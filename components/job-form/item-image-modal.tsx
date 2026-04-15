'use client';

import { useCallback, useState } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { fileToDataUrl, getCroppedBlob } from '@/lib/image/crop-image';
import { uploadJobImage } from '@/lib/db/storage';
import { ImagePlus, Trash2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  itemId: number | string;
  currentUrl?: string;
  onSaved: (url: string) => void;
  onRemove: () => void;
}

export function ItemImageModal({
  open,
  onOpenChange,
  itemId,
  currentUrl,
  onSaved,
  onRemove,
}: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pixels, setPixels] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onCropComplete = useCallback((_: Area, areaPx: Area) => {
    setPixels(areaPx);
  }, []);

  async function onPick(files: FileList | null) {
    const f = files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      setErr('Please pick an image file.');
      return;
    }
    setErr(null);
    const url = await fileToDataUrl(f);
    setSrc(url);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  }

  async function save() {
    if (!src || !pixels) return;
    setBusy(true);
    setErr(null);
    try {
      const blob = await getCroppedBlob(src, pixels);
      const url = await uploadJobImage(itemId, blob);
      onSaved(url);
      onOpenChange(false);
      setSrc(null);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={<>🖼 Item image</>}
      description="Crop and upload. Stored in the job-images bucket."
      size="lg"
      footer={
        <>
          {currentUrl && !src && (
            <Button type="button" variant="danger" size="sm" onClick={onRemove}>
              <Trash2 size={14} strokeWidth={2.5} /> remove
            </Button>
          )}
          <div className="flex-1" />
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={save}
            disabled={busy || !src || !pixels}
          >
            {busy ? 'uploading…' : 'save image'}
          </Button>
        </>
      }
    >
      {err && (
        <div className="bg-accent-lt border-2 border-accent wobbly-sm px-3 py-2 text-accent font-bold">
          ✗ {err}
        </div>
      )}

      {/* Preview of current image when nothing picked yet */}
      {!src && currentUrl && (
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentUrl}
            alt="current"
            className="max-w-[240px] border-2 border-pencil wobbly-sm shadow-hand-soft"
          />
          <p className="text-pencil/60 italic text-sm">
            Pick a new file below to replace, or remove.
          </p>
        </div>
      )}

      {/* File picker */}
      {!src && (
        <label className="cursor-pointer flex flex-col items-center justify-center gap-2 py-10 border-2 border-dashed border-pencil/40 wobbly-md bg-postit-lt hover:bg-postit transition-colors">
          <ImagePlus size={28} strokeWidth={2.5} />
          <span className="font-display text-xl">pick an image</span>
          <span className="text-sm text-pencil/60 italic">jpeg / png — any size</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onPick(e.target.files)}
          />
        </label>
      )}

      {/* Cropper */}
      {src && (
        <div className="space-y-3">
          <div className="relative w-full h-[400px] bg-muted border-2 border-pencil wobbly-sm overflow-hidden">
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              aspect={1}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              showGrid
              objectFit="contain"
            />
          </div>
          <label className="flex items-center gap-3">
            <span className="text-sm font-bold">zoom</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1 accent-ink"
            />
            <span className="font-mono text-sm">{zoom.toFixed(2)}×</span>
            <button
              type="button"
              onClick={() => setSrc(null)}
              className="text-sm text-pencil/60 underline decoration-dashed hover:text-accent"
            >
              pick different
            </button>
          </label>
        </div>
      )}
    </Modal>
  );
}
