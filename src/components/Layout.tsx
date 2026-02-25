import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router";
import {
  Cable,
  Download,
  Heart,
  Info,
  LayoutDashboard,
  Settings,
  FileChartColumn,
  User,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast, Toaster } from "sonner";
import { apiClient } from "@/api/client";
import { cn } from "@/app/lib/utils";
import { GlassThemeToggle } from "@/components/GlassThemeToggle";
import AppHeader from "@/components/AppHeader";
import type { UiSettings } from "@/types/api";
import mainLogo from "@/assets/Main-Logo.png";

interface NavigationItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

const primaryNavigationItems: NavigationItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/users", label: "Users", icon: User },
  { to: "/presence", label: "Live Presence", icon: Users },
  { to: "/reports", label: "Reports", icon: FileChartColumn },
  { to: "/exports", label: "Exports", icon: Download },
  { to: "/connections", label: "Connections", icon: Cable },
  { to: "/settings", label: "Settings", icon: Settings },
];

const secondaryNavigationItems: NavigationItem[] = [
  { to: "/about", label: "About", icon: Info },
  { to: "/donate", label: "Donate", icon: Heart },
];

export function Layout() {
  const [settings, setSettings] = useState<UiSettings | null>(null);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    apiClient
      .getSettings()
      .then(({ settings }) => {
        setSettings(settings);
        const nextIsDark = settings.theme === "dark";
        setIsDark(nextIsDark);
        document.documentElement.classList.toggle("dark", nextIsDark);
      })
      .catch(() => {
        // Ignore startup settings issues.
      });
  }, []);

  const handleThemeToggle = async () => {
    if (!settings) {
      return;
    }

    const nextIsDark = !isDark;
    const nextSettings: UiSettings = {
      ...settings,
      theme: nextIsDark ? "dark" : "light",
    };

    setIsDark(nextIsDark);
    setSettings(nextSettings);
    document.documentElement.classList.toggle("dark", nextIsDark);

    try {
      await apiClient.saveSettings(nextSettings);
    } catch (error) {
      const rollbackIsDark = !nextIsDark;
      setIsDark(rollbackIsDark);
      setSettings(settings);
      document.documentElement.classList.toggle("dark", rollbackIsDark);
      toast.error(error instanceof Error ? error.message : "Failed to save theme setting");
    }
  };

  const renderNavigationItem = (item: NavigationItem) => (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.to === "/"}
      className={({ isActive }) =>
        cn(
          "group flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all",
          isActive
            ? item.to === "/donate"
              ? "bg-red-50 text-red-600"
              : "bg-[var(--clockwork-orange-light)] text-[var(--clockwork-orange)]"
            : "text-[var(--clockwork-gray-700)] hover:bg-[var(--clockwork-gray-100)]",
        )
      }
    >
      {({ isActive }) => {
        const Icon = item.icon;
        const isDonateItem = item.to === "/donate";

        return (
          <>
            <Icon
              className={cn(
                "h-5 w-5 transition-all duration-200",
                isDonateItem &&
                  (isActive
                    ? "fill-red-500 text-red-500"
                    : "fill-transparent group-hover:scale-110 group-hover:fill-red-500 group-hover:text-red-500"),
              )}
            />
            <span>{item.label}</span>
          </>
        );
      }}
    </NavLink>
  );

  return (
    <div className="relative h-screen overflow-hidden bg-[var(--clockwork-bg-primary)]">
      <AppHeader />

      <div className="relative z-10 flex h-screen">
        <aside className="flex h-full w-64 flex-col border-r border-[var(--clockwork-border)] bg-[var(--clockwork-bg-secondary)]">
          <img
            src={mainLogo}
            alt="Clockwork logo"
            className="h-40 w-full border-b border-[var(--clockwork-border)] object-cover"
          />

          <nav className="flex-1 overflow-y-auto p-4">
            <div className="space-y-1">{primaryNavigationItems.map(renderNavigationItem)}</div>
          </nav>

          <div className="px-4 pb-4">
            <div className="space-y-1">{secondaryNavigationItems.map(renderNavigationItem)}</div>
          </div>

          <div className="flex justify-center border-t border-[var(--clockwork-border)] p-4">
            <GlassThemeToggle isDark={isDark} onToggle={() => void handleThemeToggle()} />
          </div>
        </aside>

        <main className="flex-1 overflow-auto">
          <Outlet context={{ isDark }} />
        </main>
      </div>

      <Toaster position="bottom-right" richColors />
    </div>
  );
}
