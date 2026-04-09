import React from 'react';
import { useSchema } from '@/hooks/use-schema';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { X, History, RotateCcw } from 'lucide-react';

interface VersionHistoryPanelProps {
  onClose: () => void;
}

export default function VersionHistoryPanel({ onClose }: VersionHistoryPanelProps) {
  const versions = useSchema((s) => s.versions);
  const restoreVersion = useSchema((s) => s.restoreVersion);

  const handleRestore = async (versionId: string) => {
    if (confirm('Are you sure you want to restore this version? This will discard your current unsaved changes and create a new version.')) {
      await restoreVersion(versionId);
      onClose();
    }
  };

  return (
    <Card className="absolute top-16 right-4 w-80 shadow-xl z-50 animate-in slide-in-from-right-4 border-border/60 backdrop-blur-sm bg-card/95">
      <CardHeader className="p-4 py-3 border-b border-border/40 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          Version History
        </CardTitle>
        <Button variant="ghost" size="icon" className="h-6 w-6 -mr-1" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="p-0 max-h-[400px] overflow-y-auto">
        {versions.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No versions saved yet.
          </div>
        ) : (
          <div className="flex flex-col">
            {versions.map((ver) => (
              <div key={ver.id} className="p-3 border-b border-border/40 flex flex-col gap-1.5 hover:bg-muted/20 transition-colors group">
                <div className="flex justify-between items-start">
                  <div className="font-semibold text-sm">
                    {ver.label || `Version ${ver.versionNumber}`}
                  </div>
                  <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    v{ver.versionNumber}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(ver.createdAt).toLocaleString()}
                </div>
                <Button 
                  onClick={() => handleRestore(ver.id)}
                  size="sm" 
                  variant="outline" 
                  className="mt-2 h-7 w-full text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <RotateCcw className="h-3 w-3 mr-1.5" />
                  Restore
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
