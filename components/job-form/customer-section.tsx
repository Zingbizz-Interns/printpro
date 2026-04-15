'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input, Field } from '@/components/ui/input';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { listCustomers } from '@/lib/db/customers';
import { isValidGst, isValidPhone } from '@/lib/domain/draft';
import type { Job } from '@/types/db';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  draft: Job;
  onUpdate: (patch: Partial<Job>) => void;
}

export function CustomerSection({ draft, onUpdate }: Props) {
  const [expanded, setExpanded] = useState(true);
  const customersQ = useQuery({ queryKey: ['customers'], queryFn: listCustomers });

  const suggestions = useMemo(() => {
    const list = customersQ.data ?? [];
    const q = draft.companyName.trim().toLowerCase();
    if (!q) return [];
    return list
      .filter((c) => c.company_name.toLowerCase().includes(q) && c.company_name.toLowerCase() !== q)
      .slice(0, 5);
  }, [customersQ.data, draft.companyName]);

  const gstError = draft.gstNo && !isValidGst(draft.gstNo) ? 'Invalid GST format' : undefined;
  const phoneError = draft.contactNumber && !isValidPhone(draft.contactNumber) ? 'Invalid phone' : undefined;

  function applySuggestion(c: NonNullable<typeof customersQ.data>[number]) {
    onUpdate({
      companyName: c.company_name,
      contactPerson: c.contact_person || draft.contactPerson,
      contactNumber: c.contact_number || draft.contactNumber,
      additionalContact: c.additional_contact || draft.additionalContact,
      emailId: c.email_id || draft.emailId,
      gstNo: c.gst_no || draft.gstNo,
      customerAddress: c.address || draft.customerAddress,
    });
  }

  return (
    <Card tone="paper" wobbly="md" className="overflow-visible">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center gap-2 px-6 pt-5 pb-2 cursor-pointer"
      >
        <ChevronDown
          size={18}
          strokeWidth={2.5}
          className={cn('transition-transform', !expanded && '-rotate-90')}
        />
        <CardTitle className="text-2xl">Customer</CardTitle>
        {!expanded && draft.companyName && (
          <span className="ml-3 font-body text-lg text-pencil/60 truncate">
            — {draft.companyName}
          </span>
        )}
      </button>

      {expanded && (
        <CardBody className="space-y-4">
          <div className="relative">
            <Field label="Company / Name">
              <Input
                value={draft.companyName}
                onChange={(e) => onUpdate({ companyName: e.target.value })}
                placeholder="Acme Printers Pvt Ltd"
                autoComplete="off"
              />
            </Field>
            {suggestions.length > 0 && (
              <div className="absolute z-10 mt-1 left-0 right-0 bg-white border-2 border-pencil wobbly-sm shadow-hand max-h-60 overflow-auto">
                {suggestions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => applySuggestion(s)}
                    className="w-full text-left px-3 py-2 hover:bg-postit-lt border-b border-dashed border-pencil/20 last:border-b-0"
                  >
                    <div className="font-body text-base">{s.company_name}</div>
                    {s.contact_person && (
                      <div className="text-xs text-pencil/60">
                        {s.contact_person} · {s.contact_number}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Contact person">
              <Input
                value={draft.contactPerson}
                onChange={(e) => onUpdate({ contactPerson: e.target.value })}
                placeholder="Ravi Kumar"
              />
            </Field>
            <Field label="Phone" error={phoneError}>
              <Input
                value={draft.contactNumber}
                onChange={(e) => onUpdate({ contactNumber: e.target.value })}
                placeholder="98765 43210"
                inputMode="tel"
              />
            </Field>
            <Field label="Alt. phone">
              <Input
                value={draft.additionalContact}
                onChange={(e) => onUpdate({ additionalContact: e.target.value })}
                placeholder="optional"
                inputMode="tel"
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={draft.emailId}
                onChange={(e) => onUpdate({ emailId: e.target.value })}
                placeholder="name@company.com"
              />
            </Field>
            <Field label="GST no." error={gstError}>
              <Input
                value={draft.gstNo}
                onChange={(e) => onUpdate({ gstNo: e.target.value.toUpperCase() })}
                placeholder="22AAAAA0000A1Z5"
              />
            </Field>
            <Field label="Address">
              <Input
                value={draft.customerAddress}
                onChange={(e) => onUpdate({ customerAddress: e.target.value })}
                placeholder="Street, City"
              />
            </Field>
          </div>
        </CardBody>
      )}
    </Card>
  );
}
