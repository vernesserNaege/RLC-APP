import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// How long a student page may sit untouched before the app goes back to Home.
// Change it with VITE_IDLE_MINUTES in client/.env (e.g. VITE_IDLE_MINUTES=5).
const IDLE_MS = (Number(import.meta.env.VITE_IDLE_MINUTES) || 3) * 60_000;
const WARNING_SECONDS = 15;
const ACTIVITY = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart"] as const;

// Kiosk behaviour for the student side of the crate (never on admin pages):
//  - no right-click menu, so students can't reach "Inspect", "Save as", etc.
//  - after a few idle minutes: "Still there?", then back to Home, ready for the next student.
export default function KioskGuard() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const studentPage = !pathname.startsWith("/admin");
  const canReset = studentPage && pathname !== "/"; // Home has nothing to reset
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null); // null = no warning showing

  // No right-click menu on student pages.
  useEffect(() => {
    if (!studentPage) return;
    const block = (event: MouseEvent) => event.preventDefault();
    document.addEventListener("contextmenu", block);
    return () => document.removeEventListener("contextmenu", block);
  }, [studentPage]);

  // Any touch, mouse movement or key press restarts the idle timer and hides the warning.
  useEffect(() => {
    if (!canReset) return;
    let timer = window.setTimeout(() => setSecondsLeft(WARNING_SECONDS), IDLE_MS);
    const restart = () => {
      window.clearTimeout(timer);
      setSecondsLeft(null);
      timer = window.setTimeout(() => setSecondsLeft(WARNING_SECONDS), IDLE_MS);
    };
    ACTIVITY.forEach((name) => window.addEventListener(name, restart, { passive: true }));
    return () => {
      window.clearTimeout(timer);
      ACTIVITY.forEach((name) => window.removeEventListener(name, restart));
      setSecondsLeft(null); // a new page starts with no warning
    };
  }, [canReset, pathname]);

  // The warning counts down once a second; at 0 the app goes Home.
  useEffect(() => {
    if (secondsLeft === null) return;
    if (secondsLeft === 0) {
      navigate("/");
      return;
    }
    const tick = window.setTimeout(() => setSecondsLeft(secondsLeft - 1), 1000);
    return () => window.clearTimeout(tick);
  }, [secondsLeft, navigate]);

  if (!canReset || secondsLeft === null) return null;
  return (
    <div className="idle-overlay" role="alertdialog" aria-labelledby="idle-title" aria-describedby="idle-text">
      <div className="idle-card">
        <h2 id="idle-title">Still there?</h2>
        <p id="idle-text">
          Going back to the Home screen in <strong>{secondsLeft}</strong> seconds.
        </p>
        <button type="button" className="next-button" onClick={() => setSecondsLeft(null)}>
          I'm still here
        </button>
      </div>
    </div>
  );
}