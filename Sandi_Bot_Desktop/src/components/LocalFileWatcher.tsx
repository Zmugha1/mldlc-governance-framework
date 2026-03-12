import { useState, useEffect } from 'react';
import { FolderOpen, RefreshCw, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';

interface WatchedFile {
  id: string;
  name: string;
  path: string;
  type: 'DISC' | 'You2.0' | 'TUMAY' | 'Vision' | 'Fathom' | 'Other';
  status: 'new' | 'processing' | 'imported' | 'error';
  clientName?: string;
  timestamp: Date;
}

interface LocalFileWatcherProps {
  watchPath?: string;
  onFilesImported?: (files: WatchedFile[]) => void;
}

// Simulated file watcher for airgapped deployment
// In a real Electron/Tauri app, this would use fs.watch or similar
export function LocalFileWatcher({ 
  watchPath = './client-files', 
  onFilesImported 
}: LocalFileWatcherProps) {
  const [files, setFiles] = useState<WatchedFile[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScan, setLastScan] = useState<Date | null>(null);

  // Simulate scanning the local directory
  const scanDirectory = async () => {
    setIsScanning(true);
    
    // Simulate network/file system delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // In a real implementation, this would read from the actual file system
    // For demo, we'll show some sample files that might be there
    const sampleFiles: WatchedFile[] = [
      {
        id: '1',
        name: 'Andrea_Kelleher_DISC.pdf',
        path: `${watchPath}/Andrea_Kelleher_DISC.pdf`,
        type: 'DISC',
        status: 'new',
        clientName: 'Andrea Kelleher',
        timestamp: new Date()
      },
      {
        id: '2',
        name: 'Alex_Raiyn_You2.0.txt',
        path: `${watchPath}/Alex_Raiyn_You2.0.txt`,
        type: 'You2.0',
        status: 'imported',
        clientName: 'Alex Raiyn',
        timestamp: new Date(Date.now() - 86400000)
      },
      {
        id: '3',
        name: 'New_Client_TUMAY.json',
        path: `${watchPath}/New_Client_TUMAY.json`,
        type: 'TUMAY',
        status: 'new',
        timestamp: new Date()
      }
    ];

    setFiles(sampleFiles);
    setLastScan(new Date());
    setIsScanning(false);
  };

  useEffect(() => {
    scanDirectory();
  }, []);

  const importFile = async (fileId: string) => {
    setFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, status: 'processing' } : f
    ));

    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 1000));

    setFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, status: 'imported' } : f
    ));

    const importedFile = files.find(f => f.id === fileId);
    if (importedFile && onFilesImported) {
      onFilesImported([{ ...importedFile, status: 'imported' }]);
    }
  };

  const importAll = async () => {
    const newFiles = files.filter(f => f.status === 'new');
    
    for (const file of newFiles) {
      await importFile(file.id);
    }
  };

  const getStatusIcon = (status: WatchedFile['status']) => {
    switch (status) {
      case 'new':
        return <FileText className="h-4 w-4 text-[#C4B7D9]" />;
      case 'processing':
        return <RefreshCw className="h-4 w-4 text-amber-500 animate-spin" />;
      case 'imported':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getTypeColor = (type: WatchedFile['type']) => {
    switch (type) {
      case 'DISC':
        return 'bg-blue-100 text-blue-800';
      case 'You2.0':
        return 'bg-purple-100 text-purple-800';
      case 'TUMAY':
        return 'bg-green-100 text-green-800';
      case 'Vision':
        return 'bg-amber-100 text-amber-800';
      case 'Fathom':
        return 'bg-pink-100 text-pink-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const newFilesCount = files.filter(f => f.status === 'new').length;

  return (
    <Card className="bg-white border-[#D1D5DB]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-[#C4B7D9]" />
            <CardTitle className="text-lg font-semibold text-[#333333]">
              Local File Watcher
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {newFilesCount > 0 && (
              <Badge className="bg-[#C4B7D9] text-white">
                {newFilesCount} new
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={scanDirectory}
              disabled={isScanning}
              className="border-[#D1D5DB]"
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isScanning ? 'animate-spin' : ''}`} />
              {isScanning ? 'Scanning...' : 'Scan'}
            </Button>
          </div>
        </div>
        <p className="text-sm text-[#6B6B6B]">
          Watching: <code className="bg-[#FAFAFA] px-1 py-0.5 rounded">{watchPath}</code>
          {lastScan && (
            <span className="ml-2">(Last scan: {lastScan.toLocaleTimeString()})</span>
          )}
        </p>
      </CardHeader>
      <CardContent>
        <Alert className="mb-4 bg-amber-50 border-amber-200">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-sm text-amber-800">
            <strong>Airgapped Mode:</strong> Drop client files in the 
            <code className="mx-1 px-1 bg-amber-100 rounded">{watchPath}</code> 
            folder next to the app. Files are processed locally - no cloud upload.
          </AlertDescription>
        </Alert>

        {files.length === 0 ? (
          <div className="text-center py-8 text-[#6B6B6B]">
            <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No files found in watch directory</p>
            <p className="text-sm mt-1">Drop files in {watchPath} to see them here</p>
          </div>
        ) : (
          <>
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {files.map(file => (
                  <div 
                    key={file.id}
                    className={`
                      flex items-center justify-between p-3 rounded-lg border
                      ${file.status === 'new' 
                        ? 'bg-[#C4B7D9]/5 border-[#C4B7D9]/30' 
                        : 'bg-white border-[#D1D5DB]'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(file.status)}
                      <div>
                        <p className="text-sm font-medium text-[#333333]">
                          {file.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className={`text-xs ${getTypeColor(file.type)}`}>
                            {file.type}
                          </Badge>
                          {file.clientName && (
                            <span className="text-xs text-[#6B6B6B]">
                              {file.clientName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {file.status === 'new' && (
                      <Button
                        size="sm"
                        onClick={() => importFile(file.id)}
                        className="bg-[#C4B7D9] hover:bg-[#C4B7D9]/90 text-white"
                      >
                        Import
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            {newFilesCount > 0 && (
              <div className="mt-4 pt-4 border-t border-[#D1D5DB]">
                <Button 
                  onClick={importAll}
                  className="w-full bg-[#C4B7D9] hover:bg-[#C4B7D9]/90 text-white"
                >
                  Import All New Files ({newFilesCount})
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
