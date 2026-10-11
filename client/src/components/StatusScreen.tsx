import NavButton from "./NavButton";

interface StatusScreenProps {
  title: string;
  message?: string;
  showHome?: boolean;
}

// Full-page message for loading, errors and "not found".
export default function StatusScreen({ title, message, showHome = true }: StatusScreenProps) {
  return (
    <div className="app">
      <main className="empty-state">
        <h2>{title}</h2>
        {message && <p>{message}</p>}
        {showHome && <NavButton to="/">Return Home</NavButton>}
      </main>
    </div>
  );
}