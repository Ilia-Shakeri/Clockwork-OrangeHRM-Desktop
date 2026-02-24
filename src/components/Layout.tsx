import { useEffect } from "react";
import { NavLink, Outlet } from "react-router";
import {
  Cable,
  Download,
  LayoutDashboard,
  ScanSearch,
  Settings,
  FileChartColumn,
} from "lucide-react";
import { Toaster } from "sonner";
import { apiClient } from "@/api/client";
import { cn } from "@/app/lib/utils";

const navigationItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/reports", label: "Reports", icon: FileChartColumn },
  { to: "/bulk-scan", label: "Bulk Scan", icon: ScanSearch },
  { to: "/exports", label: "Exports", icon: Download },
  { to: "/connections", label: "Connections", icon: Cable },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function Layout() {
  useEffect(() => {
    apiClient
      .getSettings()
      .then(({ settings }) => {
        document.documentElement.classList.toggle("dark", settings.theme === "dark");
      })
      .catch(() => {
        // Ignore startup settings issues.
      });
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--clockwork-bg-primary)]">
      <aside className="flex h-screen w-64 flex-col border-r border-[var(--clockwork-border)] bg-[var(--clockwork-bg-secondary)]">
        <div className="border-b border-[var(--clockwork-border)] p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--clockwork-orange)] text-white">
              C
            </div>
            <div>
              <h1 className="text-lg font-semibold text-[var(--clockwork-gray-900)]">
                Clockwork
              </h1>
              <p className="text-xs text-[var(--clockwork-gray-500)]">OrangeHRM Desktop</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all",
                    isActive
                      ? "bg-[var(--clockwork-orange-light)] text-[var(--clockwork-orange)]"
                      : "text-[var(--clockwork-gray-700)] hover:bg-[var(--clockwork-gray-100)]",
                  )
                }
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-[var(--clockwork-border)] p-4 text-xs text-[var(--clockwork-gray-500)]">
          <p>Clockwork OrangeHRM Desktop</p>
          <p>Version 1.0.0</p>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>

      <Toaster position="top-right" richColors />
    </div>
  );
}
