'use client';

import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Field } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { fmt } from '@/lib/domain/totals';
import type { Job } from '@/types/db';

interface Props {
  draft: Job;
  grandTotal: number;
  onUpdate: (patch: Partial<Job>) => void;
}

export function AdvanceSection({ draft, grandTotal, onUpdate }: Props) {
  const adv = Number(draft.advancePaid) || 0;
  const overpay = adv > grandTotal && grandTotal > 0;

  return (
    <Card tone="paper" wobbly="alt">
      <CardHeader>
        <CardTitle className="text-2xl">Initial Advance</CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Advance (₹)">
            <Input
              type="number"
              value={draft.advancePaid === 0 ? '' : draft.advancePaid}
              onChange={(e) => {
                const v = e.target.value === '' ? 0 : parseFloat(e.target.value);
                onUpdate({ advancePaid: Number.isFinite(v) ? v : 0 });
              }}
              placeholder="0.00"
              min={0}
              step={0.01}
            />
          </Field>
          <Field label="Paid on">
            <Input
              type="date"
              value={draft.advancePaidOn}
              onChange={(e) => onUpdate({ advancePaidOn: e.target.value })}
            />
          </Field>
        </div>
        {overpay && (
          <Badge tone="accent" className="text-sm">
            ⚠ Advance exceeds total — check amount
          </Badge>
        )}
        {adv > 0 && !overpay && (
          <div className="text-sm text-pencil/70">
            Balance after advance: <span className="font-mono font-bold">{fmt(grandTotal - adv)}</span>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
