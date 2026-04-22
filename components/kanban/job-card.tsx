'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { statusTheme } from '@/lib/kanban/status-theme';
import { daysUntilDue, deliveryLabel, isOverdueDate } from '@/lib/kanban/date-utils';
import { jobGrandTotal, fmt } from '@/lib/domain/totals';
import { cn } from '@/lib/utils';
import type { Job } from '@/types/db';
import type { ProofSummary } from '@/lib/domain/proof-summary';
import { Package, Copy, Trash2, Pencil, Check, MessageSquare, RotateCw } from 'lucide-react';

interface Props {
  job: Job;
  onClone?: (id: number) => void;
  onDelete?: (id: number) => void;
  isOwner?: boolean;
  dense?: boolean;
  proofSummary?: ProofSummary;
}

export function JobCard({ job, onClone, onDelete, isOwner, dense, proofSummary }: Props) {
  const theme = statusTheme(job.jobStatus);
  const gt = jobGrandTotal(job);
  const adv = Number(job.advancePaid) || 0;
  const balance = gt - adv;
  const overdue = job.jobStatus !== 'Delivered' && isOverdueDate(job.deliveryDate);
  const dueIn = daysUntilDue(job.deliveryDate);
  const urgent = overdue || dueIn === 0;
  const paymentDone = job.paymentStatus === 'Fully Paid';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.15 }}
      className="relative"
    >
      <Link
        href={`/jobs/${job.id}`}
        className={cn(
          'group block bg-card rounded-2xl border border-border no-underline shadow-sm',
          urgent ? 'shadow-md ring-1 ring-red-500/20' : '',
          'hover:shadow-lg hover:-translate-y-1',
          'transition-all duration-200 ease-out',
        )}
      >
        {/* accent strip (status colour) */}
        <div
          aria-hidden
          className="absolute left-[1px] top-4 bottom-4 w-1.5 rounded-r bg-current"
          style={{ background: theme.accent }}
        />

        {/* thumbtack equivalent: urgent pulse */}
        {urgent && !dense && (
           <div className="absolute top-0 right-3 -translate-y-1/2 rounded-full bg-red-100 p-1">
             <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
           </div>
        )}

        <div className="pl-6 pr-4 pt-4 pb-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-mono font-bold text-sm text-muted-foreground leading-none">#{job.jobNo}</div>
            <div
              className="font-body font-semibold text-lg leading-tight truncate mt-1.5"
              title={job.companyName}
            >
              {job.companyName || <span className="text-muted-foreground/60 italic font-normal">No Customer</span>}
            </div>
          </div>
          <Badge
            tone="paper"
            className="text-[10px] sm:text-xs shrink-0 rounded-md border"
            style={{ background: theme.tint, color: theme.ink, borderColor: theme.ink }}
          >
            <span>{theme.mark}</span> {theme.label}
          </Badge>
        </div>

        <div className="pl-6 pr-4 flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1.5 font-medium">
            <Package size={14} strokeWidth={2} /> {job.items.length}
          </span>
          {job.gstEnabled && (
            <span className="font-mono font-bold text-blue-500 text-[10px] border border-blue-200 bg-blue-50 px-1 rounded">GST</span>
          )}
          {Number(job.discountPct) > 0 && (
            <span className="font-mono font-bold text-amber-500 text-[10px] border border-amber-200 bg-amber-50 px-1 rounded">
              −{Number(job.discountPct)}%
            </span>
          )}
          <ProofBadge summary={proofSummary} />
        </div>

        <div className="mt-3 mx-4 border-t border-border/60" />

        <div className="px-4 pt-3 pb-4 flex items-center gap-2">
          <DeliveryPill overdue={overdue} dueIn={dueIn} label={deliveryLabel(job.deliveryDate)} delivered={job.jobStatus === 'Delivered'} />
          <div className="flex-1" />
          <div className="text-right">
            <div className="font-mono font-bold leading-none">{fmt(gt)}</div>
            {!paymentDone && balance > 0 && (
              <div className="text-xs text-red-500 font-semibold mt-1">
                due {fmt(balance)}
              </div>
            )}
            {paymentDone && (
              <div className="text-xs text-emerald-500 font-semibold mt-1">✓ Paid</div>
            )}
          </div>
        </div>

        {/* Hover actions */}
        {!dense && (
          <div className="px-4 pb-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1.5">
            <CardAction label="Edit">
              <Pencil size={12} strokeWidth={2} /> Edit
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
                <Copy size={12} strokeWidth={2} /> Clone
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
                <Trash2 size={12} strokeWidth={2} />
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
      <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
        ✅ Delivered
      </span>
    );
  }
  const cls = overdue
    ? 'text-red-600 bg-red-50 border-red-200 font-semibold'
    : dueIn === 0
    ? 'text-amber-600 bg-amber-50 border-amber-200 font-semibold'
    : dueIn === 1
    ? 'text-blue-600 bg-blue-50 border-blue-200 font-semibold'
    : 'text-muted-foreground bg-muted border-border font-medium';
  const mark = overdue ? '⚠' : dueIn === 0 ? '📅' : dueIn === 1 ? '📅' : '📅';
  return (
    <span className={cn('text-xs border px-2.5 py-0.5 rounded-full flex items-center gap-1.5', cls)}>
      <span>{mark}</span>
      {label}
    </span>
  );
}

function ProofBadge({ summary }: { summary?: ProofSummary }) {
  if (!summary || summary.total === 0) return null;
  if (summary.changes > 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
        <RotateCw size={10} /> Changes {summary.changes > 1 ? `(${summary.changes})` : ''}
      </span>
    );
  }
  if (summary.pending > 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
        <MessageSquare size={10} /> Awaiting{summary.pending > 1 ? ` (${summary.pending})` : ''}
      </span>
    );
  }
  // all items with image_url have been approved
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
      <Check size={10} /> Approved
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
        'inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-lg border transition-all',
        danger 
          ? 'text-red-500 border-red-100 hover:bg-red-50 hover:border-red-500' 
          : 'text-muted-foreground border-border hover:bg-muted hover:text-foreground'
      )}
    >
      {children}
    </button>
  );
}
