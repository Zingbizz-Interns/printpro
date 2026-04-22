# S Prints — Supabase API Reference

Complete catalog of every Supabase call made by `refference/copy.html`. Sourced by grepping `sb.from(...)`, `sb.rpc(...)`, `sb.storage(...)`, `sb.channel(...)`, and `sb.removeAllChannels()` across the full file.

---

## 1. Client Setup

**CDN (line 2139):**
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.7/dist/umd/supabase.js"></script>
```

**Credentials (lines 2147–2148):**
```js
const SUPABASE_URL = 'https://yvedbgssoivvaezsvexy.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOi...'; // anon key, JWT
```

**Client init (lines 2152–2163, re-tried at 2204–2206):**
```js
sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false }
});
```

Session persistence is **off** — login state lives only in JS memory; closing the tab logs the user out.

**Teardown on logout (line 2320):**
```js
sb.removeAllChannels();
```

---

## 2. Tables & Columns

Inferred from every read/write call and the `dbToJob` / `jobToDb` / `itemToDb` / `dbToItem` mappers (lines 2580–2672).

### `staff_accounts`
| Column        | Notes                                    |
|---------------|------------------------------------------|
| `id`          | PK, numeric                              |
| `name`        | Display name                             |
| `username`    | Unique handle                            |
| `password`    | Plaintext or SHA-256 hex (both accepted) |
| `role`        | `'owner'` \| `'staff'`                   |
| `color`       | Avatar hex (e.g. `#4f46e5`)              |
| `is_active`   | bool; inactive accounts hidden from login|

### `products`
| Column        | Notes                         |
|---------------|-------------------------------|
| `id`          | PK                            |
| `name`        | Product/category name, unique |
| `sort_order`  | Display index                 |

### `job_orders`
| Column                | Maps to (JS)         |
|-----------------------|----------------------|
| `id`                  | `id`                 |
| `job_no`              | `jobNo` (int, sequential) |
| `order_date`          | `orderDate` (nullable date) |
| `company_name`        | `companyName`        |
| `contact_person`      | `contactPerson`      |
| `contact_number`      | `contactNumber`      |
| `additional_contact`  | `additionalContact`  |
| `email_id`            | `emailId`            |
| `gst_no`              | `gstNo`              |
| `customer_address`    | `customerAddress`    |
| `delivery_date`       | `deliveryDate` (nullable date) |
| `delivery_time`       | `deliveryTime`       |
| `job_status`          | `jobStatus` (enum-like string) |
| `payment_status`      | `paymentStatus` (`Unpaid` \| `Advance Paid` \| `Fully Paid`) |
| `advance_paid`        | `advancePaid` (numeric) |
| `advance_paid_on`     | `advancePaidOn` (nullable date) |
| `balance_paid_on`     | `balancePaidOn` (nullable date) |
| `special_notes`       | `specialNotes`       |
| `gst_enabled`         | `gstEnabled` (bool)  |
| `round_off`           | `roundOff` (bool, always `true` on write) |
| `discount_pct`        | `discountPct` (numeric) |
| `created_by`          | `createdBy` (staff name) |

### `job_items`
| Column           | Maps to (JS)    |
|------------------|-----------------|
| `id`             | `id`            |
| `job_order_id`   | FK → `job_orders.id` |
| `job_no_sub`     | `jobNoSub` (e.g. `"12-1"`) |
| `category`       | `category` (matches `products.name`) |
| `description`    | `description`   |
| `size`           | `size`          |
| `material`       | `material`      |
| `specs`          | `specs`         |
| `finishing`      | `finishing`     |
| `quantity`       | `quantity` (numeric) |
| `unit`           | `unit` (default `'Nos'`) |
| `rate`           | `rate` (numeric) |
| `design_status`  | `designStatus`  |
| `print_status`   | `printStatus`   |
| `remarks`        | `remarks`       |
| `image_url`      | `imageUrl` (Storage public URL) |
| `sort_order`     | `sortOrder` (idx) |

### `partial_payments`
| Column          | Notes                               |
|-----------------|-------------------------------------|
| `id`            | PK                                  |
| `job_order_id`  | FK → `job_orders.id`                |
| `amount`        | numeric                             |
| `paid_on`       | date                                |
| `note`          | `"<mode> · <reference>"` (e.g. `"UPI · TXN1234"`) |

