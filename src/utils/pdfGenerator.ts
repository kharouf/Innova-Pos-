import { jsPDF } from 'jspdf';
import { Invoice, DatabaseState, Product, Partner } from '../types';

/**
 * Clean sanitization of string to avoid jsPDF Helvetica font errors with non-Latin/Arabic characters.
 * Provides a transliterated/clean string for the PDF export.
 */
function cleanPdfText(text: string | undefined): string {
  if (!text) return '';
  
  // Replace typical Arabic characters or phrases with clean Latin equivalents for standard PDF export
  // if Arabic is detected, so the PDF remains perfectly legible and clean without rendering boxes.
  let cleaned = text;
  
  // Custom common mapping for names & store titles
  cleaned = cleaned.replace(/إينوفا/g, 'INNOVA')
                   .replace(/فاتورة/g, 'FACTURE')
                   .replace(/شحنة/g, 'LIVRAISON')
                   .replace(/زبون/g, 'CLIENT')
                   .replace(/عادي/g, 'STANDARD')
                   .replace(/مرجع/g, 'REF')
                   .replace(/إرجاع/g, 'RETOUR')
                   .replace(/تأكيد/g, 'CONFIRMATION')
                   .replace(/بيع/g, 'VENTE')
                   .replace(/المجموع/g, 'TOTAL')
                   .replace(/الخصم/g, 'REMISE')
                   .replace(/الصافي للدفع/g, 'NET A PAYER')
                   .replace(/المتبقي/g, 'RESTE')
                   .replace(/المدفوع/g, 'PAYE');

  // Strip non-utf8/latin-1 standard printable characters or transliterate them roughly
  // We keep space, digits, standard punctuation, and Accented French letters:
  // ÀÀÂÆÇÈÉÊËÌÍÎÏÑÒÓÔŒÙÚÛÜÝàáâæçèéêëìíîïñòóôœùúûüýÿ
  return cleaned
    .split('')
    .map(char => {
      const code = char.charCodeAt(0);
      // Allow ASCII and standard western accents
      if (code < 256) return char;
      // Replace others with approximate or space
      return ' ';
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

interface PDFGeneratorOptions {
  invoice: Invoice;
  settings: DatabaseState['settings'];
  language: 'ar' | 'fr';
  formatCurrency: (value: number) => string;
  format: 'a4' | 'ticket';
}

export function downloadInvoicePDF({
  invoice,
  settings,
  language,
  formatCurrency,
  format = 'a4'
}: PDFGeneratorOptions) {
  
  const storeName = settings?.storeName ?? "INNOVA POS PRO";
  const storePhone = settings?.storePhone ?? "+216 24260711";
  const storeAddress = settings?.storeAddress ?? "AVENU HABIB BORGIBA GHANNOUCHE GABES";
  const matriculeFiscal = settings?.matriculeFiscal ?? "1234567/A/M/000";

  const isReturn = !!invoice.isReturn;
  
  // Determine labels based on language and return state
  let docTitle = '';
  if (isReturn) {
    docTitle = language === 'ar' ? 'BON DE RETOUR (AVOIR)' : 'BON DE RETOUR (AVOIR)';
  } else {
    docTitle = invoice.type === 'facture' 
      ? (language === 'ar' ? 'FACTURE DE VENTE' : 'FACTURE')
      : (language === 'ar' ? 'BON DE LIVRAISON' : 'BON DE LIVRAISON');
  }

  const numberLabel = language === 'ar' ? 'N°:' : 'N°:';
  const dateLabel = language === 'ar' ? 'Date:' : 'Date:';
  const clientLabel = language === 'ar' ? 'Client:' : 'Client:';
  const phoneLabel = language === 'ar' ? 'Tel:' : 'Tél :';
  const mfLabel = language === 'ar' ? 'MF:' : 'M.F :';
  const addressLabel = language === 'ar' ? 'Adresse:' : 'Adresse :';

  // -------------------------------------------------------------
  // TICKET CONFIGURATION (80mm width continuous height)
  // -------------------------------------------------------------
  if (format === 'ticket') {
    const itemsCount = invoice.items.length;
    const computedHeight = Math.max(160, 110 + itemsCount * 10);
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, computedHeight]
    });

    // Thermal Font Setup / Styling
    doc.setFont("helvetica", "normal");
    
    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(cleanPdfText(storeName), 40, 10, { align: 'center' });
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(cleanPdfText(storeAddress), 40, 14, { align: 'center' });
    doc.text(`${phoneLabel} ${cleanPdfText(storePhone)}`, 40, 18, { align: 'center' });
    if (matriculeFiscal) {
      doc.text(`${mfLabel} ${cleanPdfText(matriculeFiscal)}`, 40, 22, { align: 'center' });
    }

    doc.setDrawColor(200, 200, 200);
    doc.line(5, 25, 75, 25);

    // Document description
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(`${docTitle}`, 40, 30, { align: 'center' });
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`${numberLabel} ${invoice.number}`, 5, 35);
    doc.text(`${dateLabel} ${invoice.date.split('T')[0]}`, 5, 39);
    doc.text(`${clientLabel} ${cleanPdfText(invoice.partnerName)}`, 5, 43);

    doc.line(5, 46, 75, 46);

    // Table Header
    doc.setFont("helvetica", "bold");
    doc.text("Article", 5, 50);
    doc.text("Qté x P.U", 45, 50);
    doc.text("Total", 75, 50, { align: 'right' });
    doc.line(5, 52, 75, 52);

    // Items
    doc.setFont("helvetica", "normal");
    let currentY = 56;
    invoice.items.forEach((item) => {
      // If wrapping text is needed
      const nameText = cleanPdfText(item.productName);
      const truncatedName = nameText.length > 24 ? nameText.substring(0, 22) + ".." : nameText;
      
      doc.setFont("helvetica", "bold");
      doc.text(truncatedName, 5, currentY);
      
      doc.setFont("helvetica", "normal");
      doc.text(`${item.qty} x ${formatCurrency(item.sellingPrice)}`, 5, currentY + 3.5);
      
      const itemTotalFormatted = formatCurrency(item.total);
      doc.setFont("helvetica", "bold");
      doc.text(itemTotalFormatted, 75, currentY + 3.5, { align: 'right' });
      
      currentY += 8;
    });

    doc.line(5, currentY, 75, currentY);
    currentY += 4;

    // Summary calculation rows
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    
    // Sub-total
    doc.text("Sous-total :", 35, currentY);
    doc.text(formatCurrency(invoice.subTotal), 75, currentY, { align: 'right' });
    currentY += 4;

    // Remise
    if (invoice.discount > 0) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(200, 0, 0);
      doc.text("Remise :", 35, currentY);
      doc.text(`- ${formatCurrency(invoice.discount)}`, 75, currentY, { align: 'right' });
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
      currentY += 4;
    }

    // Tax Amount
    if (invoice.taxAmount > 0) {
      doc.text(`TVA (${invoice.taxRate}%) :`, 35, currentY);
      doc.text(formatCurrency(invoice.taxAmount), 75, currentY, { align: 'right' });
      currentY += 4;
    }

    // Grand TOTAL
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("NET A PAYER :", 35, currentY);
    doc.text(formatCurrency(invoice.total), 75, currentY, { align: 'right' });
    currentY += 5;

    // Payments
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Montant Versé :", 35, currentY);
    doc.text(formatCurrency(invoice.paidAmount), 75, currentY, { align: 'right' });
    currentY += 4;

    // Remaining debt Credit
    if (invoice.balance > 0) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(200, 0, 0);
      doc.text("Reste à CREDIT :", 35, currentY);
      doc.text(formatCurrency(invoice.balance), 75, currentY, { align: 'right' });
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
      currentY += 4;
    }

    // Outro thank you
    currentY += 4;
    doc.setFontSize(7.5);
    doc.text("Merci pour votre visite / شكرا لزيارتكم", 40, currentY, { align: 'center' });
    currentY += 4.5;
    doc.text("Logiciel Innova POS Pro v1.0.0", 40, currentY, { align: 'center' });

    // Trigger save download
    doc.save(`TICKET_${invoice.number}.pdf`);
    return;
  }

  // -------------------------------------------------------------
  // A4 PROFESSIONAL FORMAT
  // -------------------------------------------------------------
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Pages counter
  let currentPage = 1;

  // Header template function
  const drawPageHeader = (pageNumber: number) => {
    // Elegant left color banner accent based on document state
    if (isReturn) {
      doc.setFillColor(225, 29, 72); // rose-600 for returns
    } else if (invoice.type === 'facture') {
      doc.setFillColor(37, 99, 235); // blue-600 for invoices
    } else {
      doc.setFillColor(100, 116, 139); // slate-500 for delivery reports
    }
    doc.rect(0, 0, 8, 297, 'F');

    // Store header blocks
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text(cleanPdfText(storeName), 15, 18);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`Adresse : ${cleanPdfText(storeAddress)}`, 15, 23);
    doc.text(`Contact / Tél : ${cleanPdfText(storePhone)}`, 15, 27);
    if (matriculeFiscal) {
      doc.text(`Identifiant fiscal (M.F) : ${cleanPdfText(matriculeFiscal)}`, 15, 31);
    }

    // Document title header right
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    // align document header title on right side
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(`${docTitle}`, 195, 18, { align: 'right' });
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(37, 99, 235); // accent color blue
    doc.text(`N°: ${invoice.number}`, 195, 23, { align: 'right' });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Date : ${invoice.date.split('T')[0]}`, 195, 27, { align: 'right' });

    // Decorative slim horizontal separator rule
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.line(15, 34, 195, 34);
  };

  drawPageHeader(currentPage);

  // Partner/Client details Card box
  let currentY = 40;
  doc.setFillColor(248, 250, 252); // slate-50
  doc.roundedRect(15, currentY, 180, 22, 1, 1, 'F');
  doc.setDrawColor(241, 245, 249);
  doc.roundedRect(15, currentY, 180, 22, 1, 1, 'S');

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text("NOM OU RAISON SOCIALE DU CLIENT / ACQUÉREUR :", 18, currentY + 5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(cleanPdfText(invoice.partnerName), 18, currentY + 11);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Echéance : ${invoice.dueDate ? invoice.dueDate : "Paiement comptant à réception / Comptant"}`, 18, currentY + 17);

  // Right info card on client box
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Type de pièce: ${isReturn ? "AVOIR" : invoice.type.toUpperCase()}`, 115, currentY + 7);
  doc.text(`Statut de paiement: ${invoice.balance === 0 ? "Payé en totalité" : "Crédit en cours"}`, 115, currentY + 13);
  doc.text(`Points de fidélité: ${invoice.loyaltyPointsEarned ? `+${invoice.loyaltyPointsEarned} pts gagnés` : 'N/A'}`, 115, currentY + 19);

  currentY += 28;

  // Items table
  // Header row list
  doc.setFillColor(241, 245, 249); // slate-100
  doc.rect(15, currentY, 180, 7.5, 'F');
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);

  doc.text("Désignation de l'article / Produit", 17, currentY + 5);
  doc.text("Qté", 118, currentY + 5, { align: 'right' });
  doc.text("P.U (TTC)", 150, currentY + 5, { align: 'right' });
  doc.text("Total Net (TTC)", 193, currentY + 5, { align: 'right' });

  doc.setDrawColor(226, 232, 240);
  doc.line(15, currentY + 7.5, 195, currentY + 7.5);
  currentY += 7.5;

  // Item rows loop with automatic overflow page wrap
  const rowHeight = 7.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);

  invoice.items.forEach((item, idx) => {
    // Check page overflow boundaries
    if (currentY > 255) {
      // Draw footer page number
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`Page ${currentPage}`, 105, 287, { align: 'center' });

      doc.addPage();
      currentPage += 1;
      drawPageHeader(currentPage);
      currentY = 40;

      // Repeat table headers inside new page
      doc.setFillColor(241, 245, 249); // slate-100
      doc.rect(15, currentY, 180, 7.5, 'F');
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);

      doc.text("Désignation de l'article / Produit", 17, currentY + 5);
      doc.text("Qté", 118, currentY + 5, { align: 'right' });
      doc.text("P.U (TTC)", 150, currentY + 5, { align: 'right' });
      doc.text("Total Net (TTC)", 193, currentY + 5, { align: 'right' });

      doc.setDrawColor(226, 232, 240);
      doc.line(15, currentY + 7.5, 195, currentY + 7.5);
      currentY += 7.5;
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
    }

    // Set zebra colors alternating rows for contrast readability
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252); // slate-50
      doc.rect(15, currentY, 180, rowHeight, 'F');
    }

    // Wrap / Truncate excessively long product names to avoid overlapping column Qté
    const cleanName = cleanPdfText(item.productName);
    const truncatedName = cleanName.length > 52 ? cleanName.substring(0, 50) + "..." : cleanName;

    doc.text(truncatedName, 17, currentY + 5);
    doc.text(`${item.qty}`, 118, currentY + 5, { align: 'right' });
    doc.text(formatCurrency(item.sellingPrice), 150, currentY + 5, { align: 'right' });
    
    doc.setFont("helvetica", "bold");
    doc.text(formatCurrency(item.total), 193, currentY + 5, { align: 'right' });
    doc.setFont("helvetica", "normal");

    // Divider line
    doc.setDrawColor(241, 245, 249);
    doc.line(15, currentY + rowHeight, 195, currentY + rowHeight);
    
    currentY += rowHeight;
  });

  // Table grid closing line
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.line(15, currentY, 195, currentY);

  // Prevent overlap for calculations block at page end
  if (currentY > 215) {
    // Draw footer page number
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Page ${currentPage}`, 105, 287, { align: 'center' });

    doc.addPage();
    currentPage += 1;
    drawPageHeader(currentPage);
    currentY = 40;
  }

  currentY += 6;

  // Add notes block left if notes exist
  if (invoice.notes) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("REMARQUES ET NOTATIONS :", 15, currentY + 3);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    const wrappedNotes = doc.splitTextToSize(cleanPdfText(invoice.notes), 85);
    doc.text(wrappedNotes, 15, currentY + 8);
  }

  // Calculations block on bottom right
  const calcX = 115;
  const valX = 193;

  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  
  // Sous-total
  doc.setFont("helvetica", "normal");
  doc.text("Sous-total de la commande :", calcX, currentY + 3);
  doc.text(formatCurrency(invoice.subTotal), valX, currentY + 3, { align: 'right' });
  currentY += 5;

  // Remise
  if (invoice.discount > 0) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(220, 38, 38); // rose-600 warning
    doc.text("Remise commerciale globale (Rabais) :", calcX, currentY + 3);
    doc.text(`- ${formatCurrency(invoice.discount)}`, valX, currentY + 3, { align: 'right' });
    doc.setTextColor(71, 85, 105);
    doc.setFont("helvetica", "normal");
    currentY += 5;
  }

  // Tax
  if (invoice.taxAmount > 0) {
    doc.text(`Taxes fiscales de vente (TVA ${invoice.taxRate}%) :`, calcX, currentY + 3);
    doc.text(formatCurrency(invoice.taxAmount), valX, currentY + 3, { align: 'right' });
    currentY += 5;
  }

  doc.setDrawColor(226, 232, 240);
  doc.line(calcX, currentY + 2, 195, currentY + 2);
  currentY += 5;

  // Grand total net à payer
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text("NET GENERAL A PAYER (TTC) :", calcX, currentY + 3);
  
  // High contrast highlighted total
  doc.setTextColor(37, 99, 235); // Accent blue
  doc.text(formatCurrency(invoice.total), valX, currentY + 3, { align: 'right' });
  
  currentY += 6;

  // Versé and Reste à crédit
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.setFont("helvetica", "normal");
  doc.text("Montant déjà acquitté (Acompte) :", calcX, currentY + 3);
  doc.text(formatCurrency(invoice.paidAmount), valX, currentY + 3, { align: 'right' });
  currentY += 5;

  if (invoice.balance > 0) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(220, 38, 38); // Alert rose for unpaid debt
    doc.text("Renseigné à CREDIT (Solde débiteur) :", calcX, currentY + 3);
    doc.text(formatCurrency(invoice.balance), valX, currentY + 3, { align: 'right' });
    doc.setTextColor(71, 85, 105);
    doc.setFont("helvetica", "normal");
    currentY += 5;
  }

  // Corporate Footer and Signature spaces
  currentY = Math.max(currentY + 12, 245);
  
  doc.setDrawColor(203, 213, 225);
  doc.line(15, currentY, 195, currentY);
  currentY += 5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("SIGNATURES & CACHETS DE VALIDATION", 15, currentY + 2);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text("Signature Client (Bon pour accord) :", 15, currentY + 8);
  doc.text("Le Responsable Logistique / Caisse :", 125, currentY + 8);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("Document généré informatiquement par le système INNOVA POS PRO.", 15, currentY + 22);

  // Draw final page page number
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`Page ${currentPage}`, 105, 287, { align: 'center' });

  // Save/Download A4 PDF document
  doc.save(`${invoice.type.toUpperCase()}_${invoice.number}.pdf`);
}

