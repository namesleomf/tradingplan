# Trading Plan

A local-first trading workbook built with Next.js App Router, React, TypeScript, Tailwind, shadcn-style components, Lucide, Zustand and Dexie. It opens on Today’s Plan and groups 25 editable sections into seven navigation groups.

## Run locally

Use Node.js 22.13 or later.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. For a production build, run `npm run build` followed by `npm start`. Vercel can deploy the repository using its Next.js preset.

## Load your plan

In Settings → Data, choose **Import plan or backup** and select the supplied source JSON. Import replaces the workspace on that browser and origin. The original imported snapshot powers Restore original plan. The public project starts with an empty library. A private build can preload a source JSON by replacing `src/data/initial.json` before building. A preloaded file becomes part of the client bundle.

The source mapping is in Settings → Data. Entries with ambiguous applicability stay unconfigured until classified in the plan editor. Configure each account’s trading window, opening restriction and risk limits in Settings. Daily plan figures from the source remain available under Original daily plan.

## Daily use

Select the active account, complete Today’s Plan, and open Guided Workflow. Answers are shared with the corresponding plan pages. Entry triggers reference the original entry-model requirement IDs. The source’s account-specific or conflicting values are available for review before configuration. Validation gives a reason for each invalid or incomplete condition.

Plan definitions, original source, accounts, preferences and account/day sessions occupy separate IndexedDB tables. Trading dates and trading restrictions use America/New_York. Manual outcome recording calculates local risk restrictions. Lockouts apply within this app. Export a JSON backup before clearing browser storage, changing browser or moving to another URL.

## Verification

```sh
npm test
npm run typecheck
npm run build
```
