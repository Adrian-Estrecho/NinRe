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
import { prefs } from "./lib/prefs";
import { SessionProvider } from "./session";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/book.css";
import "./styles/pages.css";
import "./styles/atlas.css";
import "./styles/dialogs.css";
import "./styles/designer.css";
import "./styles/app.css";
import "./marketing/landing.css";
import "./auth/auth.css";

// Apply a chosen theme before the first paint.
const theme = prefs.get<string>("theme", "system");
if (theme === "light" || theme === "dark") document.documentElement.dataset.theme = theme;

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
