# School Admission — Frontend

React 19 + Vite + TypeScript + Tailwind CSS v4 + shadcn/ui, TanStack Query, React Router v7.

```bash
pnpm install
pnpm dev        # http://localhost:5173 (backend: http://localhost:8080)
pnpm lint
pnpm typecheck
pnpm build
```

Backend URL: `public/config.js` (`window.__ENV__.API_URL`, runtime) → `VITE_API_URL` (build time, see `.env.example`) → `http://localhost:8080`.
