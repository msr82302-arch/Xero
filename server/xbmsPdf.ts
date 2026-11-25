import fs from 'fs';
import {createRequire} from 'module';
import path from 'path';
import type {CompanySettings, ReceiptRecord} from '../src/types/xbms.ts';

const require = createRequire(import.meta.url);
const PDFDocument = require('pdfkit') as new (opts?: Record<string, unknown>) => {
  pipe: (stream: NodeJS.WritableStream) => void;
  on: (event: string, cb: (...args: unknown[]) => void) => void;
  end: () => void;
  page: {width: number; height: number};
  rect: (x: number, y: number, w: number, h: number) => any;
  roundedRect: (x: number, y: number, w: number, h: number, r: number) => any;
  fill: (color?: string) => any;
  stroke: (color?: string) => any;
  fillAndStroke: (fillColor?: string, strokeColor?: string) => any;
  lineWidth: (w: number) => any;
  moveTo: (x: number, y: number) => any;
  lineTo: (x: number, y: number) => any;
  fillColor: (c: string) => any;
  strokeColor: (c: string) => any;
  font: (f: string) => any;
  fontSize: (s: number) => any;
  text: (t: string, x?: number, y?: number, opts?: Record<string, unknown>) => any;
  image: (src: string, x: number, y: number, opts?: Record<string, unknown>) => any;
  save: () => any;
  restore: () => any;
  translate: (x: number, y: number) => any;
  rotate: (angle: number, opts?: Record<string, unknown>) => any;
  opacity: (v: number) => any;
};

function fmtBHD(value: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
}

