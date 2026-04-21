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
    <main className="px-4 sm:px-8 py-8 space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-4xl md:text-5xl font-body font-bold text-foreground tracking-tight">
          What We Print
        </h1>
        <p className="text-muted-foreground mt-3 font-medium text-lg">
          Renaming a product cascades to every existing item that uses it.
        </p>
      </div>

      {/* Search + add */}
      {isOwner && (
        <div className="bg-card border border-border shadow-sm rounded-3xl p-6">
          <label className="font-body font-bold text-lg text-foreground block mb-4">Add Product Category</label>
          <div className="flex gap-4 flex-wrap">
            <Input
              value={adding}
              onChange={(e) => {
                setAdding(e.target.value);
                clearErr();
              }}
              onKeyDown={(e) => e.key === 'Enter' && addMut.mutate()}
              placeholder="e.g. Visiting Card, Banner, Brochure…"
              className="flex-1 min-w-[240px] shadow-inner"
            />
            <Button
              type="button"
              variant="primary"
              onClick={() => addMut.mutate()}
              disabled={addMut.isPending || !adding.trim()}
              className="shadow-md"
            >
              <Plus size={16} strokeWidth={2.5} className="mr-1.5" /> Add
            </Button>
          </div>
          {err && (
            <div className="mt-4 text-sm font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2 flex items-center gap-2 shadow-sm">
              <span className="text-red-500">✗</span> {err}
            </div>
          )}
        </div>
      )}

      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" strokeWidth={2} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products…"
          className="w-full pl-11 pr-11 py-3 border border-border rounded-xl bg-card shadow-sm placeholder:text-muted-foreground focus:border-transparent focus:ring-2 focus:ring-ring transition-all"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X size={16} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {productsQ.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted/30 border border-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center rounded-3xl bg-muted/30 border-dashed border-border shadow-sm">
          <CardBody>
            <p className="text-xl text-muted-foreground font-medium">
              {products.length === 0 ? 'No products yet.' : 'Nothing matches your search.'}
            </p>
          </CardBody>
        </Card>
      ) : (
        <ol className="space-y-3">
          {filtered.map((p, i) => (
            <li
              key={p.id}
              className="flex items-center gap-4 bg-card border border-border rounded-xl shadow-sm px-6 py-4 hover:shadow-md transition-all group"
            >
              <span className="font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded flex-shrink-0 font-medium">
                {String(i + 1).padStart(2, '0')}
              </span>

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
                    className="flex-1 min-w-0"
                  />
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => renameMut.mutate()}
                      disabled={renameMut.isPending}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-foreground text-white font-semibold rounded-lg text-sm hover:bg-foreground/90 transition-colors shadow-sm"
                    >
                      <Check size={14} strokeWidth={3} /> Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(null)}
                      className="px-3 py-1.5 text-sm font-semibold text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : confirmDel === p.id ? (
                <>
                  <span className="flex-1 text-red-500 font-bold min-w-0 truncate">Delete "{p.name}"?</span>
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => delMut.mutate(p.id)}
                      disabled={delMut.isPending}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white font-semibold rounded-lg text-sm hover:bg-red-600 transition-colors shadow-sm"
                    >
                      <Trash2 size={14} strokeWidth={2} /> Yes, delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDel(null)}
                      className="px-3 py-1.5 text-sm font-semibold text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <span className="flex-1 font-body font-bold text-lg text-foreground min-w-0 truncate">
                    {p.name}
                  </span>
                  {isOwner ? (
                    <div className="flex gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => setEditing({ id: p.id, name: p.name })}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-muted text-muted-foreground hover:text-foreground hover:bg-border transition-all"
                      >
                        <Pencil size={14} strokeWidth={2} /> Rename
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDel(p.id)}
                        className="flex items-center justify-center p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-all"
                        aria-label="Delete"
                      >
                        <Trash2 size={16} strokeWidth={2} />
                      </button>
                    </div>
                  ) : (
                    <Badge tone="muted" className="text-xs shrink-0">Read-Only</Badge>
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
