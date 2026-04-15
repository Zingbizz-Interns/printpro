import { supabase } from '@/lib/supabase/client';
import type { CustomerRow, Job } from '@/types/db';

/** All customers, ordered (copy.html:4820). */
export async function listCustomers(): Promise<CustomerRow[]> {
  const { data, error } = await supabase()
    .from('customers')
    .select('*')
    .order('company_name');
  if (error) throw error;
  return (data ?? []) as CustomerRow[];
}

export type CustomerUpsert = Omit<CustomerRow, 'id'>;

export async function createCustomer(data: CustomerUpsert): Promise<void> {
  const { error } = await supabase().from('customers').insert(data);
  if (error) throw error;
}

export async function updateCustomer(id: number, data: Partial<CustomerUpsert>): Promise<void> {
  const { error } = await supabase()
    .from('customers')
    .update(data)
    .eq('id', id);
  if (error) throw error;
}

export async function deleteCustomer(id: number): Promise<void> {
  const { error } = await supabase().from('customers').delete().eq('id', id);
  if (error) throw error;
}

/**
 * Upsert customer from a job object. Case-insensitive match on
 * company_name; only fills in empty columns on existing records.
 * Ports syncCustomerFromJob (copy.html:4748-4789).
 */
export async function syncCustomerFromJob(j: Pick<Job, 'companyName' | 'contactPerson' | 'contactNumber' | 'emailId' | 'gstNo' | 'customerAddress' | 'additionalContact'>): Promise<void> {
  if (!j.companyName || !j.companyName.trim()) return;
  const name = j.companyName.trim();
  const sb = supabase();

  const { data: existing, error: e1 } = await sb
    .from('customers')
    .select('id, company_name, contact_person, contact_number, email_id, gst_no, address')
    .ilike('company_name', name)
    .limit(1);
  if (e1) throw e1;

  const record: CustomerUpsert = {
    company_name: name,
    contact_person: j.contactPerson || '',
    contact_number: j.contactNumber || '',
    email_id: j.emailId || '',
    gst_no: j.gstNo || '',
    address: j.customerAddress || '',
    additional_contact: j.additionalContact || '',
    notes: '',
  };

  if (existing && existing.length > 0) {
    const ex = existing[0] as CustomerRow;
    const update: Partial<CustomerUpsert> = {};
    if (!ex.contact_person && record.contact_person) update.contact_person = record.contact_person;
    if (!ex.contact_number && record.contact_number) update.contact_number = record.contact_number;
    if (!ex.email_id && record.email_id) update.email_id = record.email_id;
    if (!ex.gst_no && record.gst_no) update.gst_no = record.gst_no;
    if (!ex.address && record.address) update.address = record.address;
    if (Object.keys(update).length > 0) {
      await updateCustomer(ex.id, update);
    }
    return;
  }

  await createCustomer(record);
}