### `customers`
| Column                | Notes |
|-----------------------|-------|
| `id`                  | PK |
| `company_name`        | Matched case-insensitively (`ilike`) for dedup |
| `contact_person`      | |
| `contact_number`      | |
| `additional_contact`  | |
| `email_id`            | |
| `gst_no`              | Uppercased on save |
| `address`             | |
| `notes`               | |

---

## 3. Database Calls — By Table

### 3.1 `staff_accounts`

| Op | Line | Code |
|----|------|------|
| SELECT all, ordered | 2181 | `sb.from('staff_accounts').select('*').order('name')` |
| SELECT active only | 2208 | `sb.from('staff_accounts').select('*').eq('is_active', true).order('name')` |
| UPDATE (edit) | 2454 | `sb.from('staff_accounts').update(data).eq('id', _editStaffId)` |
| INSERT (create) | 2457 | `sb.from('staff_accounts').insert(data)` |
| UPDATE active toggle | 2467 | `sb.from('staff_accounts').update({ is_active: active }).eq('id', id)` |
| UPDATE password | 2480 | `sb.from('staff_accounts').update({ password: newPw }).eq('id', id)` |
| DELETE | 2488 | `sb.from('staff_accounts').delete().eq('id', id)` |

`data` shape for insert/update: `{ name, username, password, role, color, is_active: true }`.

### 3.2 `products`

| Op | Line | Code |
|----|------|------|
| SELECT all, sorted | 2573 | `sb.from('products').select('*').order('sort_order')` |
| SELECT id by name | 2814 | `sb.from('products').select('id').eq('name', name).single()` |
| DELETE by id | 2815 | `sb.from('products').delete().eq('id', data.id)` |
| UPDATE rename | 2831 | `sb.from('products').update({ name: v }).eq('name', oldName)` |
| INSERT | 2846 | `sb.from('products').insert({ name: v, sort_order: sortOrder })` |

When a product is renamed, **all `job_items` referencing the old name are cascaded** (line 2833):
```js
sb.from('job_items').update({ category: v }).eq('category', oldName);
```

### 3.3 `job_orders` (+ nested `job_items`)

| Op | Line | Code |
|----|------|------|
| SELECT with join | 2564 | `sb.from('job_orders').select('*, job_items(*)').order('job_no', { ascending: true })` |
| DELETE by id (card) | 3258 | `sb.from('job_orders').delete().eq('id', id)` |
| UPDATE payment_status | 4558 | `sb.from('job_orders').update({ payment_status: ns }).eq('id', j.id)` |
| UPDATE job_status | 4605 | `sb.from('job_orders').update({ job_status: ns }).eq('id', j.id)` |
| SELECT max job_no (fallback) | 4627 | `sb.from('job_orders').select('job_no').order('job_no', { ascending: false }).limit(1)` |
| INSERT new order (returns row) | 4634 | `sb.from('job_orders').insert(jobToDb(d)).select().single()` |
| DELETE (form) | 4659 | `sb.from('job_orders').delete().eq('id', id)` |
| INSERT from form | 4675 | `sb.from('job_orders').insert(jobToDb(j)).select().single()` |
| UPDATE full order | 4693 | `sb.from('job_orders').update(jobToDb(j)).eq('id', j.id)` |

### 3.4 `job_items`

| Op | Line | Code |
|----|------|------|
| Cascade rename (from products) | 2833 | `sb.from('job_items').update({ category: v }).eq('category', oldName)` |
| INSERT all items (returns rows) | 4638 | `sb.from('job_items').insert(itemRows).select()` |
| INSERT after save (returns rows) | 4680 | `sb.from('job_items').insert(itemRows).select()` |
| DELETE all for a job | 4696 | `sb.from('job_items').delete().eq('job_order_id', j.id)` |
| INSERT on update (returns rows) | 4699 | `sb.from('job_items').insert(itemRows).select()` |

**Save-update pattern (lines 4693–4701):** on existing-order save, the app `UPDATE`s `job_orders`, then `DELETE`s all `job_items` for that order, then re-`INSERT`s the full item array. No per-item diff; simple full replacement.

### 3.5 `partial_payments`

