import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { ApiError } from "../api";
import type { FetchState } from "../hooks/useFetch";
import StatusScreen from "./StatusScreen";

interface AsyncViewProps<T> {
  state: FetchState<T>;
  what: string; // used in the messages: "Loading <what>...", "Could not load <what>"
  children: (data: T) => ReactNode;
}

// Shows the loading / not found / error screen, or the page once the data is ready.
// This replaces the same three if-statements that used to be copied into every page.
export default function AsyncView<T>({
  state,
  what,
  children,
}: AsyncViewProps<T>) {
  if (state.status === "loading") {
    return <StatusScreen title={`Loading ${what}...`} showHome={false} />;
  }

  if (state.status === "error") {
    if (state.error instanceof ApiError && state.error.status === 401) {
      return <Navigate to="/admin/login" replace />;
    }
    return (
      <StatusScreen
        title={`Could not load ${what}`}
        message={state.error.message}
      />
    );
  }

  return <>{children(state.data)}</>;
}
