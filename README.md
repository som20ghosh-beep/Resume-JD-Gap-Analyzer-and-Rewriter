# ResumeFit

Resume ↔ Job Description gap analyzer and rewriter. See [resume-gap-analyzer-prompt.md](./resume-gap-analyzer-prompt.md) for the full product spec this app is built against.

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in ANTHROPIC_API_KEY
npx prisma migrate dev
npm run dev
```

## Scripts

- `npm run dev` — start the app
- `npm test` — run unit tests (Vitest)
- `npm run build` — production build
- `npm run db:migrate` — apply Prisma migrations
- `npm run db:studio` — browse the SQLite DB

## Stack

Next.js (App Router) + TypeScript (strict) + Tailwind + shadcn/ui, Zustand, Prisma + SQLite (via the `better-sqlite3` driver adapter — Prisma 7 requires an explicit adapter), Zod, Anthropic SDK, Vitest + Playwright.
