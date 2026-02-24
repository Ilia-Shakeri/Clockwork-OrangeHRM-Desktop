// Mock data for Clockwork HR attendance tool

export interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  department?: string;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  date: string; // ISO date string
  checkIn: string | null; // HH:mm format
  checkOut: string | null; // HH:mm format
  workDuration: number | null; // in hours, decimal
}

export interface ExportRecord {
  id: string;
  fileName: string;
  type: 'PDF' | 'CSV' | 'JSON';
  timestamp: string;
  userCount: number;
  dateRange: {
    from: string;
    to: string;
  };
  filePath: string;
}

export interface ConnectionSettings {
  type: 'localhost' | 'remote';
  apiUrl: string;
  apiKey: string;
  connected: boolean;
  lastTested?: string;
}

export interface AppSettings {
  theme: 'light' | 'dark';
  showJalaliDates: boolean;
  defaultDatePreset: 'current-month' | 'last-month' | 'custom';
  exportFolder: string;
  filenameTemplate: string;
  sessionOnlyToken: boolean;
}

// Mock users
export const mockUsers: User[] = [
  {
    id: 'u1',
    username: 'john.smith',
    firstName: 'John',
    lastName: 'Smith',
    employeeId: 'EMP001',
    department: 'Engineering',
  },
  {
    id: 'u2',
    username: 'sarah.johnson',
    firstName: 'Sarah',
    lastName: 'Johnson',
    employeeId: 'EMP002',
    department: 'Human Resources',
  },
  {
    id: 'u3',
    username: 'michael.chen',
    firstName: 'Michael',
    lastName: 'Chen',
    employeeId: 'EMP003',
    department: 'Engineering',
  },
  {
    id: 'u4',
    username: 'emma.davis',
    firstName: 'Emma',
    lastName: 'Davis',
    employeeId: 'EMP004',
    department: 'Marketing',
  },
  {
    id: 'u5',
    username: 'david.wilson',
    firstName: 'David',
    lastName: 'Wilson',
    employeeId: 'EMP005',
    department: 'Sales',
  },
];

// Generate mock attendance records
export const mockAttendanceRecords: AttendanceRecord[] = [
  // John Smith - complete records
  { id: 'a1', userId: 'u1', date: '2026-02-01', checkIn: '09:00', checkOut: '17:30', workDuration: 8.5 },
  { id: 'a2', userId: 'u1', date: '2026-02-02', checkIn: '08:55', checkOut: '17:25', workDuration: 8.5 },
  { id: 'a3', userId: 'u1', date: '2026-02-03', checkIn: '09:10', checkOut: '18:00', workDuration: 8.83 },
  { id: 'a4', userId: 'u1', date: '2026-02-04', checkIn: '09:05', checkOut: '17:35', workDuration: 8.5 },
  { id: 'a5', userId: 'u1', date: '2026-02-05', checkIn: '08:50', checkOut: '17:20', workDuration: 8.5 },
  { id: 'a6', userId: 'u1', date: '2026-02-08', checkIn: '09:00', checkOut: '17:30', workDuration: 8.5 },
  { id: 'a7', userId: 'u1', date: '2026-02-09', checkIn: '09:15', checkOut: '18:00', workDuration: 8.75 },
  { id: 'a8', userId: 'u1', date: '2026-02-10', checkIn: '09:00', checkOut: '17:40', workDuration: 8.67 },
  
  // Sarah Johnson - has missing checkout
  { id: 'a9', userId: 'u2', date: '2026-02-01', checkIn: '08:45', checkOut: '17:15', workDuration: 8.5 },
  { id: 'a10', userId: 'u2', date: '2026-02-02', checkIn: '08:50', checkOut: '17:20', workDuration: 8.5 },
  { id: 'a11', userId: 'u2', date: '2026-02-03', checkIn: '09:00', checkOut: null, workDuration: null }, // Missing checkout
  { id: 'a12', userId: 'u2', date: '2026-02-04', checkIn: '08:55', checkOut: '17:25', workDuration: 8.5 },
  { id: 'a13', userId: 'u2', date: '2026-02-05', checkIn: '09:05', checkOut: '17:35', workDuration: 8.5 },
  { id: 'a14', userId: 'u2', date: '2026-02-08', checkIn: '08:50', checkOut: '17:20', workDuration: 8.5 },
  { id: 'a15', userId: 'u2', date: '2026-02-09', checkIn: '09:00', checkOut: null, workDuration: null }, // Missing checkout
  
  // Michael Chen - complete records
  { id: 'a16', userId: 'u3', date: '2026-02-01', checkIn: '09:30', checkOut: '18:00', workDuration: 8.5 },
  { id: 'a17', userId: 'u3', date: '2026-02-02', checkIn: '09:25', checkOut: '17:55', workDuration: 8.5 },
  { id: 'a18', userId: 'u3', date: '2026-02-03', checkIn: '09:35', checkOut: '18:05', workDuration: 8.5 },
  { id: 'a19', userId: 'u3', date: '2026-02-04', checkIn: '09:30', checkOut: '18:10', workDuration: 8.67 },
  { id: 'a20', userId: 'u3', date: '2026-02-05', checkIn: '09:40', checkOut: '18:20', workDuration: 8.67 },
  { id: 'a21', userId: 'u3', date: '2026-02-08', checkIn: '09:30', checkOut: '18:00', workDuration: 8.5 },
  
  // Emma Davis - sparse records
  { id: 'a22', userId: 'u4', date: '2026-02-01', checkIn: '10:00', checkOut: '16:30', workDuration: 6.5 },
  { id: 'a23', userId: 'u4', date: '2026-02-03', checkIn: '10:15', checkOut: '16:45', workDuration: 6.5 },
  { id: 'a24', userId: 'u4', date: '2026-02-05', checkIn: '10:00', checkOut: '16:30', workDuration: 6.5 },
  
  // David Wilson
  { id: 'a25', userId: 'u5', date: '2026-02-01', checkIn: '08:30', checkOut: '17:00', workDuration: 8.5 },
  { id: 'a26', userId: 'u5', date: '2026-02-02', checkIn: '08:35', checkOut: '17:05', workDuration: 8.5 },
  { id: 'a27', userId: 'u5', date: '2026-02-03', checkIn: '08:40', checkOut: '17:10', workDuration: 8.5 },
  { id: 'a28', userId: 'u5', date: '2026-02-04', checkIn: '08:30', checkOut: '17:00', workDuration: 8.5 },
  { id: 'a29', userId: 'u5', date: '2026-02-05', checkIn: '08:35', checkOut: '17:05', workDuration: 8.5 },
  { id: 'a30', userId: 'u5', date: '2026-02-08', checkIn: '08:30', checkOut: '17:00', workDuration: 8.5 },
  { id: 'a31', userId: 'u5', date: '2026-02-09', checkIn: '08:40', checkOut: '17:10', workDuration: 8.5 },
  { id: 'a32', userId: 'u5', date: '2026-02-10', checkIn: '08:30', checkOut: '17:00', workDuration: 8.5 },
];

