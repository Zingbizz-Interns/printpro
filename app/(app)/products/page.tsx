'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, X, Plus, Pencil, Trash2, Check } from 'lucide-react';
import { useAuthStore } from '@/lib/auth/store';
import { listProducts, addProduct, renameProduct, deleteProductByName } from '@/lib/db/products';
import { Card, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Squiggle } from '@/components/decorations/squiggle';
import { cn } from '@/lib/utils';

export default function ProductsPage() {
  const qc = useQueryClient();
  const isOwner = useAuthStore((s) => s.isOwner());

  const productsQ = useQuery({ queryKey: ['products'], queryFn: listProducts });
  const products = productsQ.data ?? [];

  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState('');
  const [editing, setEditing] = useState<{ id: number; name: string } | null>(null);
  const [confirmDel, setConfirmDel] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? products.filter((p) => p.name.toLowerCase().includes(q)) : products;
  }, [products, search]);

  function clearErr() {
    setErr(null);
  }

  const addMut = useMutation({
    mutationFn: async () => {
      const name = adding.trim();
      if (!name) throw new Error('Name required.');
      if (products.some((p) => p.name.toLowerCase() === name.toLowerCase()))
        throw new Error('Already exists.');
      await addProduct(name, products.length + 1);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      setAdding('');
      clearErr();
    },
    onError: (e: Error) => setErr(e.message),
  });

  const renameMut = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      const name = editing.name.trim();
      if (!name) throw new Error('Name required.');
      const existing = products.find((p) => p.id !== editing.id);
      if (existing && products.some((p) => p.id !== editing.id && p.name.toLowerCase() === name.toLowerCase()))
        throw new Error('Already exists.');
      const old = products.find((p) => p.id === editing.id);
      if (!old) return;
      await renameProduct(old.name, name);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['jobs'] }); // categories cascaded
      setEditing(null);
      clearErr();
    },
    onError: (e: Error) => setErr(e.message),
  });

  const delMut = useMutation({
    mutationFn: async (id: number) => {
      const p = products.find((x) => x.id === id);
      if (!p) return;
      await deleteProductByName(p.name);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      setConfirmDel(null);
    },
  });

  return (
    <main className="px-4 sm:px-6 py-6 space-y-5 max-w-3xl mx-auto">
      <div>
        <h1 className="text-4xl md:text-5xl relative inline-block">
          What we print
          <Squiggle className="absolute -bottom-2 left-0 w-full h-3" />
        </h1>
        <p className="text-pencil/70 mt-2">
          Renaming a product cascades to every existing item that uses it.
        </p>
      </div>

      {/* Search + add */}
      {isOwner && (
        <div className="bg-postit-lt border-2 border-dashed border-pencil/40 wobbly-sm p-4">
          <label className="font-display text-lg">+ Add product</label>
          <div className="flex gap-3 mt-2 flex-wrap">
            <Input
              value={adding}
              onChange={(e) => {
                setAdding(e.target.value);
                clearErr();
              }}
              onKeyDown={(e) => e.key === 'Enter' && addMut.mutate()}
              placeholder="e.g. Visiting Card, Banner, Brochure…"
              className="flex-1 min-w-[200px]"
            />
            <Button
              type="button"
              variant="primary"
              onClick={() => addMut.mutate()}
              disabled={addMut.isPending || !adding.trim()}
            >
              <Plus size={14} strokeWidth={3} /> add
            </Button>
          </div>
          {err && (
            <div className="mt-2 text-sm font-bold text-accent bg-accent-lt border border-accent wobbly-sm px-3 py-1.5">
              ✗ {err}
            </div>
          )}
        </div>
      )}

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-pencil/50" strokeWidth={2.5} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="search products…"
          className="w-full pl-9 pr-9 py-2 border-2 border-pencil wobbly-sm bg-white placeholder:text-pencil/40 placeholder:italic focus:border-ink focus:ring-2 focus:ring-ink/20"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-pencil/50 hover:text-accent">
            <X size={14} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {productsQ.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-12 bg-white/70 border-2 border-dashed border-pencil/30 wobbly-sm animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card tone="postit" decoration="tape" tilt="l" className="p-6 text-center">
          <CardBody>
            <p className="text-pencil/70">
              {products.length === 0 ? 'No products yet.' : 'Nothing matches your search.'}
            </p>
          </CardBody>
        </Card>
      ) : (
        <ol className="space-y-2">
          {filtered.map((p, i) => (
            <li
              key={p.id}
              className="flex items-center gap-3 bg-white border-2 border-pencil wobbly-sm shadow-hand-soft px-4 py-2 hover:shadow-hand transition-all"
            >
              <span className="font-mono text-pencil/50 w-8 shrink-0">{String(i + 1).padStart(2, '0')}.</span>

              {editing?.id === p.id ? (
                <>
                  <Input
                    autoFocus
                    value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') renameMut.mutate();
                      if (e.key === 'Escape') setEditing(null);
                    }}
                    className="flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => renameMut.mutate()}
                    disabled={renameMut.isPending}
                    className={cn('kb-action wobbly-sm kb-action-neutral')}
                  >
                    <Check size={12} strokeWidth={3} /> save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(null)}
                    className="text-sm text-pencil/60 underline decoration-dashed"
                  >
                    cancel
                  </button>
                </>
              ) : confirmDel === p.id ? (
                <>
                  <span className="flex-1 text-accent font-bold">Delete "{p.name}"?</span>
                  <button
                    type="button"
                    onClick={() => delMut.mutate(p.id)}
                    disabled={delMut.isPending}
                    className="kb-action wobbly-sm kb-action-danger"
                  >
                    yes, delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDel(null)}
                    className="text-sm text-pencil/60 underline decoration-dashed"
                  >
                    cancel
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 font-body text-lg">{p.name}</span>
                  {isOwner ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setEditing({ id: p.id, name: p.name })}
                        className="kb-action wobbly-sm kb-action-neutral"
                      >
                        <Pencil size={12} strokeWidth={2.5} /> rename
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDel(p.id)}
                        className="kb-action wobbly-sm kb-action-danger"
                        aria-label="Delete"
                      >
                        <Trash2 size={12} strokeWidth={2.5} />
                      </button>
                    </>
                  ) : (
                    <Badge tone="muted" className="text-xs">read-only</Badge>
                  )}
                </>
              )}
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
