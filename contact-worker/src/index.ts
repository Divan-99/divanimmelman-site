const ALLOWED_ORIGINS = [
  "https://divanimmelman.com",
  "https://www.divanimmelman.com"
];

function escapeHtml(value: unknown) {
  return String(value)
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

export default {
  async fetch(request: Request, env: any) {

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

    try {
      const data = await request.json();
      console.log("Incoming payload:", data);

      const { name, email, subject, message } = data;

      if (!name || !email || !subject || !message) {
        return new Response("Missing fields", {
          status: 400,
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

      console.log("Resend status:", resendResponse.status);

      if (!resendResponse.ok) {
        const err = await resendResponse.text();
        return new Response(err, {
          status: 500,
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
      console.log("Worker error:", err);
      return new Response("Server error", {
        status: 500,
        headers: corsHeaders
      });
    }
  }
};
