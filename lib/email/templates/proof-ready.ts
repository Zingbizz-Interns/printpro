import 'server-only';
import { SHELL_OPEN, SHELL_CLOSE, escape } from '../layout';

export interface ProofReadyData {
  customerName: string;
  jobNo: number | string;
  itemDescription: string;
  portalJobUrl: string;
}

export function proofReady(data: ProofReadyData) {
  const { customerName, jobNo, itemDescription, portalJobUrl } = data;
  const greeting = customerName ? `Hi ${customerName.split(' ')[0]},` : 'Hi,';

  return {
    subject: `Your proof is ready for review · Job #${jobNo}`,
    text: [
      greeting,
      '',
      `We've uploaded a design proof for Job #${jobNo} (${itemDescription}).`,
      '',
      `Please review and approve (or request changes) here:`,
      portalJobUrl,
      '',
      'Nothing prints until you approve.',
      '',
      '— S Prints',
    ].join('\n'),
    html: `${SHELL_OPEN}
      <div style="font-size:11px; letter-spacing:2px; text-transform:uppercase; color:#888; margin-bottom:8px;">Proof ready</div>
      <h1 style="font-size:20px; margin:0 0 14px;">Job #${escape(String(jobNo))}</h1>
      <p style="line-height:1.6; margin:0 0 8px;">${escape(greeting)}</p>
      <p style="line-height:1.6; margin:0 0 14px;">
        We've uploaded a design proof for <strong>${escape(itemDescription)}</strong>. Please review it — nothing goes to print until you approve.
      </p>
      <p style="margin:22px 0;">
        <a href="${escape(portalJobUrl)}" style="display:inline-block; background:#111; color:#fff; padding:10px 18px; border-radius:10px; text-decoration:none; font-weight:600; font-size:14px;">
          Review proof
        </a>
      </p>
${SHELL_CLOSE}`,
  };
}
