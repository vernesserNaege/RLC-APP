import { useEffect, useState } from "react";

// A request is always in exactly one of these three states.
export type FetchState<T> =
  | { status: "loading" }
  | { status: "error"; error: Error }
  | { status: "success"; data: T };

// Runs `fetcher` and tracks its state. `key` identifies the request
// (e.g. the module id); when it changes, the request runs again.
export function useFetch<T>(fetcher: () => Promise<T>, key: string): FetchState<T> {
  const [result, setResult] = useState<{ key: string; state: FetchState<T> } | null>(null);

  useEffect(() => {
    let cancelled = false; // set when the page closes before the reply arrives

    fetcher().then(
      (data) => {
        if (!cancelled) setResult({ key, state: { status: "success", data } });
      },
      (error: unknown) => {
        if (cancelled) return;
        const err = error instanceof Error ? error : new Error(String(error));
        setResult({ key, state: { status: "error", error: err } });
      },
    );

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // A result saved for an older key is out of date, so show loading instead.
  return result?.key === key ? result.state : { status: "loading" };
}