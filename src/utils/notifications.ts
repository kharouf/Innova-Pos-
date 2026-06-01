import { Product } from '../types';

export interface EmailLog {
  id: string;
  sentAt: string;
  recipient: string;
  subject: string;
  productName: string;
  productCode: string;
  stockLeft: number;
  minQty: number;
  status: 'sent' | 'failed';
  previewUrl?: string;
}

/**
 * Professional service to trigger a real-world email alert via our full-stack Express service.
 * Connects with the `/api/send-email` controller.
 */
export async function sendCriticalStockEmail(
  adminEmail: string,
  product: Product,
  storeName: string,
  language: 'fr' | 'ar',
  smtpSettings?: {
    smtpHost?: string;
    smtpPort?: number;
    smtpUser?: string;
    smtpPass?: string;
    smtpSecure?: boolean;
    smtpSenderName?: string;
  }
): Promise<{ success: boolean; log: EmailLog }> {
  const isArabic = language === 'ar';
  
  const subject = isArabic 
    ? `⚠️ تنبيه مخزون حرج: ${product.name} - ${storeName}` 
    : `⚠️ ALERTE STOCK BAS : ${product.name} - ${storeName}`;

  const logEntry: EmailLog = {
    id: 'eml-' + Math.random().toString(36).substring(2, 11),
    sentAt: new Date().toLocaleTimeString(language === 'ar' ? 'ar-TN' : 'fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }),
    recipient: adminEmail,
    subject,
    productName: product.name,
    productCode: product.code,
    stockLeft: product.stock,
    minQty: product.minAlertQty,
    status: 'sent'
  };

  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        adminEmail,
        productName: product.name,
        productCode: product.code,
        stock: product.stock,
        minAlertQty: product.minAlertQty,
        unit: product.unit,
        storeName,
        language,
        smtpSettings
      })
    });

    const resData = await response.json();

    if (!response.ok || !resData.success) {
      throw new Error(resData.error || 'Failed to dispatch email via SMTP server');
    }

    console.log('[EMAIL DISPATCH SYSTEM] Alert email successfully sent:', resData);

    return { 
      success: true, 
      log: { 
        ...logEntry,
        id: resData.messageId || logEntry.id,
        previewUrl: resData.previewUrl
      } 
    };
  } catch (error: any) {
    console.error("Critical Stock Email Dispatch failed:", error);
    return { 
      success: false, 
      log: { 
        ...logEntry, 
        status: 'failed',
        subject: `${subject} (${error.message || 'Error'})` 
      } 
    };
  }
}

