import { useEffect, useRef, useState, type ReactNode } from "react";
import { api, errorText } from "../api";
import { Icon } from "../components/Icon";
import type { Figure } from "../types";
import { isApp } from "../lib/native";
import { Link } from "../router";
import { ACCESSORIES, AGES, BUILDS, DEFAULT_FIGURE, FigureArt, GENDERS, HAIR_STYLES, HATS, isPremiumFigure, OUTFITS, SKIN_TONES, type Choice } from "./FigureArt";

// Photos are shrunk before they're sent: plenty to see someone's hair and clothes, and quick to upload.
const SEND_EDGE = 1024;

type Step = { at: "start" } | { at: "reading"; preview: string };

/** Shrinks a photo to a JPEG no longer than SEND_EDGE on its long side. */
async function shrink(file: File): Promise<Blob> {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, SEND_EDGE / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  img.close();
  return new Promise((done, fail) => canvas.toBlob((b) => (b ? done(b) : fail(new Error("no blob"))), "image/jpeg", 0.85));
}

/**
 * Making a minifigure for the bookcase: from a photo (the server has Claude read the person's look off it) or by hand.
 * Either way it ends in the same editor, so a figure read off a photo can be put right before it goes on the shelf.
 * The figure being made is held by the panel (`draft`), which draws it large in its preview at the top.
 */
export function FigureMaker({ full, subscribed, draft, onDraft, onPlace }: {
  full: boolean;
  /** On Plus or Crew: premium looks can go on the bookcase, not just be tried on. */
  subscribed: boolean;
  draft: Figure | null;
  onDraft: (fig: Figure | null) => void;
  onPlace: (fig: Figure) => void;
}) {
  const [step, setStep] = useState<Step>({ at: "start" });
  const [fromPhoto, setFromPhoto] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const run = useRef(0);

  useEffect(() => {
    let live = true;
    api.figureOptions().then((o) => live && setFromPhoto(o.fromPhoto), () => live && setFromPhoto(false));
    return () => {
      live = false;
      run.current++;
    };
  }, []);

  async function read(f: File) {
    setError("");
    const preview = URL.createObjectURL(f);
    const mine = ++run.current;
    setStep({ at: "reading", preview });
    try {
      let blob: Blob;
      try {
        blob = await shrink(f);
      } catch {
        throw new Error("That photo couldn't be opened. Try a JPG or PNG.");
      }
      const fig = await api.figureFromPhoto(blob);
      if (mine === run.current) {
        setStep({ at: "start" });
        onDraft(fig);
      }
    } catch (err) {
      if (mine !== run.current) return;
      setError(err instanceof Error && !("status" in err) ? err.message : errorText(err, "The figure couldn't be made. Try again."));
      setStep({ at: "start" });
    } finally {
      URL.revokeObjectURL(preview);
    }
  }

  const choose = (
    <input
      ref={file}
      type="file"
      accept="image/jpeg,image/png,image/webp"
      hidden
      onChange={(e) => {
        const f = e.target.files?.[0];
        e.target.value = "";
        if (f) void read(f);
      }}
    />
  );

  if (step.at === "reading") {
    return (
      <div className="fm fm-reading" role="status">
        <img className="fm-photo" src={step.preview} alt="" />
        <p><span className="fm-spin" aria-hidden="true" />Reading your photo…</p>
        <button type="button" className="link-btn" onClick={() => { run.current++; setStep({ at: "start" }); }}>Cancel</button>
      </div>
    );
  }

  if (draft) {
    return (
      <FigureEditor
        fig={draft}
        full={full}
        canRetry={fromPhoto === true}
        subscribed={subscribed}
        onChange={onDraft}
        onRetry={() => file.current?.click()}
        onCancel={() => onDraft(null)}
        onPlace={(fig) => { onPlace(fig); onDraft(null); }}
      >
        {choose}
      </FigureEditor>
    );
  }

  return (
    <div className="fm">
      {choose}
      <div className="fm-start">
        <svg className="fm-thumb" viewBox="0 0 44 96" aria-hidden="true"><FigureArt fig={{ ...DEFAULT_FIGURE, hairStyle: "curly", top: "#f2b632" }} /></svg>
        <div>
          <p className="fm-h">Make a minifigure</p>
          <p className="fm-sub">{fromPhoto ? "A little you for the bookcase, from a photo or made yourself." : "A little you for the bookcase: pick the hair, clothes and colours."}</p>
        </div>
      </div>
      <div className="fm-actions">
        {fromPhoto && (
          <button type="button" className="btn sun small" disabled={full} onClick={() => file.current?.click()}>
            <Icon name="camera" />From a photo
          </button>
        )}
        <button type="button" className="btn line small" disabled={full} onClick={() => onDraft(DEFAULT_FIGURE)}>
          <Icon name="palette" />Make minifigure
        </button>
      </div>
      {fromPhoto && <p className="hint">Your photo is sent to Claude, Anthropic's AI, to pick the colours and styles. It isn't saved.</p>}
      {error && <p className="fm-error" role="alert">{error}</p>}
    </div>
  );
}

