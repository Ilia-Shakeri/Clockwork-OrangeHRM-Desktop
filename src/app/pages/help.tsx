// Help page for Clockwork

import { BookOpen, Zap, FileText, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card';
import { Link } from 'react-router';

export function Help() {
  return (
    <div className="p-8 space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-[var(--clockwork-green)] mb-2">
          Help & Documentation
        </h1>
        <p className="text-[var(--clockwork-gray-600)]">
          Everything you need to know about using Clockwork
        </p>
      </div>
      
      {/* Quick Start Guide */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-[var(--clockwork-orange)]" />
            <CardTitle>Quick Start Guide</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-[var(--clockwork-gray-900)] mb-2">
                1. Connect to OrangeHRM API
              </h3>
              <p className="text-sm text-[var(--clockwork-gray-600)] mb-3">
                Before you can generate reports, you need to connect Clockwork to your
                OrangeHRM instance.
              </p>
              <ol className="list-decimal list-inside text-sm text-[var(--clockwork-gray-600)] space-y-1.5 ml-4">
                <li>Go to the <Link to="/connections" className="text-[var(--clockwork-orange)] hover:underline">Connections</Link> page</li>
                <li>Choose "Localhost" or "Remote API" depending on your setup</li>
                <li>Enter your API base URL (e.g., https://your-orangehrm.com/api)</li>
                <li>Enter your API key/token from OrangeHRM admin panel</li>
                <li>Click "Test Connection" to verify</li>
                <li>Click "Save Settings" once connected</li>
              </ol>
            </div>
            
            <div>
              <h3 className="font-semibold text-[var(--clockwork-gray-900)] mb-2">
                2. Generate Reports
              </h3>
              <p className="text-sm text-[var(--clockwork-gray-600)] mb-3">
                Create attendance reports for one or multiple employees.
              </p>
              <ol className="list-decimal list-inside text-sm text-[var(--clockwork-gray-600)] space-y-1.5 ml-4">
                <li>Go to the <Link to="/reports" className="text-[var(--clockwork-orange)] hover:underline">Reports</Link> page</li>
                <li>Select users from the multi-select dropdown</li>
                <li>Choose a date range (Current Month, Last Month, or Custom)</li>
                <li>Optionally enable Jalali (Persian) date display</li>
                <li>Click "Run Report" to generate the report</li>
                <li>Review the attendance records for each user</li>
                <li>Click "Export" to save the report as PDF, CSV, or JSON</li>
              </ol>
            </div>
            
            <div>
              <h3 className="font-semibold text-[var(--clockwork-gray-900)] mb-2">
                3. Bulk Scan Multiple Users
              </h3>
              <p className="text-sm text-[var(--clockwork-gray-600)] mb-3">
                Process attendance for 30+ employees at once using a text file.
              </p>
              <ol className="list-decimal list-inside text-sm text-[var(--clockwork-gray-600)] space-y-1.5 ml-4">
                <li>Create a text file with usernames (one per line or comma-separated)</li>
                <li>Go to the <Link to="/bulk-scan" className="text-[var(--clockwork-orange)] hover:underline">Bulk Scan</Link> page</li>
                <li>Upload the file or paste usernames directly</li>
                <li>Preview the parsed usernames</li>
                <li>Click "Confirm & Scan" to process all users</li>
                <li>Review the scan results (found, not found, invalid)</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Features Guide */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-[var(--clockwork-orange)]" />
            <CardTitle>Features Guide</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border border-[var(--clockwork-border)] rounded-lg">
              <h4 className="font-semibold text-[var(--clockwork-gray-900)] mb-2">
                Dashboard
              </h4>
              <p className="text-sm text-[var(--clockwork-gray-600)]">
                View quick stats, recent activity, and alerts. Access quick actions to
                generate reports, run bulk scans, or configure connections.
              </p>
            </div>
            
            <div className="p-4 border border-[var(--clockwork-border)] rounded-lg">
              <h4 className="font-semibold text-[var(--clockwork-gray-900)] mb-2">
                Reports
              </h4>
              <p className="text-sm text-[var(--clockwork-gray-600)]">
                Generate detailed attendance reports with check-in/out times and work
                duration. Export to PDF, CSV, or JSON formats.
              </p>
            </div>
            
            <div className="p-4 border border-[var(--clockwork-border)] rounded-lg">
              <h4 className="font-semibold text-[var(--clockwork-gray-900)] mb-2">
                Bulk Scan
              </h4>
              <p className="text-sm text-[var(--clockwork-gray-600)]">
                Process multiple users at once by uploading a text file or pasting
                usernames. Perfect for HR teams managing 30+ employees.
              </p>
            </div>
            
            <div className="p-4 border border-[var(--clockwork-border)] rounded-lg">
              <h4 className="font-semibold text-[var(--clockwork-gray-900)] mb-2">
                Exports
              </h4>
              <p className="text-sm text-[var(--clockwork-gray-600)]">
                View your export history, re-run previous exports, and quickly access
                exported files on your system.
              </p>
            </div>
            
            <div className="p-4 border border-[var(--clockwork-border)] rounded-lg">
              <h4 className="font-semibold text-[var(--clockwork-gray-900)] mb-2">
                Connections
              </h4>
              <p className="text-sm text-[var(--clockwork-gray-600)]">
                Configure API connection to your OrangeHRM instance. Supports both
                localhost and remote connections.
              </p>
            </div>
            
            <div className="p-4 border border-[var(--clockwork-border)] rounded-lg">
              <h4 className="font-semibold text-[var(--clockwork-gray-900)] mb-2">
                Settings
              </h4>
              <p className="text-sm text-[var(--clockwork-gray-600)]">
                Customize theme, date display, export preferences, and security
                settings to match your workflow.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Troubleshooting */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-[var(--clockwork-orange)]" />
            <CardTitle>Troubleshooting</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-[var(--clockwork-gray-900)] mb-2">
                Connection Issues
              </h4>
              <ul className="list-disc list-inside text-sm text-[var(--clockwork-gray-600)] space-y-1 ml-4">
                <li><strong>Invalid URL:</strong> Ensure the API URL is correctly formatted with protocol (http:// or https://)</li>
                <li><strong>Unauthorized:</strong> Verify your API key is valid and has not expired</li>
                <li><strong>Timeout:</strong> Check your network connection and firewall settings</li>
                <li><strong>CORS Errors:</strong> Ensure CORS is enabled in your OrangeHRM API settings</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-[var(--clockwork-gray-900)] mb-2">
                Missing Check-outs
              </h4>
              <p className="text-sm text-[var(--clockwork-gray-600)]">
                Records with missing check-out times will be highlighted in orange with "??:??"
                displayed. Work duration cannot be calculated for these records. Contact the
                employee or HR admin to manually update the check-out time in OrangeHRM.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-[var(--clockwork-gray-900)] mb-2">
                Bulk Scan: Users Not Found
              </h4>
              <p className="text-sm text-[var(--clockwork-gray-600)]">
                If usernames are not found during bulk scan, verify:
              </p>
              <ul className="list-disc list-inside text-sm text-[var(--clockwork-gray-600)] space-y-1 ml-4 mt-2">
                <li>Usernames match exactly (case-insensitive)</li>
                <li>No extra spaces or special characters</li>
                <li>Users exist in your OrangeHRM system</li>
                <li>API has permission to access user data</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-[var(--clockwork-gray-900)] mb-2">
                Export Issues
              </h4>
              <ul className="list-disc list-inside text-sm text-[var(--clockwork-gray-600)] space-y-1 ml-4">
                <li><strong>Export Folder:</strong> Ensure the export folder exists and has write permissions</li>
                <li><strong>Large Exports:</strong> Exports with many users may take longer; wait for completion</li>
                <li><strong>PDF Layout:</strong> PDF exports include all users with separate pages per user</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* FAQ */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-[var(--clockwork-orange)]" />
            <CardTitle>Frequently Asked Questions</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-[var(--clockwork-gray-900)] mb-1">
                Is my data secure?
              </h4>
              <p className="text-sm text-[var(--clockwork-gray-600)]">
                Yes. Clockwork stores your API credentials locally on your machine only. For
                added security, enable "Session-only token" mode in Settings.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-[var(--clockwork-gray-900)] mb-1">
                What is the difference between CSV and JSON exports?
              </h4>
              <p className="text-sm text-[var(--clockwork-gray-600)]">
                CSV exports are spreadsheet-friendly (open in Excel). JSON exports preserve
                data structure for programmatic use or integration with other tools.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-[var(--clockwork-gray-900)] mb-1">
                Can I use Clockwork offline?
              </h4>
              <p className="text-sm text-[var(--clockwork-gray-600)]">
                Clockwork requires an active connection to your OrangeHRM API to fetch
                attendance data. Once data is fetched, you can export it offline.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-[var(--clockwork-gray-900)] mb-1">
                What does the Jalali date option do?
              </h4>
              <p className="text-sm text-[var(--clockwork-gray-600)]">
                Jalali (Persian/Solar Hijri) calendar is used in Iran and Afghanistan. Enable
                this option to display dates in both Gregorian and Jalali formats.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Support */}
      <Card className="bg-[var(--clockwork-green-light)] border-[var(--clockwork-green)]/20">
        <CardContent>
          <div className="text-center">
            <h3 className="font-semibold text-[var(--clockwork-gray-900)] mb-2">
              Need More Help?
            </h3>
            <p className="text-sm text-[var(--clockwork-gray-700)] mb-4">
              Can't find what you're looking for? Visit our documentation or contact support.
            </p>
            <div className="flex items-center justify-center gap-3">
              <a
                href="https://clockwork-docs.example.com"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-[var(--clockwork-green)] text-white rounded-lg hover:bg-[var(--clockwork-green-hover)] transition-colors text-sm font-medium"
              >
                Visit Documentation
              </a>
              <a
                href="mailto:support@clockwork.example.com"
                className="px-4 py-2 bg-white border border-[var(--clockwork-border)] text-[var(--clockwork-gray-700)] rounded-lg hover:bg-[var(--clockwork-gray-50)] transition-colors text-sm font-medium"
              >
                Contact Support
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
