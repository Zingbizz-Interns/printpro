import 'server-only';

export interface ProofChangesRequestedData {
  customerName: string;
  companyName: string;
  jobNo: number | string;
  itemDescription: string;
  comment: string;
  staffJobUrl: string;
}

export function proofChangesRequested(data: ProofChangesRequestedData) {
  const { customerName, companyName, jobNo, itemDescription, comment, staffJobUrl } = data;
  const who = customerName
    ? companyName
      ? `${customerName} (${companyName})`
      : customerName
    : companyName || 'A customer';

  return {
    subject: `Changes requested · Job #${jobNo}`,
    text: [
      `${who} reviewed a proof on Job #${jobNo} and requested changes.`,
      '',
      `Item: ${itemDescription}`,
      '',
      'Their comment:',
      comment || '(no comment provided)',
      '',
      `Open the job in the staff app: ${staffJobUrl}`,
      '',
      '— S Prints portal',
    ].join('\n'),
    html: `<!doctype html>
<html>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color:#111; max-width:560px; margin:0 auto; padding:24px; background:#fafafa;">
    <div style="background:#fff; border-radius:16px; padding:28px; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
      <div style="font-size:11px; letter-spacing:2px; text-transform:uppercase; color:#888; margin-bottom:8px;">
        Proof · Changes Requested
      </div>
      <h1 style="font-size:20px; margin:0 0 16px;">Job #${escape(String(jobNo))}</h1>
      <p style="line-height:1.6; margin:0 0 14px;">
        <strong>${escape(who)}</strong> reviewed a proof and requested changes.
      </p>
      <table style="width:100%; border-collapse:collapse; margin:12px 0 18px; font-size:14px;">
        <tr>
          <td style="padding:6px 0; color:#666; width:90px;">Item</td>
          <td style="padding:6px 0;">${escape(itemDescription || '—')}</td>
        </tr>
      </table>
      <div style="background:#f5f5f5; border-left:3px solid #111; padding:12px 14px; border-radius:6px; font-size:14px; line-height:1.6; white-space:pre-wrap;">
${escape(comment || '(no comment provided)')}
      </div>
      <p style="margin:22px 0;">
        <a href="${escape(staffJobUrl)}" style="display:inline-block; background:#111; color:#fff; padding:10px 18px; border-radius:10px; text-decoration:none; font-weight:600; font-size:14px;">
          Open job in staff app
        </a>
      </p>
      <p style="color:#888; font-size:12px; margin:0;">— S Prints portal</p>
    </div>
  </body>
</html>`,
  };
}

function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
