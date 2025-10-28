'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from "sonner"
import { useSchema } from '@/hooks/use-schema';
import { parseDjangoModels, validateDjangoModels } from '@/lib/import/django-importer';
import { Upload, X, FileText, AlertCircle, CheckCircle } from 'lucide-react';

interface ImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImportDialog: React.FC<ImportDialogProps> = ({ isOpen, onClose }) => {
  const [selectedFormat, setSelectedFormat] = useState<'django' | 'json'>('django');
  const [fileContent, setFileContent] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [validation, setValidation] = useState<{ valid: boolean; errors: string[] } | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const loadSchema = useSchema((state) => state.loadSchema);
  const clearSchema = useSchema((state) => state.clearSchema);

  if (!isOpen) return null;

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setFileContent(content);
        validateContent(content);
      };
      reader.readAsText(file);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setFileContent(content);
        validateContent(content);
      };
      reader.readAsText(file);
    }
  };

  const validateContent = (content: string) => {
    if (selectedFormat === 'django') {
      const result = validateDjangoModels(content);
      setValidation(result);
    } else {
      // JSON validation
      try {
        JSON.parse(content);
        setValidation({ valid: true, errors: [] });
      } catch (error) {
        setValidation({ valid: false, errors: ['Invalid JSON format'] });
      }
    }
  };

  const handleContentChange = (content: string) => {
    setFileContent(content);
    if (content.trim()) {
      validateContent(content);
    } else {
      setValidation(null);
    }
  };

  const handleImport = async () => {
    if (!fileContent.trim()) return;

    setIsImporting(true);

    try {
      let schema;

      if (selectedFormat === 'django') {
        schema = parseDjangoModels(fileContent);
      } else {
        // JSON import
        const data = JSON.parse(fileContent);
        schema = {
          id: data.id || `imported_${Date.now()}`,
          name: data.name || 'Imported Schema',
          description: data.description,
          tables: data.tables || [],
          relationships: data.relationships || [],
          createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
          updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
          version: data.version || 1,
        };
      }

      // Clear existing schema and load the new one
      clearSchema();
      loadSchema(schema);
      onClose();
    } catch (error) {
      console.error('Import failed:', error);
      toast.error('Import failed. Please check the console for details.');
    } finally {
      setIsImporting(false);
    }
  };

  const exampleDjangoCode = `from django.db import models

class User(models.Model):
    username = models.CharField(max_length=150, unique=True)
    email = models.EmailField(unique=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'auth_user'

class Profile(models.Model):
    bio = models.TextField()
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    avatar = models.ImageField(null=True, blank=True)

    class Meta:
        db_table = 'user_profiles'

class Post(models.Model):
    title = models.CharField(max_length=200)
    content = models.TextField()
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    published = models.BooleanField(default=False)

    class Meta:
        db_table = 'blog_posts'

class Tag(models.Model):
    name = models.CharField(max_length=50, unique=True)

    class Meta:
        db_table = 'tags'

class PostWithM2M(models.Model):
    title = models.CharField(max_length=200)
    content = models.TextField()
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    tags = models.ManyToManyField(Tag)

    class Meta:
        db_table = 'posts_with_m2m'`;

  const importFormats = [
    {
      value: 'django' as const,
      label: 'Django Models',
      description: 'Import from Django models.py file',
      icon: FileText,
    },
    {
      value: 'json' as const,
      label: 'JSON Schema',
      description: 'Import from SchemaCanvas JSON format',
      icon: FileText,
    },
  ];

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Import Schema</CardTitle>
              <CardDescription>
                Import your database schema from existing files
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Format Selection */}
          <div>
            <label className="text-sm font-medium mb-3 block">Import Format</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {importFormats.map((format) => {
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

          {/* File Upload */}
          <div>
            <label className="text-sm font-medium mb-2 block">Upload File or Paste Content</label>

            {/* Drag and Drop Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-foreground/20'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">
                Drag and drop your file here, or click to browse
              </p>
              <input
                type="file"
                accept={selectedFormat === 'django' ? '.py' : '.json'}
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="inline-block px-4 py-2 text-sm font-medium text-primary bg-primary/10 rounded-md cursor-pointer hover:bg-primary/20"
              >
                Choose File
              </label>
            </div>
          </div>

          {/* Text Area for Direct Input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Or paste your code directly:</label>
              {selectedFormat === 'django' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleContentChange(exampleDjangoCode)}
                >
                  Load Example
                </Button>
              )}
            </div>
            <textarea
              value={fileContent}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder={selectedFormat === 'django'
                ? "Paste your Django models.py code here..."
                : "Paste your JSON schema here..."
              }
              className="w-full h-64 p-3 border rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Validation Status */}
          {validation && (
            <div className={`p-3 rounded-md ${
              validation.valid
                ? 'bg-ring border border-ring'
                : 'bg-destructive/10 border border-destructive/20'
            }`}>
              <div className="flex items-center gap-2">
                {validation.valid ? (
                  <CheckCircle className="h-4 w-4 text-foreground" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-destructive" />
                )}
                <span className={`text-sm font-medium ${
                  validation.valid ? 'text-foreground' : 'text-destructive'
                }`}>
                  {validation.valid ? 'Valid format' : 'Validation errors found'}
                </span>
              </div>

              {!validation.valid && validation.errors.length > 0 && (
                <ul className="mt-2 text-sm text-destructive list-disc list-inside">
                  {validation.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={!fileContent.trim() || (validation && !validation.valid) || isImporting}
              className="flex-1"
            >
              <Upload className="h-4 w-4 mr-2" />
              {isImporting ? 'Importing...' : 'Import Schema'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ImportDialog;