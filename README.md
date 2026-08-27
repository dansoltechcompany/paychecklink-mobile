# PaycheckLink mobile (React Native / Expo)

US paycheck calculator app sharing the same TypeScript tax engine as [paychecklink.com](https://paychecklink.com).

## Run

```bash
cd mobile
npm start
```

Then scan the QR code with **Expo Go** on your phone, or press `a` for Android emulator.

From the repo root: `npm run mobile`

## Shared engine

`App.tsx` imports `calculatePaycheck` from `../lib/calculator` — same federal / FICA / state logic as the website. When you update rates on the web, the app picks them up automatically.

## Play Store later

Use [EAS Build](https://docs.expo.dev/build/introduction/) when you are ready to publish:

```bash
cd mobile
npx eas build -p android --profile preview
```
