'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Thumbtack } from '@/components/decorations/thumbtack';
import { statusTheme } from '@/lib/kanban/status-theme';
import { daysUntilDue, deliveryLabel, isOverdueDate } from '@/lib/kanban/date-utils';
import { jobGrandTotal, fmt } from '@/lib/domain/totals';
import { cn, seededTilt, seededWobbly } from '@/lib/utils';
import type { Job } from '@/types/db';
import { Package, Copy, Trash2, Pencil } from 'lucide-react';

interface Props {
  job: Job;
  onClone?: (id: number) => void;
  onDelete?: (id: number) => void;
  isOwner?: boolean;
  dense?: boolean;
}

export function JobCard({ job, onClone, onDelete, isOwner, dense }: Props) {
  const theme = statusTheme(job.jobStatus);
  const gt = jobGrandTotal(job);
  const adv = Number(job.advancePaid) || 0;
  const balance = gt - adv;
  const overdue = job.jobStatus !== 'Delivered' && isOverdueDate(job.deliveryDate);
  const dueIn = daysUntilDue(job.deliveryDate);
  const urgent = overdue || dueIn === 0;
  const paymentDone = job.paymentStatus === 'Fully Paid';

  const tilt = seededTilt(String(job.id));
  const wobbly = seededWobbly(String(job.id));

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.15 }}
      className={cn('relative', tilt)}
    >
      <Link
        href={`/jobs/${job.id}`}
        className={cn(
          'group block bg-white border-2 border-pencil no-underline',
          wobbly,
          urgent ? 'shadow-hand-accent' : 'shadow-hand-soft',
          'hover:shadow-hand hover:-translate-y-0.5 hover:rotate-0',
          'transition-all duration-150',
        )}
      >
        {/* accent strip (status colour) */}
        <div
          aria-hidden
          className="absolute left-0 top-3 bottom-3 w-1.5 rounded-r"
          style={{ background: theme.accent }}
        />

        {/* thumbtack for urgent */}
        {urgent && !dense && <Thumbtack tone="accent" />}

        <div className="pl-5 pr-3 pt-3 pb-2 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-mono font-bold text-lg leading-none">#{job.jobNo}</div>
            <div
              className="font-display text-xl leading-tight truncate mt-1"
              title={job.companyName}
            >
              {job.companyName || <span className="text-pencil/40 italic">no customer</span>}
            </div>
          </div>
          <Badge
            tone="paper"
            className="text-xs border-2 shrink-0"
            style={{ background: theme.tint, color: theme.ink, borderColor: theme.ink }}
          >
            <span>{theme.mark}</span> {theme.label}
          </Badge>
        </div>

        <div className="pl-5 pr-3 flex items-center gap-3 text-sm text-pencil/70 flex-wrap">
          <span className="flex items-center gap-1">
            <Package size={14} strokeWidth={2.5} /> {job.items.length}
          </span>
          {job.gstEnabled && (
            <span className="font-mono font-bold text-ink">GST</span>
          )}
          {Number(job.discountPct) > 0 && (
            <span className="font-mono font-bold text-amber-sketch">
              −{Number(job.discountPct)}%
            </span>
          )}
        </div>

        <div className="mt-2 mx-3 border-t border-dashed border-pencil/25" />

        <div className="px-3 pt-2 pb-3 flex items-center gap-2">
          <DeliveryPill overdue={overdue} dueIn={dueIn} label={deliveryLabel(job.deliveryDate)} delivered={job.jobStatus === 'Delivered'} />
          <div className="flex-1" />
          <div className="text-right">
            <div className="font-mono font-bold leading-none">{fmt(gt)}</div>
            {!paymentDone && balance > 0 && (
              <div className="text-xs text-accent font-bold mt-0.5">
                due {fmt(balance)}
              </div>
            )}
            {paymentDone && (
              <div className="text-xs text-leaf font-bold mt-0.5">✓ paid</div>
            )}
          </div>
        </div>

        {/* Hover actions */}
        {!dense && (
          <div className="px-3 pb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center gap-1">
            <CardAction label="Edit">
              <Pencil size={12} strokeWidth={2.5} /> edit
            </CardAction>
            {onClone && (
              <CardAction
                label="Clone"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (typeof job.id === 'number') onClone(job.id);
                }}
              >
                <Copy size={12} strokeWidth={2.5} /> clone
              </CardAction>
            )}
            {isOwner && onDelete && (
              <CardAction
                label="Delete"
                danger
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (typeof job.id === 'number') onDelete(job.id);
                }}
              >
                <Trash2 size={12} strokeWidth={2.5} />
              </CardAction>
            )}
          </div>
        )}
      </Link>
    </motion.div>
  );
}

function DeliveryPill({
  overdue,
  dueIn,
  label,
  delivered,
}: {
  overdue: boolean;
  dueIn: number | null;
  label: string;
  delivered: boolean;
}) {
  if (delivered) {
    return (
      <span className="text-xs font-bold text-leaf bg-leaf-lt border border-leaf px-2 py-0.5 wobbly-sm">
        ✅ delivered
      </span>
    );
  }
  const cls = overdue
    ? 'text-accent bg-accent-lt border-accent'
    : dueIn === 0
    ? 'text-amber-sketch bg-amber-lt border-amber-sketch'
    : dueIn === 1
    ? 'text-ink bg-ink-lt border-ink'
    : 'text-pencil/70 bg-muted border-pencil/40';
  const mark = overdue ? '⚠' : dueIn === 0 ? '📅' : dueIn === 1 ? '📅' : '📅';
  return (
    <span className={cn('text-xs font-bold border px-2 py-0.5 wobbly-sm flex items-center gap-1', cls)}>
      <span>{mark}</span>
      {label}
    </span>
  );
}

function CardAction({
  children,
  onClick,
  danger,
  label,
}: {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  danger?: boolean;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cn(
        'kb-action wobbly-sm',
        danger ? 'kb-action-danger' : 'kb-action-neutral',
      )}
    >
      {children}
    </button>
  );
}
