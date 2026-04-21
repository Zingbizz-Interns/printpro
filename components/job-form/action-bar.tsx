'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { fmt } from '@/lib/domain/totals';
import { cn } from '@/lib/utils';
import { Save, Trash2, Copy, Check, Wallet, Printer } from 'lucide-react';

interface Props {
  isNew: boolean;
  isOwner: boolean;
  dirty: boolean;
  saving: boolean;
  deleting?: boolean;
  grandTotal: number;
  balance: number;
  delivered: boolean;
  onSave: () => void;
  onDelete?: () => void;
  onClone?: () => void;
  onOpenPayments?: () => void;
  onPrint?: () => void;
  onToggleDelivered: (next: boolean) => void;
}

export function ActionBar({
  isNew,
  isOwner,
  dirty,
  saving,
  deleting,
  grandTotal,
  balance,
  delivered,
  onSave,
  onDelete,
  onClone,
  onOpenPayments,
  onPrint,
  onToggleDelivered,
}: Props) {
  return (
    <div
      className="no-print sticky bottom-0 md:bottom-6 z-30 mt-8 bg-background/80 backdrop-blur-2xl border-t md:border border-border md:rounded-2xl shadow-[0_-8px_30px_rgb(0,0,0,0.05)] md:shadow-xl -mx-4 md:mx-0 px-4 md:px-6 py-4 flex flex-wrap items-center gap-4 transition-all"
    >
      <div className="hidden md:flex flex-col">
        <span className="text-[10px] text-muted-foreground font-body font-semibold uppercase tracking-widest">Grand Total</span>
        <span className="font-mono font-bold text-2xl leading-none text-foreground">{fmt(grandTotal)}</span>
      </div>

      <div className="hidden md:block w-px h-10 bg-border mx-2" />

      <button
        type="button"
        onClick={() => onToggleDelivered(!delivered)}
        className={cn(
          'flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all shadow-sm',
          delivered
            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 ring-1 ring-inset ring-emerald-500/10'
            : 'bg-card text-muted-foreground border border-border hover:bg-muted hover:text-foreground',
        )}
      >
        <Check size={16} strokeWidth={3} />
        {delivered ? 'Delivered' : 'Mark Delivered'}
      </button>

      {balance > 0.01 && (
        <Badge tone="accent" className="rounded-lg py-1.5 px-3">
          Due <span className="font-mono ml-1.5">{fmt(balance)}</span>
        </Badge>
      )}

      {!isNew && onOpenPayments && (
        <Button type="button" variant="ink" size="sm" onClick={onOpenPayments} className="shadow-sm">
          <Wallet size={16} strokeWidth={2} className="mr-1.5" />
          Payments
          {balance > 0.01 && (
            <span className="ml-1.5 font-mono opacity-90">{fmt(balance)}</span>
          )}
        </Button>
      )}

      <div className="flex-1" />

      {!isNew && onPrint && (
        <Button type="button" variant="ghost" size="sm" onClick={onPrint}>
          <Printer size={16} strokeWidth={2} className="mr-1.5" /> Print
        </Button>
      )}
      {!isNew && onClone && (
        <Button type="button" variant="ghost" size="sm" onClick={onClone}>
          <Copy size={16} strokeWidth={2} className="mr-1.5" /> Clone
        </Button>
      )}
      {!isNew && isOwner && onDelete && (
        <Button
          type="button"
          variant="danger"
          size="sm"
          onClick={onDelete}
          disabled={deleting}
          className="shadow-sm"
        >
          <Trash2 size={16} strokeWidth={2} className="mr-1.5" /> {deleting ? 'Deleting…' : 'Delete'}
        </Button>
      )}
      <Button
        type="button"
        variant="primary"
        size="md"
        onClick={onSave}
        disabled={saving}
        className={cn(
          'shadow-md transition-all',
          dirty ? 'ring-2 ring-accent ring-offset-2 ring-offset-background scale-[1.02]' : ''
        )}
      >
        <Save size={18} strokeWidth={2.5} className="mr-1.5" />
        {saving ? 'Saving…' : isNew ? 'Save & Create' : dirty ? 'Save Changes' : 'Saved'}
      </Button>
    </div>
  );
}
