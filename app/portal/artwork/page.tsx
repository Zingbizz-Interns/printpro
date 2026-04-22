'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Download, ImageOff, Loader2, Paperclip, Trash2, Upload } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCustomerAuthStore } from '@/lib/auth/customer-store';
import {
  deleteArtwork,
  getArtworkSignedUrl,
  listMyArtwork,
  listMyJobProofs,
  uploadArtwork,
  type ArtworkProof,
} from '@/lib/db/customer-artwork';
import type { ArtworkSource, CustomerArtwork } from '@/types/db';

type Filter = 'all' | ArtworkSource | 'job_item';

const MAX_FILE_SIZE = 20 * 1024 * 1024;

function formatSize(bytes: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function sourceLabel(s: Filter): string {
  if (s === 'all') return 'All';
  if (s === 'quote') return 'Quote attachments';
  if (s === 'reorder') return 'Reorder attachments';
  if (s === 'upload') return 'Uploads';
  return 'Staff proofs';
}

export default function ArtworkLockerPage() {
  const user = useCustomerAuthStore((s) => s.currentUser);
  const qc = useQueryClient();
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const artworkQ = useQuery({
    queryKey: ['portal-artwork', user?.id],
    queryFn: () => listMyArtwork(user!.id),
    enabled: Boolean(user?.id),
  });

  const proofsQ = useQuery({
    queryKey: ['portal-artwork-proofs', user?.id],
    queryFn: () => listMyJobProofs(user!.id),
    enabled: Boolean(user?.id),
  });

  const del = useMutation({
    mutationFn: (args: { id: number; fileUrl: string }) => deleteArtwork(args.id, args.fileUrl),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portal-artwork', user?.id] }),
  });

  async function onPickFiles(list: FileList | null) {
    if (!list || !user) return;
    setErr(null);
    setBusy(true);
    try {
      for (const f of Array.from(list)) {
        if (f.size > MAX_FILE_SIZE) {
          setErr(`"${f.name}" is over 20 MB — please compress and retry.`);
          continue;
        }
        await uploadArtwork({
          customerUserId: user.id,
          file: f,
          source: 'upload',
        });
      }
      qc.invalidateQueries({ queryKey: ['portal-artwork', user?.id] });
    } catch (e) {
      setErr((e as Error).message || 'Upload failed.');
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  async function openSignedUrl(path: string) {
    try {
      const url = await getArtworkSignedUrl(path);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      setErr((e as Error).message || 'Could not open file.');
    }
  }

  const uploads = artworkQ.data ?? [];
  const proofs = proofsQ.data ?? [];

  const filteredUploads =
    filter === 'job_item' ? [] : filter === 'all' ? uploads : uploads.filter((u) => u.source === filter);
  const filteredProofs = filter === 'job_item' || filter === 'all' ? proofs : [];

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/portal"
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          <ArrowLeft size={14} /> Overview
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-tight">Artwork locker</h1>
          <p className="mt-1 text-muted-foreground">
            Every file you&apos;ve sent us, plus every proof we&apos;ve shown you — in one place.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInput}
            type="file"
            multiple
            className="sr-only"
            onChange={(e) => onPickFiles(e.target.files)}
          />
          <Button
            variant="primary"
            size="sm"
            onClick={() => fileInput.current?.click()}
            disabled={busy}
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            Upload files
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['all', 'upload', 'quote', 'reorder', 'job_item'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={
              'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ' +
              (filter === f
                ? 'bg-foreground text-background border-foreground'
                : 'bg-card text-muted-foreground border-border hover:text-foreground')
            }
          >
            {sourceLabel(f)}
          </button>
        ))}
      </div>

      {err && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {err}
        </div>
      )}

      {(artworkQ.isLoading || proofsQ.isLoading) && (
        <div className="py-16 text-center text-muted-foreground animate-pulse">Loading…</div>
      )}

      {!artworkQ.isLoading &&
        !proofsQ.isLoading &&
        filteredUploads.length === 0 &&
        filteredProofs.length === 0 && (
          <Card tone="muted" className="border-dashed">
            <CardBody className="py-16 text-center">
              <ImageOff className="mx-auto mb-3 text-muted-foreground" size={28} />
              <p className="font-body font-semibold text-lg">Nothing here yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Upload a file or submit a quote request and it&apos;ll show up here.
              </p>
            </CardBody>
          </Card>
        )}

      {filteredUploads.length > 0 && (
        <div>
          <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mb-3">
            Your uploads
          </div>
          <ul className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(220px,1fr))]">
            {filteredUploads.map((u) => (
              <UploadCard
                key={u.id}
                artwork={u}
                onOpen={() => openSignedUrl(u.fileUrl)}
                onDelete={() => {
                  if (window.confirm(`Delete "${u.fileName}"? This can't be undone.`)) {
                    del.mutate({ id: u.id, fileUrl: u.fileUrl });
                  }
                }}
              />
            ))}
          </ul>
        </div>
      )}

      {filteredProofs.length > 0 && (
        <div>
          <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mb-3">
            Proofs on your jobs
          </div>
          <ul className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(220px,1fr))]">
            {filteredProofs.map((p) => (
              <ProofCardItem key={`proof_${p.jobItemId}`} proof={p} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function UploadCard({
  artwork,
  onOpen,
  onDelete,
}: {
  artwork: CustomerArtwork;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const isImage = artwork.mimeType.startsWith('image/');
  return (
    <li className="group rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={onOpen}
        className="block w-full aspect-[4/3] bg-muted/40 hover:bg-muted transition-colors flex items-center justify-center"
      >
        {isImage ? (
          <Paperclip className="text-muted-foreground" size={28} />
        ) : (
          <Paperclip className="text-muted-foreground" size={28} />
        )}
      </button>
      <div className="p-3 space-y-1">
        <div className="text-sm font-medium truncate" title={artwork.fileName}>
          {artwork.fileName}
        </div>
        <div className="text-xs text-muted-foreground flex items-center justify-between gap-2">
          <span>{formatDate(artwork.uploadedAt)}</span>
          <span>{formatSize(artwork.sizeBytes)}</span>
        </div>
        <div className="flex items-center gap-1 pt-2">
          <button
            onClick={onOpen}
            className="text-xs inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2 py-1 hover:bg-muted/60"
          >
            <Download size={12} /> Open
          </button>
          <button
            onClick={onDelete}
            className="text-xs inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2 py-1 hover:bg-red-50 hover:border-red-200 hover:text-red-600"
          >
            <Trash2 size={12} /> Delete
          </button>
          <span className="ml-auto inline-flex items-center text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            {artwork.source}
          </span>
        </div>
      </div>
    </li>
  );
}

function ProofCardItem({ proof }: { proof: ArtworkProof }) {
  return (
    <li className="group rounded-xl border border-border bg-card overflow-hidden">
      <a
        href={proof.imageUrl}
        target="_blank"
        rel="noreferrer"
        className="block w-full aspect-[4/3] bg-muted/40"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={proof.imageUrl}
          alt={proof.description}
          className="w-full h-full object-cover"
        />
      </a>
      <div className="p-3 space-y-1">
        <div className="text-sm font-medium truncate" title={proof.description}>
          {proof.description}
        </div>
        <div className="text-xs text-muted-foreground flex items-center justify-between gap-2">
          <Link href={`/portal/orders/${proof.jobId}`} className="hover:underline">
            Job #{proof.jobNo}
          </Link>
          <span>{proof.proofUploadedAt ? formatDate(proof.proofUploadedAt) : ''}</span>
        </div>
        <div className="pt-1">
          <span className="inline-flex items-center text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            staff proof
          </span>
        </div>
      </div>
    </li>
  );
}
