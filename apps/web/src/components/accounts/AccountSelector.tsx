import { useEffect, useRef, useState } from "react";
import type { Navigate } from "../../routes/navigation";

export type AccountMode = "demo" | "real";

interface AccountSelectorProps {
  mode: AccountMode;
  balance: number;
  onChange: (mode: AccountMode) => void;
  navigate: Navigate;
}

export function AccountSelector({
  mode,
  balance,
  onChange,
  navigate,
}: AccountSelectorProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function closeOnOutsideClick(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, []);

  return (
    <div className="account-selector" ref={rootRef}>
      <button
        className={`account-trigger ${open ? "is-open" : ""}`}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className={`account-dot ${mode}`} />
        {mode === "demo" ? "DEMO" : "REAL"}
        <span className="chevron">⌄</span>
      </button>
      {open && (
        <div className="account-popover" role="dialog" aria-label="Select account">
          <div className="popover-heading">
            <div>
              <span className="popover-kicker">ACCOUNT</span>
              <strong>Choose an account</strong>
            </div>
            <button type="button" className="icon-button" aria-label="Close account menu" onClick={() => setOpen(false)}>×</button>
          </div>
          <button
            type="button"
            className={`account-option ${mode === "demo" ? "selected" : ""}`}
            onClick={() => {
              onChange("demo");
              setOpen(false);
            }}
          >
            <span className="account-option-mark demo">D</span>
            <span className="account-option-copy">
              <strong>Demo account <em>DEMO</em></strong>
              <small>Virtual funds · {balance.toLocaleString("en-US", { minimumFractionDigits: 2 })} USD</small>
            </span>
            <span className="selection-check">{mode === "demo" ? "✓" : ""}</span>
          </button>
          <button
            type="button"
            className={`account-option ${mode === "real" ? "selected" : ""}`}
            onClick={() => {
              onChange("real");
              setOpen(false);
            }}
          >
            <span className="account-option-mark real">R</span>
            <span className="account-option-copy">
              <strong>Real account <em className="real-badge">REAL</em></strong>
              <small>Account balance unavailable</small>
            </span>
            <span className="selection-check">{mode === "real" ? "✓" : ""}</span>
          </button>
          <div className="account-popover-footer">
            <span>Manage your accounts</span>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                navigate("/portfolio");
              }}
            >
              Manage accounts <span aria-hidden="true">↗</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
