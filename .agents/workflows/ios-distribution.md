---
description: how to build and distribute the application for iOS
---

# iOS Distribution Workflow

// turbo-all

## Prerequisites
- macOS with Xcode installed
- Apple Developer account with valid signing certificates and provisioning profiles
- Node.js and npm installed

## Steps

1. Install dependencies (if not already done):
```bash
npm install
```

2. Build the web app:
```bash
npm run build
```

3. Sync the web build with the Capacitor iOS project:
```bash
npx cap sync ios
```

4. Open the project in Xcode:
```bash
npx cap open ios
```

5. In Xcode:
   - Select the **App** target
   - Go to **Signing & Capabilities** tab
   - Select your **Team** and ensure signing is configured
   - Set the **Bundle Identifier** to `com.dojo.app` (should already be set)
   - Select the target device or **Any iOS Device (arm64)** for archive builds

6. To run on a connected device:
   - Select your device from the device dropdown in Xcode
   - Press **Cmd+R** or click the Play button

7. To create an archive for distribution:
   - Select **Product → Archive** in Xcode (requires **Any iOS Device** as the target)
   - Once the archive completes, the Organizer window will open
   - Click **Distribute App**
   - Choose distribution method:
     - **App Store Connect** for TestFlight / App Store submission
     - **Ad Hoc** for direct device installation
   - Follow the prompts to upload or export

## Quick Command (Sync + Open)
```bash
npm run cap:sync
```
This runs `npm run build && npx cap sync`, then you can open Xcode with:
```bash
npm run cap:open
```

## Troubleshooting
- If pods are out of date, run `cd ios/App && pod install` then retry
- If signing fails, check your Apple Developer portal for valid certificates and profiles
- After changing `capacitor.config.ts`, always re-run `npx cap sync ios`