export async function generateReceiptPdfBuffer(
  receipt: ReceiptRecord,
  settings: CompanySettings,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: {top: 32, bottom: 32, left: 36, right: 36},
      info: {
        Title: `${receipt.receiptNo} - ${settings.companyName} Payment Receipt`,
        Author: `${settings.companyName} (CR ${settings.crNumber})`,
        Subject: `Official Payment Receipt ${receipt.receiptNo}`,
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk as Buffer));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (err) => reject(err));

    const pageW = doc.page.width;
    const pageH = doc.page.height;
    const margin = 36;
    const contentW = pageW - margin * 2;

    // 1. Deep Navy Executive Banner
    doc.rect(margin, 32, contentW, 84).fill('#0A192F');

    const logoPath = path.resolve(process.cwd(), 'public/assets/aistudio/logo_e1b61aee.png');
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, margin + 18, 46, {width: 44, height: 44});
    }

    doc
      .fillColor('#FFFFFF')
      .font('Helvetica-Bold')
      .fontSize(16)
      .text(settings.companyName.toUpperCase(), margin + 74, 46, {width: 240});
    doc
      .fillColor('#94A3B8')
      .font('Helvetica')
      .fontSize(8.5)
      .text(`CR NO: ${settings.crNumber} · ${settings.slogan}`, margin + 74, 67, {width: 250});

    doc
      .fillColor('#E2E8F0')
      .font('Helvetica')
      .fontSize(8.5)
      .text(settings.primaryEmail, pageW - margin - 200, 44, {width: 185, align: 'right'})
      .text(settings.primaryPhone, pageW - margin - 200, 58, {width: 185, align: 'right'})
      .text(settings.secondaryPhone, pageW - margin - 200, 71, {width: 185, align: 'right'})
      .text(settings.website, pageW - margin - 200, 84, {width: 185, align: 'right'});

    // 2. Title & Metadata Box
    doc
      .fillColor('#0A192F')
      .font('Helvetica-Bold')
      .fontSize(20)
      .text('Payment Receipt', margin, 134);
    doc
      .fillColor('#64748B')
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .text(settings.companyName.toUpperCase(), margin, 159);

    doc.roundedRect(pageW - margin - 210, 128, 210, 46, 6).fillAndStroke('#F8FAFC', '#CBD5E1');
    doc
      .fillColor('#64748B')
      .font('Helvetica')
      .fontSize(8.5)
      .text('Receipt No.:', pageW - margin - 198, 137)
      .text('Date:', pageW - margin - 198, 154);
    doc
      .fillColor('#0A192F')
      .font('Helvetica-Bold')
      .fontSize(9)
      .text(receipt.receiptNo, pageW - margin - 135, 137, {width: 125, align: 'right'})
      .font('Helvetica')
      .text(receipt.dateDisplay, pageW - margin - 135, 154, {width: 125, align: 'right'});

    // 3. Client & Project Details Panels
    const panelY = 192;
    const colW = (contentW - 14) / 2;

    doc.roundedRect(margin, panelY, colW, 24, 4).fill('#0066FF');
    doc
      .fillColor('#FFFFFF')
      .font('Helvetica-Bold')
      .fontSize(9.5)
      .text('Client Details', margin + 12, panelY + 7);
    doc.roundedRect(margin, panelY + 24, colW, 74, 4).stroke('#E2E8F0');
    doc
      .fillColor('#475569')
      .font('Helvetica')
      .fontSize(8.5)
      .text('Client Name:', margin + 12, panelY + 34)
      .text('Contact No.:', margin + 12, panelY + 52)
      .text('Email:', margin + 12, panelY + 70);
    doc
      .fillColor('#0A192F')
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .text(receipt.clientName, margin + 74, panelY + 34, {width: colW - 84})
      .font('Helvetica')
      .text(receipt.clientPhone || 'N/A', margin + 74, panelY + 52, {width: colW - 84})
      .text(receipt.clientEmail || 'N/A', margin + 74, panelY + 70, {width: colW - 84});

    const rightX = margin + colW + 14;
    doc.roundedRect(rightX, panelY, colW, 24, 4).fill('#0A192F');
    doc
      .fillColor('#FFFFFF')
      .font('Helvetica-Bold')
      .fontSize(9.5)
      .text('Project & Payment Details', rightX + 12, panelY + 7);
    doc.roundedRect(rightX, panelY + 24, colW, 74, 4).stroke('#E2E8F0');
    doc
      .fillColor('#475569')
      .font('Helvetica')
      .fontSize(8.5)
      .text('Service:', rightX + 12, panelY + 34)
      .text('Channel:', rightX + 12, panelY + 52)
      .text('Terms:', rightX + 12, panelY + 70);
    doc
      .fillColor('#0A192F')
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .text(receipt.serviceName, rightX + 68, panelY + 34, {width: colW - 78})
      .font('Helvetica')
      .text(receipt.paymentMethod, rightX + 68, panelY + 52, {width: colW - 78})
      .text(receipt.paymentTerms, rightX + 68, panelY + 70, {width: colW - 78});

    // 4. Itemized Financial Table
    const tableY = 308;
    doc.roundedRect(margin, tableY, contentW, 24, 4).fill('#0A192F');
    doc
      .fillColor('#FFFFFF')
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .text('#', margin + 12, tableY + 8)
      .text('Description', margin + 38, tableY + 8)
      .text('Qty', margin + 320, tableY + 8, {width: 40, align: 'center'})
      .text('Unit Price (BHD)', margin + 365, tableY + 8, {width: 75, align: 'right'})
      .text('Amount (BHD)', margin + 445, tableY + 8, {width: 70, align: 'right'});

    const pdfRows =
      receipt.items && receipt.items.length > 0
        ? receipt.items.slice(0, 6)
        : [
            {
              id: 'single',
              description: `${receipt.serviceName} — ${receipt.projectTitle}`,
              qty: 1,
              unitPriceBHD: receipt.totalBHD,
              amountBHD: receipt.totalBHD,
            },
          ];

    const rowHeight = Math.max(22, Math.floor(64 / pdfRows.length));
    const tableBodyH = Math.max(56, pdfRows.length * rowHeight);
    doc.rect(margin, tableY + 24, contentW, tableBodyH).stroke('#E2E8F0');

    pdfRows.forEach((row, idx) => {
      const rowTop = tableY + 24 + idx * rowHeight;
      if (idx > 0) {
        doc
          .moveTo(margin, rowTop)
          .lineTo(margin + contentW, rowTop)
          .stroke('#F1F5F9');
      }
      doc
        .fillColor('#0A192F')
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .text(String(idx + 1), margin + 12, rowTop + 7)
        .font('Helvetica')
        .fontSize(8.5)
        .text(row.description, margin + 38, rowTop + 7, {width: 274})
        .text(String(row.qty), margin + 320, rowTop + 7, {width: 40, align: 'center'})
        .text(fmtBHD(row.unitPriceBHD), margin + 365, rowTop + 7, {width: 75, align: 'right'})
        .font('Helvetica-Bold')
        .text(fmtBHD(row.amountBHD), margin + 445, rowTop + 7, {width: 70, align: 'right'});
    });

    // 5. Financial Breakdown Summary Cards
    const sumY = 404;
    doc.roundedRect(margin, sumY, colW, 64, 6).fillAndStroke('#EFF6FF', '#BFDBFE');
    doc
      .fillColor('#0066FF')
      .font('Helvetica-Bold')
      .fontSize(9)
      .text('Total Project Cost', margin + 16, sumY + 14);
    doc
      .fillColor('#0A192F')
      .font('Helvetica-Bold')
      .fontSize(17)
      .text(`${fmtBHD(receipt.totalBHD)} BHD`, margin + 16, sumY + 32);

    doc.roundedRect(rightX, sumY, colW, 28, 5).fillAndStroke('#ECFDF5', '#A7F3D0');
    doc
      .fillColor('#065F46')
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .text('Advance / Received', rightX + 12, sumY + 9)
      .text(`${fmtBHD(receipt.paidBHD)} BHD`, rightX + 12, sumY + 9, {
        width: colW - 24,
        align: 'right',
      });

    doc.roundedRect(rightX, sumY + 35, colW, 29, 5).fill('#0A192F');
    doc
      .fillColor('#FFFFFF')
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .text('Remaining Amount (Balance)', rightX + 12, sumY + 45)
      .text(`${fmtBHD(receipt.balanceBHD)} BHD`, rightX + 12, sumY + 45, {
        width: colW - 24,
        align: 'right',
      });

    // Status Banner Row
    const statusY = 482;
    const statusLabel =
      receipt.status === 'PAID'
        ? 'Paid in Full'
        : receipt.status === 'PARTIAL'
          ? 'Partially Paid'
          : receipt.status === 'CANCELLED'
            ? 'VOID / CANCELLED'
            : 'Unpaid / Payment Due';
    const statusColor =
      receipt.status === 'PAID'
        ? '#16A34A'
        : receipt.status === 'PARTIAL'
          ? '#D97706'
          : '#DC2626';

    doc.roundedRect(margin, statusY, contentW, 34, 6).fillAndStroke('#F8FAFC', '#E2E8F0');
    doc
      .fillColor('#64748B')
      .font('Helvetica')
      .fontSize(8.5)
      .text(`Payment Date: ${receipt.dateDisplay}`, margin + 14, statusY + 12);
    doc
      .fillColor(statusColor)
      .font('Helvetica-Bold')
      .fontSize(10.5)
      .text(`Status: ${statusLabel}`, margin + 14, statusY + 11, {
        width: contentW - 28,
        align: 'right',
      });

    // 6. Terms & Conditions + Official Stamp
    const termsY = 532;
    doc.roundedRect(margin, termsY, contentW, 145, 6).stroke('#E2E8F0');
    doc.roundedRect(margin, termsY, 155, 22, 4).fill('#0066FF');
    doc
      .fillColor('#FFFFFF')
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .text('Terms & Conditions', margin + 12, termsY + 7);

    const termLines = settings.defaultTerms
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 6);
    let lineY = termsY + 32;
    termLines.forEach((line, idx) => {
      doc
        .fillColor('#475569')
        .font('Helvetica')
        .fontSize(7.8)
        .text(`${idx + 1}. ${line}`, margin + 14, lineY, {width: contentW - 140});
      lineY += 15;
    });

    if (settings.renderOfficialStamp) {
      const stampPath = path.resolve(process.cwd(), 'public/assets/aistudio/STAMP_d1ea7849.png');
      if (fs.existsSync(stampPath)) {
        doc.image(stampPath, pageW - margin - 108, termsY + 36, {width: 88, height: 88});
      }
    }

    if (settings.renderAuthorizedSignature) {
      doc
        .fillColor('#0A192F')
        .font('Helvetica-Bold')
        .fontSize(8)
        .text(settings.signatoryTitle, margin + 14, termsY + 124);
    }

    // 7. Void Audit Stamp & Watermark if CANCELLED
    if (receipt.status === 'CANCELLED') {
      doc.save();
      doc.opacity(0.16);
      doc.translate(pageW / 2, pageH / 2);
      doc.rotate(-34);
      doc
        .fillColor('#DC2626')
        .font('Helvetica-Bold')
        .fontSize(68)
        .text('CANCELLED', -220, -35, {width: 440, align: 'center'});
      doc.restore();
      doc.opacity(1);

      doc.roundedRect(margin, 690, contentW, 56, 6).fillAndStroke('#FEF2F2', '#FCA5A5');
      doc
        .fillColor('#B91C1C')
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .text(
          `VOIDED RECEIPT · Cancelled by ${receipt.cancelledBy || 'Administrator'} at ${receipt.cancelledAt || 'N/A'}`,
          margin + 12,
          700,
        )
        .font('Helvetica')
        .fontSize(8)
        .text(`Reason: ${receipt.cancellationReason || 'Administrative voiding'}`, margin + 12, 716, {
          width: contentW - 24,
        });
    }

    // 8. Footer
    doc
      .fillColor('#64748B')
      .font('Helvetica')
      .fontSize(7.5)
      .text(
        `${settings.address}  |  ${settings.website}  |  CR ${settings.crNumber}`,
        margin,
        pageH - 46,
        {width: contentW, align: 'center', lineBreak: false},
      );

    doc.end();
  });
}
