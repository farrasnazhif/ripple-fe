# Ripple frontend

Next.js frontend for the Ripple creative-change workspace. It follows the folder organization used in `mockupblast` (`src/app`, `src/components`, `src/constants`, `src/hooks`, `src/lib`, and `src/types`) while using Ripple-specific code and design.

Shared controls come from shadcn/ui under `src/components/ui`. Pages and components use Tailwind utility classes; `src/app/globals.css` only defines shared shadcn theme tokens and base rules. React Query manages API queries and mutations; Axios handles Go API requests and the direct signed R2 upload.

Every signed-in route uses one shared shadcn Base UI sidebar layout with Projects, Briefs, and an account dropdown containing Sign out. The sign-in route has no sidebar. On desktop the sidebar can collapse to icons; on mobile the header trigger opens it.

## Run locally

1. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_API_URL` to the Go API (default `http://localhost:8080/api/v1`).
2. Run `pnpm install` and `pnpm dev`.
3. Start `ripple-be` with its database for registration, login, and workspace access. The database-free `go run ./cmd/demo` serves only a public synthetic API fixture on port 8081; it cannot authenticate frontend sessions.

The main `/project` route lists the signed-in user's saved projects. A dialog creates a project and uploads multiple brief files to private Cloudflare R2. `/project/[projectId]` checks ownership and starts its canvas with only Raw Brief. A Brief Summary node appears only when that project's brief has a saved, nonempty summary. The canvas does not request the demo graph or show placeholder storyboard/clip nodes. Clicking a node opens its details in a dialog. Storyboard and clip nodes remain unavailable until project generation outputs are persisted. `/workspace` redirects to `/project`.

The `/briefs` route also requires a valid login and uses authenticated brief creation/retrieval by ID, Cloudflare R2 attachment upload/download, and ChatGPT summary review. `/sign-in` supports email/password login and immediate registration. Registration returns a JWT, which the browser holds in session storage until the tab session ends. Protected pages verify it through `/users/me` before showing content. Configure R2 bucket CORS to allow the frontend origin, `PUT`, and `Content-Type` for direct uploads. A summary uses entered text; the backend does not extract attachment contents yet.

Run `pnpm lint`, `pnpm exec tsc --noEmit`, and `pnpm build` before deployment.

The project canvas supports two-finger trackpad pan, pinch zoom anchored at the pointer, background dragging, and draggable nodes with live connections. Click a node without dragging to open its dialog. Node positions remain local to the mounted canvas and reset when it is reopened. Run `pnpm check:graph` to check the initial layout and zoom anchoring.
