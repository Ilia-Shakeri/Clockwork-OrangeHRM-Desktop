import { useEffect, useState } from "react";

interface PageHelpButtonProps {
  title: string;
  overview: string;
  steps: string[];
}

export function PageHelpButton({
  title,
  overview,
  steps,
}: PageHelpButtonProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    const closeOnAnyPointer = () => {
      setOpen(false);
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", closeOnAnyPointer);
    document.addEventListener("touchstart", closeOnAnyPointer);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnAnyPointer);
      document.removeEventListener("touchstart", closeOnAnyPointer);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  return (
    <div className="relative mt-3">
      <button
        type="button"
        onClick={() => {
          if (open) {
            setOpen(false);
            return;
          }

          setOpen(true);
        }}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--clockwork-green)] text-base font-semibold leading-none text-[var(--clockwork-green)] transition-colors hover:bg-[var(--clockwork-green-light)]"
        aria-label="Help"
        title="Help"
      >
        ?
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-lg border border-[var(--clockwork-border)] bg-[var(--clockwork-bg-primary)] p-4 shadow-[var(--clockwork-shadow-lg)]">
          <div className="mb-2">
            <p className="text-sm font-semibold text-[var(--clockwork-gray-900)]">{title}</p>
          </div>
          <p className="mb-3 text-xs text-[var(--clockwork-gray-600)]">{overview}</p>
          <ol className="space-y-1 pl-4 text-xs text-[var(--clockwork-gray-700)]">
            {steps.map((step, index) => (
              <li key={step}>{`${index + 1}. ${step}`}</li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}
