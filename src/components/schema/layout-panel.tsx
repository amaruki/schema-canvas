"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LayoutGrid, GitBranch, Wind, Circle, Sparkles, Warehouse } from "lucide-react";
import { AutoLayout } from "@/lib/layout/auto-layout";
import type { Table, Relationship } from "@/types/schema";

interface LayoutPanelProps {
  tables: Table[];
  relationships: Relationship[];
  onLayout: (tables: Table[]) => void;
}

const ALGORITHMS = [
  { key: "grid" as const, label: "Grid", icon: LayoutGrid },
  { key: "hierarchical" as const, label: "Tree", icon: GitBranch },
  { key: "force-directed" as const, label: "Force", icon: Wind },
  { key: "circular" as const, label: "Radial", icon: Circle },
  { key: "warehouse" as const, label: "Warehouse", icon: Warehouse },
];

const LayoutPanel: React.FC<LayoutPanelProps> = ({ tables, relationships, onLayout }) => {
  if (tables.length === 0) return null;

  const runLayout = (algorithm: "grid" | "hierarchical" | "force-directed" | "circular" | "warehouse") => {
    const result = AutoLayout.layoutTables(tables, relationships, { algorithm });
    onLayout(result);
  };

  const runAuto = () => {
    const algorithm = AutoLayout.recommendLayout(tables, relationships);
    const result = AutoLayout.layoutTables(tables, relationships, { algorithm });
    onLayout(result);
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-0.5 bg-card/95 backdrop-blur-sm border border-border rounded-lg shadow-md px-1 py-0.5">
        {ALGORITHMS.map(({ key, label, icon: Icon }) => (
          <Tooltip key={key}>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-accent"
                onClick={() => runLayout(key)}
              >
                <Icon className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {label} Layout
            </TooltipContent>
          </Tooltip>
        ))}
        <div className="w-px h-4 bg-border mx-0.5" />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              className="h-7 text-[10px] px-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
              onClick={runAuto}
            >
              <Sparkles className="h-3 w-3 mr-1" />
              Auto
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            Auto-detect best layout
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};

export default LayoutPanel;
