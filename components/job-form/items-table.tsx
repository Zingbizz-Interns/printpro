'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Field, Textarea } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { listProducts } from '@/lib/db/products';
import { fmt } from '@/lib/domain/totals';
import { cn } from '@/lib/utils';
import type { DesignStatus, JobItem, PrintStatus } from '@/types/db';
import { ChevronDown, Plus, Trash2, ImagePlus } from 'lucide-react';
import { ItemImageModal } from './item-image-modal';

const DESIGN_OPTIONS: DesignStatus[] = [
  'Design - Not yet Started',
  'Design - In Progress',
  'Design - Approved',
  'In Finishing',
];
const PRINT_OPTIONS: PrintStatus[] = [
  'Not Printed',
  'Printing',
  'Quality Check',
  'Ready',
  'Delivered',
];
const UNIT_OPTIONS = ['Nos', 'Pcs', 'Sets', 'Pages', 'Sq.ft', 'Mtrs'];

interface Props {
  items: JobItem[];
  jobNo: number;
  onAdd: () => void;
  onUpdate: (idx: number, patch: Partial<JobItem>) => void;
  onRemove: (idx: number) => void;
}

export function ItemsTable({ items, jobNo, onAdd, onUpdate, onRemove }: Props) {
  const productsQ = useQuery({ queryKey: ['products'], queryFn: listProducts });
  const productNames = useMemo(
    () => (productsQ.data ?? []).map((p) => p.name),
    [productsQ.data],
  );

  return (
    <Card tone="paper" wobbly="md">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-2xl">
            Items <span className="text-pencil/50 font-mono text-lg">({items.length})</span>
          </CardTitle>
          <Button type="button" variant="primary" size="sm" onClick={onAdd}>
            <Plus size={14} strokeWidth={3} /> add item
          </Button>
        </div>
      </CardHeader>
      <CardBody className="space-y-4">
        {items.length === 0 && (
          <div className="text-center py-10 border-2 border-dashed border-pencil/30 wobbly-md">
            <p className="text-pencil/60 italic text-lg">No items yet.</p>
            <div className="mt-3 flex justify-center">
              <Button type="button" variant="secondary" onClick={onAdd}>
                <Plus size={16} strokeWidth={3} /> add your first item
              </Button>
            </div>
          </div>
        )}

        {items.map((it, i) => (
          <ItemRow
            key={String(it.id)}
            idx={i}
            item={it}
            jobNo={jobNo}
            productNames={productNames}
            onChange={(patch) => onUpdate(i, patch)}
            onRemove={() => onRemove(i)}
          />
        ))}
      </CardBody>
    </Card>
  );
}