interface EditorProps {
  fig: Figure;
  full: boolean;
  canRetry: boolean;
  subscribed: boolean;
  onChange: (fig: Figure) => void;
  onRetry: () => void;
  onCancel: () => void;
  onPlace: (fig: Figure) => void;
  children?: ReactNode;
}

type Tab = "body" | "hair" | "clothes" | "extras";
const TABS: { id: Tab; name: string }[] = [
  { id: "body", name: "Body" },
  { id: "hair", name: "Hair" },
  { id: "clothes", name: "Clothes" },
  { id: "extras", name: "Extras" },
];

type ColourKey = "hair" | "top" | "bottom" | "shoes" | "hatColor" | "accessoryColor";

// Ready colours for each part: natural shades (and a few bright ones) for hair, a wide range for clothes, mostly
// neutrals for shoes. The last swatch in each opens the full picker for anything else.
const HAIR_COLOURS = ["#1e1714", "#3b2519", "#4a2f22", "#6b4a2e", "#8b5a2b", "#a0522d", "#c8893d", "#e0b36a", "#f1dca0", "#9aa0a6", "#e8e6e1", "#d6366b", "#5b7fd6", "#7a5cc7"];
const CLOTHES_COLOURS = ["#fbfaf6", "#d9d4c8", "#6f7680", "#2b2f33", "#33415c", "#2f6fb8", "#5ba4d9", "#3f9a63", "#9cc46a", "#f2c23a", "#f28c38", "#d6364b", "#e46b8f", "#7a5cc7", "#8b5a2b", "#c9b28a"];
const SHOE_COLOURS = ["#2b2422", "#5a3d2b", "#8b5a2b", "#c9b28a", "#fbfaf6", "#6f7680", "#d6364b", "#2f6fb8", "#3f9a63", "#f2c23a"];
const PALETTES: Record<ColourKey, string[]> = {
  hair: HAIR_COLOURS, top: CLOTHES_COLOURS, bottom: CLOTHES_COLOURS, shoes: SHOE_COLOURS, hatColor: CLOTHES_COLOURS, accessoryColor: CLOTHES_COLOURS,
};

/** The swatches for one part, opened under its chip. */
function Palette({ label, value, swatches, onPick }: { label: string; value: string; swatches: string[]; onPick: (c: string) => void }) {
  const own = !swatches.includes(value.toLowerCase());
  return (
    <div className="fm-palette" role="group" aria-label={`${label} colour`}>
      {swatches.map((c) => (
        <button key={c} type="button" className="fm-swatch" style={{ background: c }} aria-pressed={value.toLowerCase() === c} aria-label={c} onClick={() => onPick(c)} />
      ))}
      <label className={`fm-swatch fm-swatch-any${own ? " on" : ""}`} style={own ? { background: value } : undefined} title="Any colour">
        <input type="color" value={value} aria-label={`Any ${label.toLowerCase()} colour`} onChange={(e) => onPick(e.target.value)} />
        {!own && <span aria-hidden="true">+</span>}
      </label>
    </div>
  );
}

