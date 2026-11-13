import { useEffect, useState } from "react";
import { isPhoneScreen, type FrameMessage } from "../lib/frame";
import { appLike } from "../lib/native";

/** The screen is the size of a common phone (390 × 844 points); the bezel adds 14 on every side. */
const SCREEN = { w: 390, h: 844 };
const BEZEL = 14;
const PHONE = { w: SCREEN.w + BEZEL * 2, h: SCREEN.h + BEZEL * 2 };

const clock = () => new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).replace(/\s?[AP]M$/i, "");

/**
 * On a computer, NinRe's phone screens are shown in a phone. The screen inside is the real page in an iframe, so it
 * behaves as on a phone; the frame draws the status bar, the camera island and the home bar over it.
 */
export function PhoneFrame({ path }: { path: string }) {
  // The frame loads its screen once; after that the screen moves on its own and reports where it is.
  const [src] = useState(path);
  const [ground, setGround] = useState<"dark" | "light">("light");
  const [time, setTime] = useState(clock);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const fit = () => setScale(Math.min(1, (window.innerHeight - 56) / PHONE.h, (window.innerWidth - 32) / PHONE.w));
    fit();
    window.addEventListener("resize", fit);
    const tick = window.setInterval(() => setTime(clock()), 15_000);
    return () => {
      window.removeEventListener("resize", fit);
      window.clearInterval(tick);
    };
  }, []);

  useEffect(() => {
    function hear(e: MessageEvent) {
      if (e.origin !== location.origin) return;
      const msg = (e.data as { ninre?: FrameMessage } | null)?.ninre;
      if (!msg) return;
      if (msg.kind === "bar") return setGround(msg.ground);
      // Still a phone screen: keep the address bar in step, so a reload comes back to it. Otherwise leave the frame.
      if (!isPhoneScreen(msg.path.split("?")[0])) return void location.assign(msg.path);
      if (location.pathname + location.search !== msg.path) history.replaceState(history.state, "", msg.path);
      if (msg.title) document.title = msg.title;
    }
    window.addEventListener("message", hear);
    return () => window.removeEventListener("message", hear);
  }, []);

  return (
    <div className="frame-page">
      {!appLike && <a href="/" className="frame-word">NinRe</a>}
      <div className="phone-slot" style={{ width: PHONE.w * scale, height: PHONE.h * scale }}>
        <div className="phone" style={{ width: PHONE.w, height: PHONE.h, transform: `scale(${scale})` }}>
          <span className="phone-key power" />
          <span className="phone-key vol-up" />
          <span className="phone-key vol-down" />
          <div className="phone-screen">
            <iframe src={src} title="NinRe" />
            <div className={`phone-status on-${ground}`} aria-hidden="true">
              <span className="phone-time">{time}</span>
              <span className="phone-island" />
              <span className="phone-icons">
                <svg viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1" /><rect x="5" y="5.5" width="3" height="6.5" rx="1" /><rect x="10" y="3" width="3" height="9" rx="1" /><rect x="15" y="0" width="3" height="12" rx="1" /></svg>
                <svg viewBox="0 0 16 12"><path d="M8 2.2c2.3 0 4.4.9 6 2.4l1.3-1.4A10.6 10.6 0 0 0 8 .3 10.6 10.6 0 0 0 .7 3.2L2 4.6a8.7 8.7 0 0 1 6-2.4Zm0 3.8c1.3 0 2.5.5 3.4 1.3l1.3-1.4A6.8 6.8 0 0 0 8 4.1a6.8 6.8 0 0 0-4.7 1.8l1.3 1.4C5.5 6.5 6.7 6 8 6Zm0 3.7 2-2.1a3 3 0 0 0-4 0Z" /></svg>
                <span className="phone-battery"><span /></span>
              </span>
            </div>
            <span className={`phone-home on-${ground}`} aria-hidden="true" />
          </div>
        </div>
      </div>
    </div>
  );
}
