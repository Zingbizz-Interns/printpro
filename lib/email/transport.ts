import 'server-only';
import nodemailer, { type Transporter } from 'nodemailer';

/**
 * Gmail SMTP transport.
 *
 * Must run on the Node.js runtime — nodemailer is not edge-safe. Any
 * Server Action or Route Handler that imports `lib/email/*` inherits
 * that constraint; do NOT add `export const runtime = 'edge'` anywhere
 * in the import chain.
 *
 * Account requirements:
 *   - 2FA enabled on the sending Google account
 *   - `SMTP_PASS` is a 16-char App Password, NOT the account password
 *     (create one at https://myaccount.google.com/apppasswords)
 */

const host = process.env.SMTP_HOST;
const port = process.env.SMTP_PORT;
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;

let _tx: Transporter | null = null;

export function transport(): Transporter {
  if (_tx) return _tx;
  if (!host || !port || !user || !pass) {
    throw new Error(
      'Missing SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS — ' +
        'set them in .env.local. See phase-0-foundations.md.',
    );
  }
  _tx = nodemailer.createTransport({
    host,
    port: Number(port),
    secure: Number(port) === 465, // STARTTLS for 587, TLS for 465
    auth: { user, pass },
  });
  return _tx;
}

export function emailFrom(): string {
  return process.env.SMTP_FROM || process.env.SMTP_USER || '';
}

export function emailReplyTo(): string | undefined {
  return process.env.EMAIL_REPLY_TO || undefined;
}
