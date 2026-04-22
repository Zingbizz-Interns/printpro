import 'server-only';
import { emailFrom, emailReplyTo, transport } from './transport';
import { welcome, type WelcomeData } from './templates/welcome';
import {
  proofChangesRequested,
  type ProofChangesRequestedData,
} from './templates/proof-changes-requested';
import { proofReady, type ProofReadyData } from './templates/proof-ready';
import { proofApproved, type ProofApprovedData } from './templates/proof-approved';
import { readyForPickup, type ReadyForPickupData } from './templates/ready-for-pickup';
import { quoteRequested, type QuoteRequestedData } from './templates/quote-requested';
import { feedbackRequest, type FeedbackRequestData } from './templates/feedback-request';

/**
 * Template registry. Add new templates here — the map is the single
 * source of truth for what `sendEmail` accepts.
 *
 * Each template exports a `render(data)` returning `{ subject, html,
 * text }`. The `data` param is typed per-template for compile-time
 * safety.
 */
export interface TemplateMap {
  welcome: WelcomeData;
  'proof-changes-requested': ProofChangesRequestedData;
  'proof-ready': ProofReadyData;
  'proof-approved': ProofApprovedData;
  'ready-for-pickup': ReadyForPickupData;
  'quote-requested': QuoteRequestedData;
  'feedback-request': FeedbackRequestData;
}

const renderers: {
  [K in keyof TemplateMap]: (data: TemplateMap[K]) => {
    subject: string;
    html: string;
    text: string;
  };
} = {
  welcome,
  'proof-changes-requested': proofChangesRequested,
  'proof-ready': proofReady,
  'proof-approved': proofApproved,
  'ready-for-pickup': readyForPickup,
  'quote-requested': quoteRequested,
  'feedback-request': feedbackRequest,
};

export interface SendEmailArgs<K extends keyof TemplateMap> {
  to: string | string[];
  template: K;
  data: TemplateMap[K];
}

export async function sendEmail<K extends keyof TemplateMap>(
  args: SendEmailArgs<K>,
): Promise<void> {
  const { to, template, data } = args;
  const { subject, html, text } = renderers[template](data);
  await transport().sendMail({
    from: emailFrom(),
    to: Array.isArray(to) ? to.join(', ') : to,
    replyTo: emailReplyTo(),
    subject,
    html,
    text,
  });
}
