// Settings page for Clockwork

import { useState } from 'react';
import { Moon, Sun, Calendar, FolderOpen, Shield } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { defaultSettings, AppSettings } from '../lib/mock-data';
import { saveToLocalStorage, loadFromLocalStorage } from '../lib/utils';
import { toast } from 'sonner';

export function Settings() {
  const [settings, setSettings] = useState<AppSettings>(() =>
    loadFromLocalStorage<AppSettings>('clockwork-settings', defaultSettings)
  );
  
  const handleSave = () => {
    saveToLocalStorage('clockwork-settings', settings);
    toast.success('Settings saved successfully');
  };
  
  const handleReset = () => {
    setSettings(defaultSettings);
    saveToLocalStorage('clockwork-settings', defaultSettings);
    toast.info('Settings reset to defaults');
  };
  
  const handleThemeToggle = () => {
    const newTheme = settings.theme === 'light' ? 'dark' : 'light';
    const newSettings = { ...settings, theme: newTheme };
    setSettings(newSettings);
    // Apply theme immediately
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    toast.info(`Switched to ${newTheme} mode`);
  };
  
  return (
    <div className="p-8 space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-[var(--clockwork-green)] mb-2">
          Settings
        </h1>
        <p className="text-[var(--clockwork-gray-600)]">
          Customize your Clockwork experience
        </p>
      </div>
      
      {/* Theme Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            {settings.theme === 'light' ? (
              <Sun className="w-5 h-5 text-[var(--clockwork-orange)]" />
            ) : (
              <Moon className="w-5 h-5 text-[var(--clockwork-orange)]" />
            )}
            <CardTitle>Appearance</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--clockwork-gray-700)] mb-3">
                Theme Mode
              </label>
              <div className="flex items-center gap-4 p-4 bg-[var(--clockwork-gray-50)] rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium text-[var(--clockwork-gray-900)]">
                    {settings.theme === 'light' ? 'Light Mode' : 'Dark Mode'}
                  </p>
                  <p className="text-xs text-[var(--clockwork-gray-600)] mt-1">
                    {settings.theme === 'light'
                      ? 'Bright and clean interface'
                      : 'Easier on the eyes in low light'}
                  </p>
                </div>
                <Button variant="secondary" onClick={handleThemeToggle}>
                  {settings.theme === 'light' ? (
                    <>
                      <Moon className="w-4 h-4" />
                      Switch to Dark
                    </>
                  ) : (
                    <>
                      <Sun className="w-4 h-4" />
                      Switch to Light
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-[var(--clockwork-gray-500)] mt-2">
                Note: The OrangeHRM color scheme is maintained in both modes
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Date & Time Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-[var(--clockwork-orange)]" />
            <CardTitle>Date & Time</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Show Jalali Dates */}
            <div className="flex items-center justify-between p-4 bg-[var(--clockwork-gray-50)] rounded-lg">
              <div>
                <p className="text-sm font-medium text-[var(--clockwork-gray-900)]">
                  Show Jalali (Persian) Dates
                </p>
                <p className="text-xs text-[var(--clockwork-gray-600)] mt-1">
                  Display dates in both Gregorian and Jalali calendar
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.showJalaliDates}
                  onChange={(e) =>
                    setSettings({ ...settings, showJalaliDates: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[var(--clockwork-gray-300)] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[var(--clockwork-orange)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--clockwork-green)]"></div>
              </label>
            </div>
            
            {/* Default Date Preset */}
            <div>
              <label className="block text-sm font-medium text-[var(--clockwork-gray-700)] mb-2">
                Default Date Range Preset
              </label>
              <div className="flex gap-3">
                <Button
                  variant={
                    settings.defaultDatePreset === 'current-month' ? 'primary' : 'secondary'
                  }
                  size="sm"
                  onClick={() =>
                    setSettings({ ...settings, defaultDatePreset: 'current-month' })
                  }
                >
                  Current Month
                </Button>
                <Button
                  variant={
                    settings.defaultDatePreset === 'last-month' ? 'primary' : 'secondary'
                  }
                  size="sm"
                  onClick={() =>
                    setSettings({ ...settings, defaultDatePreset: 'last-month' })
                  }
                >
                  Last Month
                </Button>
                <Button
                  variant={settings.defaultDatePreset === 'custom' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setSettings({ ...settings, defaultDatePreset: 'custom' })}
                >
                  Custom
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Export Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <FolderOpen className="w-5 h-5 text-[var(--clockwork-orange)]" />
            <CardTitle>Export Settings</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Export Folder */}
            <div>
              <Input
                label="Default Export Folder"
                type="text"
                value={settings.exportFolder}
                onChange={(e) =>
                  setSettings({ ...settings, exportFolder: e.target.value })
                }
                helperText="Where exported files will be saved"
              />
              <Button variant="ghost" size="sm" className="mt-2">
                Browse...
              </Button>
            </div>
            
            {/* Filename Template */}
            <Input
              label="Filename Template"
              type="text"
              value={settings.filenameTemplate}
              onChange={(e) =>
                setSettings({ ...settings, filenameTemplate: e.target.value })
              }
              helperText="Use {date}, {time}, {username} as placeholders"
            />
          </div>
        </CardContent>
      </Card>
      
      {/* Security Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-[var(--clockwork-orange)]" />
            <CardTitle>Security</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Session Only Token */}
            <div className="flex items-center justify-between p-4 bg-[var(--clockwork-gray-50)] rounded-lg">
              <div>
                <p className="text-sm font-medium text-[var(--clockwork-gray-900)]">
                  Session-only Token Storage
                </p>
                <p className="text-xs text-[var(--clockwork-gray-600)] mt-1">
                  Don't persist API token between app sessions (more secure)
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.sessionOnlyToken}
                  onChange={(e) =>
                    setSettings({ ...settings, sessionOnlyToken: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[var(--clockwork-gray-300)] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[var(--clockwork-orange)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--clockwork-orange)]"></div>
              </label>
            </div>
            
            {/* Clear Data */}
            <div className="p-4 border border-[var(--clockwork-border)] rounded-lg">
              <p className="text-sm font-medium text-[var(--clockwork-gray-900)] mb-2">
                Clear Local Data
              </p>
              <p className="text-xs text-[var(--clockwork-gray-600)] mb-3">
                Remove all locally stored settings and credentials
              </p>
              <Button variant="destructive" size="sm">
                Clear All Data
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button variant="primary" onClick={handleSave}>
          Save Settings
        </Button>
        <Button variant="secondary" onClick={handleReset}>
          Reset to Defaults
        </Button>
      </div>
      
      {/* App Info */}
      <Card className="bg-[var(--clockwork-gray-50)] border-[var(--clockwork-border)]">
        <CardContent>
          <div className="text-center text-sm text-[var(--clockwork-gray-600)]">
            <p>Clockwork - HR Attendance Reporting Tool</p>
            <p className="mt-1">Version 1.0.0 • Built for OrangeHRM</p>
            <p className="mt-1">© 2026 Clockwork. All rights reserved.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
