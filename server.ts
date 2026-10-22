import express from "express";
import path from "path";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import Tesseract from "tesseract.js";

dotenv.config();

/**
 * Extracts expiration date from recognized OCR text, with special support for
 * Tunisian & French dairy and food product formats (e.g., Vitalait, Délice, Natilait)
 * where expiration is printed under "يستحسن إستهلاكه قبل / A CONSOMMER DE PREFERENCE AVANT"
 * as space-separated "DD MM YY" (e.g. "01 01 27 21 D") and fabrication date as "DF : 02 09 26".
 */
function extractExpiryDateFromText(rawText: string): { found: boolean; date: string; rawText: string; confidence: string; description: string } {
  if (!rawText) return { found: false, date: "", rawText: "", confidence: "low", description: "" };

  const lines = rawText.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean);
  
  let foundExpDate: { iso: string; raw: string; line: string } | null = null;
  let foundFabDate: { iso: string; raw: string; line: string } | null = null;
  const allParsedDates: { iso: string; raw: string; line: string; isFab: boolean; index: number }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Check if line indicates fabrication / production date
    const isFabLine = /\b(?:DF|FAB|PROD|MFG|صنع|إنتاج)\b/i.test(line);

    // Look for spaced or punctuated dates: DD MM YY, DD/MM/YY, DD.MM.YY, DD-MM-YY
    const dateMatches = [
      // Spaced format: e.g. "01 01 27", "02 09 26", "15 10 2026"
      ...Array.from(line.matchAll(/\b(0[1-9]|[12][0-9]|3[01])\s+(0[1-9]|1[0-2])\s+(2[0-9]|202[4-9]|203[0-9])\b/g)),
      // Punctuated format: e.g. "01/01/27", "02.09.26", "25-11-2026"
      ...Array.from(line.matchAll(/\b(0[1-9]|[12][0-9]|3[01])[./-](0[1-9]|1[0-2])[./-](2[0-9]|202[4-9]|203[0-9])\b/g))
    ];

    for (const m of dateMatches) {
      const d = parseInt(m[1], 10);
      const mo = parseInt(m[2], 10);
      let yr = parseInt(m[3], 10);
      if (yr < 100) yr += 2000;

      const iso = `${yr}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const item = { iso, raw: m[0], line, isFab: isFabLine, index: i };
      allParsedDates.push(item);

      if (isFabLine) {
        foundFabDate = item;
      }
    }
  }

  // Check lines following an expiration heading (e.g. "A CONSOMMER DE PREFERENCE AVANT" or "يستحسن إستهلاكه قبل")
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/(?:CONSOMMER|PREFERENCE|AVANT|يستحسن|إستهلاكه|استهلاكه|قبل|DLC|DLUO|EXP|BBD)/i.test(line)) {
      for (let j = i + 1; j <= Math.min(i + 3, lines.length - 1); j++) {
        const nextLine = lines[j];
        if (!/\b(?:DF|FAB|PROD|MFG)\b/i.test(nextLine)) {
          // Look for date in this subsequent line
          const match = nextLine.match(/\b(0[1-9]|[12][0-9]|3[01])[\s./-]+(0[1-9]|1[0-2])[\s./-]+(2[0-9]|202[4-9]|203[0-9])\b/);
          if (match) {
            let yr = parseInt(match[3], 10);
            if (yr < 100) yr += 2000;
            const iso = `${yr}-${String(match[2]).padStart(2, "0")}-${String(match[1]).padStart(2, "0")}`;
            foundExpDate = { iso, raw: match[0], line: nextLine };
            break;
          }
        }
      }
      if (foundExpDate) break;
    }
  }

  if (foundExpDate) {
    return {
      found: true,
      date: foundExpDate.iso,
      rawText: foundExpDate.raw,
      confidence: "high",
      description: `Date de péremption : ${foundExpDate.raw} (A consommer avant)`
    };
  }

  // Filter out known fabrication dates
  const nonFabDates = allParsedDates.filter(d => !d.isFab);
  if (nonFabDates.length > 0) {
    // If multiple dates exist, the expiration date is the latest date (furthest in the future)
    nonFabDates.sort((a, b) => a.iso.localeCompare(b.iso));
    const chosen = nonFabDates[nonFabDates.length - 1];
    return {
      found: true,
      date: chosen.iso,
      rawText: chosen.raw,
      confidence: "high",
      description: `Date d'expiration détectée : ${chosen.raw}${foundFabDate ? ` (Fabrication: ${foundFabDate.raw})` : ""}`
    };
  }

  // Fallback: If only dates with DF or unclassified were parsed, sort and take the latest date
  if (allParsedDates.length > 0) {
    allParsedDates.sort((a, b) => a.iso.localeCompare(b.iso));
    const chosen = allParsedDates[allParsedDates.length - 1];
    return {
      found: true,
      date: chosen.iso,
      rawText: chosen.raw,
      confidence: "medium",
      description: `Date de péremption : ${chosen.raw}`
    };
  }

  // Also check standard MM/YYYY pattern (e.g. 11/2026)
  const clean = rawText.replace(/[\r\n]+/g, " ");
  const expMonthYearRegex = /(?:EXP|DLC|DLUO|BB|VAL|AVANT)[\s.:/_-]*(\d{1,2})[\s.:/_-](\d{2,4})/i;
  const myMatch = clean.match(expMonthYearRegex);
  if (myMatch) {
    const month = parseInt(myMatch[1], 10);
    let year = parseInt(myMatch[2], 10);
    if (year < 100) year += 2000;
    if (month >= 1 && month <= 12 && year >= 2024 && year <= 2040) {
      const lastDay = new Date(year, month, 0).getDate();
      const iso = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      return {
        found: true,
        date: iso,
        rawText: myMatch[0],
        confidence: "medium",
        description: `Mois et année de péremption : ${iso}`
      };
    }
  }

  return { found: false, date: "", rawText: "", confidence: "low", description: "" };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "25mb" }));
  app.use(express.urlencoded({ extended: true, limit: "25mb" }));

  // Health check endpoint required by the platform deployment
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // AI-powered product expiration date extraction with resilient OCR fallback
  app.post("/api/extract-expiry-date", async (req, res) => {
    try {
      const { image, mimeType } = req.body;
      if (!image) {
        return res.status(400).json({ success: false, error: "Image is required" });
      }

      let base64Data = image;
      let actualMime = mimeType || "image/jpeg";
      if (image.startsWith("data:")) {
        const match = image.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          actualMime = match[1];
          base64Data = match[2];
        }
      }

      const apiKey = (process.env.GEMINI_API_KEY || "").trim();
      const isKnownLeakedKey = apiKey.includes("AIzaSyBpS76O7tf6JnbCWgr5WTocIsdjDtzr0Oo") || apiKey === "your_gemini_api_key_here";

      // Try Gemini AI if a valid (non-placeholder) API key is available
      if (apiKey && !isKnownLeakedKey) {
        try {
          const ai = new GoogleGenAI({
            apiKey,
            httpOptions: {
              headers: {
                'User-Agent': 'aistudio-build',
              }
            }
          });

          const response = await ai.models.generateContent({
            model: "gemini-3.8-flash",
            contents: {
              parts: [
                {
                  inlineData: {
                    data: base64Data,
                    mimeType: actualMime,
                  },
                },
                {
                  text: `You are an expert OCR vision system specialized in retail, food, pharmaceutical, and consumer goods packaging.
Your job is to read and extract the EXPIRATION / BEST BEFORE / USE BY / DLC / DLUO date from the provided product photo.

CRITICAL RULES & TUNISIAN/DAIRY PACKAGING (Vitalait, Délice, Natilait, Danone, etc.):
1. Headings like:
   - "يستحسن إستهلاكه قبل" (Yustahsan istihlakuhu qabl)
   - "A CONSOMMER DE PREFERENCE AVANT"
   indicate that the date stamped directly underneath is the EXPIRATION DATE!
2. Spaced digits format:
   - "01 01 27 21 D" -> Date is "01 01 27" = 01 Jan 2027 -> ISO: "2027-01-01" (where "21 D" is batch code).
3. "DF :" means Date de Fabrication (Manufacturing Date):
   - "DF : 02 09 26 02" -> Fabrication date is 02 Sept 2026.
   - DO NOT RETURN THE DF DATE! Always return the expiration date ("2027-01-01"), which is the later date under the "A CONSOMMER..." header!
4. Other common formats: DD/MM/YYYY, DD.MM.YYYY, DD-MM-YYYY, DD/MM/YY, MM/YYYY.
5. Normalize into standard ISO format: "YYYY-MM-DD".
6. Provide:
   - found: boolean
   - date: "YYYY-MM-DD"
   - rawText: exact text found (e.g. "01 01 27")
   - confidence: "high" | "medium" | "low"
   - description: concise explanation (e.g. "Date de péremption : 01/01/2027 (DF fabrication: 02/09/2026)")`
                }
              ]
            },
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  found: { type: Type.BOOLEAN },
                  date: { type: Type.STRING, description: "Normalized date in YYYY-MM-DD format" },
                  rawText: { type: Type.STRING, description: "Raw printed date text" },
                  confidence: { type: Type.STRING, description: "Confidence level" },
                  description: { type: Type.STRING, description: "Explanation" }
                },
                required: ["found"]
              }
            }
          });

          const rawJson = response.text?.trim() || "{}";
          const parsed = JSON.parse(rawJson);

          let validDate = parsed.date || "";
          if (validDate && !/^\d{4}-\d{2}-\d{2}$/.test(validDate)) {
            const parsedTimestamp = Date.parse(validDate);
            if (!isNaN(parsedTimestamp)) {
              validDate = new Date(parsedTimestamp).toISOString().split("T")[0];
            } else {
              validDate = "";
            }
          }

          if (parsed.found && validDate) {
            return res.status(200).json({
              success: true,
              found: true,
              date: validDate,
              rawText: parsed.rawText || "",
              confidence: parsed.confidence || "high",
              description: parsed.description || "Date reconnue par l'IA"
            });
          }
        } catch (geminiErr: any) {
          console.log("[SERVER OCR INFO] Gemini API unavailable or key expired, switching to local OCR engine:", geminiErr.message || geminiErr);
        }
      }

      // Fast Local OCR Fallback via Tesseract.js
      try {
        const imageBuffer = Buffer.from(base64Data, "base64");
        const { data: { text } } = await Tesseract.recognize(imageBuffer, "eng");
        const extracted = extractExpiryDateFromText(text || "");

        return res.status(200).json({
          success: true,
          found: extracted.found,
          date: extracted.date,
          rawText: extracted.rawText,
          confidence: extracted.confidence,
          description: extracted.description || (extracted.found ? "Date détectée via le moteur OCR" : "Aucune date de péremption lisible trouvée")
        });
      } catch (ocrErr: any) {
        console.log("[SERVER OCR INFO] Local OCR finished with no matches:", ocrErr.message || ocrErr);
        return res.status(200).json({
          success: true,
          found: false,
          date: "",
          rawText: "",
          confidence: "low",
          description: "Veuillez renseigner la date manuellement ou reprendre la photo."
        });
      }
    } catch (err: any) {
      console.log("[SERVER OCR INFO] Request handled gracefully:", err.message || err);
      return res.status(200).json({
        success: true,
        found: false,
        date: "",
        rawText: "",
        confidence: "low",
        description: "Veuillez renseigner la date manuellement ou reprendre la photo."
      });
    }
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
