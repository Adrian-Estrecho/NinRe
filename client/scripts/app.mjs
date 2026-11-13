// Builds the NinRe phone app.
//
//   node scripts/app.mjs sync        build the web client for the app and copy it into android/
//   node scripts/app.mjs apk         sync, then build a debug APK you can install on a phone
//   node scripts/app.mjs open        sync, then open the project in Android Studio
//
// The app needs to know where NinRe's server is. Set NINRE_API_URL (for example https://ninre.app); without it, the
// app talks to this computer on the local network (http://<this computer's Wi-Fi address>:4000), which is what you
// want while testing on your own phone on the same Wi-Fi. NINRE_SITE_URL is the public website, used in invite links;
// it defaults to the server address.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const client = join(dirname(fileURLToPath(import.meta.url)), "..");
const step = process.argv[2] ?? "sync";
const win = process.platform === "win32";

/** This computer's address on the local network: the first private IPv4 address. */
function lanAddress() {
  const all = Object.values(networkInterfaces()).flat().filter((a) => a && a.family === "IPv4" && !a.internal);
  const ip = all.find((a) => /^(192\.168|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(a.address)) ?? all[0];
  if (!ip) throw new Error("Couldn't find this computer's network address. Set NINRE_API_URL instead.");
  return ip.address;
}

const api = (process.env.NINRE_API_URL || `http://${lanAddress()}:${process.env.PORT || 4000}`).replace(/\/+$/, "");
const site = (process.env.NINRE_SITE_URL || api).replace(/\/+$/, "");
const env = { ...process.env, NINRE_API_URL: api, VITE_API_URL: api, VITE_SITE_URL: site };
// Where the JDK and Android SDK were installed for this user, for a terminal opened before they were set.
if (win && !env.JAVA_HOME && process.env.LOCALAPPDATA) env.JAVA_HOME = join(process.env.LOCALAPPDATA, "Programs", "jdk-21");
if (win && !env.ANDROID_HOME && process.env.LOCALAPPDATA) env.ANDROID_HOME = join(process.env.LOCALAPPDATA, "Android", "Sdk");
const run = (cmd, args, cwd = client) => execFileSync(cmd, args, { cwd, env, stdio: "inherit", shell: win });

console.log(`\nThe app will talk to NinRe at ${api}\n`);
run("npx", ["tsc", "-p", "tsconfig.json"]);
run("npx", ["vite", "build"]);
if (!existsSync(join(client, "android"))) run("npx", ["cap", "add", "android"]);
run("npx", ["cap", "sync", "android"]);

if (step === "apk") {
  run(join(client, "android", win ? "gradlew.bat" : "gradlew"), ["assembleDebug"], join(client, "android"));
  console.log(`\nAPK: ${join(client, "android", "app", "build", "outputs", "apk", "debug", "app-debug.apk")}`);
  if (api.startsWith("http://")) console.log(`Start the server on this computer (npm run dev, or npm start) before opening the app; the phone must be on the same Wi-Fi.`);
} else if (step === "open") {
  run("npx", ["cap", "open", "android"]);
}
