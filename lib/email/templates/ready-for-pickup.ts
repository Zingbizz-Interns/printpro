import 'server-only';
import { SHELL_OPEN, SHELL_CLOSE, SHOP_ADDRESS, escape } from '../layout';

export interface ReadyForPickupData {
  customerName: string;
  jobNo: number | string;
  itemCount: number;
  balanceLine: string | null;
  portalJobUrl: string;
}

export function readyForPickup(data: ReadyForPickupData) {
  const { customerName, jobNo, itemCount, balanceLine, portalJobUrl } = data;
  const greeting = customerName ? `Hi ${customerName.split(' ')[0]},` : 'Hi,';
  const itemLine =
    itemCount === 1 ? '1 item is' : `${itemCount} items are`;

  return {
    subject: `Ready for pickup · Job #${jobNo}`,
    text: [
      greeting,
      '',
      `Job #${jobNo} is ready. ${itemLine} waiting for you${SHOP_ADDRESS ? ` at ${SHOP_ADDRESS}` : ''}.`,
      '',
      balanceLine ? balanceLine : '',
      '',
      `Full invoice + order details: ${portalJobUrl}`,
      '',
      '— S Prints',
    ]
      .filter((l) => l !== undefined)
      .join('\n'),
    html: `${SHELL_OPEN}
      <div style="font-size:11px; letter-spacing:2px; text-transform:uppercase; color:#888; margin-bottom:8px;">Ready for pickup</div>
      <h1 style="font-size:20px; margin:0 0 14px;">Job #${escape(String(jobNo))}</h1>
      <p style="line-height:1.6; margin:0 0 8px;">${escape(greeting)}</p>
      <p style="line-height:1.6; margin:0 0 14px;">
        Your order is ready. <strong>${escape(itemLine)}</strong> waiting for you${SHOP_ADDRESS ? ` at <strong>${escape(SHOP_ADDRESS)}</strong>` : ''}.
      </p>
      ${
        balanceLine
          ? `<div style="background:#fff7ed; border-left:3px solid #f59e0b; padding:10px 14px; border-radius:6px; font-size:14px; margin:14px 0;">${escape(balanceLine)}</div>`
          : ''
      }
      <p style="margin:22px 0;">
        <a href="${escape(portalJobUrl)}" style="display:inline-block; background:#111; color:#fff; padding:10px 18px; border-radius:10px; text-decoration:none; font-weight:600; font-size:14px;">
          View invoice
        </a>
      </p>
${SHELL_CLOSE}`,
  };
}
