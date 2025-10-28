'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from "sonner"
import { useSchema } from '@/hooks/use-schema';
import { ExportManager } from '@/lib/export/export-manager';
import { ExportOptions, SQLDialect } from '@/types/schema';
import { Download, X, FileJson, Database, Code } from 'lucide-react';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({ isOpen, onClose }) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportOptions['format']>('json');
  const [sqlDialect, setSqlDialect] = useState<SQLDialect>('postgresql');
  const [includePositions, setIncludePositions] = useState(true);
  const [includeDescriptions, setIncludeDescriptions] = useState(true);
  const [schemaName, setSchemaName] = useState('my-schema');

  const exportSchema = useSchema((state) => state.exportSchema);

  if (!isOpen) return null;

  const handleExport = () => {
    try {
      const schema = exportSchema();
      const options: ExportOptions = {
        format: selectedFormat,
        sqlDialect,
        includePositions,
        includeDescriptions,
      };

      const content = ExportManager.export(schema, options);

      // Determine filename and mime type
      let filename = '';
      let mimeType = 'text/plain';

      switch (selectedFormat) {
        case 'json':
          filename = `${schemaName}.json`;
          mimeType = 'application/json';
          break;
        case 'sql':
          filename = `${schemaName}-${sqlDialect}.sql`;
          mimeType = 'application/sql';
          break;
        case 'prisma':
          filename = `${schemaName}.prisma`;
          mimeType = 'text/plain';
          break;
        case 'django':
          filename = `${schemaName}-models.py`;
          mimeType = 'text/x-python';
          break;
        case 'laravel':
          filename = `${schemaName}-migration.php`;
          mimeType = 'application/x-httpd-php';
          break;
        case 'typeorm':
          filename = `${schemaName}-entities.ts`;
          mimeType = 'application/typescript';
          break;
      }

      ExportManager.downloadFile(content, filename, mimeType);
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Export failed. Please check the console for details.');
    }
  };

  const exportFormats = [
    {
      value: 'json' as const,
      label: 'JSON',
      description: 'Portable schema format for backup and import',
      icon: FileJson,
    },
    {
      value: 'sql' as const,
      label: 'SQL DDL',
      description: 'Database creation scripts',
      icon: Database,
    },
    {
      value: 'prisma' as const,
      label: 'Prisma',
      description: 'Prisma ORM schema file',
      icon: Code,
    },
    {
      value: 'django' as const,
      label: 'Django Models',
      description: 'Django ORM model definitions',
      icon: Code,
    },
    {
      value: 'laravel' as const,
      label: 'Laravel Migrations',
      description: 'Laravel Eloquent migrations',
      icon: Code,
    },
    {
      value: 'typeorm' as const,
      label: 'TypeORM Entities',
      description: 'TypeScript entities for TypeORM',
      icon: Code,
    },
  ];

  const sqlDialects: { value: SQLDialect; label: string }[] = [
    { value: 'postgresql', label: 'PostgreSQL' },
    { value: 'mysql', label: 'MySQL' },
    { value: 'sqlite', label: 'SQLite' },
    { value: 'sqlserver', label: 'SQL Server' },
  ];

  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Export Schema</CardTitle>
              <CardDescription>
                Choose export format and options for your database schema
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Schema Name */}
          <div>
            <label className="text-sm font-medium mb-2 block">Schema Name</label>
            <Input
              value={schemaName}
              onChange={(e) => setSchemaName(e.target.value)}
              placeholder="my-schema"
            />
          </div>

          {/* Export Format Selection */}
          <div>
            <label className="text-sm font-medium mb-3 block">Export Format</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {exportFormats.map((format) => {
                const Icon = format.icon;
                return (
                  <div
                    key={format.value}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedFormat === format.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-foreground/20'
                    }`}
                    onClick={() => setSelectedFormat(format.value)}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-primary" />
                      <div>
                        <div className="font-medium">{format.label}</div>
                        <div className="text-sm text-muted-foreground">{format.description}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SQL Dialect Selection (only for SQL format) */}
          {selectedFormat === 'sql' && (
            <div>
              <label className="text-sm font-medium mb-2 block">SQL Dialect</label>
              <select
                value={sqlDialect}
                onChange={(e) => setSqlDialect(e.target.value as SQLDialect)}
                className="w-full p-2 border rounded-md"
              >
                {sqlDialects.map((dialect) => (
                  <option key={dialect.value} value={dialect.value}>
                    {dialect.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Export Options */}
          <div>
            <label className="text-sm font-medium mb-3 block">Export Options</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={includePositions}
                  onChange={(e) => setIncludePositions(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Include table positions (for JSON format)</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={includeDescriptions}
                  onChange={(e) => setIncludeDescriptions(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Include descriptions and comments</span>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleExport} className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              Export Schema
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExportDialog;