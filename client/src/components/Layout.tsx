import type { ReactNode } from "react";
import Logo from "./Logo";
import NavButton from "./NavButton";

interface LayoutProps {
  subtitle?: string;
  className: string; // style of the <main> area, e.g. "home-container"
  showHome?: boolean; // the Home button in the header (student pages other than Home)
  admin?: boolean; // admin pages: the logo goes back to the dashboard
  children: ReactNode;
}

// The frame every page shares (student and admin): the dark header, then the page content.
// The logo in the top-right corner is the hidden way into the admin login.
export default function Layout({
  subtitle = "Learn • Build • Program • Test",
  className,
  showHome,
  admin,
  children,
}: LayoutProps) {
  return (
    // "kiosk" = student pages: bigger buttons, no accidental text selection (see index.css)
    <div className={admin ? "app" : "app kiosk"}>
      <header className="app-header">
        <div className="header-inner">
          <div className="brand">
            <h1>ROBOTICS LEARNING CRATE</h1>
            <p>{subtitle}</p>
          </div>
          <div className="header-actions">
            {showHome && (
              <NavButton to="/" className="header-home">
                ⌂ Home
              </NavButton>
            )}
            <NavButton
              to={admin ? "/admin" : "/admin/login"}
              className="brand-logo"
              label="Robotics Learning Crate"
            >
              <Logo />
            </NavButton>
          </div>
        </div>
      </header>
      <main className={className}>{children}</main>
    </div>
  );
}
