// /api/contact.js
// Vercel serverless function to receive form submissions and email Nick via Resend.
// Required env vars (set in Vercel dashboard):
//   RESEND_API_KEY  — your Resend API key
//   CONTACT_TO      — recipient email (nicholas.chin@antaralogic.com)
//   CONTACT_FROM    — from address (must be on a verified Resend domain)

export default async function handler(req, res) {
  // CORS for safety (same-origin only really, but explicit)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, email, phone, type } = req.body || {};

    // Server-side validation
    if (!name || !email || !phone || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Sanity checks
    if (typeof name !== 'string' || name.length > 200) {
      return res.status(400).json({ error: 'Invalid name' });
    }
    if (typeof email !== 'string' || !email.includes('@') || email.length > 200) {
      return res.status(400).json({ error: 'Invalid email' });
    }
    if (typeof phone !== 'string' || phone.length > 50) {
      return res.status(400).json({ error: 'Invalid phone' });
    }
    const validTypes = ['Investor', 'Partner', 'Customer', 'Press', 'Other'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid type' });
    }

    // Escape HTML to prevent injection in email body
    const esc = (s) => String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    const subject = `Early Interest — ${type} — ${name}`;

    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1a1a2e;">
        <div style="border-bottom: 2px solid #c4a265; padding-bottom: 16px; margin-bottom: 24px;">
          <h1 style="font-size: 20px; margin: 0; color: #1a1a2e;">New Early Interest — AntaraLogic®</h1>
          <p style="margin: 6px 0 0; color: #5a5a6e; font-size: 14px;">From the website contact form</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
          <tr>
            <td style="padding: 10px 0; color: #8a8a9a; width: 120px; vertical-align: top; font-weight: 600;">Name</td>
            <td style="padding: 10px 0; color: #1a1a2e;">${esc(name)}</td>
          </tr>
          <tr style="border-top: 1px solid #ebe5d9;">
            <td style="padding: 10px 0; color: #8a8a9a; vertical-align: top; font-weight: 600;">Email</td>
            <td style="padding: 10px 0; color: #1a1a2e;"><a href="mailto:${esc(email)}" style="color: #b87a5a; text-decoration: none;">${esc(email)}</a></td>
          </tr>
          <tr style="border-top: 1px solid #ebe5d9;">
            <td style="padding: 10px 0; color: #8a8a9a; vertical-align: top; font-weight: 600;">Phone</td>
            <td style="padding: 10px 0; color: #1a1a2e;">${esc(phone)}</td>
          </tr>
          <tr style="border-top: 1px solid #ebe5d9;">
            <td style="padding: 10px 0; color: #8a8a9a; vertical-align: top; font-weight: 600;">Type</td>
            <td style="padding: 10px 0; color: #1a1a2e;"><strong>${esc(type)}</strong></td>
          </tr>
          <tr style="border-top: 1px solid #ebe5d9;">
            <td style="padding: 10px 0; color: #8a8a9a; vertical-align: top; font-weight: 600;">Submitted</td>
            <td style="padding: 10px 0; color: #1a1a2e;">${new Date().toISOString()}</td>
          </tr>
        </table>

        <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #ebe5d9; font-size: 12px; color: #8a8a9a;">
          AntaraLogic® · Made in Malaysia. Built for ASEAN.
        </div>
      </div>
    `;

    const textBody = `New Early Interest — AntaraLogic®\n\nName: ${name}\nEmail: ${email}\nPhone: ${phone}\nType: ${type}\nSubmitted: ${new Date().toISOString()}`;

    // Send via Resend
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.CONTACT_FROM,
        to: process.env.CONTACT_TO,
        reply_to: email,
        subject: subject,
        html: htmlBody,
        text: textBody,
      }),
    });

    if (!resendRes.ok) {
      const errBody = await resendRes.text();
      console.error('Resend error:', resendRes.status, errBody);
      return res.status(500).json({ error: 'Email delivery failed' });
    }

    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error('Handler error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
