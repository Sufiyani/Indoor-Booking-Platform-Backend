import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

export interface BookingPdfData {
  bookingCode: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  courtName: string;
  sport: string;
  courtType?: string;
  dateStr: string;
  timeSlotStr: string;
  durationMinutes: number;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  venueName: string;
  venueAddress: string;
  venuePhone: string;
  venueEmail: string;
  cancellationAllowedUntilStr: string;
  lookupUrl?: string;
  frontendUrl?: string;
}

export class PdfService {
  async generateBookingPdf(data: BookingPdfData): Promise<Buffer> {
    // QR points to localhost:3000 manage-booking page for local/dev use
    const frontendBase = data.frontendUrl || process.env.FRONTEND_URL || 'http://localhost:3000';
    const qrPayload = data.lookupUrl ||
      `${frontendBase}/manage-booking?code=${data.bookingCode}&phone=${encodeURIComponent(data.customerPhone)}`;

    const qrBuffer = await QRCode.toBuffer(qrPayload, {
      width: 160,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' },
    });

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 0, info: {
        Title: `IndoorArena Booking Pass - ${data.bookingCode}`,
        Author: data.venueName,
        Subject: `Booking Confirmation for ${data.customerName}`,
      }});

      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const W = doc.page.width;   // 595.28
      const H = doc.page.height;  // 841.89
      const M = 44;               // margin
      const CW = W - M * 2;       // content width

      // ─────────────────────────────────────────
      // 1. HEADER — dark banner
      // ─────────────────────────────────────────
      doc.rect(0, 0, W, 115).fill('#090d16');
      // Emerald top accent line
      doc.rect(0, 0, W, 6).fill('#10b981');

      // Brand name
      doc.fillColor('#ffffff').fontSize(24).font('Helvetica-Bold')
        .text('INDOOR ARENA', M, 28, { characterSpacing: 2, lineBreak: false });

      // Subtitle
      doc.fillColor('#10b981').fontSize(9).font('Helvetica')
        .text('PREMIUM SPORTS COMPLEX  |  KARACHI', M, 58, { lineBreak: false });

      // Right side labels
      doc.fillColor('#94a3b8').fontSize(8).font('Helvetica')
        .text('BOOKING CONFIRMATION PASS', M, 30, { align: 'right', width: CW, lineBreak: false });

      doc.fillColor('#ffffff').fontSize(11).font('Helvetica-Bold')
        .text('PAY CASH ON ARRIVAL', M, 46, { align: 'right', width: CW, lineBreak: false });

      doc.fillColor('#6ee7b7').fontSize(8).font('Helvetica')
        .text(`Ref: ${data.bookingCode}`, M, 63, { align: 'right', width: CW, lineBreak: false });

      // ─────────────────────────────────────────
      // 2. BOOKING CODE TICKET STRIP
      // ─────────────────────────────────────────
      const tickY = 130;
      const tickH = 100;

      doc.roundedRect(M, tickY, CW, tickH, 10)
        .fillAndStroke('#f1f5f9', '#cbd5e1');

      // Left: code block
      doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold')
        .text('BOOKING REFERENCE', M + 20, tickY + 16, { characterSpacing: 1, lineBreak: false });

      doc.fillColor('#0f172a').fontSize(30).font('Helvetica-Bold')
        .text(data.bookingCode, M + 20, tickY + 30, { characterSpacing: 3, lineBreak: false });

      // Status badge
      doc.roundedRect(M + 20, tickY + 68, 110, 18, 4).fill('#dcfce7');
      doc.fillColor('#15803d').fontSize(9).font('Helvetica-Bold')
        .text('STATUS: CONFIRMED', M + 22, tickY + 71, { lineBreak: false });

      // Right: QR code
      const qrSize = 78;
      const qrX = M + CW - qrSize - 18;
      const qrY = tickY + (tickH - qrSize) / 2;
      doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });

      doc.fillColor('#94a3b8').fontSize(7).font('Helvetica')
        .text('Scan to verify booking', qrX - 5, tickY + tickH - 14,
          { width: qrSize + 10, align: 'center', lineBreak: false });

      // ─────────────────────────────────────────
      // 3. RESERVATION DETAILS SECTION
      // ─────────────────────────────────────────
      const detY = tickY + tickH + 22;

      // Section header
      doc.rect(M, detY, CW, 22).fill('#f8fafc');
      doc.rect(M, detY, 4, 22).fill('#10b981');
      doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold')
        .text('RESERVATION DETAILS', M + 14, detY + 6, { lineBreak: false });

      // Helper to draw a two-col label+value row
      const drawRow = (label1: string, val1: string, label2: string, val2: string, y: number) => {
        const col2 = M + CW / 2 + 8;
        doc.fillColor('#64748b').fontSize(8).font('Helvetica')
          .text(label1, M, y, { lineBreak: false });
        doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold')
          .text(val1, M, y + 12, { width: CW / 2 - 16, lineBreak: false });

        if (label2 && val2) {
          doc.fillColor('#64748b').fontSize(8).font('Helvetica')
            .text(label2, col2, y, { lineBreak: false });
          doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold')
            .text(val2, col2, y + 12, { width: CW / 2 - 8, lineBreak: false });
        }
        // row divider
        doc.moveTo(M, y + 28).lineTo(M + CW, y + 28)
          .strokeColor('#f1f5f9').lineWidth(0.5).stroke();
      };

      let ry = detY + 32;
      const rs = 36; // row spacing

      drawRow('Court / Facility', `${data.courtName}`, 'Court Type', data.courtType || 'Indoor Turf', ry);
      ry += rs;
      drawRow('Sport Category', data.sport, 'Duration', `${data.durationMinutes} minutes`, ry);
      ry += rs;
      drawRow('Match Date', data.dateStr, 'Time Slot (PKT)', data.timeSlotStr, ry);
      ry += rs;
      drawRow('Customer Name', data.customerName, 'Contact Phone', data.customerPhone, ry);
      ry += rs;
      if (data.customerEmail) {
        drawRow('Email Address', data.customerEmail, '', '', ry);
        ry += rs;
      }

      // ─────────────────────────────────────────
      // 4. PAYMENT BOX
      // ─────────────────────────────────────────
      const payY = ry + 8;
      const payH = 68;

      doc.roundedRect(M, payY, CW, payH, 8).fillAndStroke('#ecfdf5', '#6ee7b7');

      doc.fillColor('#065f46').fontSize(9).font('Helvetica-Bold')
        .text('TOTAL AMOUNT DUE — CASH ON ARRIVAL', M + 18, payY + 12, { lineBreak: false });

      doc.fillColor('#047857').fontSize(26).font('Helvetica-Bold')
        .text(`Rs. ${Number(data.totalAmount).toLocaleString('en-PK')}`, M + 18, payY + 26, { lineBreak: false });

      doc.fillColor('#065f46').fontSize(8).font('Helvetica')
        .text('Pay at reception desk before entering the court. No advance card required.',
          M + 18, payY + 54, { lineBreak: false });

      // ─────────────────────────────────────────
      // 5. CANCELLATION & POLICY
      // ─────────────────────────────────────────
      const polY = payY + payH + 20;

      doc.rect(M, polY, CW, 22).fill('#fff7ed');
      doc.rect(M, polY, 4, 22).fill('#f97316');
      doc.fillColor('#7c2d12').fontSize(11).font('Helvetica-Bold')
        .text('IMPORTANT GUIDELINES', M + 14, polY + 6, { lineBreak: false });

      const rules = [
        `Arrive 10-15 minutes early and pay in cash at the reception desk.`,
        `Cancellation allowed until: ${data.cancellationAllowedUntilStr}. Go to Manage Booking to cancel.`,
        `Wear non-marking or turf shoes only. Studded cleats are not permitted.`,
        `3 unexcused no-shows will auto-block this phone number from future bookings.`,
      ];

      let gy = polY + 30;
      rules.forEach((rule, i) => {
        doc.fillColor('#0f172a').fontSize(8).font('Helvetica-Bold')
          .text(`${i + 1}.`, M, gy, { lineBreak: false });
        doc.fillColor('#334155').fontSize(8).font('Helvetica')
          .text(rule, M + 16, gy, { width: CW - 16, lineBreak: false });
        gy += 16;
      });

      // ─────────────────────────────────────────
      // 6. FOOTER
      // ─────────────────────────────────────────
      const footY = H - 65;
      doc.rect(0, footY, W, 65).fill('#f8fafc');
      doc.moveTo(0, footY).lineTo(W, footY).strokeColor('#e2e8f0').lineWidth(1).stroke();

      // Venue branding left
      doc.fillColor('#10b981').fontSize(13).font('Helvetica-Bold')
        .text('INDOOR', M, footY + 12, { lineBreak: false, continued: true })
        .fillColor('#0f172a')
        .text('ARENA', { lineBreak: false });

      doc.fillColor('#475569').fontSize(8).font('Helvetica')
        .text(data.venueAddress, M, footY + 30, { lineBreak: false });

      // Contact right
      doc.fillColor('#475569').fontSize(8).font('Helvetica')
        .text(`Tel: ${data.venuePhone}`, M, footY + 12,
          { align: 'right', width: CW, lineBreak: false });
      doc.fillColor('#475569').fontSize(8).font('Helvetica')
        .text(data.venueEmail, M, footY + 24,
          { align: 'right', width: CW, lineBreak: false });

      doc.fillColor('#94a3b8').fontSize(7).font('Helvetica')
        .text('This pass is valid only for the date and time stated above. Keep this document handy at the venue.',
          M, footY + 46, { width: CW, align: 'center', lineBreak: false });

      doc.end();
    });
  }
}

export const pdfService = new PdfService();
