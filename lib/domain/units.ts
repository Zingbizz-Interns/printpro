/** Allowed unit values for line items. Single source of truth — staff
 * job form, customer portal quote form, and any future unit selector
 * must import from here. */
export const UNIT_OPTIONS = ['Nos', 'Pcs', 'Sets', 'Pages', 'Sq.ft', 'Mtrs'] as const;

export type Unit = (typeof UNIT_OPTIONS)[number];
