import { Heart, Info, User } from "lucide-react";
import { Link } from "react-router";
import { toast } from "sonner";
import { Button } from "@/app/components/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/Card";
import { cn } from "@/app/lib/utils";
import { socialLinks } from "@/config/socialLinks";

export function About() {
  const openSocialLink = async (url: string) => {
    const result = await window.clockwork.openExternal(url);
    if (!result.ok) {
      toast.error("Unable to open external link.");
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8">
      <div>
        <div>
          <h1 className="mb-2 text-3xl font-semibold text-[var(--clockwork-green)]">About</h1>
          <p className="text-sm text-[var(--clockwork-gray-600)]">
            Learn more about Clockwork OrangeHRM Desktop and stay connected.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-[var(--clockwork-orange)]" />
            <CardTitle>Clockwork OrangeHRM Desktop</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-7 text-[var(--clockwork-gray-700)]">
            Clockwork OrangeHRM Desktop is a Windows-first attendance toolkit for OrangeHRM. It
            provides payroll-cycle and custom-range reporting, multi-database connectivity
            (MariaDB/MySQL/PostgreSQL/SQLite), and fast CSV/PDF exports through a secure local API.
          </p>

          <div className="rounded-lg border border-[var(--clockwork-border)] bg-[var(--clockwork-gray-50)] p-4">
            <div className="mb-1 flex items-center gap-2">
              <User className="h-4 w-4 text-[var(--clockwork-green)]" />
              <p className="font-medium text-[var(--clockwork-gray-900)]">Ilia Shakeri</p>
            </div>
            <p className="text-sm text-[var(--clockwork-gray-600)]">
              Built and maintained by Ilia Shakeri.
            </p>
          </div>

          <div className="pt-1">
            <Link to="/donate">
              <Button variant="primary" className="group">
                <Heart
                  className={cn(
                    "h-4 w-4 transition-all duration-200",
                    "fill-transparent group-hover:scale-110 group-hover:fill-red-500 group-hover:text-red-500 group-active:fill-red-500 group-active:text-red-500",
                  )}
                />
                Donate
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Social Links</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {socialLinks.map((linkItem) => {
              const Icon = linkItem.icon;
              return (
                <button
                  key={linkItem.id}
                  type="button"
                  onClick={() => void openSocialLink(linkItem.url)}
                  className="flex items-center justify-between rounded-lg border border-[var(--clockwork-border)] bg-[var(--clockwork-bg-primary)] px-4 py-3 text-left transition-colors hover:bg-[var(--clockwork-gray-50)]"
                >
                  <span className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-[var(--clockwork-orange)]" />
                    <span>
                      <span className="block text-sm font-medium text-[var(--clockwork-gray-900)]">
                        {linkItem.label}
                      </span>
                      <span className="block text-xs text-[var(--clockwork-gray-600)]">
                        {linkItem.handle ?? linkItem.url}
                      </span>
                    </span>
                  </span>
                  <span className="text-xs text-[var(--clockwork-gray-500)]">Open</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
