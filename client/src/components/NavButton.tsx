import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

interface NavButtonProps {
  to: string;
  className?: string;
  disabled?: boolean;
  label?: string; // read out by screen readers when the button shows only an icon
  children: ReactNode;
}

// A button that opens another page. Replaces repeating useNavigate + onClick everywhere.
// type="button" stops it from submitting a form it sits inside (like the login form).
export default function NavButton({ to, className = "lesson-back-button", disabled, label, children }: NavButtonProps) {
  const navigate = useNavigate();
  return (
    <button type="button" className={className} onClick={() => navigate(to)} disabled={disabled} aria-label={label}>
      {children}
    </button>
  );
}