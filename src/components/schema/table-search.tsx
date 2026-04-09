import React, { useState, useEffect } from 'react';
import { useSchema } from '@/hooks/use-schema';
import { useCanvasState } from '@/features/schema/hooks/use-canvas-state';
import { Search } from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useReactFlow } from '@xyflow/react';

export default function TableSearch() {
  const [open, setOpen] = useState(false);
  const tables = useSchema((s) => s.tables);
  const selectNode = useCanvasState((s) => s.selectNode);
  const { fitView } = useReactFlow();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'p' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleSelect = (tableId: string) => {
    setOpen(false);
    selectNode(tableId);
    // Give it a moment to render selected state
    setTimeout(() => {
      fitView({ nodes: [{ id: tableId }], duration: 500, maxZoom: 1 });
    }, 50);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search tables..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Tables">
          {tables.map((table) => (
            <CommandItem key={table.id} value={table.name} onSelect={() => handleSelect(table.id)}>
              <Search className="mr-2 h-4 w-4 text-muted-foreground" />
              {table.name}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