// Mock export history
export const mockExportRecords: ExportRecord[] = [
  {
    id: 'e1',
    fileName: 'clockwork_attendance_1404-11-01_to_1404-11-30_20260210_143022.pdf',
    type: 'PDF',
    timestamp: '2026-02-10T14:30:22Z',
    userCount: 5,
    dateRange: { from: '2026-01-21', to: '2026-02-19' },
    filePath: '/exports/clockwork_attendance_1404-11-01_to_1404-11-30_20260210_143022.pdf',
  },
  {
    id: 'e2',
    fileName: 'clockwork_attendance_2026-01_20260205_091545.csv',
    type: 'CSV',
    timestamp: '2026-02-05T09:15:45Z',
    userCount: 12,
    dateRange: { from: '2026-01-01', to: '2026-01-31' },
    filePath: '/exports/clockwork_attendance_2026-01_20260205_091545.csv',
  },
  {
    id: 'e3',
    fileName: 'clockwork_bulk_scan_20260201_162010.json',
    type: 'JSON',
    timestamp: '2026-02-01T16:20:10Z',
    userCount: 32,
    dateRange: { from: '2026-01-15', to: '2026-01-31' },
    filePath: '/exports/clockwork_bulk_scan_20260201_162010.json',
  },
  {
    id: 'e4',
    fileName: 'clockwork_attendance_john.smith_20260128_105530.pdf',
    type: 'PDF',
    timestamp: '2026-01-28T10:55:30Z',
    userCount: 1,
    dateRange: { from: '2026-01-01', to: '2026-01-28' },
    filePath: '/exports/clockwork_attendance_john.smith_20260128_105530.pdf',
  },
];

// Default settings
export const defaultSettings: AppSettings = {
  theme: 'light',
  showJalaliDates: false,
  defaultDatePreset: 'current-month',
  exportFolder: '/home/user/Documents/Clockwork Exports',
  filenameTemplate: 'clockwork_attendance_{date}_{time}',
  sessionOnlyToken: false,
};

// Calculate total work hours for a user
export function calculateTotalHours(records: AttendanceRecord[]): number {
  return records.reduce((sum, record) => {
    return sum + (record.workDuration || 0);
  }, 0);
}

// Get attendance records by user ID and date range
export function getAttendanceRecords(
  userIds: string[],
  startDate: string,
  endDate: string
): Record<string, AttendanceRecord[]> {
  const result: Record<string, AttendanceRecord[]> = {};
  
  userIds.forEach(userId => {
    const records = mockAttendanceRecords.filter(record => {
      return (
        record.userId === userId &&
        record.date >= startDate &&
        record.date <= endDate
      );
    }).sort((a, b) => a.date.localeCompare(b.date));
    
    result[userId] = records;
  });
  
  return result;
}

// Find users by username (for bulk scan)
export function findUsersByUsernames(usernames: string[]): {
  found: User[];
  notFound: string[];
} {
  const found: User[] = [];
  const notFound: string[] = [];
  
  usernames.forEach(username => {
    const user = mockUsers.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (user) {
      found.push(user);
    } else {
      notFound.push(username);
    }
  });
  
  return { found, notFound };
}
