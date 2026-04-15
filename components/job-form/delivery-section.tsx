'use client';

import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Field, Textarea } from '@/components/ui/input';
import type { Job } from '@/types/db';

interface Props {
  draft: Job;
  onUpdate: (patch: Partial<Job>) => void;
}

export function DeliverySection({ draft, onUpdate }: Props) {
  return (
    <Card tone="paper" wobbly="alt">
      <CardHeader>
        <CardTitle className="text-2xl">Delivery &amp; Notes</CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="grid md:grid-cols-3 gap-4">
          <Field label="Order date">
            <Input
              type="date"
              value={draft.orderDate}
              onChange={(e) => onUpdate({ orderDate: e.target.value })}
            />
          </Field>
          <Field label="Delivery date">
            <Input
              type="date"
              value={draft.deliveryDate}
              onChange={(e) => onUpdate({ deliveryDate: e.target.value })}
            />
          </Field>
          <Field label="Delivery time">
            <Input
              type="time"
              value={draft.deliveryTime}
              onChange={(e) => onUpdate({ deliveryTime: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Special notes">
          <Textarea
            value={draft.specialNotes}
            onChange={(e) => onUpdate({ specialNotes: e.target.value })}
            placeholder="Anything the print team should know…"
          />
        </Field>
      </CardBody>
    </Card>
  );
}
