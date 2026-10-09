"use client";

import { FormEvent, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [error, setError] = useState("");
  const auth = useMutation({
    mutationFn: async () => {
      return mode === "sign-up"
        ? api.register(username, email, password)
        : api.login(email, password);
    },
  });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      const result = await auth.mutateAsync();
      sessionStorage.setItem("ripple_token", result.token);
      const next = new URLSearchParams(window.location.search).get("next");
      router.replace(
        next === "/project" || next === "/briefs" || /^\/project\/[0-9a-f-]{36}$/i.test(next || "")
          ? next!
          : "/project",
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sign in failed.");
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#f0f4f0] p-8">
      <div className="mb-8 text-4xl font-black tracking-[-0.14em] text-[#1c3c39]">
        r<span className="text-orange-300">.</span> <small className="ml-3 align-middle text-[10px] tracking-[0.21em]">RIPPLE</small>
      </div>
      <Card className="block w-full max-w-[425px] rounded-md border border-emerald-100 bg-white p-9 shadow-xl">
        <div className="text-[10px] font-extrabold tracking-[0.15em] text-emerald-700">YOUR WORKSPACE AWAITS</div>
        <h1 className="text-4xl font-semibold tracking-tight">
          {mode === "sign-up" ? "Create an account" : "Welcome back"}
          <span className="text-orange-400">.</span>
        </h1>
        <p className="leading-relaxed text-neutral-500">
          Manage briefs, references, and creative direction in one place.
        </p>
        <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
          {mode === "sign-up" && (
            <Label className="flex flex-col items-stretch gap-2 text-xs font-bold text-[#4d6960]">
              Username
              <Input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                required
                maxLength={100}
                placeholder="Studio name"
              />
            </Label>
          )}
          <Label className="flex flex-col items-stretch gap-2 text-xs font-bold text-[#4d6960]">
            Email address
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
              placeholder="you@studio.com"
            />
          </Label>
          <Label className="flex flex-col items-stretch gap-2 text-xs font-bold text-[#4d6960]">
            Password
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={
                mode === "sign-up" ? "new-password" : "current-password"
              }
              required
              minLength={mode === "sign-up" ? 15 : undefined}
              aria-describedby={mode === "sign-up" ? "password-hint" : undefined}
              placeholder="••••••••"
            />
          </Label>
          {mode === "sign-up" && (
            <p id="password-hint" className="-mt-2 text-xs text-muted-foreground">
              Use at least 15 characters.
            </p>
          )}
          {error && (
            <p className="rounded-md bg-red-50 p-3 text-xs text-red-700" role="alert">
              {error}
            </p>
          )}
          <Button
            type="submit"
            className="mt-2 w-full"
            disabled={auth.isPending}
          >
            {auth.isPending
              ? "Please wait…"
              : mode === "sign-up"
                ? "Create account"
                : "Sign in"}
            <ArrowRight />
          </Button>
        </form>
        <div className="mt-6 border-t border-neutral-200 pt-4 text-xs text-neutral-500">
          {mode === "sign-in" ? (
            <Button
              className="h-auto p-0 font-semibold text-emerald-700"
              variant="link"
              type="button"
              onClick={() => {
                setMode("sign-up");
                setError("");
              }}
            >
              New here? Create an account <ArrowRight />
            </Button>
          ) : (
            <Button
              className="h-auto p-0 font-semibold text-emerald-700"
              variant="link"
              type="button"
              onClick={() => {
                setMode("sign-in");
                setError("");
              }}
            >
              Already have an account? Sign in <ArrowRight />
            </Button>
          )}
        </div>
      </Card>
    </main>
  );
}
