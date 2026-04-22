import 'server-only';
import { SHELL_OPEN, SHELL_CLOSE, escape } from '../layout';

export interface ProofApprovedData {
  customerName: string;
  companyName: string;
  jobNo: number | string;
  itemDescription: string;
  staffJobUrl: string;
}

export function proofApproved(data: ProofApprovedData) {
  const { customerName, companyName, jobNo, itemDescription, staffJobUrl } = data;
  const who = customerName
    ? companyName
      ? `${customerName} (${companyName})`
      : customerName
    : companyName || 'A customer';

  return {
    subject: `Approved · Job #${jobNo}`,
    text: [
      `${who} approved the proof for Job #${jobNo}.`,
      '',
      `Item: ${itemDescription}`,
      '',
      `You're clear to print. Open the job: ${staffJobUrl}`,
      '',
      '— S Prints portal',
    ].join('\n'),
    html: `${SHELL_OPEN}
      <div style="font-size:11px; letter-spacing:2px; text-transform:uppercase; color:#888; margin-bottom:8px;">Proof · Approved</div>
      <h1 style="font-size:20px; margin:0 0 14px;">Job #${escape(String(jobNo))}</h1>
      <p style="line-height:1.6; margin:0 0 8px;">
        <strong>${escape(who)}</strong> approved the proof.
      </p>
      <table style="width:100%; border-collapse:collapse; margin:10px 0 18px; font-size:14px;">
        <tr>
          <td style="padding:6px 0; color:#666; width:90px;">Item</td>
          <td style="padding:6px 0;">${escape(itemDescription || '—')}</td>
        </tr>
      </table>
      <p style="line-height:1.6; margin:0 0 14px; color:#047857;">You're clear to print.</p>
      <p style="margin:22px 0;">
        <a href="${escape(staffJobUrl)}" style="display:inline-block; background:#111; color:#fff; padding:10px 18px; border-radius:10px; text-decoration:none; font-weight:600; font-size:14px;">
          Open job in staff app
        </a>
      </p>
${SHELL_CLOSE}`,
  };
}
