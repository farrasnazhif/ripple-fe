# Ripple frontend

Next.js frontend for the Ripple creative-change workspace. It follows the folder organization used in `mockupblast` (`src/app`, `src/components`, `src/constants`, `src/hooks`, `src/lib`, and `src/types`) while using Ripple-specific code and design.

Shared controls come from shadcn/ui under `src/components/ui`. Pages and components use Tailwind utility classes; `src/app/globals.css` only defines shared shadcn theme tokens and base rules. React Query manages API queries and mutations; Axios handles Go API requests and the direct signed R2 upload.

Every signed-in route uses one shared shadcn Base UI sidebar layout with Projects, Briefs, and an account dropdown containing Sign out. The sign-in route has no sidebar. On desktop the sidebar can collapse to icons; on mobile the header trigger opens it.

## Run locally

1. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_API_URL` to the Go API (default `http://localhost:8080/api/v1`).
2. Run `pnpm install` and `pnpm dev`.
3. Start `ripple-be` with its database for registration, login, and workspace access. The database-free `go run ./cmd/demo` serves only a public synthetic API fixture on port 8081; it cannot authenticate frontend sessions.

The main `/project` route lists the signed-in user's saved projects. A dialog creates a project and uploads multiple brief files to private Cloudflare R2. `/project/[projectId]` checks ownership, then shows its brief, confirmed summary, and a node canvas with sample storyboard/clip data from authenticated `GET /demo/graph`. Clicking a node opens its details in a dialog. Project attachments are saved, while storyboard/clip data is a labeled synthetic fixture shared across projects until persisted project graph data exists. `/workspace` redirects to `/project`.

The `/briefs` route also requires a valid login and uses authenticated brief creation/retrieval by ID, Cloudflare R2 attachment upload/download, and ChatGPT summary review. `/sign-in` supports email/password login and immediate registration. Registration returns a JWT, which the browser holds in session storage until the tab session ends. Protected pages verify it through `/users/me` before showing content. Configure R2 bucket CORS to allow the frontend origin, `PUT`, and `Content-Type` for direct uploads. A summary uses entered text; the backend does not extract attachment contents yet.

Run `pnpm lint`, `pnpm exec tsc --noEmit`, and `pnpm build` before deployment.
