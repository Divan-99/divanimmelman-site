interface ContactEnv {
  RESEND_API_KEY: string;
  TURNSTILE_SECRET_KEY: string;
}

const ALLOWED_ORIGINS = [
  "https://divanimmelman.com",
  "https://www.divanimmelman.com"
];

const LIMITS = {
  name: 100,
  email: 254,
  subject: 150,
  message: 5000
} as const;

const ALLOWED_HOSTNAMES = ALLOWED_ORIGINS.map(o => new URL(o).hostname);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function cors(origin: string) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400"
  };
}

type Fields = { -readonly [K in keyof typeof LIMITS]: string };

// Returns the cleaned fields, or an error message for the client.
function validate(data: unknown): Fields | string {
  if (typeof data !== "object" || data === null) return "Invalid payload";
  const raw = data as Record<string, unknown>;
  const fields = {} as Fields;

  for (const key of Object.keys(LIMITS) as (keyof typeof LIMITS)[]) {
    const value = raw[key];
    if (typeof value !== "string" || !value.trim()) return "Missing fields";
    if (value.length > LIMITS[key]) return `${key} is too long`;
    fields[key] = value.trim();
  }

  if (!EMAIL_RE.test(fields.email)) return "Invalid email";
  // The subject ends up in an email header, so keep it on one line.
  fields.subject = fields.subject.replace(/[\r\n]+/g, " ");
  return fields;
}

// Checks the Turnstile token with Cloudflare. Tokens are single use and expire after 5 minutes.
async function verifyTurnstile(token: unknown, secret: string, ip: string | null) {
  if (typeof token !== "string" || !token || token.length > 2048) return false;

  const body = new FormData();
  body.append("secret", secret);
  body.append("response", token);
  if (ip) body.append("remoteip", ip);

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body
  });
  if (!res.ok) return false;

  const outcome = await res.json() as { success?: boolean; hostname?: string };
  return outcome.success === true && ALLOWED_HOSTNAMES.includes(outcome.hostname ?? "");
}

export default {
  async fetch(request: Request, env: ContactEnv) {

    const origin = request.headers.get("Origin");

    if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
      return new Response("Forbidden", { status: 403 });
    }

    const corsHeaders = cors(origin);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    if (request.method !== "POST") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: corsHeaders
      });
    }

    let data: unknown;
    try {
      data = await request.json();
    } catch {
      return new Response("Invalid JSON", {
        status: 400,
        headers: corsHeaders
      });
    }

    const fields = validate(data);
    if (typeof fields === "string") {
      return new Response(fields, {
        status: 400,
        headers: corsHeaders
      });
    }

    const { name, email, subject, message } = fields;

    try {
      const token = (data as Record<string, unknown>)["cf-turnstile-response"];
      const human = await verifyTurnstile(token, env.TURNSTILE_SECRET_KEY, request.headers.get("CF-Connecting-IP"));
      if (!human) {
        return new Response("Verification failed", {
          status: 403,
          headers: corsHeaders
        });
      }

      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: "Divan Website <noreply@resend.dev>",
          to: ["divanimm123@gmail.com"],
          reply_to: email,
          subject: `[Website] ${subject}`,
          html: `
            <h2>New Website Message</h2>
            <p><strong>Name:</strong> ${escapeHtml(name)}</p>
            <p><strong>Email:</strong> ${escapeHtml(email)}</p>
            <p><strong>Message:</strong></p>
            <p style="white-space:pre-wrap">${escapeHtml(message)}</p>
          `
        })
      });

      if (!resendResponse.ok) {
        // Keep Resend's error details in the logs, not in the response.
        console.error("Resend error:", resendResponse.status, await resendResponse.text());
        return new Response("Could not send message", {
          status: 502,
          headers: corsHeaders
        });
      }

      return new Response(
        JSON.stringify({ success: true }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );

    } catch (err) {
      console.error("Worker error:", err);
      return new Response("Server error", {
        status: 500,
        headers: corsHeaders
      });
    }
  }
};
