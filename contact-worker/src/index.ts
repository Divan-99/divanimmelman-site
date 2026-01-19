export default {
  async fetch(request: Request, env: any) {

    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    try {
      const data = await request.json();
      const { name, email, subject, message } = data;

      if (!name || !email || !subject || !message) {
        return new Response("Missing fields", { status: 400 });
      }

      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: "Divan Website <onboarding@resend.dev>",
          to: ["divanimm123@gmail.com"],
          subject: `[Website] ${subject}`,
          html: `
            <h2>New Website Message</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Message:</strong></p>
            <p>${message}</p>
          `
        })
      });

      if (!resendResponse.ok) {
        const err = await resendResponse.text();
        return new Response(err, { status: 500 });
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { "Content-Type": "application/json" } }
      );

    } catch {
      return new Response("Server error", { status: 500 });
    }
  }
};
