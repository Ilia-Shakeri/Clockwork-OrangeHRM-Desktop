// Reports page for Clockwork

import { useState } from 'react';
import { Calendar, Download, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card';
import { Button } from '../components/Button';
import { DataTable } from '../components/DataTable';
import { MultiSelect } from '../components/MultiSelect';
import { Badge } from '../components/Badge';
import { Modal, ModalFooter } from '../components/Modal';
import { ProgressBar } from '../components/Progress';
import {
  mockUsers,
  User,
  AttendanceRecord,
  getAttendanceRecords,
  calculateTotalHours,
} from '../lib/mock-data';
import {
  formatDate,
  formatTime,
  formatDuration,
  generateExportFilename,
  simulateExportProgress,
  getDateRangePreset,
} from '../lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';

type DatePreset = 'current-month' | 'last-month' | 'custom';

export function Reports() {
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [datePreset, setDatePreset] = useState<DatePreset>('current-month');
  const [customDateRange, setCustomDateRange] = useState({
    from: format(new Date(), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd'),
  });
  const [showJalali, setShowJalali] = useState(false);
  const [reportData, setReportData] = useState<Record<string, AttendanceRecord[]> | null>(null);
  const [collapsedUsers, setCollapsedUsers] = useState<Set<string>>(new Set());
  const [exportModal, setExportModal] = useState(false);
  const [exportType, setExportType] = useState<'pdf' | 'csv' | 'json'>('pdf');
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [exportStep, setExportStep] = useState('');
  
  const userOptions = mockUsers.map((user) => ({
    value: user.id,
    label: `${user.firstName} ${user.lastName} (${user.username})`,
  }));
  
  const getDateRange = () => {
    if (datePreset === 'custom') {
      return customDateRange;
    }
    const preset = getDateRangePreset(datePreset);
    if (preset) {
      return {
        from: format(preset.from, 'yyyy-MM-dd'),
        to: format(preset.to, 'yyyy-MM-dd'),
      };
    }
    return customDateRange;
  };
  
  const handleRunReport = () => {
    if (selectedUserIds.length === 0) {
      toast.error('Please select at least one user');
      return;
    }
    
    const dateRange = getDateRange();
    const data = getAttendanceRecords(selectedUserIds, dateRange.from, dateRange.to);
    setReportData(data);
    toast.success(`Report generated for ${selectedUserIds.length} user(s)`);
  };
  
  const toggleUserCollapse = (userId: string) => {
    const newCollapsed = new Set(collapsedUsers);
    if (newCollapsed.has(userId)) {
      newCollapsed.delete(userId);
    } else {
      newCollapsed.add(userId);
    }
    setCollapsedUsers(newCollapsed);
  };
  
  const handleExport = async () => {
    if (!reportData) return;
    
    setExportProgress(0);
    
    try {
      for await (const progress of simulateExportProgress(selectedUserIds.length)) {
        setExportStep(progress.step);
        setExportProgress(progress.progress);
        
        if (progress.complete) {
          const dateRange = getDateRange();
          const selectedUsers = mockUsers
            .filter((u) => selectedUserIds.includes(u.id))
            .map((u) => u.username);
          const filename = generateExportFilename(selectedUsers, dateRange, exportType, showJalali);
          
          toast.success(`Export completed: ${filename}`);
          setExportModal(false);
          setExportProgress(null);
          setExportStep('');
        }
      }
    } catch (error) {
      toast.error('Export failed');
      setExportProgress(null);
      setExportStep('');
    }
  };
  
  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-[var(--clockwork-green)] mb-2">
          Reports
        </h1>
        <p className="text-[var(--clockwork-gray-600)]">
          Generate attendance reports for single or multiple users
        </p>
      </div>
      
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Report Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* User Selection */}
            <MultiSelect
              label="Select Users"
              options={userOptions}
              value={selectedUserIds}
              onChange={setSelectedUserIds}
              placeholder="Choose users..."
              searchable
            />
            
            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-[var(--clockwork-gray-700)] mb-2">
                Date Range
              </label>
              <div className="flex gap-3 flex-wrap">
                <Button
                  variant={datePreset === 'current-month' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setDatePreset('current-month')}
                >
                  Current Month
                </Button>
                <Button
                  variant={datePreset === 'last-month' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setDatePreset('last-month')}
                >
                  Last Month
                </Button>
                <Button
                  variant={datePreset === 'custom' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setDatePreset('custom')}
                >
                  Custom Range
                </Button>
              </div>
              
              {datePreset === 'custom' && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[var(--clockwork-gray-600)] mb-1">
                      From
                    </label>
                    <input
                      type="date"
                      value={customDateRange.from}
                      onChange={(e) =>
                        setCustomDateRange({ ...customDateRange, from: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-[var(--clockwork-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--clockwork-orange)]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--clockwork-gray-600)] mb-1">
                      To
                    </label>
                    <input
                      type="date"
                      value={customDateRange.to}
                      onChange={(e) =>
                        setCustomDateRange({ ...customDateRange, to: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-[var(--clockwork-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--clockwork-orange)]"
                    />
                  </div>
                </div>
              )}
            </div>
            
            {/* Date Display Options */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="show-jalali"
                checked={showJalali}
                onChange={(e) => setShowJalali(e.target.checked)}
                className="w-4 h-4 text-[var(--clockwork-orange)] border-[var(--clockwork-border)] rounded focus:ring-2 focus:ring-[var(--clockwork-orange)]"
              />
              <label
                htmlFor="show-jalali"
                className="text-sm text-[var(--clockwork-gray-700)]"
              >
                Show Jalali (Persian) dates
              </label>
            </div>
            
            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button variant="primary" onClick={handleRunReport}>
                <Calendar className="w-4 h-4" />
                Run Report
              </Button>
              {reportData && (
                <Button variant="secondary" onClick={() => setExportModal(true)}>
                  <Download className="w-4 h-4" />
                  Export
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Results */}
      {reportData && (
        <div className="space-y-4">
          {selectedUserIds.map((userId) => {
            const user = mockUsers.find((u) => u.id === userId);
            const records = reportData[userId] || [];
            const totalHours = calculateTotalHours(records);
            const isCollapsed = collapsedUsers.has(userId);
            const hasMissingCheckout = records.some((r) => r.checkOut === null);
            
            if (!user) return null;
            
            return (
              <Card key={userId} noPadding>
                {/* User Header */}
                <div
                  className="p-4 bg-[var(--clockwork-gray-50)] border-b border-[var(--clockwork-border)] flex items-center justify-between cursor-pointer hover:bg-[var(--clockwork-gray-100)] transition-colors"
                  onClick={() => toggleUserCollapse(userId)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-[var(--clockwork-green)] rounded-full flex items-center justify-center text-white font-semibold">
                      {user.firstName[0]}{user.lastName[0]}
                    </div>
                    <div>
                      <h3 className="font-semibold text-[var(--clockwork-gray-900)]">
                        {user.firstName} {user.lastName}
                      </h3>
                      <p className="text-sm text-[var(--clockwork-gray-600)]">
                        {user.username} • {user.department}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {hasMissingCheckout && (
                      <Badge variant="warning">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Missing checkout
                      </Badge>
                    )}
                    <div className="text-right">
                      <p className="text-sm text-[var(--clockwork-gray-600)]">Total Hours</p>
                      <p className="text-lg font-semibold text-[var(--clockwork-gray-900)]">
                        {formatDuration(totalHours)}
                      </p>
                    </div>
                    {isCollapsed ? (
                      <ChevronDown className="w-5 h-5 text-[var(--clockwork-gray-500)]" />
                    ) : (
                      <ChevronUp className="w-5 h-5 text-[var(--clockwork-gray-500)]" />
                    )}
                  </div>
                </div>
                
                {/* Records Table */}
                {!isCollapsed && (
                  <div className="p-4">
                    {records.length === 0 ? (
                      <p className="text-center py-8 text-[var(--clockwork-gray-500)]">
                        No attendance records found for this period
                      </p>
                    ) : (
                      <DataTable
                        columns={[
                          {
                            key: 'date',
                            header: 'Date (Gregorian)',
                            render: (record: AttendanceRecord) => formatDate(record.date, false),
                          },
                          ...(showJalali
                            ? [
                                {
                                  key: 'jalali',
                                  header: 'Date (Jalali)',
                                  render: (record: AttendanceRecord) =>
                                    formatDate(record.date, true).split(' (')[1]?.replace(')', '') || '-',
                                },
                              ]
                            : []),
                          {
                            key: 'checkIn',
                            header: 'Check-in',
                            render: (record: AttendanceRecord) => formatTime(record.checkIn),
                          },
                          {
                            key: 'checkOut',
                            header: 'Check-out',
                            render: (record: AttendanceRecord) => (
                              <span
                                className={
                                  record.checkOut === null
                                    ? 'text-[var(--clockwork-warning)] font-semibold'
                                    : ''
                                }
                              >
                                {formatTime(record.checkOut)}
                              </span>
                            ),
                          },
                          {
                            key: 'duration',
                            header: 'Work Duration',
                            render: (record: AttendanceRecord) => formatDuration(record.workDuration),
                            align: 'right',
                          },
                        ]}
                        data={records}
                        getRowKey={(record) => record.id}
                        zebra
                        stickyHeader={false}
                      />
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
      
      {/* Export Modal */}
      <Modal
        isOpen={exportModal}
        onClose={() => setExportModal(false)}
        title="Export Report"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--clockwork-gray-700)] mb-2">
              Export Format
            </label>
            <div className="flex gap-3">
              <Button
                variant={exportType === 'pdf' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setExportType('pdf')}
              >
                PDF
              </Button>
              <Button
                variant={exportType === 'csv' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setExportType('csv')}
              >
                CSV
              </Button>
              <Button
                variant={exportType === 'json' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setExportType('json')}
              >
                JSON
              </Button>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-[var(--clockwork-gray-700)] mb-2">
              Preview Filename
            </label>
            <div className="p-3 bg-[var(--clockwork-gray-50)] border border-[var(--clockwork-border)] rounded-lg">
              <p className="text-sm text-[var(--clockwork-gray-700)] font-mono break-all">
                {generateExportFilename(
                  mockUsers
                    .filter((u) => selectedUserIds.includes(u.id))
                    .map((u) => u.username),
                  getDateRange(),
                  exportType,
                  showJalali
                )}
              </p>
            </div>
          </div>
          
          {exportProgress !== null && (
            <ProgressBar value={exportProgress} label={exportStep} />
          )}
          
          <ModalFooter>
            <Button variant="secondary" onClick={() => setExportModal(false)} disabled={exportProgress !== null}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleExport} disabled={exportProgress !== null}>
              Export {exportType.toUpperCase()}
            </Button>
          </ModalFooter>
        </div>
      </Modal>
    </div>
  );
}
