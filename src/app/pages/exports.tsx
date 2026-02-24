// Exports page for Clockwork

import { FolderOpen, RotateCw, Download } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { mockExportRecords } from '../lib/mock-data';
import { formatDate } from '../lib/utils';
import { toast } from 'sonner';

export function Exports() {
  const handleOpenFile = (filePath: string) => {
    toast.info(`Opening: ${filePath}`);
    // In real Electron app, this would use: shell.showItemInFolder(filePath)
  };
  
  const handleRerun = (exportId: string) => {
    toast.info('Re-running export...');
    // This would re-run the export with the same parameters
  };
  
  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-[var(--clockwork-green)] mb-2">
            Exports
          </h1>
          <p className="text-[var(--clockwork-gray-600)]">
            View and manage your export history
          </p>
        </div>
        <Button variant="secondary">
          <Download className="w-4 h-4" />
          Export Settings
        </Button>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent>
            <p className="text-sm text-[var(--clockwork-gray-600)] mb-1">
              Total Exports
            </p>
            <p className="text-3xl font-semibold text-[var(--clockwork-gray-900)]">
              {mockExportRecords.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-[var(--clockwork-gray-600)] mb-1">
              PDF Exports
            </p>
            <p className="text-3xl font-semibold text-[var(--clockwork-gray-900)]">
              {mockExportRecords.filter((e) => e.type === 'PDF').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-[var(--clockwork-gray-600)] mb-1">
              CSV/JSON Exports
            </p>
            <p className="text-3xl font-semibold text-[var(--clockwork-gray-900)]">
              {mockExportRecords.filter((e) => e.type !== 'PDF').length}
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Export History */}
      <Card>
        <CardHeader>
          <CardTitle>Export History</CardTitle>
        </CardHeader>
        <CardContent>
          {mockExportRecords.length === 0 ? (
            <div className="text-center py-12">
              <Download className="w-12 h-12 text-[var(--clockwork-gray-300)] mx-auto mb-3" />
              <p className="text-[var(--clockwork-gray-500)]">No exports yet</p>
              <p className="text-sm text-[var(--clockwork-gray-400)] mt-1">
                Generate a report and export it to see it here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {mockExportRecords.map((exportRecord) => (
                <div
                  key={exportRecord.id}
                  className="p-4 border border-[var(--clockwork-border)] rounded-lg hover:border-[var(--clockwork-orange)] transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge
                          variant={
                            exportRecord.type === 'PDF'
                              ? 'error'
                              : exportRecord.type === 'CSV'
                              ? 'success'
                              : 'neutral'
                          }
                        >
                          {exportRecord.type}
                        </Badge>
                        <p className="text-sm font-medium text-[var(--clockwork-gray-900)] truncate font-mono">
                          {exportRecord.fileName}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-[var(--clockwork-gray-600)]">
                        <span>{exportRecord.userCount} users</span>
                        <span>•</span>
                        <span>
                          {formatDate(exportRecord.dateRange.from, false)} -{' '}
                          {formatDate(exportRecord.dateRange.to, false)}
                        </span>
                        <span>•</span>
                        <span>
                          {new Date(exportRecord.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenFile(exportRecord.filePath)}
                      >
                        <FolderOpen className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRerun(exportRecord.id)}
                      >
                        <RotateCw className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
