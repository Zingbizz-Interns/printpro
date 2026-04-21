'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/components/ui/modal';
import { Input, Field, Textarea } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { createCustomer, updateCustomer, type CustomerUpsert } from '@/lib/db/customers';
import type { CustomerRow } from '@/types/db';
import { isValidGst, isValidPhone } from '@/lib/domain/draft';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** When supplied → edit mode; otherwise create. */
  customer?: CustomerRow | null;
}

const blank: CustomerUpsert = {
  company_name: '',
  contact_person: '',
  contact_number: '',
  additional_contact: '',
  email_id: '',
  gst_no: '',
  address: '',
  notes: '',
};

export function CustomerModal({ open, onOpenChange, customer }: Props) {
  const qc = useQueryClient();
  const editing = !!customer;
  const [data, setData] = useState<CustomerUpsert>(blank);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setErr(null);
    setData(
      customer
        ? {
            company_name: customer.company_name,
            contact_person: customer.contact_person,
            contact_number: customer.contact_number,
            additional_contact: customer.additional_contact,
            email_id: customer.email_id,
            gst_no: customer.gst_no,
            address: customer.address,
            notes: customer.notes,
          }
        : blank,
    );
  }, [open, customer]);

  const mut = useMutation({
    mutationFn: async () => {
      if (!data.company_name.trim()) throw new Error('Company name is required.');
      if (data.gst_no && !isValidGst(data.gst_no)) throw new Error('Invalid GST format.');
      if (data.contact_number && !isValidPhone(data.contact_number)) throw new Error('Invalid phone number.');
      if (editing && customer) {
        await updateCustomer(customer.id, data);
      } else {
        await createCustomer(data);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      onOpenChange(false);
    },
    onError: (e: Error) => setErr(e.message),
  });

  function update<K extends keyof CustomerUpsert>(k: K, v: CustomerUpsert[K]) {
    setData((d) => ({ ...d, [k]: v }));
    setErr(null);
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? 'Edit Customer' : 'Add Customer'}
      footer={
        <>
          <div className="flex-1" />
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => mut.mutate()}
            disabled={mut.isPending}
            className="shadow-md"
          >
            {mut.isPending ? 'Saving…' : editing ? 'Save Changes' : 'Add Customer'}
          </Button>
        </>
      }
    >
      {err && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-600 font-semibold mb-4 text-sm flex items-center gap-2 shadow-sm">
          <span className="text-red-500">✗</span> {err}
        </div>
      )}
      <div className="grid md:grid-cols-2 gap-5 mt-2">
        <div className="md:col-span-2">
          <Field label="Company / Name">
            <Input
              autoFocus
              value={data.company_name}
              onChange={(e) => update('company_name', e.target.value)}
              placeholder="Acme Printers Pvt Ltd"
            />
          </Field>
        </div>
        <Field label="Contact Person">
          <Input
            value={data.contact_person}
            onChange={(e) => update('contact_person', e.target.value)}
          />
        </Field>
        <Field label="Phone">
          <Input
            value={data.contact_number}
            onChange={(e) => update('contact_number', e.target.value)}
            inputMode="tel"
          />
        </Field>
        <Field label="Alt. Phone">
          <Input
            value={data.additional_contact}
            onChange={(e) => update('additional_contact', e.target.value)}
            inputMode="tel"
          />
        </Field>
        <Field label="Email">
          <Input
            type="email"
            value={data.email_id}
            onChange={(e) => update('email_id', e.target.value)}
          />
        </Field>
        <Field label="GST No.">
          <Input
            value={data.gst_no}
            onChange={(e) => update('gst_no', e.target.value.toUpperCase())}
          />
        </Field>
        <Field label="Address">
          <Input value={data.address} onChange={(e) => update('address', e.target.value)} />
        </Field>
        <div className="md:col-span-2">
          <Field label="Notes">
            <Textarea value={data.notes} onChange={(e) => update('notes', e.target.value)} />
          </Field>
        </div>
      </div>
    </Modal>
  );
}
