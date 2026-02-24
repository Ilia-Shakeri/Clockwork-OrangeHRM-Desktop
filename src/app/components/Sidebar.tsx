// Sidebar navigation component for Clockwork

import { Link, useLocation } from 'react-router';
import { motion } from 'motion/react';
import {
  LayoutDashboard,
  FileText,
  Scan,
  Download,
  Cable,
  Settings,
  HelpCircle,
} from 'lucide-react';
import { cn } from '../lib/utils';

const navigationItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/reports', label: 'Reports', icon: FileText },
  { path: '/bulk-scan', label: 'Bulk Scan', icon: Scan },
  { path: '/exports', label: 'Exports', icon: Download },
  { path: '/connections', label: 'Connections', icon: Cable },
  { path: '/settings', label: 'Settings', icon: Settings },
  { path: '/help', label: 'Help', icon: HelpCircle },
];

export function Sidebar() {
  const location = useLocation();
  
  return (
    <aside className="w-64 h-screen bg-[var(--clockwork-bg-secondary)] border-r border-[var(--clockwork-border)] flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-[var(--clockwork-border)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[var(--clockwork-orange)] rounded-lg flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="2"/>
              <path d="M12 6V12L16 14" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-[var(--clockwork-gray-900)]">
              Clockwork
            </h1>
            <p className="text-xs text-[var(--clockwork-gray-500)]">HR Attendance</p>
          </div>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link key={item.path} to={item.path}>
              <motion.div
                whileHover={{ x: 4 }}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-all relative',
                  isActive
                    ? 'bg-[var(--clockwork-orange-light)] text-[var(--clockwork-orange)]'
                    : 'text-[var(--clockwork-gray-600)] hover:bg-[var(--clockwork-gray-100)]'
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--clockwork-orange)] rounded-r"
                  />
                )}
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">{item.label}</span>
              </motion.div>
            </Link>
          );
        })}
      </nav>
      
      {/* Footer */}
      <div className="p-4 border-t border-[var(--clockwork-border)]">
        <div className="text-xs text-[var(--clockwork-gray-500)] text-center">
          <p>Version 1.0.0</p>
          <p className="mt-1">© 2026 Clockwork</p>
        </div>
      </div>
    </aside>
  );
}
