import type { CapacitorConfig } from "@capacitor/cli";

/*
 * The NinRe phone app: the web client in client/dist, bundled into a native shell.
 * Build it with `npm run app:apk -w client` (see scripts/app.mjs), which sets the server address the app talks to.
 */
const config: CapacitorConfig = {
  // The store identity. It can't change once the app is published on Google Play.
  appId: "com.ninre.app",
  appName: "NinRe",
  webDir: "dist",
  server: {
    // The app's own pages load from https://localhost; the server allows that origin (server/src/auth.ts).
    androidScheme: "https",
  },
  android: {
    // While testing against a computer on the same Wi-Fi, the server is plain http. Release builds talk to https only.
    allowMixedContent: process.env.NINRE_API_URL?.startsWith("http://") ?? false,
  },
  plugins: {
    SplashScreen: {
      // The app hides it once the first screen has drawn (src/lib/shell.ts).
      launchAutoHide: false,
      backgroundColor: "#2a56b9",
      showSpinner: false,
    },
    SystemBars: {
      // Edge to edge, with the safe areas in env(safe-area-inset-*) and --safe-area-inset-* for the CSS to keep clear.
      insetsHandling: "css",
    },
  },
};

export default config;
