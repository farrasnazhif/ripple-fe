"use client";

import { useSyncExternalStore } from "react";

export function useAuthToken() {
  return useSyncExternalStore(
    () => () => {},
    () => sessionStorage.getItem("ripple_token"),
    () => null,
  );
}
