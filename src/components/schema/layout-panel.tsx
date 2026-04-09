"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  LayoutGrid,
  GitBranch,
  Wind,
  Circle,
  Warehouse,
  Sparkles,
  List,
  LayoutList,
  Maximize2,
  Table2,
  KeyRound,
  Layers,
  ChevronUp,
} from "lucide-react";
import { AutoLayout } from "@/lib/layout/auto-layout";
import { useCanvasState, type DetailLevel } from "@/features/schema/hooks/use-canvas-state";
import type { Table, Relationship } from "@/types/schema";
import { cn } from "@/lib/utils";

interface LayoutPanelProps {
  tables: Table[];
  relationships: Relationship[];
  onLayout: (tables: Table[]) => void;
  onFitView?: () => void;
}

type LayoutAlgorithm = "grid" | "hierarchical" | "force-directed" | "circular" | "warehouse";

const DETAIL_LEVELS: { value: DetailLevel; label: string; icon: React.ElementType; description: string }[] = [
  { value: "compact",   label: "Compact",  icon: Table2,     description: "Table names only" },
  { value: "keys-only", label: "Keys",     icon: KeyRound,   description: "PK / FK / UQ columns" },
  { value: "standard",  label: "Standard", icon: List,       description: "All columns" },
  { value: "detailed",  label: "Detailed", icon: LayoutList, description: "Columns + metadata" },
];

const LAYOUT_ALGORITHMS: { key: LayoutAlgorithm; label: string; icon: React.ElementType; description: string }[] = [
  { key: "grid",            label: "Grid",      icon: LayoutGrid, description: "Clean grid" },
  { key: "hierarchical",   label: "Tree",      icon: GitBranch,  description: "Parent-child tree" },
  { key: "force-directed", label: "Force",     icon: Wind,       description: "Physics spacing" },
  { key: "circular",       label: "Radial",    icon: Circle,     description: "Circular arrangement" },
  { key: "warehouse",      label: "Warehouse", icon: Warehouse,  description: "Compact warehouse" },
];

function useClickOutside<T extends HTMLElement>(ref: React.RefObject<T | null>, onClose: () => void) {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, onClose]);
}

const LayoutPanel: React.FC<LayoutPanelProps> = ({ tables, relationships, onLayout, onFitView }) => {
  const detailLevel = useCanvasState((s) => s.detailLevel);
  const setDetailLevel = useCanvasState((s) => s.setDetailLevel);
  const [busy, setBusy] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<"view" | "arrange" | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  useClickOutside(containerRef, () => setOpenMenu(null));

  if (tables.length === 0) return null;

  const toggle = (menu: "view" | "arrange") =>
    setOpenMenu((prev) => (prev === menu ? null : menu));

  const runLayout = (algorithm: LayoutAlgorithm) => {
    setBusy(algorithm);
    onLayout(AutoLayout.layoutTables(tables, relationships, { algorithm }));
    setTimeout(() => setBusy(null), 500);
    setOpenMenu(null);
  };

  const runAuto = () => {
    setBusy("auto");
    const algorithm = AutoLayout.recommendLayout(tables, relationships);
    onLayout(AutoLayout.layoutTables(tables, relationships, { algorithm }));
    setTimeout(() => setBusy(null), 500);
    setOpenMenu(null);
  };

  const ActiveViewIcon = DETAIL_LEVELS.find((d) => d.value === detailLevel)?.icon ?? List;

  return (
    <div ref={containerRef} className="relative flex items-center">
      {/* The two-button bar */}
      <div className="flex items-center gap-0.5 bg-card/95 backdrop-blur-md border border-border rounded-lg shadow-lg px-1 py-1">

        {/* View button */}
        <button
          title="Display mode"
          onClick={() => toggle("view")}
          className={cn(
            "flex items-center justify-center h-7 w-7 rounded transition-all duration-150",
            openMenu === "view"
              ? "bg-accent text-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          )}
        >
          <ActiveViewIcon className="h-3.5 w-3.5" />
        </button>

        <div className="w-px h-4 bg-border/60" />

        {/* Arrange button */}
        <button
          title="Arrange layout"
          onClick={() => toggle("arrange")}
          className={cn(
            "flex items-center justify-center h-7 w-7 rounded transition-all duration-150",
            openMenu === "arrange"
              ? "bg-accent text-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          )}
        >
          <Layers className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* View popover */}
      {openMenu === "view" && (
        <div className="absolute bottom-full mb-2 left-0 z-50 w-52 bg-card border border-border rounded-lg shadow-xl py-1.5 animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-3 pb-1.5">Display mode</p>
          {DETAIL_LEVELS.map(({ value, label, icon: Icon, description }) => (
            <button
              key={value}
              onClick={() => { setDetailLevel(value); setOpenMenu(null); }}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-1.5 text-xs transition-colors",
                detailLevel === value
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-foreground hover:bg-accent"
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="flex-1 text-left font-medium">{label}</span>
              <span className="text-[10px] text-muted-foreground">{description}</span>
            </button>
          ))}
        </div>
      )}

      {/* Arrange popover */}
      {openMenu === "arrange" && (
        <div className="absolute bottom-full mb-2 right-0 z-50 w-56 bg-card border border-border rounded-lg shadow-xl py-1.5 animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-3 pb-1.5">Arrange layout</p>
          {LAYOUT_ALGORITHMS.map(({ key, label, icon: Icon, description }) => (
            <button
              key={key}
              onClick={() => runLayout(key)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-1.5 text-xs transition-colors",
                busy === key
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-foreground hover:bg-accent"
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="flex-1 text-left font-medium">{label}</span>
              <span className="text-[10px] text-muted-foreground">{description}</span>
            </button>
          ))}
          <div className="my-1 mx-3 border-t border-border/60" />
          <button
            onClick={runAuto}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
          >
            <Sparkles className={cn("h-3.5 w-3.5 shrink-0", busy === "auto" && "animate-spin")} />
            Auto-detect best layout
          </button>
          {onFitView && (
            <button
              onClick={() => { onFitView(); setOpenMenu(null); }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-foreground hover:bg-accent transition-colors"
            >
              <Maximize2 className="h-3.5 w-3.5 shrink-0" />
              Fit view
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default LayoutPanel;
