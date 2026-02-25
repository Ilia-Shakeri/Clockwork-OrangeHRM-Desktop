import { useState } from "react";

function MinimizeGlyph() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      <rect x="1" y="6" width="8" height="1" fill="currentColor" />
    </svg>
  );
}

function MaximizeGlyph() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      <rect x="1.5" y="1.5" width="7" height="7" fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

function RestoreGlyph() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      <rect x="2.5" y="1.5" width="6" height="6" fill="none" stroke="currentColor" strokeWidth="1" />
      <rect x="1.5" y="2.5" width="6" height="6" fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

function CloseGlyph() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="square" />
    </svg>
  );
}

export default function AppHeader() {
  const [isMaximized, setIsMaximized] = useState(false);
  const bridge = window.clockwork;

  const handleMinimize = async () => {
    if (!bridge?.windowControls) {
      return;
    }

    await bridge.windowControls.minimize();
  };

  const handleToggleMaximize = async () => {
    if (!bridge?.windowControls) {
      return;
    }

    const result = await bridge.windowControls.toggleMaximize();
    setIsMaximized(Boolean(result?.maximized));
  };

  const handleClose = async () => {
    if (!bridge?.windowControls) {
      return;
    }

    await bridge.windowControls.close();
  };

  return (
    <header className="fixed left-0 right-0 top-0 z-[1200] h-10">
      <div className="app-drag-region absolute inset-0 bg-transparent" />
      <div className="app-no-drag absolute right-0 top-0 flex h-10 items-center pr-1">
        <div className="flex items-center">
          <button
            onClick={() => void handleMinimize()}
            className="flex h-8 w-[46px] items-center justify-center text-[var(--clockwork-orange)] transition-colors hover:bg-black/10 dark:text-[var(--clockwork-green)] dark:hover:bg-white/10"
            aria-label="Minimize"
            title="Minimize"
          >
            <MinimizeGlyph />
          </button>
          <button
            onClick={() => void handleToggleMaximize()}
            className="flex h-8 w-[46px] items-center justify-center text-[var(--clockwork-orange)] transition-colors hover:bg-black/10 dark:text-[var(--clockwork-green)] dark:hover:bg-white/10"
            aria-label={isMaximized ? "Restore" : "Maximize"}
            title={isMaximized ? "Restore" : "Maximize"}
          >
            {isMaximized ? <RestoreGlyph /> : <MaximizeGlyph />}
          </button>
          <button
            onClick={() => void handleClose()}
            className="flex h-8 w-[46px] items-center justify-center text-[var(--clockwork-orange)] transition-colors hover:bg-[#E81123] hover:text-white dark:text-[var(--clockwork-green)]"
            aria-label="Close"
            title="Close"
          >
            <CloseGlyph />
          </button>
        </div>
      </div>
    </header>
  );
}
