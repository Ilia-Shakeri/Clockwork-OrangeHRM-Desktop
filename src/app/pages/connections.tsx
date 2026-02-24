// Connections page for Clockwork

import { useState } from 'react';
import { Cable, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Badge } from '../components/Badge';
import { testConnection, saveToLocalStorage, loadFromLocalStorage } from '../lib/utils';
import { toast } from 'sonner';

interface ConnectionSettings {
  type: 'localhost' | 'remote';
  apiUrl: string;
  apiKey: string;
  connected: boolean;
  lastTested?: string;
}

export function Connections() {
  const [settings, setSettings] = useState<ConnectionSettings>(() =>
    loadFromLocalStorage<ConnectionSettings>('clockwork-connection', {
      type: 'remote',
      apiUrl: '',
      apiKey: '',
      connected: false,
    })
  );
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  
  const handleTest = async () => {
    if (!settings.apiUrl || !settings.apiKey) {
      toast.error('Please fill in all fields');
      return;
    }
    
    setTesting(true);
    setTestResult(null);
    
    try {
      const result = await testConnection(settings.apiUrl, settings.apiKey);
      setTestResult(result);
      
      if (result.success) {
        const updatedSettings = {
          ...settings,
          connected: true,
          lastTested: new Date().toISOString(),
        };
        setSettings(updatedSettings);
        saveToLocalStorage('clockwork-connection', updatedSettings);
        toast.success('Connection successful!');
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Connection failed',
      });
      toast.error('Connection failed');
    } finally {
      setTesting(false);
    }
  };
  
  const handleSave = () => {
    saveToLocalStorage('clockwork-connection', settings);
    toast.success('Connection settings saved');
  };
  
  const handleDisconnect = () => {
    const updatedSettings = {
      ...settings,
      connected: false,
      apiKey: '',
    };
    setSettings(updatedSettings);
    saveToLocalStorage('clockwork-connection', updatedSettings);
    setTestResult(null);
    toast.info('Disconnected from API');
  };
  
  return (
    <div className="p-8 space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-[var(--clockwork-green)] mb-2">
          Connections
        </h1>
        <p className="text-[var(--clockwork-gray-600)]">
          Configure your OrangeHRM API connection
        </p>
      </div>
      
      {/* Connection Status */}
      <Card>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  settings.connected
                    ? 'bg-[var(--clockwork-green-light)]'
                    : 'bg-[var(--clockwork-orange-light)]'
                }`}
              >
                <Cable
                  className={`w-5 h-5 ${
                    settings.connected
                      ? 'text-[var(--clockwork-green)]'
                      : 'text-[var(--clockwork-orange)]'
                  }`}
                />
              </div>
              <div>
                <p className="font-semibold text-[var(--clockwork-gray-900)]">
                  API Connection Status
                </p>
                <p className="text-sm text-[var(--clockwork-gray-600)]">
                  {settings.connected
                    ? `Connected to ${settings.apiUrl}`
                    : 'Not connected'}
                </p>
              </div>
            </div>
            <Badge variant={settings.connected ? 'success' : 'warning'}>
              {settings.connected ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>
        </CardContent>
      </Card>
      
      {/* Connection Settings */}
      <Card>
        <CardHeader>
          <CardTitle>API Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Connection Type */}
            <div>
              <label className="block text-sm font-medium text-[var(--clockwork-gray-700)] mb-2">
                Connection Type
              </label>
              <div className="flex gap-3">
                <Button
                  variant={settings.type === 'localhost' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setSettings({ ...settings, type: 'localhost' })}
                >
                  Localhost
                </Button>
                <Button
                  variant={settings.type === 'remote' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setSettings({ ...settings, type: 'remote' })}
                >
                  Remote API
                </Button>
              </div>
            </div>
            
            {/* API URL */}
            <Input
              label="API Base URL"
              type="text"
              placeholder={
                settings.type === 'localhost'
                  ? 'http://localhost:3000/api'
                  : 'https://your-orangehrm.com/api'
              }
              value={settings.apiUrl}
              onChange={(e) =>
                setSettings({ ...settings, apiUrl: e.target.value })
              }
              helperText="The base URL of your OrangeHRM API endpoint"
            />
            
            {/* API Key */}
            <Input
              label="API Key / Token"
              type="password"
              placeholder="Enter your API key"
              value={settings.apiKey}
              onChange={(e) =>
                setSettings({ ...settings, apiKey: e.target.value })
              }
              helperText="Your OrangeHRM API authentication key (stored locally)"
            />
            
            {/* Test Result */}
            {testResult && (
              <div
                className={`p-4 rounded-lg border ${
                  testResult.success
                    ? 'bg-[var(--clockwork-green-light)] border-[var(--clockwork-green)]/20'
                    : 'bg-red-50 border-red-200 dark:bg-red-950/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  {testResult.success ? (
                    <CheckCircle className="w-5 h-5 text-[var(--clockwork-green)] flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-[var(--clockwork-error)] flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-[var(--clockwork-gray-900)]">
                      {testResult.success ? 'Connection Successful' : 'Connection Failed'}
                    </p>
                    <p className="text-sm text-[var(--clockwork-gray-700)] mt-1">
                      {testResult.message}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="primary"
                onClick={handleTest}
                disabled={testing || !settings.apiUrl || !settings.apiKey}
              >
                {testing ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  'Test Connection'
                )}
              </Button>
              <Button variant="secondary" onClick={handleSave}>
                Save Settings
              </Button>
              {settings.connected && (
                <Button variant="ghost" onClick={handleDisconnect}>
                  Disconnect
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Security Notice */}
      <Card className="bg-blue-50 border-blue-200 dark:bg-blue-950/30">
        <CardContent>
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-[var(--clockwork-gray-900)] mb-1">
                Security Notice
              </h3>
              <p className="text-sm text-[var(--clockwork-gray-700)]">
                Your API credentials are stored locally on your machine. For enhanced
                security, you can enable "Session-only token" mode in Settings to avoid
                persisting credentials between sessions.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Documentation */}
      <Card>
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div>
              <p className="font-medium text-[var(--clockwork-gray-900)] mb-1">
                Where to find your API credentials:
              </p>
              <ol className="list-decimal list-inside text-[var(--clockwork-gray-600)] space-y-1">
                <li>Log in to your OrangeHRM admin panel</li>
                <li>Navigate to Admin → Configuration → API</li>
                <li>Generate or copy your API key</li>
                <li>Paste it in the field above</li>
              </ol>
            </div>
            <div>
              <p className="font-medium text-[var(--clockwork-gray-900)] mb-1">
                Troubleshooting connection issues:
              </p>
              <ul className="list-disc list-inside text-[var(--clockwork-gray-600)] space-y-1">
                <li>Ensure your OrangeHRM instance is accessible</li>
                <li>Check that the API is enabled in OrangeHRM settings</li>
                <li>Verify your API key is valid and not expired</li>
                <li>Check firewall settings if using remote connection</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
