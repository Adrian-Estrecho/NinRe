import { Icon, type IconName } from "./Icon";
import "./icon-dock.css";

export type DockTone = "coral" | "azure" | "violet" | "sun";
export type DockApp = { icon: IconName; label: string; href: string; tone: DockTone };

/** The four ways into the book the website's dock used to offer, kept for the mobile app's tab bar. */
export const BOOK_DOCK: DockApp[] = [
  { icon: "pin", label: "The map", tone: "coral", href: "#pages" },
  { icon: "camera", label: "What’s on a page", tone: "azure", href: "#inside" },
  { icon: "palette", label: "Design a cover", tone: "violet", href: "#design" },
  { icon: "people", label: "Plans", tone: "sun", href: "#pricing" },
];

/**
 * A row of app-icon tiles that lift and show their name on hover or focus. The website no longer shows it;
 * it's kept for the mobile app. Its styles load with it, so nothing ships until something renders a dock.
 */
export function IconDock({ apps = BOOK_DOCK, label = "Jump to", className = "" }: { apps?: DockApp[]; label?: string; className?: string }) {
  return (
    <nav className={`dock ${className}`} aria-label={label}>
      {apps.map(({ icon, label, tone, href }) => (
        <a key={href} href={href} className={`dock-app ${tone}`} aria-label={label} data-label={label}>
          <Icon name={icon} />
        </a>
      ))}
    </nav>
  );
}
