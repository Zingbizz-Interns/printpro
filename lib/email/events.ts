/**
 * Shared type for portal email events. Lives outside
 * `lib/email/dispatch.ts` so the client can import the type without
 * pulling in the server-only dispatcher module.
 */
export type PortalEvent =
  | {
      type: 'welcome';
      customerUserId: string;
      /** Pass-through from the signup response — lets the dispatcher
       *  avoid racing `handle_new_customer_user()` replication. */
      email: string;
      name: string;
    }
  | { type: 'proof-ready'; jobItemId: number }
  | { type: 'proof-approved'; reviewId: number }
  | { type: 'proof-changes-requested'; reviewId: number }
  | { type: 'ready-for-pickup'; jobId: number }
  | { type: 'delivered'; jobId: number }
  | { type: 'quote-requested'; jobId: number };
