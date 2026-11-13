import { createContext, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { api, errorText } from "../api";
import { Icon } from "../components/Icon";
import { useToast } from "../components/Toast";
import { deriveCode, fold } from "../lib/format";
import { isImageFile, preparePhoto } from "../lib/image";
import { isNative } from "../lib/native";
import { pickPhonePhotos } from "../lib/phone-photos";
import type { KindInfo } from "../lib/kinds";
import { PLACES } from "../lib/places";
import type { NumberedPage, Page, PageDraft, Photo } from "../types";
import { Editable } from "./Editable";
import type { SaveState } from "./room";

export const MAX_PHOTOS = 12;
const SAVE_AFTER = 800;

/**
 * Where a page puts its own tools (an album's layout picker) outside the book, just above it, when the reader gives
 * it a place: the element, or null until it's there. Left undefined (no reader around it), the page keeps them inside.
 */
export const LeafTools = createContext<HTMLElement | null | undefined>(undefined);

/** What every kind of page is given to draw itself with. */
export interface LeafProps {
  bookId: string;
  page: NumberedPage;
  kind: KindInfo;
  me: { id: string; owner: boolean } | null;
  /** Off while the book is only being read: the page shows as printed, with nothing to click into. */
  writing: boolean;
  /** A page just added opens with its title ready to type. */
  fresh?: boolean;
  onSaved: (page: Page) => void;
  onState: (state: SaveState) => void;
}

/** The parts of a page that can be changed in place, and the photos with what's needed to show them. */
export type Leaf = Omit<PageDraft, "photos"> & { photos: Photo[] };
const leafOf = (p: Page): Leaf => ({ title: p.title, date: p.date, kind: p.kind, layout: p.layout, place: p.place, story: p.story, photos: p.photos });
const draftOf = (l: Leaf): PageDraft => ({ ...l, photos: l.photos.map((ph) => ({ id: ph.id, caption: ph.caption })) });

/**
 * A page being read or written: what it says now, and the ways to change it. Changes save a moment later, and
 * whatever is waiting is saved when the page is turned or the book is closed.
 */
export function useLeaf({ bookId, page, onSaved, onState }: Pick<LeafProps, "bookId" | "page" | "onSaved" | "onState">) {
  const toast = useToast();
  const [leaf, setLeaf] = useState<Leaf>(() => leafOf(page));
  const [shown, setShown] = useState(0);
  const [adding, setAdding] = useState(0);
  const picker = useRef<HTMLInputElement>(null);
  const timer = useRef(0);
  const waiting = useRef<Leaf | null>(null);
  const live = useRef(leaf);
  live.current = leaf;

  async function save() {
    window.clearTimeout(timer.current);
    const l = waiting.current;
    waiting.current = null;
    if (!l) return;
    onState("saving");
    try {
      onSaved(await api.updatePage(bookId, page.id, draftOf(l)));
      onState("saved");
    } catch (err) {
      onState("error");
      toast(errorText(err, "Couldn't save this page. Check your connection."));
    }
  }

  useEffect(() => () => {
    if (waiting.current) void save();
  }, []);

  function change(patch: Partial<Leaf>) {
    const next = { ...live.current, ...patch };
    live.current = next;
    setLeaf(next);
    waiting.current = next;
    onState("idle");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(save, SAVE_AFTER);
  }

  /** A place typed by name: a known one brings its pin and region; otherwise the stamp code follows the new name. */
  function setPlace(name: string) {
    const known = PLACES.find((p) => fold(p.name) === fold(name));
    change({ place: known ? { ...known } : { name, region: live.current.place.region, code: deriveCode(name), lat: null, lng: null } });
  }

  async function addPhotos(files: FileList | File[] | null) {
    const room = MAX_PHOTOS - live.current.photos.length;
    const list = [...(files ?? [])].filter(isImageFile).slice(0, Math.max(0, room));
    if (picker.current) picker.current.value = "";
    if (!list.length) {
      if (files?.length) toast(room <= 0 ? `A page holds up to ${MAX_PHOTOS} photos.` : "Those don't look like photos.");
      return;
    }
    setAdding((n) => n + list.length);
    for (const file of list) {
      try {
        const prepared = await preparePhoto(file);
        const photo = await api.uploadPhoto(bookId, prepared.blob, prepared.width, prepared.height);
        URL.revokeObjectURL(prepared.preview);
        change({ photos: [...live.current.photos, photo] });
        setShown(live.current.photos.length - 1);
      } catch (err) {
        toast(errorText(err, "That photo couldn't be added."));
      } finally {
        setAdding((n) => n - 1);
      }
    }
  }

  const photos = leaf.photos;
  return {
    leaf,
    change,
    setPlace,
    adding,
    full: photos.length + adding >= MAX_PHOTOS,
    shown: Math.min(shown, Math.max(0, photos.length - 1)),
    setShown,
    // On the phone, the camera or the phone's own photo picker; on the website, the file chooser.
    pick: () => (isNative ? void pickPhonePhotos(MAX_PHOTOS - live.current.photos.length).then((f) => f && addPhotos(f)) : picker.current?.click()),
    input: <input ref={picker} type="file" accept="image/*" multiple hidden onChange={(e) => addPhotos(e.target.files)} />,
    caption: (id: string, caption: string) => change({ photos: live.current.photos.map((p) => (p.id === id ? { ...p, caption } : p)) }),
    remove(i: number) {
      const now = live.current.photos;
      change({ photos: now.filter((_, j) => j !== i) });
      setShown((s) => Math.max(0, Math.min(s, now.length - 2)));
    },
    /** Moves a photo to the front, where the kinds of page that lead with one photo show it biggest. */
    lead(i: number) {
      const now = live.current.photos;
      change({ photos: [now[i], ...now.filter((_, j) => j !== i)] });
      setShown(0);
    },
  };
}

export type LeafState = ReturnType<typeof useLeaf>;

/** The page's tag (kind of day, mood, category, occasion): a choice while writing, plain text while reading. */
export function TagSelect({ s, kind, writing }: { s: LeafState; kind: KindInfo; writing: boolean }) {
  if (!writing) return <>{s.leaf.kind}</>;
  return (
    <select className="ed-select" aria-label={kind.tag} value={s.leaf.kind} onChange={(e) => s.change({ kind: e.target.value })}>
      {[...new Set([s.leaf.kind, ...kind.tags])].map((k) => <option key={k}>{k}</option>)}
    </select>
  );
}

/** A dashed tile that adds photos, small in a row of photos or big where a page has none yet. */
export function AddPhoto({ s, big, className = "" }: { s: LeafState; big?: boolean; className?: string }) {
  if (big && s.adding) return <div className={`leaf-add big busy ${className}`} role="status">Adding the photo…</div>;
  return (
    <button type="button" className={`leaf-add${big ? " big" : ""} ${className}`} disabled={s.full} onClick={s.pick} aria-label="Add photos to this page">
      <Icon name="plus" />
      {big && <span>Add a photo</span>}
    </button>
  );
}

/** Photos still on their way up, held open as shimmering prints. */
export function Pending({ s, className = "" }: { s: LeafState; className?: string }) {
  return <>{Array.from({ length: s.adding }, (_, i) => <figure key={`up${i}`} className={`print pending ${className}`} aria-hidden="true"><span className="leaf-thumb busy" /></figure>)}</>;
}

interface PrintProps {
  s: LeafState;
  photo: Photo;
  i: number;
  writing: boolean;
  place: string;
  className?: string;
  style?: CSSProperties;
  /** What putting this photo first is called on this kind of page; without it there's no such button. */
  lead?: string;
  children?: ReactNode;
}

/** One photo on a page with its caption, and while writing, buttons to take it off or put it first. */
export function Print({ s, photo, i, writing, place, className = "", style, lead, children }: PrintProps) {
  return (
    <figure className={`print ${className}`} style={style}>
      <img src={photo.url} alt={photo.caption || `Photo from ${place}`} width={photo.width} height={photo.height} loading="lazy" decoding="async" />
      <Editable as="figcaption" label="Caption" value={photo.caption} placeholder="Write a caption" maxLength={60} readOnly={!writing} onCommit={(c) => s.caption(photo.id, c)} />
      {children}
      {writing && (
        <span className="print-tools">
          {lead && i > 0 && <button type="button" onClick={() => s.lead(i)} aria-label={`${lead}: photo ${i + 1}`} title={lead}><Icon name="sparkle" /></button>}
          <button type="button" onClick={() => s.remove(i)} aria-label={`Take photo ${i + 1} off this page`} title="Take off the page"><Icon name="close" /></button>
        </span>
      )}
    </figure>
  );
}
