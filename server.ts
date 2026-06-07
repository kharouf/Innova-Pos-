import express from "express";
import path from "path";
import nodemailer from "nodemailer";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check endpoint required by the platform deployment
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // API endpoint to send a real critical stock email
  app.post("/api/send-email", async (req, res) => {
    try {
      const {
        adminEmail,
        productName,
        productCode,
        stock,
        minAlertQty,
        unit,
        storeName,
        language,
        smtpSettings
      } = req.body;

      if (!adminEmail) {
        return res.status(400).json({ success: false, error: "Missing recipient adminEmail" });
      }

      const isArabic = language === 'ar';
      const subject = isArabic 
        ? `⚠️ تنبيه منسوب المخزون الحرج: ${productName} - ${storeName}` 
        : `⚠️ ALERTE STOCK BAS : ${productName} - ${storeName}`;

      const messageHtml = isArabic
        ? `
        <div style="direction: rtl; font-family: system-ui, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; max-width: 600px; background-color: #f8fafc;">
          <h2 style="color: #dc2626; margin-top: 0;">⚠️ تنبيه تلقائي من نظام INNOVA POS</h2>
          <p style="font-size: 14px; color: #475569;">مرحباً، لقد وصلت السلعة التالية في محل <strong>${storeName}</strong> إلى مستوى المخزون الحرج:</p>
          <hr style="border: 0; border-top: 1px solid #cbd5e1; margin: 15px 0;" />
          <ul style="list-style: none; padding: 0; font-size: 14px; line-height: 1.8;">
            <li>📦 <strong>اسم المنتج:</strong> ${productName}</li>
            <li>🏷️ <strong>الكود السري (SKU):</strong> ${productCode}</li>
            <li>📊 <strong>الكمية المتبقية:</strong> <span style="color: #dc2626; font-weight: bold; font-size: 16px;">${stock} ${unit || 'قطعة'}</span></li>
            <li>🚨 <strong>الحد الأدنى للتنبيه:</strong> ${minAlertQty} ${unit || 'قطعة'}</li>
          </ul>
          <hr style="border: 0; border-top: 1px solid #cbd5e1; margin: 15px 0;" />
          <p style="font-size: 12px; color: #64748b; margin-bottom: 0;">يرجى إعادة تموين هذا الصنف بأقرب وقت لتفادي انقطاع المبيعات.</p>
        </div>
        `
        : `
        <div style="font-family: system-ui, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; max-width: 600px; background-color: #f8fafc;">
          <h2 style="color: #dc2626; margin-top: 0;">⚠️ Alerte Automatique - INNOVA POS</h2>
          <p style="font-size: 14px; color: #475569;">Bonjour,</p>
          <p style="font-size: 14px; color: #475569;">Le produit suivant de votre magasin <strong>${storeName}</strong> a franchi le niveau d'alerte minimal de sécurité :</p>
          <hr style="border: 0; border-top: 1px solid #cbd5e1; margin: 15px 0;" />
          <ul style="list-style-type: none; padding: 0; font-size: 14px; line-height: 1.8;">
            <li>📦 <strong>Produit :</strong> ${productName}</li>
            <li>🏷️ <strong>SKU / Code :</strong> ${productCode || 'N/A'}</li>
            <li>📊 <strong>Stock Restant :</strong> <span style="color: #dc2626; font-weight: bold; font-size: 16px;">${stock} ${unit || 'Pcs'}</span></li>
            <li>🚨 <strong>Seuil minimal :</strong> ${minAlertQty} ${unit || 'Pcs'}</li>
          </ul>
          <hr style="border: 0; border-top: 1px solid #cbd5e1; margin: 15px 0;" />
          <p style="font-size: 12px; color: #64748b; margin-bottom: 0;">Veuillez passer commande auprès de vos partenaires dès que possible afin d'éviter toute rupture de stock.</p>
        </div>
        `;

      const hasSmtp = !!(smtpSettings?.smtpHost && smtpSettings?.smtpUser && smtpSettings?.smtpPass);
      let transporter;
      let fromAddress = `"INNOVA Alertes" <alerts@innovapos.com>`;
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
        const senderName = smtpSettings.smtpSenderName || storeName || "INNOVA POS";
        fromAddress = `"${senderName}" <${smtpSettings.smtpUser}>`;
        smtpUsed = true;
      } else {
        // Fallback to the default authenticated SMTP settings from environment variables
        const envHost = (process.env.SMTP_HOST || "smtp.gmail.com").trim();
        const envPort = Number(process.env.SMTP_PORT) || 587;
        const envUser = (process.env.SMTP_USER || "kharoufwala24@gmail.com").trim();
        const envPass = (process.env.SMTP_PASS || "").trim();
        const envSecure = process.env.SMTP_SECURE === 'true' || envPort === 465;
        const envSenderName = process.env.SMTP_SENDER_NAME || storeName || "INNOVA POS";

        if (!envPass) {
          // If no fallback password is provided, bypass connecting to avoid BadCredentials error
          console.warn(`[SERVER SMTP] Skipping real SMTP alert dispatch: Fallback SMTP_PASS is empty for user ${envUser}.`);
          return res.status(200).json({
            success: true,
            simulated: true,
            messageId: `sim-[SERVER SMTP ERROR]-${Date.now()}`,
            smtpUsed: false,
            note: "Draft skipped. SMTP_PASS environment variable is not configured."
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
        to: adminEmail,
        subject: subject,
        html: messageHtml
      };

      const info = await transporter.sendMail(mailOptions);

      console.log(`[SERVER SMTP] Email sent successfully to ${adminEmail}, MessageId: ${info.messageId}`);

      return res.status(200).json({
        success: true,
        messageId: info.messageId,
        smtpUsed
      });
    } catch (err: any) {
      console.log("[SERVER SMTP INFO] Gracefully skipped/handled SMTP delivery of administrative alert email:", err.message || err);
      
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
  });

  // API endpoint to send a custom HTML email (e.g. shift opening/closing session reports)
  app.post("/api/send-custom-email", async (req, res) => {
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
          // If no fallback password is provided, bypass connecting to avoid BadCredentials error
          console.warn(`[SERVER SMTP] Skipping real SMTP custom dispatch: Fallback SMTP_PASS is empty for user ${envUser}.`);
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
      console.log(`[SERVER SMTP] Custom email sent successfully to ${recipient}, MessageId: ${info.messageId}`);

      return res.status(200).json({
        success: true,
        messageId: info.messageId,
        smtpUsed
      });
    } catch (err: any) {
      console.log("[SERVER SMTP INFO] Gracefully skipped/handled SMTP delivery of custom email:", err.message || err);

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
  });

  // Serve static assets and SPA route redirects
  if (process.env.NODE_ENV !== "production") {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.warn("Vite not found or failed to start, falling back to static production serving.");
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Fullstack server integrated on http://localhost:${PORT}`);
  });
}

startServer();
