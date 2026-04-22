import 'server-only';

export interface WelcomeData {
  name: string;
  portalUrl: string;
}

export function welcome(data: WelcomeData) {
  const { name, portalUrl } = data;
  const greeting = name ? `Hi ${name.split(' ')[0]},` : 'Hi,';

  return {
    subject: 'Welcome to S Prints',
    text: [
      greeting,
      '',
      'Your S Prints customer account is ready.',
      '',
      `Track your print jobs, approve proofs, and see balances here: ${portalUrl}`,
      '',
      'Any questions — just reply to this email.',
      '',
      '— S Prints',
    ].join('\n'),
    html: `<!doctype html>
<html>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color:#111; max-width:560px; margin:0 auto; padding:24px; background:#fafafa;">
    <div style="background:#fff; border-radius:16px; padding:32px; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
      <h1 style="font-size:22px; margin:0 0 16px;">Welcome to S Prints</h1>
      <p style="line-height:1.6;">${escape(greeting)}</p>
      <p style="line-height:1.6;">Your customer account is ready. You can now track your print jobs, approve design proofs, and see balances — all in one place.</p>
      <p style="margin:28px 0;">
        <a href="${escape(portalUrl)}" style="display:inline-block; background:#111; color:#fff; padding:12px 20px; border-radius:10px; text-decoration:none; font-weight:600;">Open your portal</a>
      </p>
      <p style="line-height:1.6; color:#666; font-size:14px;">Any questions — just reply to this email.</p>
      <p style="line-height:1.6; color:#666; font-size:14px;">— S Prints</p>
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
