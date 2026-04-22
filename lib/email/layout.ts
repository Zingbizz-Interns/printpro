import 'server-only';

/**
 * Shared header + footer snippets for portal emails. Keep this as a
 * 10-line helper, not a JSX component — templates stay as HTML-string
 * functions so `send.ts` can treat them uniformly.
 */
export const SHOP_NAME = 'S Prints';
export const SHOP_ADDRESS = process.env.SHOP_ADDRESS || '';

export const SHELL_OPEN = `<!doctype html>
<html>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color:#111; max-width:560px; margin:0 auto; padding:24px; background:#fafafa;">
    <div style="background:#fff; border-radius:16px; padding:28px; box-shadow:0 1px 3px rgba(0,0,0,0.05);">`;

export const SHELL_CLOSE = `      <p style="color:#888; font-size:12px; margin:24px 0 0;">— ${escape(SHOP_NAME)}${SHOP_ADDRESS ? ` · ${escape(SHOP_ADDRESS)}` : ''}</p>
    </div>
  </body>
</html>`;

export function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
