'use client';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardBody, CardFooter } from '@/components/ui/card';
import { Input, Textarea, Field } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DashedDivider } from '@/components/ui/dashed-divider';
import { StickyNote } from '@/components/ui/sticky-note';
import { Arrow } from '@/components/decorations/arrow';
import { Squiggle, Underline } from '@/components/decorations/squiggle';
import { CornerMarks } from '@/components/decorations/corner-marks';
import { Thumbtack } from '@/components/decorations/thumbtack';
import { Printer, Package, TrendingUp, Users, FileText, Bell } from 'lucide-react';

export default function Showcase() {
  return (
    <main className="max-w-5xl mx-auto px-6 py-20">
      {/* ── HERO ───────────────────────────────────────── */}
      <section className="relative mb-24">
        <StickyNote tilt="l2" className="mb-6">
          ✎ Phase 1 · Design System
        </StickyNote>

        <h1 className="text-6xl md:text-7xl leading-[1.05] mb-4">
          S Prints
          <span className="inline-block ml-3 animate-[sway_4s_ease-in-out_infinite] text-accent">!</span>
        </h1>

        <div className="relative inline-block mb-8">
          <p className="text-2xl md:text-3xl text-pencil/80">
            Hand-drawn job orders for real print shops.
          </p>
          <Underline className="absolute -bottom-3 left-0 w-48 h-3" />
        </div>

        <div className="flex flex-wrap gap-4 items-center">
          <Button variant="primary" size="lg">
            <Printer size={22} strokeWidth={2.5} /> Open the board
          </Button>
          <Button variant="secondary" size="lg">View a demo job</Button>
          <Arrow className="hidden md:block h-20 w-40 -rotate-[18deg]" />
        </div>

        <div
          aria-hidden
          className="hidden md:block absolute -right-8 top-8 h-24 w-24 bg-postit border-2 border-pencil shadow-hand wobbly-circle animate-bounce-slow"
        />
      </section>

      {/* ── PALETTE ────────────────────────────────────── */}
      <section className="mb-20">
        <SectionTitle>Palette</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8">
          {[
            ['Paper', 'bg-paper', 'text-pencil'],
            ['Pencil', 'bg-pencil', 'text-white'],
            ['Muted', 'bg-muted', 'text-pencil'],
            ['Accent', 'bg-accent', 'text-white'],
            ['Ink', 'bg-ink', 'text-white'],
            ['Post-it', 'bg-postit', 'text-pencil'],
            ['Leaf', 'bg-leaf', 'text-white'],
            ['Amber', 'bg-amber-sketch', 'text-white'],
          ].map(([name, bg, text], i) => (
            <div
              key={name}
              className={`${bg} ${text} border-2 border-pencil shadow-hand wobbly-md p-5 font-display text-lg`}
              style={{ transform: `rotate(${(i % 2 === 0 ? -1 : 1) * ((i % 3) + 0.5)}deg)` }}
            >
              {name}
            </div>
          ))}
        </div>
      </section>

      {/* ── BUTTONS ────────────────────────────────────── */}
      <section className="mb-20">
        <SectionTitle>Buttons</SectionTitle>
        <div className="flex flex-wrap gap-5 mt-8 items-center">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ink">Ink</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="primary" size="sm">Small</Button>
          <Button variant="primary" size="lg">Large</Button>
          <Button variant="primary" disabled>Disabled</Button>
        </div>
        <p className="mt-4 text-pencil/60 italic">
          Hover: background floods red, shadow reduces, button translates 2px.
          Active: shadow disappears completely — the button "presses flat".
        </p>
      </section>

      {/* ── CARDS ──────────────────────────────────────── */}
      <section className="mb-20">
        <SectionTitle>Cards</SectionTitle>
        <div className="grid md:grid-cols-3 gap-8 mt-8">
          <Card tone="paper" decoration="tape" tilt="l" hoverLift>
            <CardHeader>
              <CardTitle>Plain Paper</CardTitle>
            </CardHeader>
            <CardBody>
              <p>Standard card with tape decoration. Hover lifts it slightly.</p>
            </CardBody>
            <CardFooter>
              <Badge tone="ink">Default</Badge>
            </CardFooter>
          </Card>

          <Card tone="postit" decoration="tack" tilt="r" wobbly="alt" hoverLift>
            <CardHeader>
              <CardTitle>Post-it</CardTitle>
            </CardHeader>
            <CardBody>
              <p>Yellow post-it with red thumbtack. Use for feature callouts.</p>
            </CardBody>
            <CardFooter>
              <Badge tone="accent">Featured</Badge>
            </CardFooter>
          </Card>

          <Card tone="paper" wobbly="blob" tilt="l2" hoverLift>
            <CardHeader>
              <CardTitle>Blob Shape</CardTitle>
            </CardHeader>
            <CardBody>
              <p>Organic blob border, no decoration. Great for stat tiles.</p>
            </CardBody>
            <CardFooter>
              <Badge tone="leaf" dashed>Draft</Badge>
            </CardFooter>
          </Card>
        </div>
      </section>

      {/* ── BADGES ─────────────────────────────────────── */}
      <section className="mb-20">
        <SectionTitle>Badges</SectionTitle>
        <div className="flex flex-wrap gap-3 mt-8">
          <Badge tone="paper">Not Started</Badge>
          <Badge tone="ink">In Progress</Badge>
          <Badge tone="amber">In Printing</Badge>
          <Badge tone="postit">Ready</Badge>
          <Badge tone="leaf">Delivered</Badge>
          <Badge tone="accent">Overdue</Badge>
          <Badge tone="muted" dashed>Draft</Badge>
        </div>
      </section>

      {/* ── INPUTS ─────────────────────────────────────── */}
      <section className="mb-20">
        <SectionTitle>Inputs</SectionTitle>
        <div className="grid md:grid-cols-2 gap-6 mt-8 max-w-2xl">
          <Field label="Company">
            <Input placeholder="Acme Printers Pvt Ltd" />
          </Field>
          <Field label="Phone" hint="10 digits, no spaces">
            <Input placeholder="98765 43210" />
          </Field>
          <Field label="GST No." error="Invalid GST format">
            <Input placeholder="22AAAAA0000A1Z5" defaultValue="WRONG" />
          </Field>
          <Field label="Delivery Date">
            <Input type="date" />
          </Field>
          <div className="md:col-span-2">
            <Field label="Special notes">
              <Textarea placeholder="Anything the print team should know…" />
            </Field>
          </div>
        </div>
      </section>

      {/* ── HYBRID DATA TABLE (the "restrained" half) ─── */}
      <section className="mb-20">
        <div className="flex items-baseline gap-3 mb-2 flex-wrap">
          <SectionTitle>Hybrid Data Table</SectionTitle>
          <Badge tone="ink" dashed>lined-notebook</Badge>
        </div>
        <p className="text-pencil/70 italic mb-6">
          Wobbly frame + hand-drawn header, but straight rows and monospaced numbers so 100+ jobs stay scannable.
        </p>

        <div className="hd-table shadow-hand">
          <table className="w-full text-left">
            <thead className="bg-pencil text-white font-display text-base">
              <tr>
                <th className="px-4 py-3">Job #</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Delivery</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="font-body">
              {[
                ['#1042', 'Acme Printers', 'In Printing', 'Today', '₹12,500', '₹4,500'],
                ['#1041', 'Bluewave Media', 'Ready', 'Tomorrow', '₹8,200', '₹0'],
                ['#1040', 'Citrus Studio', 'Design Approved', '15 Apr', '₹25,000', '₹25,000'],
                ['#1039', 'Delta Pack', 'Delivered', '12 Apr', '₹6,400', '₹0'],
              ].map((row, i) => (
                <tr key={i} className="border-t border-dashed border-pencil/30 hover:bg-postit/40">
                  <td className="px-4 py-3 font-mono font-bold">{row[0]}</td>
                  <td className="px-4 py-3">{row[1]}</td>
                  <td className="px-4 py-3">
                    <Badge
                      tone={
                        row[2] === 'Delivered'
                          ? 'leaf'
                          : row[2] === 'Ready'
                            ? 'postit'
                            : row[2] === 'In Printing'
                              ? 'amber'
                              : 'ink'
                      }
                    >
                      {row[2]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">{row[3]}</td>
                  <td className="px-4 py-3 text-right font-mono">{row[4]}</td>
                  <td className={`px-4 py-3 text-right font-mono font-bold ${row[5] === '₹0' ? 'text-leaf' : 'text-accent'}`}>
                    {row[5]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── DECORATIONS ────────────────────────────────── */}
      <section className="mb-20">
        <SectionTitle>Decorations</SectionTitle>
        <div className="grid md:grid-cols-4 gap-8 mt-10">
          <Deco label="Tape">
            <div className="relative h-16 w-32 bg-white border-2 border-pencil wobbly-md">
              <div
                className="absolute left-1/2 -top-3 h-6 w-16 -translate-x-1/2 -rotate-6 bg-pencil/20"
                style={{ clipPath: 'polygon(5% 0%, 95% 10%, 100% 100%, 0% 90%)' }}
              />
            </div>
          </Deco>
          <Deco label="Thumbtack">
            <div className="relative h-16 w-32 bg-white border-2 border-pencil wobbly-md">
              <Thumbtack />
            </div>
          </Deco>
          <Deco label="Dashed Arrow">
            <Arrow className="h-20 w-40" />
          </Deco>
          <Deco label="Squiggle">
            <Squiggle className="w-40 h-6" />
          </Deco>
          <Deco label="Corner marks">
            <div className="relative h-16 w-32">
              <CornerMarks />
              <div className="h-full grid place-items-center text-pencil/50 font-mono text-sm">image</div>
            </div>
          </Deco>
          <Deco label="Sticky note">
            <StickyNote tilt="r2" tone="postit">Remember!</StickyNote>
          </Deco>
          <Deco label="Red underline">
            <div className="relative">
              <span className="text-xl">emphasized</span>
              <Underline className="absolute -bottom-2 left-0 w-full h-2" />
            </div>
          </Deco>
          <Deco label="Dashed divider">
            <div className="w-40">
              <DashedDivider />
            </div>
          </Deco>
        </div>
      </section>

      {/* ── APP PREVIEW (mini Kanban tease) ─────────────── */}
      <section className="mb-20">
        <SectionTitle>A taste of the board</SectionTitle>
        <div className="grid md:grid-cols-3 gap-6 mt-8">
          {[
            { n: '#1042', co: 'Acme Printers', st: 'In Printing', tone: 'amber' as const, items: 3, due: 'today' },
            { n: '#1041', co: 'Bluewave Media', st: 'Ready', tone: 'postit' as const, items: 1, due: 'tomorrow' },
            { n: '#1040', co: 'Citrus Studio', st: 'Design Approved', tone: 'ink' as const, items: 5, due: 'Apr 15' },
          ].map((j, i) => (
            <Card
              key={j.n}
              tone="paper"
              wobbly={i === 0 ? 'md' : i === 1 ? 'alt' : 'sm'}
              tilt={i === 0 ? 'l' : i === 1 ? 'r' : 'l2'}
              decoration={i === 1 ? 'tack' : 'none'}
              hoverLift
              className="cursor-pointer"
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-lg font-bold">{j.n}</span>
                  <Badge tone={j.tone}>{j.st}</Badge>
                </div>
                <CardTitle className="mt-2 text-2xl">{j.co}</CardTitle>
              </CardHeader>
              <CardBody className="flex items-center gap-4 text-pencil/70">
                <span className="flex items-center gap-1">
                  <Package size={16} /> {j.items} items
                </span>
                <span>·</span>
                <span>due {j.due}</span>
              </CardBody>
              <CardFooter>
                <Button variant="ghost" size="sm">✎ Edit</Button>
                <Button variant="ghost" size="sm">⧉ Clone</Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>

      {/* ── NAV ICONS TEASE ────────────────────────────── */}
      <section className="mb-20">
        <SectionTitle>Nav icons (lucide, stroke 2.5)</SectionTitle>
        <div className="flex flex-wrap gap-5 mt-8">
          {[
            { Icon: Printer, label: 'Board' },
            { Icon: Package, label: 'Jobs' },
            { Icon: Users, label: 'Customers' },
            { Icon: TrendingUp, label: 'Dashboard' },
            { Icon: FileText, label: 'Reports' },
            { Icon: Bell, label: 'Alerts' },
          ].map(({ Icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-2">
              <div className="wobbly-circle border-2 border-pencil bg-white w-14 h-14 grid place-items-center shadow-hand-soft hover:animate-[jiggle_0.4s_ease-in-out] cursor-pointer">
                <Icon size={24} strokeWidth={2.5} />
              </div>
              <span className="text-sm">{label}</span>
            </div>
          ))}
        </div>
      </section>

      <footer className="mt-24 pt-10 border-t-2 border-dashed border-pencil/30">
        <p className="text-pencil/60 text-center italic">
          Phase 1 complete — primitives ready. Next up: auth, data layer, realtime.
        </p>
      </footer>
    </main>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative inline-block">
      <h2 className="text-4xl md:text-5xl">{children}</h2>
      <Squiggle className="absolute -bottom-2 left-0 w-full h-3" />
    </div>
  );
}

function Deco({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-pencil/30 wobbly-md">
      <div className="min-h-[64px] grid place-items-center">{children}</div>
      <span className="font-display text-lg">{label}</span>
    </div>
  );
}
