'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Sun, Moon, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({ isOpen, onClose }) => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
  };

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Prevent theme flicker during SSR
  if (!mounted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
        <div className="relative z-10 w-full max-w-md mx-4">
          <Card className="bg-card border-border shadow-2xl">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <Settings className="h-5 w-5" />
                  Settings
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-8 w-8 p-0 hover:bg-muted"
                >
                  ×
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="animate-pulse space-y-4">
                <div className="h-20 bg-muted rounded" />
                <div className="h-32 bg-muted rounded" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-md mx-4 animate-in zoom-in-95 duration-200">
        <Card className="bg-card border-border shadow-2xl">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <Settings className="h-5 w-5 text-primary" />
                Settings
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0 hover:bg-muted rounded-full"
              >
                <span className="text-2xl leading-none text-muted-foreground hover:text-foreground">×</span>
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Theme Settings */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-foreground">Color Scheme</h3>
              <div className="grid grid-cols-3 gap-3">
                <Button
                  variant={theme === 'light' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleThemeChange('light')}
                  className={cn(
                    "flex flex-col items-center gap-2 h-20 p-3 transition-all",
                    theme === 'light' 
                      ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary ring-offset-2" 
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
                    "flex flex-col items-center gap-2 h-20 p-3 transition-all",
                    theme === 'dark' 
                      ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary ring-offset-2" 
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
                    "flex flex-col items-center gap-2 h-20 p-3 transition-all",
                    theme === 'system' 
                      ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary ring-offset-2" 
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

            {/* Future Settings Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-foreground">Advanced</h3>
              <div className="text-sm text-muted-foreground p-4 bg-muted/50 rounded-lg border border-border/50">
                More settings will be available in future updates including:
                <ul className="mt-2 space-y-1 text-xs list-inside">
                  <li>• Export preferences</li>
                  <li>• Canvas grid settings</li>
                  <li>• Auto-save configuration</li>
                  <li>• Collaboration settings</li>
                </ul>
              </div>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SettingsDialog;