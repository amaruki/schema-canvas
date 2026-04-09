import React from 'react';
import { useCanvasState, type DetailLevel } from '@/features/schema/hooks/use-canvas-state';
import { Button } from '@/components/ui/button';
import { LayoutList, List, Heading, Baseline } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DetailLevelToggle() {
  const detailLevel = useCanvasState((s) => s.detailLevel);
  const setDetailLevel = useCanvasState((s) => s.setDetailLevel);

  const levels: { value: DetailLevel; title: string; icon: React.ReactNode }[] = [
    { value: 'compact', title: 'Compact (Names only)', icon: <Heading className="h-4 w-4" /> },
    { value: 'keys-only', title: 'Keys Only (PK/FK/UQ)', icon: <Baseline className="h-4 w-4" /> },
    { value: 'standard', title: 'Standard (All columns)', icon: <List className="h-4 w-4" /> },
    { value: 'detailed', title: 'Detailed (Info + Meta)', icon: <LayoutList className="h-4 w-4" /> },
  ];

  return (
    <div className="flex bg-muted/30 p-1 rounded-md border border-border">
      {levels.map((lvl) => (
        <Button
          key={lvl.value}
          variant="ghost"
          size="sm"
          className={cn('h-7 px-2 transition-colors', detailLevel === lvl.value ? 'bg-background shadow-sm' : 'hover:bg-muted/50')}
          onClick={() => setDetailLevel(lvl.value)}
          title={lvl.title}
        >
          {lvl.icon}
        </Button>
      ))}
    </div>
  );
}
