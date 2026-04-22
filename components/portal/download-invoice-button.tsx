'use client';

import { Download } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { Job } from '@/types/db';

/**
 * Client-side PDF generation. The @react-pdf/renderer package is
 * heavy, so we `next/dynamic`-import it and only run on click —
 * nothing is shipped in the main bundle for this button.
 */
export function DownloadInvoiceButton({ job }: { job: Job }) {
  const [busy, setBusy] = useState(false);

  async function handle() {
    setBusy(true);
    try {
      const [{ pdf }, { InvoiceDocument }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/lib/pdf/invoice'),
      ]);
      const blob = await pdf(<InvoiceDocument job={job} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${job.jobNo}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handle} disabled={busy}>
      <Download size={16} />
      {busy ? 'Preparing…' : 'Download invoice'}
    </Button>
  );
}
