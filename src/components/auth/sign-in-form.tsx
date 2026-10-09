"use client";

import { FormEvent, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
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
    // Grid container
    <main className="grid min-h-screen grid-cols-1 bg-[#ffffff] lg:grid-cols-[40%_60%]">
      
      {/* Left Column: Form with increased outer and vertical padding */}
      <div className="flex flex-col justify-center px-10 py-16 sm:px-20 lg:px-28 lg:py-24">
        <div className="mx-auto w-full max-w-[440px]">
          
          {/* Logo Replacement */}
          <img
            src="/main-logo-black.png"
            alt="Ripple Logo"
            className="mb-14 h-9 w-auto object-contain"
          />

          <h1 className="text-4xl font-semibold tracking-tight text-neutral-900">
            {mode === "sign-up" ? "Create an account" : "Welcome back."}
          </h1>
          {/* <p className="mt-3 leading-relaxed text-neutral-500">
            Manage briefs, references, and creative direction in one place.
          </p> */}

          <form onSubmit={submit} className="mt-10 flex flex-col gap-4">
            {mode === "sign-up" && (
              <Label className="flex flex-col items-stretch gap-2.5 text-sm font-medium text-[#4d6960]">
                Username
                <Input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoComplete="username"
                  required
                  maxLength={100}
                  placeholder="Your username"
                  className="h-12 bg-white px-4 text-sm"
                />
              </Label>
            )}
            <Label className="flex flex-col items-stretch gap-2.5 text-sm font-medium text-[#4d6960]">
              Email address
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
                placeholder="you@studio.com"
                className="h-12 bg-white px-4 text-base"
              />
            </Label>
            <Label className="flex flex-col items-stretch gap-2.5 text-sm font-medium text-[#4d6960]">
              Password
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={
                  mode === "sign-up" ? "new-password" : "current-password"
                }
                required
                minLength={mode === "sign-up" ? 8 : undefined}
                aria-describedby={mode === "sign-up" ? "password-hint" : undefined}
                placeholder="••••••••"
                className="h-12 bg-white px-4 text-base"
              />
            </Label>

            {mode === "sign-up" && (
              <p id="password-hint" className="-mt-3 text-xs text-muted-foreground">
                Use at least 8 characters.
              </p>
            )}

            {error && (
              <p className="rounded-md bg-red-50 p-4 text-xs text-red-700" role="alert">
                {error}
              </p>
            )}

            <Button
              type="submit"
              // className="mt-4 h-13 w-full py-7 text-base font-medium bg-[#16B58B] hover:bg-[#008878] text-white"
              className="mt-4 h-13 w-full py-7 text-base font-medium text-white"
              disabled={auth.isPending}
            >
              {auth.isPending
                ? "Please wait…"
                : mode === "sign-up"
                  ? "Create account"
                  : "Sign in"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>

          {/* Switch Mode Section */}
          <div className="mt-10 border-t border-neutral-200/80 pt-8 text-center text-xs text-primary">
            {mode === "sign-in" ? (
              <Button
                className="h-auto p-0 font-semibold text-primary hover:text-primary-muted"
                variant="link"
                type="button"
                onClick={() => {
                  setMode("sign-up");
                  setError("");
                }}
              >
                New here? Create an account <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            ) : (
              <Button
                className="h-auto p-0 font-semibold text-primary hover:text-primary-muted"
                variant="link"
                type="button"
                onClick={() => {
                  setMode("sign-in");
                  setError("");
                }}
              >
                Already have an account? Sign in <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Image */}
      <div className="hidden relative bg-neutral-200 lg:block">
        <img
          src="/ripple-splash-login.png"
          alt="Ripple Workspace"
          className="absolute inset-0 h-full w-full object-cover object-right"
        />
        <div className="absolute inset-0 bg-black/5 mix-blend-multiply" />
      </div>

    </main>
  );
}