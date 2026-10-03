# EasyShoppingDZ – Android app

Your HTML store wrapped as a native Android app with Capacitor.

## What's included
- Works fully offline (Tailwind + fonts are bundled, no CDN calls)
- Local notifications: order confirmation, "on the way", "arrived", and a cart reminder (3 h after you leave the app with items in the cart)
- Android 13+ notification permission prompt (asked the first time an item is added to the cart)
- Hardware Back button closes panels / clears search / minimizes the app
- Cart, wilaya and store are remembered between launches
- Haptic feedback, edge-to-edge layout, dark-mode-aware system bars, custom icon + splash

## Option A – build the APK in the cloud (no Android Studio)
1. Create a GitHub repo and push this folder to the `main` branch.
2. Open the repo's **Actions** tab → *Build Android APK* → wait ~5 min.
3. Download the `EasyShoppingDZ-apk` artifact, unzip, copy `app-debug.apk` to your phone and install it
   (allow "install from unknown sources" when asked).

## Option B – build locally
Requirements: Node 22+, Android Studio (or JDK 21 + Android SDK).
```bash
npm install
npm run sync        # builds CSS/JS and copies to the Android project
npm run open        # opens Android Studio -> Run, or Build > Build APK(s)
```
Or from the command line: `cd android && ./gradlew assembleDebug`
(APK appears in `android/app/build/outputs/apk/debug/`).

## After editing the HTML
Edit `www/index.html`, then run `npm run sync` and rebuild.

## Publishing to Google Play
The debug APK is only for testing/sideloading. For the Play Store you need a signed release
build (`./gradlew bundleRelease` with your own keystore), and a real backend/payment flow:
the current checkout is a demo (no real orders or payments).
