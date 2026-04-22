'use client';

import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer';
import { itemsSubtotal, jobGrandTotal } from '@/lib/domain/totals';
import type { Job } from '@/types/db';

/**
 * PDF invoice. Data source is the `Job` object as persisted — company
 * name, GST, address, etc. are the values frozen at save time on the
 * job_orders row. `customer_profiles` is deliberately NOT used, so
 * future profile edits don't mutate historical invoices.
 *
 * Rupee amounts are plain strings — react-pdf can't render a Unicode
 * '₹' glyph reliably without a registered font, so we use the plain
 * "Rs." prefix.
 */

function rupees(n: number): string {
  const v = Number.isFinite(n) ? n : 0;
  return (
    'Rs. ' +
    v.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function fmtDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: 'Helvetica', color: '#111' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 },
  brand: { fontFamily: 'Helvetica-Bold', fontSize: 18 },
  brandSub: { color: '#666', fontSize: 9, marginTop: 2 },
  hLabel: { color: '#666', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1 },
  hValue: { fontFamily: 'Helvetica-Bold', fontSize: 12, marginTop: 2 },
  metaGrid: { flexDirection: 'row', gap: 24, marginTop: 14 },
  metaCol: { flex: 1 },
  sectionTitle: {
    marginTop: 18,
    marginBottom: 6,
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#444',
  },
  customerBlock: {
    padding: 12,
    backgroundColor: '#f6f6f5',
    borderRadius: 4,
    fontSize: 10,
    lineHeight: 1.5,
  },
  table: { marginTop: 6, borderTop: '1px solid #ddd' },
  row: {
    flexDirection: 'row',
    borderBottom: '1px solid #eee',
    paddingVertical: 6,
  },
  thead: { backgroundColor: '#fafaf9', fontFamily: 'Helvetica-Bold', fontSize: 9 },
  cell: { paddingHorizontal: 4 },
  c_no: { width: '6%' },
  c_desc: { width: '46%' },
  c_qty: { width: '10%', textAlign: 'right' },
  c_unit: { width: '10%', textAlign: 'center' },
  c_rate: { width: '12%', textAlign: 'right' },
  c_amount: { width: '16%', textAlign: 'right' },
  totalsBlock: { marginTop: 16, alignItems: 'flex-end' },
  totalRow: { flexDirection: 'row', width: 220, justifyContent: 'space-between', paddingVertical: 2 },
  totalLabel: { color: '#555' },
  totalGrandRow: {
    flexDirection: 'row',
    width: 220,
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 6,
    borderTop: '1px solid #111',
  },
  totalGrand: { fontFamily: 'Helvetica-Bold', fontSize: 12 },
  notesBlock: { marginTop: 22, fontSize: 9, color: '#666', lineHeight: 1.5 },
  footer: {
    position: 'absolute',
    left: 36,
    right: 36,
    bottom: 24,
    textAlign: 'center',
    color: '#999',
    fontSize: 8,
  },
});

export function InvoiceDocument({ job }: { job: Job }) {
  const subtotal = itemsSubtotal(job.items);
  const discount = subtotal * ((job.discountPct || 0) / 100);
  const afterDisc = subtotal - discount;
  const gst = job.gstEnabled ? afterDisc * 0.18 : 0;
  const total = jobGrandTotal(job);
  const advance = Number(job.advancePaid) || 0;
  const partialSum = (job._partialPayments || []).reduce(
    (s, p) => s + (Number(p.amount) || 0),
    0,
  );
  const paid = advance + partialSum;
  const balance = Math.max(total - paid, 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.brand}>S Prints</Text>
            <Text style={styles.brandSub}>Your order receipt</Text>
          </View>
          <View>
            <Text style={styles.hLabel}>Invoice</Text>
            <Text style={styles.hValue}>#{job.jobNo}</Text>
            <View style={styles.metaGrid}>
              <View style={styles.metaCol}>
                <Text style={styles.hLabel}>Order date</Text>
                <Text style={{ marginTop: 2 }}>{fmtDate(job.orderDate)}</Text>
              </View>
              <View style={styles.metaCol}>
                <Text style={styles.hLabel}>Delivery</Text>
                <Text style={{ marginTop: 2 }}>{fmtDate(job.deliveryDate)}</Text>
              </View>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Bill to</Text>
        <View style={styles.customerBlock}>
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>{job.companyName || '—'}</Text>
          {job.contactPerson ? <Text>Contact: {job.contactPerson}</Text> : null}
          {job.contactNumber ? <Text>Phone: {job.contactNumber}</Text> : null}
          {job.emailId ? <Text>Email: {job.emailId}</Text> : null}
          {job.customerAddress ? <Text>{job.customerAddress}</Text> : null}
          {job.gstNo ? <Text>GSTIN: {job.gstNo}</Text> : null}
        </View>

        <Text style={styles.sectionTitle}>Items</Text>
        <View style={styles.table}>
          <View style={[styles.row, styles.thead]}>
            <Text style={[styles.cell, styles.c_no]}>#</Text>
            <Text style={[styles.cell, styles.c_desc]}>Description</Text>
            <Text style={[styles.cell, styles.c_qty]}>Qty</Text>
            <Text style={[styles.cell, styles.c_unit]}>Unit</Text>
            <Text style={[styles.cell, styles.c_rate]}>Rate</Text>
            <Text style={[styles.cell, styles.c_amount]}>Amount</Text>
          </View>
          {job.items.map((it, idx) => {
            const q = Number(it.quantity) || 0;
            const r = Number(it.rate) || 0;
            const line = q * r;
            const desc = [it.category, it.description, it.size, it.material, it.finishing]
              .filter(Boolean)
              .join(' · ');
            return (
              <View key={it.id} style={styles.row}>
                <Text style={[styles.cell, styles.c_no]}>{idx + 1}</Text>
                <Text style={[styles.cell, styles.c_desc]}>{desc || '—'}</Text>
                <Text style={[styles.cell, styles.c_qty]}>{q}</Text>
                <Text style={[styles.cell, styles.c_unit]}>{it.unit || 'Nos'}</Text>
                <Text style={[styles.cell, styles.c_rate]}>{rupees(r)}</Text>
                <Text style={[styles.cell, styles.c_amount]}>{rupees(line)}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.totalsBlock}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text>{rupees(subtotal)}</Text>
          </View>
          {job.discountPct ? (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Discount ({job.discountPct}%)</Text>
              <Text>- {rupees(discount)}</Text>
            </View>
          ) : null}
          {job.gstEnabled ? (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>GST 18%</Text>
              <Text>{rupees(gst)}</Text>
            </View>
          ) : null}
          <View style={styles.totalGrandRow}>
            <Text style={styles.totalGrand}>Total</Text>
            <Text style={styles.totalGrand}>{rupees(total)}</Text>
          </View>
          {paid > 0 ? (
            <>
              <View style={[styles.totalRow, { marginTop: 8 }]}>
                <Text style={styles.totalLabel}>Paid</Text>
                <Text>{rupees(paid)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={[styles.totalLabel, { fontFamily: 'Helvetica-Bold' }]}>Balance</Text>
                <Text style={{ fontFamily: 'Helvetica-Bold' }}>{rupees(balance)}</Text>
              </View>
            </>
          ) : null}
        </View>

        <View style={styles.notesBlock}>
          <Text>Status: {job.jobStatus}</Text>
          <Text>Payment: {job.paymentStatus}</Text>
        </View>

        <Text style={styles.footer} render={() => `S Prints · Invoice #${job.jobNo}`} fixed />
      </Page>
    </Document>
  );
}
