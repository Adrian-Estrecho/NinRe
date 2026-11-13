import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/archivo/wdth.css";
import "@fontsource-variable/bodoni-moda/index.css";
import "@fontsource-variable/bodoni-moda/wght-italic.css";
import "@fontsource/spectral/400.css";
import "@fontsource/spectral/400-italic.css";
import "@fontsource/spectral/500.css";
import "@fontsource/spectral/600.css";
import "@fontsource/dm-mono/400.css";
import "@fontsource/dm-mono/500.css";
import "@fontsource/gochi-hand/400.css";
import "@fontsource/pinyon-script/400.css";
import "@fontsource/special-elite/400.css";
import { App } from "./App";
import { InkDefs } from "./components/InkDefs";
import { ToastProvider } from "./components/Toast";
import { inFrame } from "./lib/frame";
import { loadSession } from "./lib/native";
import { prefs } from "./lib/prefs";
import { startShell } from "./lib/shell";
import { SessionProvider } from "./session";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/book.css";
import "./styles/pages.css";
import "./styles/atlas.css";
import "./styles/dialogs.css";
import "./styles/designer.css";
import "./styles/app.css";
import "./styles/settings.css";
import "./styles/library.css";
import "./styles/plan.css";
import "./styles/kinds.css";
import "./styles/phone-app.css";
import "./styles/landing.css";
import "./styles/auth.css";
import "./styles/onboarding.css";
import "./styles/glass.css";
import "./styles/phone-frame.css";

// Inside the desktop phone frame, the page is the phone's screen: it leaves room for the drawn status bar and home bar.
if (inFrame) document.documentElement.classList.add("in-frame");

// Apply a chosen theme before the first paint.
const theme = prefs.get<string>("theme", "system");
if (theme === "light" || theme === "dark") document.documentElement.dataset.theme = theme;

// In the phone app, the saved session is read first so the app opens signed in.
void loadSession().then(() => {
  startShell();
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <SessionProvider>
        <ToastProvider>
          <InkDefs />
          <App />
        </ToastProvider>
      </SessionProvider>
    </StrictMode>,
  );
});
