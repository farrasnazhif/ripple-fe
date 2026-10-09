"use client";

import { useSyncExternalStore } from "react";

export function useAuthToken() {
  return useSyncExternalStore(
    () => () => {},
    () => sessionStorage.getItem("ripple_token") || null,
    // Hydration has not read browser storage yet; this is not a missing session.
    () => undefined,
  );
}