export async function sendCustomEmail(
  recipient: string,
  subject: string,
  html: string,
  smtpSettings?: {
    smtpHost?: string;
    smtpPort?: number;
    smtpUser?: string;
    smtpPass?: string;
    smtpSecure?: boolean;
    smtpSenderName?: string;
  }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const response = await fetch('/api/send-custom-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        recipient,
        subject,
        html,
        smtpSettings
      })
    });

    const resData = await response.json();
    if (!response.ok || !resData.success) {
      throw new Error(resData.error || 'Failed to dispatch custom report email via SMTP');
    }

    return { success: true, messageId: resData.messageId };
  } catch (error: any) {
    console.error("Custom Email Dispatch failed:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Triggers a beautiful HTML Shift Opening email.
 */
export async function sendShiftOpeningEmail(
  adminEmail: string,
  storeName: string,
  cashierName: string,
  startTime: string,
  language: 'fr' | 'ar',
  smtpSettings?: any
) {
  const isArabic = language === 'ar';
  const subject = isArabic
    ? `🟢 فتح كاشير جديد: ${cashierName} - ${storeName}`
    : `🟢 OUVERTURE DE CAISSE : ${cashierName} - ${storeName}`;

  const formattedTime = new Date(startTime).toLocaleTimeString(language === 'ar' ? 'ar-TN' : 'fr-FR', {
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
  const formattedDate = new Date(startTime).toLocaleDateString(language === 'ar' ? 'ar-TN' : 'fr-FR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const html = isArabic
    ? `
    <div style="direction: rtl; font-family: system-ui, sans-serif; padding: 25px; border: 1px solid #10b981; border-radius: 16px; max-width: 600px; background-color: #f0fdf4; margin: 0 auto; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
      <div style="text-align: center; margin-bottom: 20px;">
        <span style="background-color: #10b981; color: white; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">تقرير فتح صندوق النقدية</span>
      </div>
      <h2 style="color: #15803d; margin-top: 10px; font-size: 20px; text-align: center; border-bottom: 2px solid #bbf7d0; padding-bottom: 12px;">✅ تم بدء نوبة عمل كاشير جديدة</h2>
      <p style="font-size: 14px; color: #374151; line-height: 1.6; text-align: center; margin-top: 15px;">نحيطكم علماً بأن الكاشير قد قام بتسجيل الدخول وبدء العمل على صندوق البيع بالتفاصيل التالية:</p>
      
      <div style="background-color: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 18px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr style="border-bottom: 1px solid #f3f4f6;">
            <td style="padding: 10px 0; color: #6b7280; font-weight: bold; width: 40%;">👤 الكاشير النشط:</td>
            <td style="padding: 10px 0; color: #111827; font-weight: bold; text-align: left;">${cashierName}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f3f4f6;">
            <td style="padding: 10px 0; color: #6b7280; font-weight: bold;">🏬 اسم المحل:</td>
            <td style="padding: 10px 0; color: #111827; font-weight: bold; text-align: left;">${storeName}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f3f4f6;">
            <td style="padding: 10px 0; color: #6b7280; font-weight: bold;">📅 تاريخ الافتتاح:</td>
            <td style="padding: 10px 0; color: #111827; font-mono; text-align: left;">${formattedDate}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #6b7280; font-weight: bold;">⏰ ساعة الافتتاح:</td>
            <td style="padding: 10px 0; color: #10b981; font-weight: bold; font-mono; text-align: left;">${formattedTime}</td>
          </tr>
        </table>
      </div>
      
      <p style="font-size: 11px; color: #6b7280; text-align: center; margin-top: 15px;">صدر هذا التقرير تلقائياً من نظام INNOVA POS PRO عند تفعيل وضع العامل المقيد.</p>
    </div>
    `
    : `
    <div style="font-family: system-ui, sans-serif; padding: 25px; border: 1px solid #10b981; border-radius: 16px; max-width: 600px; background-color: #f0fdf4; margin: 0 auto; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
      <div style="text-align: center; margin-bottom: 20px;">
        <span style="background-color: #10b981; color: white; padding: 6px 14px; border-radius: 20px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">RAPPORT D'OUVERTURE DE SESSION</span>
      </div>
      <h2 style="color: #15803d; margin-top: 10px; font-size: 20px; text-align: center; border-bottom: 2px solid #bbf7d0; padding-bottom: 12px;">✅ Ouverture de session active</h2>
      <p style="font-size: 14px; color: #374151; line-height: 1.6; text-align: center; margin-top: 15px;">Bonjour,</p>
      <p style="font-size: 14px; color: #374151; line-height: 1.6; text-align: center;">Une nouvelle session de caisse privée vient d'être activée sur votre terminal par votre collaborateur :</p>
      
      <div style="background-color: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 18px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr style="border-bottom: 1px solid #f3f4f6;">
            <td style="padding: 10px 0; color: #6b7280; font-weight: bold;">👤 Caissier :</td>
            <td style="padding: 10px 0; color: #111827; font-weight: bold; text-align: right;">${cashierName}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f3f4f6;">
            <td style="padding: 10px 0; color: #6b7280; font-weight: bold;">🏬 Établissement :</td>
            <td style="padding: 10px 0; color: #111827; font-weight: bold; text-align: right;">${storeName}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f3f4f6;">
            <td style="padding: 10px 0; color: #6b7280; font-weight: bold;">📅 Date :</td>
            <td style="padding: 10px 0; color: #111827; font-weight: bold; text-align: right;">${formattedDate}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #6b7280; font-weight: bold;">⏰ Heure de début :</td>
            <td style="padding: 10px 0; color: #10b981; font-weight: bold; font-mono; text-align: right;">${formattedTime}</td>
          </tr>
        </table>
      </div>
      
      <p style="font-size: 11px; color: #6b7280; text-align: center; margin-top: 15px;">Message automatique envoyé sécurisé par le protocole SMTP de votre logiciel de gestion commercial - INNOVA POS PRO.</p>
    </div>
    `;

  return sendCustomEmail(adminEmail, subject, html, smtpSettings);
}

/**
 * Triggers a beautiful HTML Shift Closing email with all metrics tracked during the active session.
 */
export async function sendShiftClosingEmail(
  adminEmail: string,
  storeName: string,
  cashierName: string,
  startTime: string,
  endTime: string,
  metrics: {
    salesCount: number;
    revenueTotal: number;
    paidTotal: number;
    creditTotal: number;
    expensesTotal: number;
  },
  language: 'fr' | 'ar',
  smtpSettings?: any
) {
  const isArabic = language === 'ar';
  const subject = isArabic
    ? `🚨 تقرير غلق الكاشير والتحويل المالي: ${cashierName} - ${storeName}`
    : `🚨 CLÔTURE DE CAISSE ET BILAN : ${cashierName} - ${storeName}`;

  const formattedStart = new Date(startTime).toLocaleString(language === 'ar' ? 'ar-TN' : 'fr-FR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
  });
  const formattedEnd = new Date(endTime).toLocaleString(language === 'ar' ? 'ar-TN' : 'fr-FR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
  });

  const durationMs = new Date(endTime).getTime() - new Date(startTime).getTime();
  const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
  const durationMins = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
  const formattedDuration = isArabic
    ? `${durationHours} ساعة و ${durationMins} دقيقة`
    : `${durationHours}h ${durationMins}min`;

  const totalSalesFormatted = metrics.revenueTotal.toFixed(2);
  const totalPaidFormatted = metrics.paidTotal.toFixed(2);
  const totalCreditFormatted = metrics.creditTotal.toFixed(2);
  const totalExpensesFormatted = metrics.expensesTotal.toFixed(2);

  const html = isArabic
    ? `
    <div style="direction: rtl; font-family: system-ui, sans-serif; padding: 25px; border: 1px solid #ef4444; border-radius: 16px; max-width: 600px; background-color: #fef2f2; margin: 0 auto; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
      <div style="text-align: center; margin-bottom: 20px;">
        <span style="background-color: #ef4444; color: white; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">تقرير الإغلاق المالي للنوبة</span>
      </div>
      <h2 style="color: #991b1b; margin-top: 10px; font-size: 20px; text-align: center; border-bottom: 2px solid #fecaca; padding-bottom: 12px;">🚨 تقرير غلق الصندوق وحساب الأرباح</h2>
      <p style="font-size: 14px; color: #374151; line-height: 1.6; text-align: center; margin-top: 15px;">نبلغكم بأنه قد تم غلق نوبة عمل الكاشير <strong>${cashierName}</strong> بنجاح. وفيما يلي الخلاصة التفصيلية للعمليات المسجلة خلال النوبة:</p>
      
      <div style="background-color: white; border: 1px solid #f3f4f6; border-radius: 12px; padding: 18px; margin: 15px 0;">
        <h3 style="margin-top:0; color: #374151; font-size: 15px; border-bottom: 1px solid #f3f4f6; padding-bottom: 8px;">⏱️ توقيت النوبة المكتملة</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: right;">
          <tr>
            <td style="padding: 6px 0; color: #6b7280;">🕐 بداية النوبة:</td>
            <td style="padding: 6px 0; color: #111827; font-bold; text-align: left;">${formattedStart}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #6b7280;">🚨 نهاية النوبة:</td>
            <td style="padding: 6px 0; color: #111827; font-bold; text-align: left;">${formattedEnd}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #6b7280;">⏳ كامل المدة والنشاط:</td>
            <td style="padding: 6px 0; color: #3b82f6; font-bold; text-align: left;">${formattedDuration}</td>
          </tr>
        </table>
      </div>

      <div style="background-color: white; border: 1px solid #f3f4f6; border-radius: 12px; padding: 18px; margin: 15px 0;">
        <h3 style="margin-top:0; color: #374151; font-size: 15px; border-bottom: 1px solid #f3f4f6; padding-bottom: 8px;">📊 الأرقام والمؤشرات المالية</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr style="border-bottom: 1px solid #f3f4f6;">
            <td style="padding: 10px 0; color: #4b5563;">🧾 عدد فواتير الصندوق المنشأة:</td>
            <td style="padding: 10px 0; color: #111827; font-weight: bold; text-align: left; font-mono;">${metrics.salesCount} فاتورة صنف</td>
          </tr>
          <tr style="border-bottom: 1px solid #f3f4f6;">
            <td style="padding: 10px 0; color: #4b5563;">💰 إجمالي رقم أعمال المبيعات:</td>
            <td style="padding: 10px 0; color: #111827; font-weight: bold; text-align: left; font-mono; font-size: 16px;">${totalSalesFormatted} TND</td>
          </tr>
          <tr style="border-bottom: 1px solid #f3f4f6;">
            <td style="padding: 10px 0; color: #15803d; font-weight: bold;">📥 السيولة المقبوضة فعلياً:</td>
            <td style="padding: 10px 0; color: #15803d; font-weight: bold; text-align: left; font-mono; font-size: 16px;">${totalPaidFormatted} TND</td>
          </tr>
          <tr style="border-bottom: 1px solid #f3f4f6;">
            <td style="padding: 10px 0; color: #d97706;">⚠️ بقية ديون (كريديت عملاء):</td>
            <td style="padding: 10px 0; color: #d97706; font-weight: bold; text-align: left; font-mono;">${totalCreditFormatted} TND</td>
          </tr>
          <tr style="border-bottom: 1px solid #f3f4f6;">
            <td style="padding: 10px 0; color: #b91c1c;">💸 إجمالي المصاريف المخصومة:</td>
            <td style="padding: 10px 0; color: #b91c1c; font-weight: bold; text-align: left; font-mono;">${totalExpensesFormatted} TND</td>
          </tr>
          <tr style="background-color: #f8fafc;">
            <td style="padding: 10px; color: #1e293b; font-weight: bold;">💵 صافي التدفق المالي بالخزينة:</td>
            <td style="padding: 10px; color: #1e293b; font-weight: bold; text-align: left; font-mono; font-size: 18px;">${(metrics.paidTotal - metrics.expensesTotal).toFixed(2)} TND</td>
          </tr>
        </table>
      </div>

      <p style="font-size: 11px; color: #6b7280; text-align: center; margin-top: 15px;">يرجى مراجعة الصندوق الفعلي ومطابقتها للتأكد من خلوه من أي عجز أو تفاوت. نظام INNOVA POS PRO.</p>
    </div>
    `
    : `
    <div style="font-family: system-ui, sans-serif; padding: 25px; border: 1px solid #ef4444; border-radius: 16px; max-width: 600px; background-color: #fef2f2; margin: 0 auto; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
      <div style="text-align: center; margin-bottom: 20px;">
        <span style="background-color: #ef4444; color: white; padding: 6px 14px; border-radius: 20px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">RAPPORT DE CLÔTURE DE SESSION</span>
      </div>
      <h2 style="color: #991b1b; margin-top: 10px; font-size: 20px; text-align: center; border-bottom: 2px solid #fecaca; padding-bottom: 12px;">🚨 Clôture de caisse & Bilan Financier</h2>
      <p style="font-size: 14px; color: #374151; line-height: 1.6; text-align: center; margin-top: 15px;">Bonjour,</p>
      <p style="font-size: 14px; color: #374151; line-height: 1.6; text-align: center;">La session caissier restreinte de <strong>${cashierName}</strong> vient d'être déverrouillée et clôturée. Voici le bilan d'activité correspondant :</p>
      
      <div style="background-color: white; border: 1px solid #f3f4f6; border-radius: 12px; padding: 15px; margin: 15px 0;">
        <h3 style="margin-top:0; color: #374151; font-size: 14px; border-bottom: 1px solid #f3f4f6; padding-bottom: 6px;">⏱️ Durée d'Activité</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="padding: 5px 0; color: #6b7280;">🕐 Début de session :</td>
            <td style="padding: 5px 0; color: #111827; font-weight: bold; text-align: right;">${formattedStart}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #6b7280;">🚨 Fin de session :</td>
            <td style="padding: 5px 0; color: #111827; font-weight: bold; text-align: right;">${formattedEnd}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #6b7280;">⏳ Durée accumulée :</td>
            <td style="padding: 5px 0; color: #3b82f6; font-weight: bold; text-align: right;">${formattedDuration}</td>
          </tr>
        </table>
      </div>

      <div style="background-color: white; border: 1px solid #f3f4f6; border-radius: 12px; padding: 18px; margin: 15px 0;">
        <h3 style="margin-top:0; color: #374151; font-size: 14px; border-bottom: 1px solid #f3f4f6; padding-bottom: 6px;">📊 Bilan Comptable</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr style="border-bottom: 1px solid #f3f4f6;">
            <td style="padding: 8px 0; color: #4b5563;">🧾 Ventes effectuées :</td>
            <td style="padding: 8px 0; color: #111827; font-weight: bold; text-align: right; font-mono;">${metrics.salesCount} tickets</td>
          </tr>
          <tr style="border-bottom: 1px solid #f3f4f6;">
            <td style="padding: 8px 0; color: #4b5563;">💰 Chiffre d'affaires brut (CA) :</td>
            <td style="padding: 8px 0; color: #111827; font-weight: bold; text-align: right; font-mono;">${totalSalesFormatted} TND</td>
          </tr>
          <tr style="border-bottom: 1px solid #f3f4f6;">
            <td style="padding: 8px 0; color: #15803d; font-weight: bold;">📥 Équivalent Encaissé réel :</td>
            <td style="padding: 8px 0; color: #15803d; font-weight: bold; text-align: right; font-mono;">${totalPaidFormatted} TND</td>
          </tr>
          <tr style="border-bottom: 1px solid #f3f4f6;">
            <td style="padding: 8px 0; color: #d97706; font-weight: bold;">⚠️ Reste en Crédit Client :</td>
            <td style="padding: 8px 0; color: #d97706; font-weight: bold; text-align: right; font-mono;">${totalCreditFormatted} TND</td>
          </tr>
          <tr style="border-bottom: 1px solid #f3f4f6;">
            <td style="padding: 8px 0; color: #b91c1c; font-weight: bold;">💸 Dépenses de caisse :</td>
            <td style="padding: 8px 0; color: #b91c1c; font-weight: bold; text-align: right; font-mono;">${totalExpensesFormatted} TND</td>
          </tr>
          <tr style="background-color: #f8fafc; font-weight: bold;">
            <td style="padding: 10px; color: #1e293b;">💵 Net flux de trésorerie :</td>
            <td style="padding: 10px; color: #1e293b; text-align: right; font-mono; font-size: 16px;">${(metrics.paidTotal - metrics.expensesTotal).toFixed(2)} TND</td>
          </tr>
        </table>
      </div>

      <p style="font-size: 11px; color: #6b7280; text-align: center; margin-top: 15px;">Cet e-mail sécurisé a été généré par la plateforme INNOVA POS PRO.</p>
    </div>
    `;

  return sendCustomEmail(adminEmail, subject, html, smtpSettings);
}

/**
 * Triggers a beautiful HTML Daily Low Stock Summary email.
 */
export async function sendDailyLowStockSummaryEmail(
  adminEmail: string,
  storeName: string,
  lowStockProducts: Product[],
  language: 'fr' | 'ar',
  smtpSettings?: any
): Promise<{ success: boolean; error?: string }> {
  const isArabic = language === 'ar';
  const subject = isArabic
    ? `📋 تقرير نقص المخزون اليومي - ${storeName}`
    : `📋 Rapport journalier des ruptures de stock - ${storeName}`;

  const formattedDate = new Date().toLocaleDateString(language === 'ar' ? 'ar-TN' : 'fr-FR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  // Generate table rows for low stock products
  let tableRows = '';
  if (lowStockProducts.length === 0) {
    tableRows = `
      <tr>
        <td colspan="4" style="padding: 20px; text-align: center; color: #10b981; font-weight: bold; background-color: #f0fdf4;">
          ${isArabic ? '✅ ممتاز! جميع السلع متوفرة بكميات كافية ولا توجد مواد منخفضة اليوم.' : '✅ Félicitations ! Aucun produit n’est en stock bas aujourd’hui.'}
        </td>
      </tr>
    `;
  } else {
    tableRows = lowStockProducts.map(p => `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 12px 10px; color: #111827; font-weight: bold; text-align: ${isArabic ? 'right' : 'left'};">${p.name}</td>
        <td style="padding: 12px 10px; color: #4b5563; font-family: monospace; text-align: ${isArabic ? 'right' : 'left'};">${p.code}</td>
        <td style="padding: 12px 10px; color: #ef4444; font-weight: bold; font-family: monospace; text-align: center; font-size: 14px;">
          ${p.stock} <span style="font-size: 11px; font-weight: normal; color: #6b7280;">${p.unit}</span>
        </td>
        <td style="padding: 12px 10px; color: #6b7280; font-family: monospace; text-align: center; font-size: 14px;">
          ${p.minAlertQty} <span style="font-size: 11px; font-weight: normal; color: #9ca3af;">${p.unit}</span>
        </td>
      </tr>
    `).join('');
  }

  const html = isArabic
    ? `
    <div style="direction: rtl; font-family: system-ui, -apple-system, sans-serif; padding: 25px; border: 1px solid #ef4444; border-radius: 16px; max-width: 600px; background-color: #fcfcfc; margin: 0 auto; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
      <div style="text-align: center; margin-bottom: 20px;">
        <span style="background-color: #ef4444; color: white; padding: 6px 14px; border-radius: 20px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">تقرير المخزون اليومي</span>
      </div>
      <h2 style="color: #991b1b; margin-top: 10px; font-size: 20px; text-align: center; border-bottom: 2px solid #fecaca; padding-bottom: 12px; margin-bottom: 15px;">📋 السلع ذات الكميات الحرجة</h2>
      <p style="font-size: 14px; color: #374151; line-height: 1.6; text-align: right; margin-top: 15px;">مرحباً،</p>
      <p style="font-size: 14px; color: #374151; line-height: 1.6; text-align: right;">إليكم كشفاً شاملاً ومجمعاً بالمواد التي بلغت أو تجاوزت الحد الأدنى من كميات الأمان المحددة لها اليوم (<strong>${formattedDate}</strong>):</p>
      
      <div style="background-color: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 8px; margin: 20px 0; overflow-x: auto; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="background-color: #f9fafb; border-bottom: 2px solid #e5e7eb; text-align: right;">
              <th style="padding: 10px; color: #374151; font-weight: bold; text-align: right;">المنتج</th>
              <th style="padding: 10px; color: #374151; font-weight: bold; text-align: right;">الباركود</th>
              <th style="padding: 10px; color: #374151; font-weight: bold; text-align: center;">المخزون الحالي</th>
              <th style="padding: 10px; color: #374151; font-weight: bold; text-align: center;">الحد الأدنى</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>
      
      <p style="font-size: 12px; color: #4b5563; line-height: 1.5; text-align: right; margin-top: 15px;">💡 يرجى الاتصال بمزودي الخدمات وتجهيز طلبيات التوريد لتجنب أي تعطل في عمل المحل أو عمليات البيع بالتفصيل.</p>
      <p style="font-size: 11px; color: #9ca3af; text-align: center; margin-top: 25px; border-top: 1px solid #f3f4f6; pt-15;">صدر هذا التقرير اليومي التلقائي بشكل مؤمن من نظام INNOVA POS PRO.</p>
    </div>
    `
    : `
    <div style="font-family: system-ui, -apple-system, sans-serif; padding: 25px; border: 1px solid #ef4444; border-radius: 16px; max-width: 600px; background-color: #fcfcfc; margin: 0 auto; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
      <div style="text-align: center; margin-bottom: 20px;">
        <span style="background-color: #ef4444; color: white; padding: 6px 14px; border-radius: 20px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">BILAN DES STOCKS BAS</span>
      </div>
      <h2 style="color: #991b1b; margin-top: 10px; font-size: 20px; text-align: center; border-bottom: 2px solid #fecaca; padding-bottom: 12px; margin-bottom: 15px;">📋 Rapport de Synthèse Journalier</h2>
      <p style="font-size: 14px; color: #374151; line-height: 1.6; text-align: left; margin-top: 15px;">Bonjour,</p>
      <p style="font-size: 14px; color: #374151; line-height: 1.6; text-align: left;">Voici la synthèse des articles ayant atteint ou franchi négativement leur seuil d'alerte configuré pour le <strong>${formattedDate}</strong> :</p>
      
      <div style="background-color: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 8px; margin: 20px 0; overflow-x: auto; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="background-color: #f9fafb; border-bottom: 2px solid #e5e7eb;">
              <th style="padding: 10px; color: #374151; font-weight: bold; text-align: left;">Produit</th>
              <th style="padding: 10px; color: #374151; font-weight: bold; text-align: left;">Code barre</th>
              <th style="padding: 10px; color: #374151; font-weight: bold; text-align: center;">Stock restant</th>
              <th style="padding: 10px; color: #374151; font-weight: bold; text-align: center;">Seuil d'Alerte</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>
      
      <p style="font-size: 12px; color: #4b5563; line-height: 1.5; text-align: left; margin-top: 15px;">💡 Veuillez contacter vos fournisseurs et préparer vos commandes d'approvisionnement afin d'éviter d'éventuelles ruptures.</p>
      <p style="font-size: 11px; color: #9ca3af; text-align: center; margin-top: 25px; border-top: 1px solid #f3f4f6; pt-15;">Ce rapport journalier automatique de sécurité a été généré en toute sécurité par INNOVA POS PRO.</p>
    </div>
    `;

  const response = await sendCustomEmail(adminEmail, subject, html, smtpSettings);
  return response.success 
    ? { success: true } 
    : { success: false, error: response.error };
}
