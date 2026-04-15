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
      className="no-print sticky bottom-0 md:bottom-4 z-30 mt-6 bg-paper/95 backdrop-blur border-t-2 md:border-2 border-pencil md:wobbly-md md:shadow-hand -mx-4 md:mx-0 px-4 md:px-5 py-3 flex flex-wrap items-center gap-3"
    >
      <div className="hidden md:flex flex-col">
        <span className="text-xs text-pencil/60 font-display">grand total</span>
        <span className="font-mono font-bold text-xl leading-none">{fmt(grandTotal)}</span>
      </div>

      <div className="hidden md:block w-px h-10 bg-pencil/30" />

      <button
        type="button"
        onClick={() => onToggleDelivered(!delivered)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 text-sm font-bold border-2 wobbly-sm transition-all',
          delivered
            ? 'bg-leaf-lt text-leaf border-leaf shadow-hand-sm'
            : 'bg-white text-pencil/60 border-dashed border-pencil/40 hover:border-solid',
        )}
      >
        <Check size={14} strokeWidth={3} />
        {delivered ? 'delivered' : 'mark delivered'}
      </button>

      {balance > 0.01 && (
        <Badge tone="accent">
          due <span className="font-mono ml-1">{fmt(balance)}</span>
        </Badge>
      )}

      {!isNew && onOpenPayments && (
        <Button type="button" variant="ink" size="sm" onClick={onOpenPayments}>
          <Wallet size={14} strokeWidth={2.5} />
          payments
          {balance > 0.01 && (
            <span className="ml-1 font-mono opacity-90">{fmt(balance)}</span>
          )}
        </Button>
      )}

      <div className="flex-1" />

      {!isNew && onPrint && (
        <Button type="button" variant="ghost" size="sm" onClick={onPrint}>
          <Printer size={14} strokeWidth={2.5} /> print
        </Button>
      )}
      {!isNew && onClone && (
        <Button type="button" variant="ghost" size="sm" onClick={onClone}>
          <Copy size={14} strokeWidth={2.5} /> clone
        </Button>
      )}
      {!isNew && isOwner && onDelete && (
        <Button
          type="button"
          variant="danger"
          size="sm"
          onClick={onDelete}
          disabled={deleting}
          wobbly="sm"
        >
          <Trash2 size={14} strokeWidth={2.5} /> {deleting ? 'deleting…' : 'delete'}
        </Button>
      )}
      <Button
        type="button"
        variant="primary"
        size="md"
        onClick={onSave}
        disabled={saving}
        className={cn(dirty && 'shadow-hand-accent')}
      >
        <Save size={16} strokeWidth={2.5} />
        {saving ? 'saving…' : isNew ? 'save & create' : dirty ? 'save changes' : 'saved'}
      </Button>
    </div>
  );
}
