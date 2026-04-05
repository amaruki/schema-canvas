"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { LayoutGrid, GitBranch, Wind, Circle } from "lucide-react";
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
];

const LayoutPanel: React.FC<LayoutPanelProps> = ({ tables, relationships, onLayout }) => {
  if (tables.length === 0) return null;

  const runLayout = (algorithm: "grid" | "hierarchical" | "force-directed" | "circular") => {
    const result = AutoLayout.layoutTables(tables, relationships, { algorithm });
    onLayout(result);
  };

  const runAuto = () => {
    const algorithm = AutoLayout.recommendLayout(tables, relationships);
    const result = AutoLayout.layoutTables(tables, relationships, { algorithm });
    onLayout(result);
  };

  return (
    <div className="bg-card border border-border rounded shadow-sm p-2 space-y-1.5 mb-1">
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Layout</p>
      <div className="flex gap-1">
        {ALGORITHMS.map(({ key, label, icon: Icon }) => (
          <Button
            key={key}
            size="sm"
            variant="outline"
            className="flex-1 h-7 text-[10px] flex-col gap-0.5 px-1 py-1"
            onClick={() => runLayout(key)}
            title={label}
          >
            <Icon className="h-3 w-3" />
            <span>{label}</span>
          </Button>
        ))}
      </div>
      <Button
        size="sm"
        className="w-full h-7 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
        onClick={runAuto}
      >
        Auto
      </Button>
    </div>
  );
};

export default LayoutPanel;
