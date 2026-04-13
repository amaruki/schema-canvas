"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

interface CanvasSidebarProps {
  isEditorOpen: boolean;
  isEditorCollapsed: boolean;
  onToggleEditor: () => void;
}

export function CanvasSidebar({
  isEditorOpen,
  isEditorCollapsed,
  onToggleEditor,
}: CanvasSidebarProps) {
  return (
    <div
      className={cn(
        "w-10 bg-card border-r border-border flex flex-col items-center py-2 shrink-0",
      )}
    >
      <Button
        variant={isEditorOpen && !isEditorCollapsed ? "secondary" : "ghost"}
        size="icon"
        onClick={onToggleEditor}
        className="h-8 w-8"
        title={isEditorOpen && isEditorCollapsed ? "Expand editor" : "Collapse editor"}
      >
        {isEditorOpen && !isEditorCollapsed ? (
          <PanelLeftClose className="h-4 w-4" />
        ) : (
          <PanelLeftOpen className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
