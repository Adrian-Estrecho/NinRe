# The Android app

NinRe's phone app is the same React client, bundled into a native shell with [Capacitor](https://capacitorjs.com). The Android project is in `client/android/`; its settings are in `client/capacitor.config.ts`.

## What's different in the app

- **Sign-in:** the app keeps a session token, saved on the phone, and sends it as `Authorization: Bearer …`. The website keeps using its cookie. Photos load with a separate photo key in the address (`?k=…`), because an `<img>` can't send a header. The key opens photos and nothing else. Logging out ends both. See `server/src/auth.ts`.
- **Adding photos:** a native sheet offers *Take a photo* or *Choose from your photos*. The second opens the phone's photo picker, where several photos can be picked at once.
- **Invites** open the phone's share sheet (Messenger, Viber, SMS…). Invite links point at the website.
- **Back button:** closes an open book or dialog first, then steps back through the screens. On the library, it puts the app in the background.
- **No purchases:** the app shows your plan but sells nothing and doesn't point anyone to a payment. Google Play requires its own billing for anything sold inside an app. People subscribe on the website, and the plan applies in the app too.
- **No front page:** the app opens on the library, or on logging in.

All of this is switched on by `isApp` in `client/src/lib/native.ts`. App-only styles are in `client/src/styles/phone-app.css`.

## Try it on your phone

One-time setup on this PC is done: JDK 21 is in `%LOCALAPPDATA%\Programs\jdk-21` and the Android SDK is in `%LOCALAPPDATA%\Android\Sdk`.

1. Build the APK:
   ```
   npm run app:apk -w client
   ```
   With no `NINRE_API_URL` set, the app talks to this computer at its Wi-Fi address on port 4000. The script prints that address.
2. Start the server on this computer: `npm run dev`. The first time, Windows asks whether Node.js may use the network. Allow it on **private networks**.
3. Copy `client/android/app/build/outputs/apk/debug/app-debug.apk` to the phone and open it. Android asks you to allow installing from that source. Or, with USB debugging on, run `%LOCALAPPDATA%\Android\Sdk\platform-tools\adb install -r` followed by the APK's path.
4. Keep the phone on the same Wi-Fi as the computer.

The computer's Wi-Fi address can change. If the app can't reach NinRe, build again.

To point the app at the live site instead, run:
```
set NINRE_API_URL=https://your-domain && npm run app:apk -w client
```
(or `NINRE_API_URL=https://your-domain npm run app:apk -w client` in Git Bash).

Other commands: `npm run app:sync -w client` builds and copies the web client into `android/` without building an APK. `npm run app:open -w client` opens the project in Android Studio, if it's installed.

**Icons and splash:** the sources are `client/assets/src/*.svg`. Run `node assets/src/render.mjs`, then `npx capacitor-assets generate --android --iconBackgroundColor "#5b95d0" --splashBackgroundColor "#2a56b9" --splashBackgroundColorDark "#14202b"` (both from `client/`).

## Before publishing on Google Play

1. **Decide the app id.** It is `com.ninre.app` (in `capacitor.config.ts` and `android/app/build.gradle`), and it can never change after the first upload. Use your own domain reversed if you have one, for example `app.ninre`.
2. **Point it at the live site** with `NINRE_API_URL=https://…`. Release builds refuse plain http.
3. **Make an upload key** (`keytool -genkey …`), keep it safe, and add a `signingConfigs.release` to `android/app/build.gradle`. Then build the bundle with `gradlew bundleRelease`.
4. **Play Console:** $25 once. A new *personal* account must run a closed test with 12 testers for 14 days before it can publish. An organisation account, which needs a free D-U-N-S number, skips that.
5. **Store listing:** screenshots, a privacy policy URL, the data-safety form (email, name, photos), and the content rating questionnaire.
6. **Invite links** open in the browser for now. To open them in the app, add Android App Links once the domain is live: an intent filter for `https://your-domain/join/*`, plus an `assetlinks.json` served by the website. The app already handles `/join/…` links when it receives them (`client/src/lib/shell.ts`).

iOS comes later. Run `npx cap add ios` on a Mac, or build with Codemagic. It needs the $99 a year Apple Developer Program. See `docs/DEPLOYMENT.md`.
