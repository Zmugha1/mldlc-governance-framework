import React, { useCallback, useState } from 'react';
import { Upload, FileText, X, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';

export interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  content?: string;
  status: 'uploading' | 'processing' | 'complete' | 'error';
  progress: number;
  extractedData?: any;
}

interface FileUploadZoneProps {
  onFilesUploaded: (files: UploadedFile[]) => void;
  acceptedTypes?: string[];
  maxFileSize?: number; // in MB
  clientId?: string;
}

export function FileUploadZone({
  onFilesUploaded,
  acceptedTypes = ['.pdf', '.txt', '.doc', '.docx', '.json'],
  maxFileSize = 10,
  clientId
}: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFile = async (file: File): Promise<UploadedFile> => {
    const uploadedFile: UploadedFile = {
      id: Math.random().toString(36).substring(7),
      name: file.name,
      type: file.type,
      size: file.size,
      status: 'uploading',
      progress: 0
    };

    // Check file size
    if (file.size > maxFileSize * 1024 * 1024) {
      return { ...uploadedFile, status: 'error', progress: 0 };
    }

    // Simulate upload progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 50));
      setFiles(prev => prev.map(f => 
        f.id === uploadedFile.id ? { ...f, progress: i } : f
      ));
    }

    // Extract content based on file type
    let content = '';
    try {
      if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        content = await file.text();
      } else if (file.type === 'application/json' || file.name.endsWith('.json')) {
        content = await file.text();
      } else {
        // For PDFs and other files, create a placeholder
        content = `[${file.name}] - File uploaded successfully. Content extraction would process this ${file.type || 'document'} file.`;
      }
    } catch (err) {
      console.error('Error reading file:', err);
    }

    return {
      ...uploadedFile,
      status: 'complete',
      progress: 100,
      content
    };
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setError(null);

    const droppedFiles = Array.from(e.dataTransfer.files);
    
    // Validate file types
    const invalidFiles = droppedFiles.filter(file => {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      return !acceptedTypes.includes(ext);
    });

    if (invalidFiles.length > 0) {
      setError(`Invalid file type(s). Accepted: ${acceptedTypes.join(', ')}`);
      return;
    }

    // Process each file
    const newFiles: UploadedFile[] = [];
    for (const file of droppedFiles) {
      const processedFile = await processFile(file);
      newFiles.push(processedFile);
      setFiles(prev => [...prev, processedFile]);
    }

    onFilesUploaded(newFiles);
  }, [acceptedTypes, maxFileSize, onFilesUploaded]);

  const handleFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setError(null);

    const invalidFiles = selectedFiles.filter(file => {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      return !acceptedTypes.includes(ext);
    });

    if (invalidFiles.length > 0) {
      setError(`Invalid file type(s). Accepted: ${acceptedTypes.join(', ')}`);
      return;
    }

    const newFiles: UploadedFile[] = [];
    for (const file of selectedFiles) {
      const processedFile = await processFile(file);
      newFiles.push(processedFile);
      setFiles(prev => [...prev, processedFile]);
    }

    onFilesUploaded(newFiles);
  }, [acceptedTypes, maxFileSize, onFilesUploaded]);

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer
          ${isDragging 
            ? 'border-[#C4B7D9] bg-[#C4B7D9]/10' 
            : 'border-[#D1D5DB] hover:border-[#C4B7D9] hover:bg-[#FAFAFA]'
          }
        `}
      >
        <input
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileInput}
          className="hidden"
          id={`file-upload-${clientId || 'general'}`}
        />
        <label 
          htmlFor={`file-upload-${clientId || 'general'}`}
          className="cursor-pointer block"
        >
          <Upload className="mx-auto h-12 w-12 text-[#6B6B6B] mb-4" />
          <p className="text-lg font-medium text-[#333333] mb-2">
            Drop files here or click to browse
          </p>
          <p className="text-sm text-[#6B6B6B]">
            Accepted: {acceptedTypes.join(', ')} (max {maxFileSize}MB)
          </p>
          {clientId && (
            <p className="text-xs text-[#C4B7D9] mt-2">
              Files will be associated with client: {clientId}
            </p>
          )}
        </label>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-[#333333]">Uploaded Files</h4>
          {files.map(file => (
            <div 
              key={file.id}
              className="flex items-center gap-3 p-3 bg-white rounded-lg border border-[#D1D5DB]"
            >
              <FileText className="h-5 w-5 text-[#C4B7D9] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#333333] truncate">
                  {file.name}
                </p>
                <p className="text-xs text-[#6B6B6B]">
                  {formatFileSize(file.size)}
                </p>
                {file.status === 'uploading' && (
                  <Progress value={file.progress} className="h-1 mt-2" />
                )}
              </div>
              {file.status === 'complete' && (
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
              )}
              {file.status === 'error' && (
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFile(file.id)}
                className="flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
