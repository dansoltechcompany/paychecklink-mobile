# PaycheckLink Mobile

Standalone React Native (Expo) app for **Paycheck Calculator** — Android / iOS.

Uses a **copy** of the paychecklink.com tax engine in `lib/` (same `calculatePaycheck` logic as the website).

## Run

```bash
npm start
```

Scan the QR code with **Expo Go**, or press `a` for Android emulator.

## Sync tax rates from the website

Do not copy tax files by hand. From this repo:

```bash
npm run tax:sync    # copy lib/calculator.ts, lib/types.ts, lib/tax/*.ts from the website
npm run tax:check   # fail if those files differ (also runs as npm test)
```

The website repo is expected at `../Salary Paycheck Calculator`. Override with `TAX_ENGINE_SOURCE`.

`tax-engine.lock.json` records the website git commit and file hashes. Copied `.ts` files stay identical to the site — no extra comments — so the check can diff them.

CI clones `dansoltechcompany/paychecklink` and fails the build on drift. If that repo is private, add a `PAYCHECKLINK_REPO_TOKEN` secret with `repo` read access.

## Play Store (later)

```bash
npx eas build -p android --profile preview
```

Package: `com.paychecklink.calculator`

## Related project

Website repo: `Salary Paycheck Calculator` (paychecklink.com)
