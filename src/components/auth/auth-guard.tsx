"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useAuthToken } from "@/hooks/use-auth-token";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const token = useAuthToken();
  const session = useQuery({
    queryKey: ["auth", token],
    queryFn: () => api.me(token!),
    enabled: !!token,
    retry: false,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const invalid = session.error instanceof ApiError && session.error.status === 401;

  useEffect(() => {
    if (token === undefined) return;
    if (!token || invalid) {
      if (invalid) sessionStorage.removeItem("ripple_token");
      router.replace(`/sign-in?next=${encodeURIComponent(pathname)}`);
    }
  }, [token, invalid, pathname, router]);

  if (session.isSuccess && token) return children;
  if (session.isError && !invalid) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f0f4f0] p-8">
        <p>We couldn&apos;t verify your session.</p>
        <Button onClick={() => session.refetch()}>Try again</Button>
      </main>
    );
  }
  return null;
}
