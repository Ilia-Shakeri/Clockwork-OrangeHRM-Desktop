// Utility functions for Clockwork

import { format as formatDateFns, parse, parseISO } from 'date-fns';
import { format as formatJalali } from 'date-fns-jalali';

// Format date for display
export function formatDate(dateStr: string, showJalali: boolean = false): string {
  const date = parseISO(dateStr);
  const gregorian = formatDateFns(date, 'MMM dd, yyyy');
  
  if (!showJalali) {
    return gregorian;
  }
  
  const jalali = formatJalali(date, 'yyyy/MM/dd');
  return `${gregorian} (${jalali})`;
}

// Format date for Jalali display
export function formatJalaliDate(dateStr: string): string {
  const date = parseISO(dateStr);
  return formatJalali(date, 'yyyy/MM/dd');
}

// Format time for display
export function formatTime(timeStr: string | null): string {
  if (!timeStr) return '??:??';
  return timeStr;
}

// Format work duration
export function formatDuration(hours: number | null): string {
  if (hours === null) return '—';
  return hours.toFixed(2) + ' hrs';
}

// Generate filename for export
export function generateExportFilename(
  users: string[],
  dateRange: { from: string; to: string },
  type: 'pdf' | 'csv' | 'json',
  showJalali: boolean = false
): string {
  const now = new Date();
  const timestamp = formatDateFns(now, 'yyyyMMdd_HHmmss');
  
  let datePart: string;
  if (showJalali) {
    const fromJalali = formatJalali(parseISO(dateRange.from), 'yyyy-MM-dd');
    const toJalali = formatJalali(parseISO(dateRange.to), 'yyyy-MM-dd');
    datePart = `${fromJalali}_to_${toJalali}`;
  } else {
    datePart = `${dateRange.from}_to_${dateRange.to}`;
  }
  
  const userPart = users.length === 1 ? `_${users[0]}` : '';
  
  return `clockwork_attendance${userPart}_${datePart}_${timestamp}.${type}`;
}

// Parse bulk scan file content
export function parseBulkScanFile(content: string): string[] {
  const lines = content.split(/[\n,]/).map(line => line.trim()).filter(line => line.length > 0);
  return [...new Set(lines)]; // Remove duplicates
}

// Validate usernames
export function validateUsername(username: string): boolean {
  return /^[a-zA-Z0-9._-]+$/.test(username);
}

// Get date range presets
export function getDateRangePreset(preset: 'current-month' | 'last-month' | 'custom'): {
  from: Date;
  to: Date;
} | null {
  const now = new Date();
  
  if (preset === 'current-month') {
    return {
      from: new Date(now.getFullYear(), now.getMonth(), 1),
      to: new Date(now.getFullYear(), now.getMonth() + 1, 0),
    };
  }
  
  if (preset === 'last-month') {
    return {
      from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      to: new Date(now.getFullYear(), now.getMonth(), 0),
    };
  }
  
  return null;
}

// Format file size
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// Local storage helpers
export function saveToLocalStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
}

export function loadFromLocalStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error('Error loading from localStorage:', error);
    return defaultValue;
  }
}

export function removeFromLocalStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error removing from localStorage:', error);
  }
}

// Connection status check (mock implementation)
export async function testConnection(apiUrl: string, apiKey: string): Promise<{
  success: boolean;
  message: string;
}> {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  if (!apiUrl || !apiKey) {
    return {
      success: false,
      message: 'API URL and API Key are required',
    };
  }
  
  if (apiUrl.includes('invalid')) {
    return {
      success: false,
      message: 'Invalid API URL',
    };
  }
  
  if (apiKey === 'invalid') {
    return {
      success: false,
      message: 'Unauthorized: Invalid API Key',
    };
  }
  
  return {
    success: true,
    message: 'Connection successful',
  };
}

// Simulate export progress
export async function* simulateExportProgress(userCount: number) {
  const steps = ['Preparing...', 'Fetching records...', 'Generating file...', 'Complete'];
  
  for (let i = 0; i < steps.length; i++) {
    await new Promise(resolve => setTimeout(resolve, 800));
    yield {
      step: steps[i],
      progress: ((i + 1) / steps.length) * 100,
      complete: i === steps.length - 1,
    };
  }
}

// CN helper for className merging
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
