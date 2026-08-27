# PaycheckLink Mobile

Standalone React Native (Expo) app for **Paycheck Calculator** — Android / iOS.

Uses a **copy** of the paychecklink.com tax engine in `lib/` (same `calculatePaycheck` logic as the website).

## Run

```bash
npm start
```

Scan the QR code with **Expo Go**, or press `a` for Android emulator.

## Sync tax rates from the website

When you update tax tables on the main PaycheckLink site, copy these files into this project:

```
From: Salary Paycheck Calculator/
  lib/calculator.ts
  lib/types.ts
  lib/tax/*.ts   (skip *.test.ts files)

To: PaycheckLink Mobile/lib/
```

Then test the app and commit.

## Play Store (later)

```bash
npx eas build -p android --profile preview
```

Package: `com.paychecklink.calculator`

## Related project

Website repo: `Salary Paycheck Calculator` (paychecklink.com)