function ItemRow({
  idx,
  item,
  jobNo,
  productNames,
  onChange,
  onRemove,
}: {
  idx: number;
  item: JobItem;
  jobNo: number;
  productNames: string[];
  onChange: (patch: Partial<JobItem>) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [imgOpen, setImgOpen] = useState(false);

  const q = typeof item.quantity === 'number' ? item.quantity : parseFloat(String(item.quantity)) || 0;
  const r = typeof item.rate === 'number' ? item.rate : parseFloat(String(item.rate)) || 0;
  const subtotal = q * r;

  return (
    <div
      className={cn(
        'border-2 border-pencil wobbly-sm bg-white p-4 space-y-3',
        'relative shadow-hand-soft',
      )}
    >
      {/* Row header */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-mono font-bold text-pencil/70 shrink-0">
          #{jobNo > 0 ? `${jobNo}-${idx + 1}` : `· ${idx + 1}`}
        </span>
        <button
          type="button"
          onClick={() => setImgOpen(true)}
          aria-label={item.imageUrl ? 'Edit image' : 'Add image'}
          className="shrink-0 w-10 h-10 border-2 border-pencil wobbly-sm bg-white overflow-hidden grid place-items-center hover:shadow-hand-sm transition-all"
          style={
            item.imageUrl
              ? { backgroundImage: `url(${item.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
              : undefined
          }
        >
          {!item.imageUrl && <ImagePlus size={16} strokeWidth={2.5} className="text-pencil/60" />}
        </button>
        <CategoryInput
          value={item.category}
          options={productNames}
          onChange={(v) => onChange({ category: v })}
        />
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="text-sm text-pencil/70 hover:text-pencil flex items-center gap-1 underline decoration-dashed underline-offset-4"
        >
          <ChevronDown
            size={14}
            strokeWidth={2.5}
            className={cn('transition-transform', expanded && 'rotate-180')}
          />
          {expanded ? 'hide details' : '+ job details'}
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove item"
          className="text-accent hover:bg-accent hover:text-white p-1.5 wobbly-sm border border-accent/60 transition-colors"
        >
          <Trash2 size={14} strokeWidth={2.5} />
        </button>
      </div>

      <Field label="Description">
        <Input
          value={item.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="What's being printed?"
        />
      </Field>

      {/* Quantity / Unit / Rate / Subtotal */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Field label="Qty">
          <Input
            type="number"
            value={item.quantity === '' ? '' : item.quantity}
            onChange={(e) =>
              onChange({ quantity: e.target.value === '' ? '' : parseFloat(e.target.value) })
            }
            placeholder="0"
            min={0}
          />
        </Field>
        <Field label="Unit">
          <select
            value={item.unit}
            onChange={(e) => onChange({ unit: e.target.value })}
            className="w-full text-lg bg-white border-2 border-pencil wobbly-sm px-4 py-2.5 focus:border-ink focus:ring-2 focus:ring-ink/20"
          >
            {UNIT_OPTIONS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Rate (₹)">
          <Input
            type="number"
            value={item.rate === '' ? '' : item.rate}
            onChange={(e) =>
              onChange({ rate: e.target.value === '' ? '' : parseFloat(e.target.value) })
            }
            placeholder="0.00"
            min={0}
            step={0.01}
          />
        </Field>
        <Field label="Subtotal">
          <div className="text-lg font-mono font-bold px-4 py-2.5 bg-muted/50 border-2 border-dashed border-pencil/40 wobbly-sm">
            {fmt(subtotal)}
          </div>
        </Field>
      </div>

      {/* Statuses */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Design status">
          <select
            value={item.designStatus}
            onChange={(e) => onChange({ designStatus: e.target.value as DesignStatus })}
            className="w-full text-base bg-white border-2 border-pencil wobbly-sm px-3 py-2.5 focus:border-ink"
          >
            {DESIGN_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Print status">
          <select
            value={item.printStatus}
            onChange={(e) => onChange({ printStatus: e.target.value as PrintStatus })}
            className="w-full text-base bg-white border-2 border-pencil wobbly-sm px-3 py-2.5 focus:border-ink"
          >
            {PRINT_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <ItemImageModal
        open={imgOpen}
        onOpenChange={setImgOpen}
        itemId={item.id}
        currentUrl={item.imageUrl || undefined}
        onSaved={(url) => onChange({ imageUrl: url })}
        onRemove={() => {
          onChange({ imageUrl: '' });
          setImgOpen(false);
        }}
      />

      {/* Expandable details */}
      {expanded && (
        <div className="pt-3 mt-2 border-t-2 border-dashed border-pencil/30 space-y-3">
          <Badge tone="postit" dashed>
            job details
          </Badge>
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Size">
              <Input
                value={item.size}
                onChange={(e) => onChange({ size: e.target.value })}
                placeholder="e.g. A4, 3x5 ft"
              />
            </Field>
            <Field label="Material">
              <Input
                value={item.material}
                onChange={(e) => onChange({ material: e.target.value })}
                placeholder="Art card 300 GSM"
              />
            </Field>
            <Field label="Specs / Colour">
              <Input
                value={item.specs}
                onChange={(e) => onChange({ specs: e.target.value })}
                placeholder="4+4 colour"
              />
            </Field>
            <Field label="Finishing">
              <Input
                value={item.finishing}
                onChange={(e) => onChange({ finishing: e.target.value })}
                placeholder="Lamination, die cut…"
              />
            </Field>
          </div>
          <Field label="Remarks">
            <Textarea
              value={item.remarks}
              onChange={(e) => onChange({ remarks: e.target.value })}
              placeholder="Internal notes"
            />
          </Field>
        </div>
      )}
    </div>
  );
}

function CategoryInput({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <>
      <input
        list="product-names"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="choose or type category…"
        className="flex-1 min-w-[180px] text-base bg-white border-2 border-pencil wobbly-sm px-3 py-1.5 focus:border-ink focus:ring-2 focus:ring-ink/20"
      />
      <datalist id="product-names">
        {options.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
    </>
  );
}
