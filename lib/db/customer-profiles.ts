import { supabase } from '@/lib/supabase/client';
import type { CustomerProfileRow } from '@/types/db';

export type CustomerProfileUpdate = Partial<
  Pick<
    CustomerProfileRow,
    | 'name'
    | 'company_name'
    | 'contact_number'
    | 'gst_no'
    | 'billing_address'
    | 'gst_certificate_url'
    | 'email_prefs'
  >
>;

/** Read current customer profile. RLS scopes to the signed-in user. */
export async function getMyProfile(
  customerUserId: string,
): Promise<CustomerProfileRow | null> {
  const { data, error } = await supabase()
    .from('customer_profiles')
    .select('*')
    .eq('id', customerUserId)
    .maybeSingle();
  if (error) throw error;
  return (data as CustomerProfileRow | null) ?? null;
}

export async function updateMyProfile(
  customerUserId: string,
  patch: CustomerProfileUpdate,
): Promise<void> {
  const { error } = await supabase()
    .from('customer_profiles')
    .update(patch)
    .eq('id', customerUserId);
  if (error) throw error;
}