/** Every trait of a figure, one group at a time, while the panel draws the figure above as it changes. */
function FigureEditor({ fig, full, canRetry, subscribed, onChange, onRetry, onCancel, onPlace, children }: EditorProps) {
  // Anyone can try a premium look on; only subscribers can keep it.
  const locked = !subscribed && isPremiumFigure(fig);
  const [tab, setTabState] = useState<Tab>("body");
  // The colour chip whose swatches are open, if any.
  const [picking, setPicking] = useState<ColourKey | null>(null);
  const setTab = (t: Tab) => { setTabState(t); setPicking(null); };
  const set = (part: Partial<Figure>) => onChange({ ...fig, ...part });
  const labels: Partial<Record<ColourKey, string>> = {};
  const colour = (label: string, key: ColourKey) => {
    labels[key] = label;
    return (
      <button type="button" className="fm-colour" aria-expanded={picking === key} onClick={() => setPicking(picking === key ? null : key)}>
        <span className="fm-colour-dot" style={{ background: fig[key] }} aria-hidden="true" />
        <span>{label}</span>
        <svg className="fm-colour-caret" viewBox="0 0 10 6" aria-hidden="true"><path d="M1 1l4 4 4-4" /></svg>
      </button>
    );
  };
  // The swatches open under the row of the chip that was tapped.
  const palette = (keys: ColourKey[]) =>
    picking && keys.includes(picking) && labels[picking] && (
      <Palette label={labels[picking]!} value={fig[picking]} swatches={PALETTES[picking]} onPick={(c) => set({ [picking]: c })} />
    );
  const chips = <K extends keyof Figure>(key: K, options: Choice<Figure[K]>[], label: string) => (
    <div className="fm-row" role="group" aria-label={label}>
      <span className="fm-label">{label}</span>
      <div className="fm-chips">
        {options.map((o) => (
          <button
            key={String(o.id)}
            type="button"
            className={`fm-chip${o.premium ? " premium" : ""}`}
            aria-pressed={fig[key] === o.id}
            aria-label={o.premium && !subscribed ? `${o.name} (Plus and Crew)` : undefined}
            onClick={() => set({ [key]: o.id } as Partial<Figure>)}
          >
            {o.name}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="fm fm-edit">
      {children}
      <label className="fm-row">
        <span className="fm-label">Name</span>
        <input className="input" maxLength={24} value={fig.name} placeholder="Who is it?" onChange={(e) => set({ name: e.target.value })} />
      </label>

      <div className="fm-tabs" role="tablist" aria-label="Appearance">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" id={`fm-tab-${t.id}`} aria-selected={tab === t.id} aria-controls="fm-tabpanel" onClick={() => setTab(t.id)}>{t.name}</button>
        ))}
      </div>

      <div key={tab} className="fm-tabpanel" id="fm-tabpanel" role="tabpanel" aria-labelledby={`fm-tab-${tab}`}>
        {tab === "body" && (
          <>
            {chips("gender", GENDERS, "Gender")}
            {chips("age", AGES, "Age")}
            {chips("build", BUILDS, "Build")}
            <div className="fm-row" role="group" aria-label="Skin">
              <span className="fm-label">Skin</span>
              <div className="fm-tones">
                {SKIN_TONES.map((t) => (
                  <button key={t} type="button" className="fm-tone" style={{ background: t }} aria-pressed={fig.skin === t} aria-label={`Skin tone ${t}`} onClick={() => set({ skin: t })} />
                ))}
                <label className="fm-tone fm-tone-any" aria-label="Any skin tone">
                  <input type="color" value={fig.skin} onChange={(e) => set({ skin: e.target.value })} />
                </label>
              </div>
            </div>
          </>
        )}
        {tab === "hair" && (
          <>
            {chips("hairStyle", HAIR_STYLES, "Style")}
            <div className="fm-row" role="group" aria-label="Hair colour and beard">
              <span className="fm-label">Colour</span>
              <div className="fm-chips">
                {colour("Hair", "hair")}
                <button type="button" className="fm-chip" aria-pressed={fig.beard} onClick={() => set({ beard: !fig.beard })}>Beard</button>
              </div>
              {palette(["hair"])}
            </div>
          </>
        )}
        {tab === "clothes" && (
          <>
            {chips("outfit", OUTFITS, "Outfit")}
            <div className="fm-row" role="group" aria-label="Clothes colours">
              <span className="fm-label">Colours</span>
              <div className="fm-chips">
                {colour(fig.outfit === "dress" ? "Dress" : "Top", "top")}
                {fig.outfit !== "dress" && colour(fig.outfit === "skirt" ? "Skirt" : fig.outfit === "shorts" ? "Shorts" : "Trousers", "bottom")}
                {colour("Shoes", "shoes")}
              </div>
              {palette(["top", "bottom", "shoes"])}
            </div>
          </>
        )}
        {tab === "extras" && (
          <>
            {chips("hat", HATS, "Hat")}
            {chips("accessory", ACCESSORIES, "Accessory")}
            <div className="fm-row" role="group" aria-label="More">
              <span className="fm-label">More</span>
              <div className="fm-chips">
                {fig.hat !== "none" && colour("Hat colour", "hatColor")}
                {fig.accessory !== "none" && colour(ACCESSORIES.find((x) => x.id === fig.accessory)?.name ?? "Accessory", "accessoryColor")}
                {fig.accessory !== "sunglasses" && (
                  <button type="button" className="fm-chip" aria-pressed={fig.glasses} onClick={() => set({ glasses: !fig.glasses })}>Glasses</button>
                )}
              </div>
              {palette(["hatColor", "accessoryColor"])}
            </div>
          </>
        )}
      </div>

      {locked && (
        <p className="fm-locked">
          <span className="fm-plus">Plus</span>
          This look is for Plus and Crew. Try it on here; to put it on the bookcase, switch back to an everyday look{isApp ? "." : <> or <Link href="/app/settings/plan?upgrade=plus">see plans</Link>.</>}
        </p>
      )}
      <div className="fm-actions">
        <button type="button" className="btn sun small" disabled={full || locked} onClick={() => onPlace({ ...fig, name: fig.name.trim() })}>
          <Icon name="check" />Put on the bookcase
        </button>
        {canRetry && <button type="button" className="btn line small" onClick={onRetry}><Icon name="camera" />Another photo</button>}
        <button type="button" className="link-btn" onClick={onCancel}>Cancel</button>
      </div>
      {full && <p className="hint">The bookcase is full: take something off in the preview first.</p>}
    </div>
  );
}
