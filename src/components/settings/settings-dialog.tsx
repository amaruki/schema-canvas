'use client';

import React, { useSyncExternalStore } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Settings, Sun, Moon, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({ isOpen, onClose }) => {
  const { theme, setTheme } = useTheme();
  // Avoid hydration mismatch: true on client, false during SSR
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <Settings className="h-5 w-5 text-primary" />
            Settings
          </DialogTitle>
          <DialogDescription>
            Workspace preferences
          </DialogDescription>
        </DialogHeader>

        {/* Prevent theme flicker during SSR */}
        {!mounted ? (
          <div className="animate-pulse space-y-4 py-4">
            <div className="h-20 bg-muted rounded" />
            <div className="h-32 bg-muted rounded" />
          </div>
        ) : (
          <div className="space-y-6 py-2">
            {/* Theme Settings */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-foreground">Color Scheme</h3>
              <div className="grid grid-cols-3 gap-3">
                <Button
                  variant={theme === 'light' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleThemeChange('light')}
                  className={cn(
                    "flex flex-col items-center gap-2 h-20 p-3",
                    theme === 'light'
                      ? "bg-primary text-primary-foreground border-2 border-primary"
                      : "hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Sun className="h-5 w-5" />
                  <span className="text-xs font-medium">Light</span>
                </Button>

                <Button
                  variant={theme === 'dark' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleThemeChange('dark')}
                  className={cn(
                    "flex flex-col items-center gap-2 h-20 p-3",
                    theme === 'dark'
                      ? "bg-primary text-primary-foreground border-2 border-primary"
                      : "hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Moon className="h-5 w-5" />
                  <span className="text-xs font-medium">Dark</span>
                </Button>

                <Button
                  variant={theme === 'system' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleThemeChange('system')}
                  className={cn(
                    "flex flex-col items-center gap-2 h-20 p-3",
                    theme === 'system'
                      ? "bg-primary text-primary-foreground border-2 border-primary"
                      : "hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Monitor className="h-5 w-5" />
                  <span className="text-xs font-medium">System</span>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Current: <span className="font-medium text-foreground">{theme || 'system'}</span>
              </p>
            </div>

            {/* Keyboard Shortcuts */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-foreground">Keyboard Shortcuts</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-1.5 hover:bg-muted/50 px-2 rounded transition-colors">
                  <span className="text-muted-foreground">Toggle Settings</span>
                  <kbd className="px-2 py-1 bg-muted border border-border rounded text-foreground font-mono shadow-sm">
                    Ctrl + ,
                  </kbd>
                </div>
                <div className="flex justify-between items-center py-1.5 hover:bg-muted/50 px-2 rounded transition-colors">
                  <span className="text-muted-foreground">Add Table</span>
                  <kbd className="px-2 py-1 bg-muted border border-border rounded text-foreground font-mono shadow-sm">
                    Ctrl + T
                  </kbd>
                </div>
                <div className="flex justify-between items-center py-1.5 hover:bg-muted/50 px-2 rounded transition-colors">
                  <span className="text-muted-foreground">Export Schema</span>
                  <kbd className="px-2 py-1 bg-muted border border-border rounded text-foreground font-mono shadow-sm">
                    Ctrl + E
                  </kbd>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;