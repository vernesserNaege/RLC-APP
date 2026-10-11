import { useCallback, useEffect, useState } from "react";

type ToastKind = "success" | "error";

// A short message that pops up at the bottom of the screen and disappears by itself,
// so the admin sees "Saved" wherever they have scrolled to.
// Usage: const [toast, showToast] = useToast();  ...  showToast("Saved");  ...  {toast} in the page.
export function useToast() {
  const [toast, setToast] = useState<{ text: string; kind: ToastKind; id: number } | null>(null);

  // Success messages stay 3 seconds, errors 6 (they take longer to read).
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), toast.kind === "error" ? 6000 : 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const showToast = useCallback(
    (text: string, kind: ToastKind = "success") => setToast({ text, kind, id: Date.now() }),
    [],
  );

  const element = toast && (
    // key: a new message restarts the pop-up animation even if the text is the same
    <div key={toast.id} className={`toast toast-${toast.kind}`} role={toast.kind === "error" ? "alert" : "status"}>
      <span aria-hidden="true">{toast.kind === "success" ? "✓" : "!"}</span>
      {toast.text}
      <button type="button" onClick={() => setToast(null)} aria-label="Close message">✕</button>
    </div>
  );

  return [element, showToast] as const;
}