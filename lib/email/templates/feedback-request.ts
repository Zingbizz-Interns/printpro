import 'server-only';
import { SHELL_OPEN, SHELL_CLOSE, escape } from '../layout';

export interface FeedbackRequestData {
  customerName: string;
  jobNo: number | string;
  feedbackUrl: string;
}

export function feedbackRequest(data: FeedbackRequestData) {
  const { customerName, jobNo, feedbackUrl } = data;
  const greeting = customerName ? `Hi ${customerName.split(' ')[0]},` : 'Hi,';

  return {
    subject: `How did we do with job #${jobNo}?`,
    text: [
      greeting,
      '',
      `Job #${jobNo} is delivered. If you have 30 seconds, we'd love a rating so we know how we did.`,
      '',
      `Rate this job: ${feedbackUrl}`,
      '',
      'If anything was off, reply to this email and we will make it right.',
      '',
      '— S Prints',
    ].join('\n'),
    html: `${SHELL_OPEN}
      <div style="font-size:11px; letter-spacing:2px; text-transform:uppercase; color:#888; margin-bottom:8px;">Quick check-in</div>
      <h1 style="font-size:20px; margin:0 0 14px;">How did we do with job #${escape(String(jobNo))}?</h1>
      <p style="line-height:1.6; margin:0 0 8px;">${escape(greeting)}</p>
      <p style="line-height:1.6; margin:0 0 14px;">
        Job #${escape(String(jobNo))} is delivered. If you have 30 seconds,
        tell us how we did &mdash; it helps us do better next time.
      </p>
      <p style="margin:22px 0;">
        <a href="${escape(feedbackUrl)}" style="display:inline-block; background:#111; color:#fff; padding:10px 18px; border-radius:10px; text-decoration:none; font-weight:600; font-size:14px;">
          Rate this job
        </a>
      </p>
      <p style="line-height:1.6; color:#666; font-size:13px; margin:18px 0 0;">
        If anything was off, just reply to this email and we&rsquo;ll make it right.
      </p>
${SHELL_CLOSE}`,
  };
}
