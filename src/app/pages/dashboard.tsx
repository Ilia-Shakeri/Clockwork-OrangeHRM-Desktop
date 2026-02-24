// Dashboard page for Clockwork

import { Link } from 'react-router';
import { FileText, Scan, Cable, AlertTriangle, Clock, Users } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { mockUsers, mockAttendanceRecords, mockExportRecords } from '../lib/mock-data';
import { formatDate, formatTime } from '../lib/utils';
import { useState, useEffect } from 'react';

export function Dashboard() {
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected'>('connected');
  
  // Calculate missing checkouts this month
  const currentMonth = new Date().toISOString().slice(0, 7);
  const missingCheckouts = mockAttendanceRecords.filter(
    (record) => record.checkOut === null && record.date.startsWith(currentMonth)
  );
  
  // Get recent activity
  const recentExports = mockExportRecords.slice(0, 3);
  
  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-[var(--clockwork-green)] mb-2">
          Dashboard
        </h1>
        <p className="text-[var(--clockwork-gray-600)]">
          Welcome to Clockwork - Your HR attendance reporting tool
        </p>
      </div>
      
      {/* Connection Status Alert */}
      {connectionStatus === 'disconnected' && (
        <Card className="bg-[var(--clockwork-orange-light)] border-[var(--clockwork-orange)]">
          <div className="flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-[var(--clockwork-orange)] flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold text-[var(--clockwork-gray-900)] mb-1">
                No API Connection
              </h3>
              <p className="text-sm text-[var(--clockwork-gray-700)] mb-3">
                You need to connect to your OrangeHRM API to fetch attendance data.
              </p>
              <Link to="/connections">
                <Button variant="primary" size="sm">
                  Connect Now
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      )}
      
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-[var(--clockwork-gray-600)] mb-1">
                  Total Users
                </p>
                <p className="text-3xl font-semibold text-[var(--clockwork-gray-900)]">
                  {mockUsers.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-[var(--clockwork-green-light)] rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-[var(--clockwork-green)]" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-[var(--clockwork-gray-600)] mb-1">
                  Missing Check-outs
                </p>
                <p className="text-3xl font-semibold text-[var(--clockwork-gray-900)]">
                  {missingCheckouts.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-[var(--clockwork-orange-light)] rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-[var(--clockwork-orange)]" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-[var(--clockwork-gray-600)] mb-1">
                  Total Exports
                </p>
                <p className="text-3xl font-semibold text-[var(--clockwork-gray-900)]">
                  {mockExportRecords.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link to="/reports" className="group">
              <div className="p-6 border border-[var(--clockwork-border)] rounded-lg hover:border-[var(--clockwork-orange)] hover:shadow-md transition-all">
                <FileText className="w-8 h-8 text-[var(--clockwork-orange)] mb-3" />
                <h3 className="font-semibold text-[var(--clockwork-gray-900)] mb-1">
                  New Report
                </h3>
                <p className="text-sm text-[var(--clockwork-gray-600)]">
                  Generate attendance reports for users
                </p>
              </div>
            </Link>
            
            <Link to="/bulk-scan" className="group">
              <div className="p-6 border border-[var(--clockwork-border)] rounded-lg hover:border-[var(--clockwork-orange)] hover:shadow-md transition-all">
                <Scan className="w-8 h-8 text-[var(--clockwork-green)] mb-3" />
                <h3 className="font-semibold text-[var(--clockwork-gray-900)] mb-1">
                  Bulk Scan
                </h3>
                <p className="text-sm text-[var(--clockwork-gray-600)]">
                  Process multiple users from a file
                </p>
              </div>
            </Link>
            
            <Link to="/connections" className="group">
              <div className="p-6 border border-[var(--clockwork-border)] rounded-lg hover:border-[var(--clockwork-orange)] hover:shadow-md transition-all">
                <Cable className="w-8 h-8 text-blue-600 mb-3" />
                <h3 className="font-semibold text-[var(--clockwork-gray-900)] mb-1">
                  Connection Settings
                </h3>
                <p className="text-sm text-[var(--clockwork-gray-600)]">
                  Configure API connection
                </p>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
      
      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Exports */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Exports</CardTitle>
              <Link to="/exports">
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentExports.length === 0 ? (
              <p className="text-sm text-[var(--clockwork-gray-500)] text-center py-8">
                No exports yet
              </p>
            ) : (
              <div className="space-y-3">
                {recentExports.map((exportRecord) => (
                  <div
                    key={exportRecord.id}
                    className="p-3 border border-[var(--clockwork-border)] rounded-lg hover:bg-[var(--clockwork-gray-50)] transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-sm font-medium text-[var(--clockwork-gray-900)] truncate flex-1">
                        {exportRecord.fileName}
                      </p>
                      <Badge variant="neutral">{exportRecord.type}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-[var(--clockwork-gray-600)]">
                      <span>{exportRecord.userCount} users</span>
                      <span>•</span>
                      <span>{new Date(exportRecord.timestamp).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Alerts */}
        <Card>
          <CardHeader>
            <CardTitle>Alerts & Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {missingCheckouts.length > 0 && (
                <div className="p-3 bg-[var(--clockwork-orange-light)] border border-[var(--clockwork-orange)]/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-[var(--clockwork-orange)] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-[var(--clockwork-gray-900)] mb-1">
                        Missing Check-outs
                      </p>
                      <p className="text-xs text-[var(--clockwork-gray-700)]">
                        {missingCheckouts.length} record(s) this month have missing check-out times
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="p-3 bg-[var(--clockwork-green-light)] border border-[var(--clockwork-green)]/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-[var(--clockwork-green)] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[var(--clockwork-gray-900)] mb-1">
                      System Status
                    </p>
                    <p className="text-xs text-[var(--clockwork-gray-700)]">
                      All systems operational
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
