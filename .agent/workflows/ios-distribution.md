---
description: how to build and distribute the application for iOS
---

To build and distribute the Dojo application for iOS, follow these steps:

### 1. Build the Web Application
First, generate the production build of your React application.
// turbo
```bash
npm run build
```

### 2. Sync with Capacitor
Sync the web build with the iOS project. This updates the native project with the latest web code and dependencies.
```bash
npx cap sync ios
```

### 3. Open in Xcode
Open the iOS project in Xcode to manage code signing and distribution.
```bash
npx cap open ios
```

### 4. Configure Signing in Xcode
1. In Xcode, select the **App** project in the Project Navigator.
2. Go to the **Signing & Capabilities** tab.
3. Select your Development Team.
4. Ensure a unique **Bundle Identifier** is set (e.g., `com.yourname.dojo`).

### 5. Build for Distribution
1. Select **Product > Archive** from the Xcode menu.
2. Once the archive is complete, the Organizer window will appear.
3. Click **Distribute App** and follow the prompts to upload to **App Store Connect** (TestFlight or App Store).

### 6. Test on Device (Local)
To run directly on a connected device:
1. Connect your iPhone/iPad via USB.
2. Select your device as the run destination in the top bar.
3. Click the **Play** button (or `Cmd + R`).
