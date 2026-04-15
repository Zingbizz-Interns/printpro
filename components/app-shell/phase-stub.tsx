import Link from 'next/link';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StickyNote } from '@/components/ui/sticky-note';

export function Phase4Stub({ title, phase }: { title: string; phase: string }) {
  return (
    <main className="max-w-2xl mx-auto px-6 py-16">
      <StickyNote tilt="l2">{phase}</StickyNote>
      <Card tone="paper" decoration="tape" tilt="r" wobbly="alt" className="mt-6">
        <CardHeader>
          <CardTitle className="text-4xl">{title}</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <p className="text-lg text-pencil/70">
            This screen ships in {phase}. Phase 3 (the board) is live — poke around there.
          </p>
          <Link href="/kanban">
            <Button variant="primary">← Back to the board</Button>
          </Link>
        </CardBody>
      </Card>
    </main>
  );
}
