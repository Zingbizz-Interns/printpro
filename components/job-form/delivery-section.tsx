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
    <Card className="border border-border shadow-sm rounded-3xl overflow-hidden p-0">
      <CardHeader className="px-8 pt-8 pb-4">
        <CardTitle className="text-2xl font-body font-bold text-foreground">Delivery &amp; Notes</CardTitle>
      </CardHeader>
      <CardBody className="space-y-6 px-8 pb-8">
        <div className="grid md:grid-cols-3 gap-5">
          <Field label="Order Date">
            <Input
              type="date"
              value={draft.orderDate}
              onChange={(e) => onUpdate({ orderDate: e.target.value })}
            />
          </Field>
          <Field label="Delivery Date">
            <Input
              type="date"
              value={draft.deliveryDate}
              onChange={(e) => onUpdate({ deliveryDate: e.target.value })}
            />
          </Field>
          <Field label="Delivery Time">
            <Input
              type="time"
              value={draft.deliveryTime}
              onChange={(e) => onUpdate({ deliveryTime: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Special Notes">
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
