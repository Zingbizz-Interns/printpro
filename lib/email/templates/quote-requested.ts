import 'server-only';
import { SHELL_OPEN, SHELL_CLOSE, escape } from '../layout';

export interface QuoteRequestedData {
  customerName: string;
  companyName: string;
  jobNo: number | string;
  itemLines: string[];
  deliveryDate: string | null;
  notes: string;
  staffJobUrl: string;
}

export function quoteRequested(data: QuoteRequestedData) {
  const { customerName, companyName, jobNo, itemLines, deliveryDate, notes, staffJobUrl } = data;
  const who = customerName
    ? companyName
      ? `${customerName} (${companyName})`
      : customerName
    : companyName || 'A customer';

  return {
    subject: `Quote request · Job #${jobNo}`,
    text: [
      `${who} submitted a quote request.`,
      '',
      `Items:`,
      ...itemLines.map((l) => ` • ${l}`),
      '',
      deliveryDate ? `Target delivery: ${deliveryDate}` : '',
      notes ? `\nNotes:\n${notes}` : '',
      '',
      `Review and price it: ${staffJobUrl}`,
      '',
      '— S Prints portal',
    ]
      .filter(Boolean)
      .join('\n'),
    html: `${SHELL_OPEN}
      <div style="font-size:11px; letter-spacing:2px; text-transform:uppercase; color:#888; margin-bottom:8px;">New quote request</div>
      <h1 style="font-size:20px; margin:0 0 14px;">Job #${escape(String(jobNo))}</h1>
      <p style="line-height:1.6; margin:0 0 8px;">
        <strong>${escape(who)}</strong> submitted a quote request through the portal.
      </p>
      <div style="margin:14px 0;">
        <div style="font-size:11px; letter-spacing:1px; text-transform:uppercase; color:#888; margin-bottom:6px;">Items</div>
        <ul style="margin:0; padding-left:20px; font-size:14px; line-height:1.6;">
          ${itemLines.map((l) => `<li>${escape(l)}</li>`).join('')}
        </ul>
      </div>
      ${
        deliveryDate
          ? `<div style="font-size:14px; color:#555; margin:8px 0;">Target delivery: <strong>${escape(deliveryDate)}</strong></div>`
          : ''
      }
      ${
        notes
          ? `<div style="background:#f5f5f5; border-left:3px solid #111; padding:10px 14px; border-radius:6px; font-size:14px; line-height:1.6; white-space:pre-wrap; margin:12px 0;">${escape(notes)}</div>`
          : ''
      }
      <p style="margin:22px 0;">
        <a href="${escape(staffJobUrl)}" style="display:inline-block; background:#111; color:#fff; padding:10px 18px; border-radius:10px; text-decoration:none; font-weight:600; font-size:14px;">
          Review and price
        </a>
      </p>
${SHELL_CLOSE}`,
  };
}