export interface PurchaseOrderPDFOptions {
  products: Product[];
  partner?: Partner; // Selected supplier (optional)
  settings: DatabaseState['settings'];
  language: 'ar' | 'fr';
  formatCurrency?: (value: number) => string;
}

export function downloadPurchaseOrderPDF({
  products,
  partner,
  settings,
  language,
  formatCurrency
}: PurchaseOrderPDFOptions) {
  const storeName = settings?.storeName ?? "INNOVA POS PRO";
  const storePhone = settings?.storePhone ?? "+216 24260711";
  const storeAddress = settings?.storeAddress ?? "AVENU HABIB BORGIBA GHANNOUCHE GABES";
  const matriculeFiscal = settings?.matriculeFiscal ?? "1234567/A/M/000";

  const format = formatCurrency || ((v: number) => `${v.toLocaleString()} DT`);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  let currentPage = 1;

  const docTitle = language === 'ar' ? 'BON DE COMMANDE FOURNISSEUR' : 'BON DE COMMANDE FOURNISSEUR';
  const numberLabel = 'N°:';
  const dateLabel = 'Date:';
  const supplierLabel = language === 'ar' ? 'Fournisseur:' : 'Fournisseur:';
  const phoneLabel = 'Tél:';
  const mfLabel = 'M.F:';
  const addressLabel = 'Adresse:';

  const orderNumber = `BC-${new Date().getFullYear()}-${String(Math.floor(10000 + Math.random() * 90000))}`;
  const orderDate = new Date().toISOString().split('T')[0];

  const drawPageHeader = (pageNumber: number) => {
    // Left color banner accent: slate-700 / dark blue for supplier orders
    doc.setFillColor(30, 41, 59); // slate-800
    doc.rect(0, 0, 8, 297, 'F');

    // Store header blocks
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text(cleanPdfText(storeName), 15, 18);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Acheteur / Émetteur : ${cleanPdfText(storeName)}`, 15, 23);
    doc.text(`Adresse : ${cleanPdfText(storeAddress)}`, 15, 27);
    doc.text(`Contact / Tél : ${cleanPdfText(storePhone)}`, 15, 31);
    if (matriculeFiscal) {
      doc.text(`Identifiant fiscal (M.F) : ${cleanPdfText(matriculeFiscal)}`, 15, 35);
    }

    // Document title header right
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(`${docTitle}`, 195, 18, { align: 'right' });
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(37, 99, 235);
    doc.text(`${numberLabel} ${orderNumber}`, 195, 23, { align: 'right' });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`${dateLabel} ${orderDate}`, 195, 27, { align: 'right' });

    // Decorative slim horizontal separator rule
    doc.setDrawColor(226, 232, 240);
    doc.line(15, 38, 195, 38);
  };

  drawPageHeader(currentPage);

  // Supplier details card box
  let currentY = 44;
  doc.setFillColor(248, 250, 252); // slate-50
  doc.roundedRect(15, currentY, 180, 24, 1, 1, 'F');
  doc.setDrawColor(241, 245, 249);
  doc.roundedRect(15, currentY, 180, 24, 1, 1, 'S');

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text("DESTINATAIRE / FOURNISSEUR PARTENAIRE :", 18, currentY + 5);

  const supplierName = partner ? partner.name : (language === 'ar' ? 'مزود عام لتلبية الطلب' : 'Fournisseur Principal d\'Approvisionnement');
  const supplierPhone = partner ? partner.phone : 'N/A';
  const supplierAddress = partner ? partner.address : 'N/A';
  const paymentTerms = partner?.paymentTerms ? partner.paymentTerms : 'Comptant / Traite ou Facturation standard';

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(cleanPdfText(supplierName), 18, currentY + 11);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Tél : ${cleanPdfText(supplierPhone)} | Adresse : ${cleanPdfText(supplierAddress)}`, 18, currentY + 16);
  doc.text(`Conditions de paiement : ${cleanPdfText(paymentTerms)}`, 18, currentY + 21);

  // Right info card on supplier box
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Priorité: HAUTE (Alerte Stock)`, 120, currentY + 7);
  doc.text(`Statut: Brouillon de commande`, 120, currentY + 13);
  doc.text(`Usage: Réapprovisionnement`, 120, currentY + 19);

  currentY += 30;

  // Table header row
  doc.setFillColor(241, 245, 249); // slate-100
  doc.rect(15, currentY, 180, 7.5, 'F');
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);

  doc.text("Désignation de l'article / Référence", 17, currentY + 5);
  doc.text("Seuil", 95, currentY + 5, { align: 'right' });
  doc.text("Stock Actuel", 120, currentY + 5, { align: 'right' });
  doc.text("Qté Commandée", 150, currentY + 5, { align: 'right' });
  doc.text("P.U Achat Est.", 172, currentY + 5, { align: 'right' });
  doc.text("Total Estimé", 193, currentY + 5, { align: 'right' });

  doc.setDrawColor(226, 232, 240);
  doc.line(15, currentY + 7.5, 195, currentY + 7.5);
  currentY += 7.5;

  // Item rows
  const rowHeight = 7.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);

  let subTotal = 0;

  products.forEach((prod, idx) => {
    // Check page overflow
    if (currentY > 235) {
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`Page ${currentPage}`, 105, 287, { align: 'center' });
      
      doc.addPage();
      currentPage++;
      drawPageHeader(currentPage);
      currentY = 44;
    }

    // Row zebra background
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(15, currentY, 180, rowHeight, 'F');
    }

    // Calculate elegant order quantity to replenish stock:
    // We order at least enough to reach 2x minAlertQty, with a minimum of 10 or 50 pieces.
    const qtyOrdered = Math.max(10, (prod.minAlertQty * 2) - prod.stock);
    const itemTotal = qtyOrdered * prod.purchasePrice;
    subTotal += itemTotal;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    
    const maxLen = 35;
    const prodLabelName = prod.name.length > maxLen ? prod.name.substring(0, maxLen - 2) + ".." : prod.name;
    doc.text(cleanPdfText(prodLabelName), 17, currentY + 5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Réf : ${prod.code || 'N/A'} (Cat : ${cleanPdfText(prod.category)})`, 17, currentY + 8.2);

    doc.setTextColor(15, 23, 42);
    // Alignments
    doc.text(String(prod.minAlertQty), 95, currentY + 5, { align: 'right' });
    doc.text(`${prod.stock} ${cleanPdfText(prod.unit)}`, 120, currentY + 5, { align: 'right' });
    
    doc.setFont("helvetica", "bold");
    doc.setTextColor(37, 99, 235);
    doc.text(`${qtyOrdered} ${cleanPdfText(prod.unit)}`, 150, currentY + 5, { align: 'right' });

    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    doc.text(format(prod.purchasePrice), 172, currentY + 5, { align: 'right' });
    
    doc.setFont("helvetica", "bold");
    doc.text(format(itemTotal), 193, currentY + 5, { align: 'right' });

    doc.setDrawColor(241, 245, 249);
    doc.line(15, currentY + rowHeight + 1.5, 195, currentY + rowHeight + 1.5);
    
    currentY += rowHeight + 2;
  });

  // Notes block
  currentY += 4;
  if (currentY > 210) {
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Page ${currentPage}`, 105, 287, { align: 'center' });
    
    doc.addPage();
    currentPage++;
    drawPageHeader(currentPage);
    currentY = 44;
  }

  doc.setFillColor(254, 252, 232); // light yellow border
  doc.rect(15, currentY, 90, 20, 'F');
  doc.setDrawColor(254, 240, 138);
  doc.rect(15, currentY, 90, 20, 'S');

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(133, 77, 14); // warm dark yellow
  doc.text("NOTE D'AVERTISSEMENT STOCK :", 18, currentY + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(113, 63, 18);
  doc.text("Ce document d'approvisionnement a ete genere", 18, currentY + 10);
  doc.text("automatiquement suite au franchissement du seuil", 18, currentY + 13);
  doc.text("critique des stocks. Quantite recommandee.", 18, currentY + 16);

  // Calculations block on bottom right
  const calcX = 115;
  const valX = 193;

  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  
  doc.setFont("helvetica", "normal");
  doc.text("Sous-total Estimé (H.T) :", calcX, currentY + 4);
  doc.text(format(subTotal), valX, currentY + 4, { align: 'right' });
  currentY += 5;

  const estimatedTax = subTotal * 0.19; // assume standard 19% tax rate or 0% as fallback
  doc.text("TVA Estimée (19%) :", calcX, currentY + 4);
  doc.text(format(estimatedTax), valX, currentY + 4, { align: 'right' });
  currentY += 5;

  doc.setDrawColor(226, 232, 240);
  doc.line(calcX, currentY + 3, 195, currentY + 3);
  currentY += 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("TOTAL ESTIMÉ (TTC) :", calcX, currentY + 4);
  
  doc.setTextColor(37, 99, 235);
  doc.text(format(subTotal + estimatedTax), valX, currentY + 4, { align: 'right' });
  currentY += 12;

  // Signatures
  doc.setDrawColor(203, 213, 225);
  doc.line(15, currentY, 195, currentY);
  currentY += 5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("SIGNATURES & CACHET POUR COMMANDE", 15, currentY + 2);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text("Pour l'Acheteur (Innova POS Pro) :", 15, currentY + 8);
  doc.text("Pour le Fournisseur (Accuse de reception) :", 125, currentY + 8);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("Document de reapprovisionnement genere automatiquement par le systeme.", 15, currentY + 18);

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`Page ${currentPage}`, 105, 287, { align: 'center' });

  doc.save(`BON_DE_COMMANDE_${orderNumber}.pdf`);
}

interface ShiftReportPDFOptions {
  settings: DatabaseState['settings'];
  language: 'ar' | 'fr';
  cashierName: string;
  startTime: string;
  endTime: string;
  invoices: Invoice[];
  expenses: any[];
  formatCurrency: (value: number) => string;
}

export function downloadShiftReportPDF({
  settings,
  language,
  cashierName,
  startTime,
  endTime,
  invoices,
  expenses,
  formatCurrency
}: ShiftReportPDFOptions) {
  const storeName = settings?.storeName ?? "INNOVA POS PRO";
  const storePhone = settings?.storePhone ?? "+216 24 260 711";
  const storeAddress = settings?.storeAddress ?? "AVENU HABIB BOURGUIBA GHANNOUCHE GABES";

  // Filter non-return vs return invoices
  const salesCount = invoices.length;
  const revenueTotal = invoices.reduce((sum, inv) => sum + (inv.isReturn ? -inv.total : inv.total), 0);
  const paidTotal = invoices.reduce((sum, inv) => sum + (inv.isReturn ? -(inv.paidAmount || 0) : (inv.paidAmount || 0)), 0);
  const creditTotal = invoices.reduce((sum, inv) => sum + (inv.isReturn ? -(inv.balance || 0) : (inv.balance || 0)), 0);

  // Spendings/expenses
  const expensesTotal = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

  // COGS Calculation
  const cogsTotal = invoices.reduce((sum, inv) => {
    const invCogs = inv.items.reduce((itemSum, item) => itemSum + ((item.qty || 0) * (item.purchasePrice || 0)), 0);
    return sum + (inv.isReturn ? -invCogs : invCogs);
  }, 0);

  // Net Profit
  const netProfit = revenueTotal - cogsTotal - expensesTotal;

  // Compute layout dimensions: 80mm roll width. Dynamic height
  const baseHeight = 160 + (expenses.length * 8) + Math.min(20, invoices.length * 5);
  const computedHeight = Math.max(180, baseHeight);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, computedHeight]
  });

  // 1. Store Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(30, 41, 59);
  doc.text(cleanPdfText(storeName).toUpperCase(), 40, 10, { align: 'center' });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(cleanPdfText(storeAddress), 40, 14, { align: 'center' });
  doc.text(`Tél: ${cleanPdfText(storePhone)}`, 40, 18, { align: 'center' });

  // Divider
  doc.setDrawColor(186, 195, 208);
  doc.setLineWidth(0.2);
  doc.line(5, 22, 75, 22);

  // Report Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  const titleText = language === 'ar' ? 'رسمي: تقرير نهاية نوبة العمل' : 'RAPPORT EXECUTIF DE SHIFT';
  doc.text(titleText, 40, 28, { align: 'center' });
  
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`DATE EXPLOITATION: ${new Date().toLocaleDateString()}`, 40, 32, { align: 'center' });

  // Boxed shift metadata
  doc.setFillColor(248, 250, 252);
  doc.rect(8, 36, 64, 21, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(8, 36, 64, 21, 'S');

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`Caissier: ${cleanPdfText(cashierName)}`, 11, 41);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Début: ${new Date(startTime).toLocaleString()}`, 11, 46);
  doc.text(`Fin: ${new Date(endTime).toLocaleString()}`, 11, 51);

  // Receipts Table metrics info
  let currentY = 63;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(language === 'ar' ? 'ملخص العمليات والنقدية :' : 'RECAPITULATIF DES TRANSACTIONS', 8, currentY);
  currentY += 4;
  doc.line(8, currentY, 72, currentY);
  currentY += 4.5;

  // Single rows helper
  const drawRow = (label: string, value: string, isBold = false) => {
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(isBold ? 15 : 71, isBold ? 23 : 85, isBold ? 42 : 105);
    doc.text(label, 8, currentY);
    doc.text(value, 72, currentY, { align: 'right' });
    currentY += 4.5;
  };

  drawRow(language === 'ar' ? 'عدد التذاكر / المبيعات :' : 'Nombre de Ventes :', `${salesCount}`);
  drawRow(language === 'ar' ? 'إجمالي المبيعات (الخام) :' : 'Chiffre d\'Affaires (TTC) :', formatCurrency(revenueTotal));
  drawRow(language === 'ar' ? 'المبالغ المقبوضة (المدفوع) :' : 'Règlements Reçus (Payé) :', formatCurrency(paidTotal));
  drawRow(language === 'ar' ? 'الديون المسجلة (كريديت) :' : 'Ventes à Crédit (Restant) :', formatCurrency(creditTotal));

  // Divider
  doc.setDrawColor(241, 245, 249);
  doc.line(8, currentY, 72, currentY);
  currentY += 4.5;

  // Expenses Segment
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(language === 'ar' ? 'مصاريف وخصومات النوبة :' : 'CHARGES & DECAISSEMENTS', 8, currentY);
  currentY += 4;
  doc.line(8, currentY, 72, currentY);
  currentY += 4.5;

  drawRow(language === 'ar' ? 'إجمالي المصاريف المسجلة :' : 'Total des Dépenses :', formatCurrency(expensesTotal), expensesTotal > 0);

  // List expenses if they exist
  if (expenses.length > 0) {
    expenses.forEach((exp, idx) => {
      if (currentY + 6 > computedHeight - 15) return; // safety boundary
      doc.setFont("helvetica", "italic");
      doc.setFontSize(6.5);
      doc.setTextColor(115, 115, 115);
      const desc = exp.description ? cleanPdfText(exp.description) : `Charge #${idx + 1}`;
      const lineText = `${idx + 1}. ${desc.substring(0, 18)} :`;
      doc.text(lineText, 10, currentY);
      doc.text(formatCurrency(exp.amount), 72, currentY, { align: 'right' });
      currentY += 3.5;
    });
    currentY += 2;
  }

  // Divider
  doc.setDrawColor(241, 245, 249);
  doc.line(8, currentY, 72, currentY);
  currentY += 4.5;

  // Financial margins Segment
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(language === 'ar' ? 'النتائج والربحية المقدرة :' : 'PERFORMANCE FINANCIERE', 8, currentY);
  currentY += 4;
  doc.line(8, currentY, 72, currentY);
  currentY += 4.5;

  drawRow(language === 'ar' ? 'تكلفة السلع المباعة :' : 'Coût d\'Achat des ventes :', formatCurrency(cogsTotal));
  
  doc.setFillColor(240, 253, 244); // light green bg for profit highlight
  doc.rect(8, currentY - 3.5, 64, 7, 'F');
  drawRow(language === 'ar' ? 'صافي أرباح النوبة والربحية :' : 'Bénéfice Net Retenu (Marge) :', formatCurrency(netProfit), true);
  currentY += 2;

  // Divider
  doc.setDrawColor(186, 195, 208);
  doc.setLineWidth(0.2);
  doc.line(5, currentY, 75, currentY);
  currentY += 5;

  // Barcode
  let barX = 14;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  for (let i = 0; i < 26; i++) {
    const w = Math.random() > 0.4 ? 0.35 : 0.8;
    doc.setLineWidth(w);
    doc.line(barX, currentY, barX, currentY + 8);
    barX += w + (Math.random() > 0.5 ? 0.4 : 1.1);
  }
  currentY += 12;

  // Text code for barcode representation
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`SHIFT-REP-${Date.now().toString().slice(-6)}`, 40, currentY, { align: 'center' });
  currentY += 5;

  // Footer notes
  doc.setFont("helvetica", "italic");
  doc.setFontSize(6);
  doc.setTextColor(148, 163, 184);
  doc.text("Généré par Innova Caisse Inteligente", 40, currentY, { align: 'center' });
  doc.text("Document certifié conforme à la caisse physique", 40, currentY + 3, { align: 'center' });

  doc.save(`RAPPORT_SHIFT_${cleanPdfText(cashierName).replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
}