| Op | Line | Code |
|----|------|------|
| SELECT for job (inline) | 4520 | `sb.from('partial_payments').select('*').eq('job_order_id', jobId).order('paid_on')` |
| INSERT (inline) | 4569 | `sb.from('partial_payments').insert({ job_order_id: jobId, amount: amt, paid_on: dt, note: mode+(note?' · '+note:'') })` |
| DELETE (inline) | 4581 | `sb.from('partial_payments').delete().eq('id', payId)` |
| SELECT for job (modal) | 5652 | `sb.from('partial_payments').select('*').eq('job_order_id', jobId).order('paid_on')` |
| INSERT (modal) | 5685 | `sb.from('partial_payments').insert({ job_order_id, amount, paid_on, note })` |
| DELETE (modal) | 5696 | `sb.from('partial_payments').delete().eq('id', payId)` |

**Note convention:** `note` is always stored as `"<PaymentMode> · <FreeText>"`. Modes: `UPI`, `Cash`, `Bank Transfer`, `Cheque`, `Card`.

### 3.6 `customers`

| Op | Line | Code |
|----|------|------|
| SELECT by name (case-insensitive) | 4753 | `sb.from('customers').select('id, company_name, contact_person, contact_number, email_id, gst_no, address').ilike('company_name', name).limit(1)` |
| UPDATE missing fields | 4779 | `sb.from('customers').update(update).eq('id', ex.id)` |
| INSERT new | 4783 | `sb.from('customers').insert(record)` |
| SELECT all, ordered | 4820 | `sb.from('customers').select('*').order('company_name')` |
| UPDATE (edit modal) | 4925 | `sb.from('customers').update(data).eq('id', editId)` |
| INSERT (add modal) | 4928 | `sb.from('customers').insert(data)` |
| DELETE | 4937 | `sb.from('customers').delete().eq('id', id)` |

---

## 4. RPC

**`get_next_job_no`** (line 4624):
```js
const { data: rpcNo, error: noErr } = await sb.rpc('get_next_job_no');
```
Returns the next sequential `job_no` (integer). On error or `null`, the app falls back to `SELECT max(job_no) + 1` (line 4627).

---

## 5. Storage

**Bucket:** `job-images` (public).

**Upload** (line 5523):
```js
const fileName = 'item_' + _imgTargetItemId + '_' + Date.now() + '.jpg';
const { data, error } = await sb.storage
  .from('job-images')
  .upload(fileName, blob, { contentType: 'image/jpeg', upsert: true });
```

**Get public URL** (line 5525):
```js
const { data: urlData } = sb.storage.from('job-images').getPublicUrl(fileName);
// urlData.publicUrl → stored in job_items.image_url
```

Images are Cropper.js-cropped JPEGs (max 1200×1200, quality 0.88) uploaded with `upsert: true` so re-crops overwrite cleanly.

---

## 6. Realtime

**Single channel `print-pro-changes`** (lines 2678–2708), subscribing to 3 tables:

```js
sb.channel('print-pro-changes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'job_orders' }, handler)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'job_items' },  handler)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' },  handler)
  .subscribe((status) => { /* flip live-dot on SUBSCRIBED */ });
```

- Each handler reloads all data (`loadAllData()` → `loadJobs`, `loadProducts`, `loadCustomers`) and re-renders the current view.
- **`products` is not subscribed to** — product changes do not broadcast; relies on page reload.
- **`partial_payments` is not subscribed to** — payment changes only reflect for the user who made them until another realtime event triggers a full reload.
- **`staff_accounts` is not subscribed to** — staff changes require re-login.
- Status `SUBSCRIBED` turns the green live-dot on (`#realtimeDot`).
- Disconnect: `sb.removeAllChannels()` on logout (line 2320).

---

## 7. Auth Model

No use of `sb.auth.*`. Authentication is application-level:

1. `loadStaffAccounts()` pulls `staff_accounts` with the anon key.
2. User picks avatar → enters password.
3. Password compared both as plaintext and SHA-256 hex (`crypto.subtle.digest`) against `staff_accounts.password`.
4. On success, `password` is wiped from in-memory `staffAccounts` and `currentUser`.
5. All subsequent queries use the same anon key — **authorization is client-enforced** via `isOwner()` gates.

**Security implication:** the anon key has full CRUD on all tables. RLS, if present, must be permissive enough for anon or the queries would fail. Role enforcement is UI-only.

---

