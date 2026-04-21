'use client';

import { useCallback, useState } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { fileToDataUrl, getCroppedBlob } from '@/lib/image/crop-image';
import { uploadJobImage } from '@/lib/db/storage';
import { ImagePlus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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
      title={
        <div className="flex items-center gap-2">
          <ImagePlus size={24} className="text-foreground" />
          <span className="font-body font-bold tracking-tight">Item Image</span>
        </div>
      }
      description="Select and crop an image for this item."
      size="lg"
      footer={
        <>
          {currentUrl && !src && (
            <Button type="button" variant="danger" size="sm" onClick={onRemove} className="shadow-sm">
              <Trash2 size={16} strokeWidth={2.5} className="mr-1.5" /> Remove
            </Button>
          )}
          <div className="flex-1" />
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={save}
            disabled={busy || !src || !pixels}
            className="shadow-md"
          >
            {busy ? 'Uploading…' : 'Save Image'}
          </Button>
        </>
      }
    >
      <div className="mt-2 space-y-6">
        {err && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 font-semibold text-sm flex items-center gap-2 shadow-sm animate-in fade-in slide-in-from-top-2">
            <span className="text-red-500">✗</span> {err}
          </div>
        )}

        {/* Preview of current image when nothing picked yet */}
        {!src && currentUrl && (
          <div className="flex flex-col items-center gap-4 bg-muted/30 p-6 rounded-2xl border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentUrl}
              alt="current"
              className="max-w-[280px] rounded-xl border border-border shadow-md"
            />
            <p className="text-muted-foreground font-medium text-sm">
              Current image. Pick a new file below to replace it.
            </p>
          </div>
        )}

        {/* File picker */}
        {!src && (
          <label className="cursor-pointer flex flex-col items-center justify-center gap-3 py-16 border-2 border-dashed border-border rounded-2xl bg-muted/20 hover:bg-muted/50 hover:border-muted-foreground/30 transition-all group">
            <div className="bg-background rounded-full p-4 shadow-sm border border-border group-hover:scale-110 transition-transform">
              <ImagePlus size={32} strokeWidth={2} className="text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
            <div className="text-center">
              <span className="font-body font-bold text-xl block text-foreground">Upload Image</span>
              <span className="text-sm text-muted-foreground font-medium mt-1 inline-block">JPEG / PNG — Any size</span>
            </div>
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
          <div className="space-y-4">
            <div className="relative w-full h-[450px] bg-card rounded-2xl overflow-hidden border border-border shadow-inner">
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
            <div className="flex items-center gap-4 bg-muted/30 p-4 rounded-xl border border-border">
              <span className="text-sm font-semibold text-foreground uppercase tracking-wider">Zoom</span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-1 accent-foreground"
              />
              <span className="font-mono text-sm font-semibold bg-background px-2 py-1 rounded-md border border-border">{zoom.toFixed(2)}×</span>
              <button
                type="button"
                onClick={() => setSrc(null)}
                className="text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted px-3 py-1.5 rounded-lg transition-colors ml-2"
              >
                Change Image
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
