"use client";
import { useEffect, useRef } from "react";

// Native modal dialogs keep keyboard focus inside and make the background inert.
export default function FocusDialog({ children, onClose, busy = false }: { children: React.ReactNode; onClose: () => void; busy?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
    dialog?.showModal();
    return () => { dialog?.close(); if (opener?.isConnected) opener.focus(); };
  }, []);
  return <dialog ref={ref} className="modal" aria-labelledby="reset-title" aria-describedby="reset-description" aria-busy={busy}
    onKeyDown={e => {
      if (e.key !== "Tab") return;
      const controls = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])')).filter(el => el.getClientRects().length);
      const first = controls[0], last = controls.at(-1);
      if (!first) { e.preventDefault(); e.currentTarget.focus(); }
      else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }}
    onCancel={e => { e.preventDefault(); if (!busy) onClose(); }}>{children}</dialog>;
}