## 8. Load Orchestration

`loadAllData()` (line 2560):
```js
await Promise.all([loadJobs(), loadProducts(), loadCustomers()]);
```

Called on login and from every realtime handler. `loadStaffAccounts()` is called separately on boot and after staff-management mutations.

---

## 9. Error Handling

- All destructive ops use `confirm()` before firing.
- Errors toast `error.message` via `toast('Error: '+e.message,'❌')`.
- `loadJobs` calls `showDbError(error)` which special-cases PostgREST codes `42P01` (missing tables) and `PGRST301` (RLS) with setup hints.

---

## 10. Quick Call Index

Every single `sb.*` call site in the file:

| Line | Call |
|------|------|
| 2181 | `sb.from('staff_accounts').select('*').order('name')` |
| 2208 | `sb.from('staff_accounts').select('*').eq('is_active',true).order('name')` |
| 2320 | `sb.removeAllChannels()` |
| 2454 | `sb.from('staff_accounts').update(data).eq('id', _editStaffId)` |
| 2457 | `sb.from('staff_accounts').insert(data)` |
| 2467 | `sb.from('staff_accounts').update({is_active}).eq('id', id)` |
| 2480 | `sb.from('staff_accounts').update({password}).eq('id', id)` |
| 2488 | `sb.from('staff_accounts').delete().eq('id', id)` |
| 2564 | `sb.from('job_orders').select('*, job_items(*)').order('job_no')` |
| 2573 | `sb.from('products').select('*').order('sort_order')` |
| 2678 | `sb.channel('print-pro-changes').on(...).on(...).on(...).subscribe(...)` |
| 2814 | `sb.from('products').select('id').eq('name', name).single()` |
| 2815 | `sb.from('products').delete().eq('id', data.id)` |
| 2831 | `sb.from('products').update({name}).eq('name', oldName)` |
| 2833 | `sb.from('job_items').update({category}).eq('category', oldName)` |
| 2846 | `sb.from('products').insert({name, sort_order})` |
| 3258 | `sb.from('job_orders').delete().eq('id', id)` |
| 4520 | `sb.from('partial_payments').select('*').eq('job_order_id', jobId).order('paid_on')` |
| 4558 | `sb.from('job_orders').update({payment_status}).eq('id', j.id)` |
| 4569 | `sb.from('partial_payments').insert({...})` |
| 4581 | `sb.from('partial_payments').delete().eq('id', payId)` |
| 4605 | `sb.from('job_orders').update({job_status}).eq('id', j.id)` |
| 4624 | `sb.rpc('get_next_job_no')` |
| 4627 | `sb.from('job_orders').select('job_no').order('job_no', {ascending:false}).limit(1)` |
| 4634 | `sb.from('job_orders').insert(jobToDb(d)).select().single()` |
| 4638 | `sb.from('job_items').insert(itemRows).select()` |
| 4659 | `sb.from('job_orders').delete().eq('id', id)` |
| 4675 | `sb.from('job_orders').insert(jobToDb(j)).select().single()` |
| 4680 | `sb.from('job_items').insert(itemRows).select()` |
| 4693 | `sb.from('job_orders').update(jobToDb(j)).eq('id', j.id)` |
| 4696 | `sb.from('job_items').delete().eq('job_order_id', j.id)` |
| 4699 | `sb.from('job_items').insert(itemRows).select()` |
| 4753 | `sb.from('customers').select(...).ilike('company_name', name).limit(1)` |
| 4779 | `sb.from('customers').update(update).eq('id', ex.id)` |
| 4783 | `sb.from('customers').insert(record)` |
| 4820 | `sb.from('customers').select('*').order('company_name')` |
| 4925 | `sb.from('customers').update(data).eq('id', editId)` |
| 4928 | `sb.from('customers').insert(data)` |
| 4937 | `sb.from('customers').delete().eq('id', id)` |
| 5523 | `sb.storage.from('job-images').upload(fileName, blob, {contentType, upsert:true})` |
| 5525 | `sb.storage.from('job-images').getPublicUrl(fileName)` |
| 5652 | `sb.from('partial_payments').select('*').eq('job_order_id', jobId).order('paid_on')` |
| 5685 | `sb.from('partial_payments').insert({...})` |
| 5696 | `sb.from('partial_payments').delete().eq('id', payId)` |
