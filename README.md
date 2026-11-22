# Trading Plan

The app opens to Today’s Plan with the complete read-only workbook from Trading.pdf. Its 25 sections retain the original order within each navigation group. The plan library shows every entry, including models and workspace setups outside the active session. The guided workflow filters checklists to the current selection.

The source ships in the release. This edition uses an encrypted workbook and a private access link. Open the full link on a new browser. The browser unlocks the bundled plan locally and remembers access on that origin. Source text, hierarchy and rules have no editing or replacement controls. Anyone with the private link can read the plan.

Daily answers, notes, account selection, risk review and session lockouts persist locally in IndexedDB. Settings can export and restore session backups. Older backups restore session data while the bundled source remains authoritative. The source coverage report is available under Settings → Data.

## Run locally

Use Node.js 22.13 or later.

```sh
npm ci
npm run dev
```

Use the same private link fragment on localhost. The downloadable personal edition bundles the source directly and opens without a private link. For a production build run `npm run build` and `npm start`.

## Verify

```sh
npm test
npm run typecheck
npm run build
```
