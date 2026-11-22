# Trading Plan

The private Full trading plan link opens the complete read-only workbook from Trading.pdf in a responsive card grid. Compact view previews each section. All entries expands the original hierarchy across the page. Its 25 sections retain the original order within each navigation group. The plan library shows every entry, including models and workspace setups outside the active session. The guided workflow filters checklists to the current selection.

The source ships in the release. This edition uses an encrypted workbook and a private access link. Open the full link on a new browser. The full-plan reader validates the private link and serves the cards as HTML. Reading, expanding cards and group navigation work with JavaScript and browser storage disabled. Interactive session pages use a separate browser workspace. Source text, hierarchy and rules have no editing or replacement controls. Anyone with the private link can read the plan.

Daily answers, notes, account selection, risk review and session lockouts persist locally in IndexedDB. Settings can export and restore session backups. Older backups restore session data while the bundled source remains authoritative. The source coverage report is available under Settings → Data.

## Run locally

Use Node.js 22.13 or later.

```sh
npm ci
npm run dev
```

For the encrypted edition, configure the server-only TRADING_PLAN_SOURCE_KEY in .env.local or as a production secret and open the same private reader path on the new origin. The downloadable personal edition bundles the source directly and opens without a private link. For a production build run `npm run build` and `npm start`.

## Verify

```sh
npm test
npm run typecheck
npm run build
```
