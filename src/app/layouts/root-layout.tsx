// Root layout for Clockwork

import { Outlet } from 'react-router';
import { Sidebar } from '../components/Sidebar';
import { Toaster } from 'sonner';

export function RootLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--clockwork-bg-primary)]">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
      <Toaster position="top-right" richColors />
    </div>
  );
}
