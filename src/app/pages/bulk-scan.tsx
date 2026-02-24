// Bulk Scan page for Clockwork

import { useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, X } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { ProgressBar } from '../components/Progress';
import { findUsersByUsernames, mockUsers } from '../lib/mock-data';
import { parseBulkScanFile, validateUsername } from '../lib/utils';
import { toast } from 'sonner';

interface ScanResult {
  username: string;
  status: 'success' | 'not-found' | 'invalid';
  userId?: string;
  name?: string;
}

export function BulkScan() {
  const [fileContent, setFileContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [parsedUsernames, setParsedUsernames] = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setFileContent(content);
      const usernames = parseBulkScanFile(content);
      setParsedUsernames(usernames);
      setScanResults([]);
      toast.success(`Loaded ${usernames.length} username(s)`);
    };
    reader.readAsText(file);
  };
  
  const handleManualInput = (value: string) => {
    setFileContent(value);
    const usernames = parseBulkScanFile(value);
    setParsedUsernames(usernames);
    setScanResults([]);
  };
  
  const handleScan = async () => {
    if (parsedUsernames.length === 0) {
      toast.error('No usernames to scan');
      return;
    }
    
    setScanning(true);
    setScanProgress(0);
    const results: ScanResult[] = [];
    
    // Simulate scanning process
    for (let i = 0; i < parsedUsernames.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      
      const username = parsedUsernames[i];
      
      if (!validateUsername(username)) {
        results.push({
          username,
          status: 'invalid',
        });
      } else {
        const user = mockUsers.find(
          (u) => u.username.toLowerCase() === username.toLowerCase()
        );
        
        if (user) {
          results.push({
            username,
            status: 'success',
            userId: user.id,
            name: `${user.firstName} ${user.lastName}`,
          });
        } else {
          results.push({
            username,
            status: 'not-found',
          });
        }
      }
      
      setScanProgress(((i + 1) / parsedUsernames.length) * 100);
    }
    
    setScanResults(results);
    setScanning(false);
    
    const successCount = results.filter((r) => r.status === 'success').length;
    toast.success(`Scan complete: ${successCount}/${parsedUsernames.length} users found`);
  };
  
  const handleClear = () => {
    setFileContent('');
    setFileName('');
    setParsedUsernames([]);
    setScanResults([]);
  };
  
  const successCount = scanResults.filter((r) => r.status === 'success').length;
  const notFoundCount = scanResults.filter((r) => r.status === 'not-found').length;
  const invalidCount = scanResults.filter((r) => r.status === 'invalid').length;
  
  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-[var(--clockwork-green)] mb-2">
          Bulk Scan
        </h1>
        <p className="text-[var(--clockwork-gray-600)]">
          Process multiple users from a file or paste usernames directly
        </p>
      </div>
      
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload or Enter Usernames</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* File Upload */}
            <div>
              <label
                htmlFor="file-upload"
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[var(--clockwork-border)] rounded-lg hover:border-[var(--clockwork-orange)] transition-colors cursor-pointer bg-[var(--clockwork-gray-50)] hover:bg-white"
              >
                <Upload className="w-8 h-8 text-[var(--clockwork-gray-400)] mb-2" />
                <p className="text-sm text-[var(--clockwork-gray-600)]">
                  Click to upload file or drag and drop
                </p>
                <p className="text-xs text-[var(--clockwork-gray-500)] mt-1">
                  .txt file with usernames (one per line or comma-separated)
                </p>
              </label>
              <input
                id="file-upload"
                type="file"
                accept=".txt"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
            
            {fileName && (
              <div className="flex items-center gap-3 p-3 bg-[var(--clockwork-green-light)] border border-[var(--clockwork-green)]/20 rounded-lg">
                <FileText className="w-5 h-5 text-[var(--clockwork-green)]" />
                <p className="text-sm text-[var(--clockwork-gray-700)] flex-1">{fileName}</p>
                <button
                  onClick={handleClear}
                  className="text-[var(--clockwork-gray-500)] hover:text-[var(--clockwork-gray-700)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            
            {/* Manual Input */}
            <div>
              <label className="block text-sm font-medium text-[var(--clockwork-gray-700)] mb-2">
                Or paste usernames here
              </label>
              <textarea
                value={fileContent}
                onChange={(e) => handleManualInput(e.target.value)}
                placeholder="Enter usernames (one per line or comma-separated)&#10;Example:&#10;john.smith&#10;sarah.johnson&#10;michael.chen"
                rows={6}
                className="w-full px-3 py-2 border border-[var(--clockwork-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--clockwork-orange)] resize-none font-mono text-sm"
              />
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-3">
              <Button
                variant="primary"
                onClick={handleScan}
                disabled={parsedUsernames.length === 0 || scanning}
              >
                {scanning ? 'Scanning...' : 'Confirm & Scan'}
              </Button>
              <Button variant="secondary" onClick={handleClear} disabled={scanning}>
                Clear
              </Button>
              <p className="text-sm text-[var(--clockwork-gray-600)]">
                {parsedUsernames.length} username(s) ready to scan
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Preview */}
      {parsedUsernames.length > 0 && scanResults.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Preview ({parsedUsernames.length} usernames)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {parsedUsernames.map((username, index) => (
                <Badge
                  key={index}
                  variant={validateUsername(username) ? 'neutral' : 'error'}
                >
                  {username}
                  {!validateUsername(username) && (
                    <AlertCircle className="w-3 h-3 ml-1" />
                  )}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Scanning Progress */}
      {scanning && (
        <Card>
          <CardContent>
            <ProgressBar
              value={scanProgress}
              label="Scanning users..."
              showPercentage
            />
          </CardContent>
        </Card>
      )}
      
      {/* Results */}
      {scanResults.length > 0 && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[var(--clockwork-green-light)] rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-[var(--clockwork-green)]" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-[var(--clockwork-gray-900)]">
                      {successCount}
                    </p>
                    <p className="text-sm text-[var(--clockwork-gray-600)]">Found</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[var(--clockwork-orange-light)] rounded-lg flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-[var(--clockwork-warning)]" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-[var(--clockwork-gray-900)]">
                      {notFoundCount}
                    </p>
                    <p className="text-sm text-[var(--clockwork-gray-600)]">Not Found</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                    <X className="w-5 h-5 text-[var(--clockwork-error)]" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-[var(--clockwork-gray-900)]">
                      {invalidCount}
                    </p>
                    <p className="text-sm text-[var(--clockwork-gray-600)]">Invalid</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Results List */}
          <Card>
            <CardHeader>
              <CardTitle>Scan Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {scanResults.map((result, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border border-[var(--clockwork-border)] rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {result.status === 'success' ? (
                        <CheckCircle className="w-5 h-5 text-[var(--clockwork-green)]" />
                      ) : result.status === 'not-found' ? (
                        <AlertCircle className="w-5 h-5 text-[var(--clockwork-warning)]" />
                      ) : (
                        <X className="w-5 h-5 text-[var(--clockwork-error)]" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-[var(--clockwork-gray-900)]">
                          {result.username}
                        </p>
                        {result.name && (
                          <p className="text-xs text-[var(--clockwork-gray-600)]">
                            {result.name}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant={
                        result.status === 'success'
                          ? 'success'
                          : result.status === 'not-found'
                          ? 'warning'
                          : 'error'
                      }
                    >
                      {result.status === 'success'
                        ? 'Found'
                        : result.status === 'not-found'
                        ? 'Not Found'
                        : 'Invalid'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
