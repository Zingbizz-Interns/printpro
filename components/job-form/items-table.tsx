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
    <Card className="overflow-visible border border-border shadow-sm rounded-3xl">
      <CardHeader className="px-8 pt-8 pb-4">
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="text-2xl font-body font-bold text-foreground">
            Items <span className="text-muted-foreground font-mono font-medium text-lg ml-2 bg-muted px-2 py-0.5 rounded-lg border border-border">{items.length}</span>
          </CardTitle>
          <Button type="button" variant="primary" size="sm" onClick={onAdd} className="shadow-md">
            <Plus size={16} strokeWidth={2.5} className="mr-1" /> Add Item
          </Button>
        </div>
      </CardHeader>
      <CardBody className="space-y-4 px-8 pb-8">
        {items.length === 0 && (
          <div className="text-center py-12 rounded-2xl border border-dashed border-border bg-muted/30 transition-colors hover:bg-muted/50">
            <p className="text-muted-foreground font-medium text-lg">No items added to this job yet.</p>
            <div className="mt-4 flex justify-center">
              <Button type="button" variant="secondary" onClick={onAdd} className="shadow-sm bg-white hover:bg-gray-50 border-border">
                <Plus size={16} strokeWidth={2.5} className="mr-1" /> Add your first item
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
        'border border-border bg-card p-6 rounded-2xl space-y-4',
        'relative shadow-sm transition-all',
      )}
    >
      {/* Row header */}
      <div className="flex items-center gap-4 flex-wrap">
        <span className="font-mono font-bold text-muted-foreground shrink-0 bg-muted px-2 py-1 rounded max-w-fit">
          #{jobNo > 0 ? `${jobNo}-${idx + 1}` : `· ${idx + 1}`}
        </span>
        <button
          type="button"
          onClick={() => setImgOpen(true)}
          aria-label={item.imageUrl ? 'Edit image' : 'Add image'}
          className="shrink-0 w-12 h-12 rounded-xl border border-border bg-muted/50 overflow-hidden grid place-items-center hover:shadow-md hover:border-muted-foreground/30 transition-all focus:outline-none focus:ring-2 focus:ring-ring"
          style={
            item.imageUrl
              ? { backgroundImage: `url(${item.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
              : undefined
          }
        >
          {!item.imageUrl && <ImagePlus size={18} strokeWidth={2} className="text-muted-foreground" />}
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
          className="text-sm font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-muted transition-all"
        >
          <ChevronDown
            size={16}
            strokeWidth={2}
            className={cn('transition-transform duration-200', expanded && 'rotate-180')}
          />
          {expanded ? 'Hide Details' : 'Job Details'}
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove item"
          className="text-red-500 hover:bg-red-50 hover:text-red-600 p-2 rounded-lg border border-transparent hover:border-red-200 transition-colors focus:ring-2 focus:ring-red-500/20"
        >
          <Trash2 size={16} strokeWidth={2} />
        </button>
      </div>

      <Field label="Description">
        <Input
          value={item.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="What's being printed?"
          className="text-lg"
        />
      </Field>

      {/* Quantity / Unit / Rate / Subtotal */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
            className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-foreground font-body text-base focus:border-transparent focus:ring-2 focus:ring-ring focus:outline-none shadow-sm transition-all"
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
          <div className="text-xl font-mono font-bold px-4 py-2.5 text-foreground bg-muted/30 border border-border rounded-xl shadow-inner flex items-center h-[46px]">
            {fmt(subtotal)}
          </div>
        </Field>
      </div>

      {/* Statuses */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Design Status">
          <select
            value={item.designStatus}
            onChange={(e) => onChange({ designStatus: e.target.value as DesignStatus })}
            className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-foreground font-body font-medium focus:border-transparent focus:ring-2 focus:ring-ring focus:outline-none shadow-sm transition-all cursor-pointer"
          >
            {DESIGN_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Print Status">
          <select
            value={item.printStatus}
            onChange={(e) => onChange({ printStatus: e.target.value as PrintStatus })}
            className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-foreground font-body font-medium focus:border-transparent focus:ring-2 focus:ring-ring focus:outline-none shadow-sm transition-all cursor-pointer"
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
        <div className="pt-4 mt-2 border-t border-border space-y-4 animate-in slide-in-from-top-2 fade-in duration-200">
          <Badge tone="paper" className="font-semibold px-3 py-1 bg-muted border-border text-foreground">
            Job Details
          </Badge>
          <div className="grid md:grid-cols-2 gap-4">
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
    <div className="flex-1 min-w-[200px] relative">
      <input
        list="product-names"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Choose or type category…"
        className="w-full text-foreground bg-card border border-border rounded-xl px-4 py-2 font-semibold text-lg focus:border-transparent focus:ring-2 focus:ring-ring focus:outline-none shadow-sm transition-all"
      />
      <datalist id="product-names">
        {options.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
    </div>
  );
}
