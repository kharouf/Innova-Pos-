import nodemailer from "nodemailer";

export default async function handler(req: any, res: any) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const {
      recipient,
      subject,
      html,
      smtpSettings
    } = req.body;

    if (!recipient) {
      return res.status(400).json({ success: false, error: "Missing recipient email" });
    }

    const hasSmtp = !!(smtpSettings?.smtpHost && smtpSettings?.smtpUser && smtpSettings?.smtpPass);
    let transporter;
    let fromAddress = `"INNOVA Reports" <reports@innovapos.com>`;
    let smtpUsed = false;

    if (hasSmtp) {
      const port = Number(smtpSettings.smtpPort) || 587;
      let host = (smtpSettings.smtpHost || '').trim();
      if (host.includes('@')) {
        host = host.replace('@', '.');
      }
      transporter = nodemailer.createTransport({
        host,
        port,
        secure: smtpSettings.smtpSecure ?? (port === 465),
        auth: {
          user: smtpSettings.smtpUser,
          pass: smtpSettings.smtpPass
        },
        tls: {
          rejectUnauthorized: false
        }
      });
      const senderName = smtpSettings.smtpSenderName || "INNOVA POS";
      fromAddress = `"${senderName}" <${smtpSettings.smtpUser}>`;
      smtpUsed = true;
    } else {
      // Fallback to the default authenticated SMTP settings from environment variables
      const envHost = (process.env.SMTP_HOST || "smtp.gmail.com").trim();
      const envPort = Number(process.env.SMTP_PORT) || 587;
      const envUser = (process.env.SMTP_USER || "kharoufwala24@gmail.com").trim();
      const envPass = (process.env.SMTP_PASS || "").trim();
      const envSecure = process.env.SMTP_SECURE === 'true' || envPort === 465;
      const envSenderName = process.env.SMTP_SENDER_NAME || "INNOVA POS";

      if (!envPass) {
        console.warn(`[SERVER SMTP] Skipping real SMTP custom dispatch: Fallback SMTP_PASS is empty.`);
        return res.status(200).json({
          success: true,
          simulated: true,
          messageId: `sim-[SERVER SMTP ERROR]-${Date.now()}`,
          smtpUsed: false,
          note: "Report skipped. SMTP_PASS environment variable is not configured."
        });
      }

      transporter = nodemailer.createTransport({
        host: envHost,
        port: envPort,
        secure: envSecure,
        auth: {
          user: envUser,
          pass: envPass
        },
        tls: {
          rejectUnauthorized: false
        }
      });
      fromAddress = `"${envSenderName}" <${envUser}>`;
      smtpUsed = true;
    }

    const mailOptions = {
      from: fromAddress,
      to: recipient,
      subject: subject,
      html: html
    };

    const info = await transporter.sendMail(mailOptions);

    return res.status(200).json({
      success: true,
      messageId: info.messageId,
      smtpUsed
    });
  } catch (err: any) {
    console.error("Vercel send-custom-email error:", err);
    const isAuthError = err.code === 'EAUTH' || 
                        err.message?.includes('535') || 
                        err.message?.includes('Username and Password not accepted') ||
                        err.message?.includes('BadCredentials');

    if (isAuthError) {
      return res.status(200).json({
        success: false,
        error: "SMTP_AUTH_FAILED",
        message: "SMTP authentication failed. Please check your SMTP username and password in settings. For Gmail, use an App Password.",
        details: err.message
      });
    }

    return res.status(200).json({
      success: false,
      error: "SMTP_DISPATCH_FAILED",
      message: err.message || "Failed to dispatch email"
    });
  }
}
