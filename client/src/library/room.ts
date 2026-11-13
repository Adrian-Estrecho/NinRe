import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api";
import type { BoardMaterial, BoardPhoto, DecorKind, Figure, PlaceVisit, Room } from "../types";

export const MATERIALS: { id: BoardMaterial; name: string }[] = [
  { id: "cork", name: "Cork" },
  { id: "linen", name: "Linen" },
  { id: "felt", name: "Felt" },
  { id: "chalk", name: "Chalkboard" },
  { id: "steel", name: "Fridge door" },
];
/** The ready-made things for the bookcase. Figures are made separately, each from its own traits. */
export const DECOR: { id: Exclude<DecorKind, "figure">; name: string }[] = [
  { id: "plant", name: "Plant" },
  { id: "globe", name: "Globe" },
  { id: "camera", name: "Camera" },
  { id: "lamp", name: "Lamp" },
  { id: "postcards", name: "Postcards" },
  { id: "jar", name: "Ticket jar" },
  { id: "suitcase", name: "Suitcase" },
  { id: "girl", name: "Little girl" },
];
/** What to call a thing on the bookcase: a figure by the name it was given. */
export const decorName = (d: Room["decor"][number]) =>
  d.k === "figure" ? (d.fig?.name ? `figure of ${d.fig.name}` : "figure") : (DECOR.find((o) => o.id === d.k)?.name.toLowerCase() ?? d.k);

/** The same figure, whatever order its traits came in. */
const figureKey = (f: Figure) => JSON.stringify(Object.keys(f).sort().map((k) => [k, f[k as keyof Figure]]));
export const sameFigure = (a: Figure, b: Figure) => figureKey(a) === figureKey(b);
/** Adds a figure to the person's figures, newest first, unless an identical one is already kept. */
export const keepFigure = (kept: Figure[], fig: Figure) =>
  kept.some((f) => sameFigure(f, fig)) ? kept : [fig, ...kept].slice(0, MAX_FIGURES);

export const MAX_FIGURES = 24;
export const MAX_DECOR = 10;
export const DEFAULT_BOARD_TITLE = "Places we've been";

const EMPTY: Room = { board: { material: "cork", pins: "pin", title: "" }, photos: [], magnets: [], decor: [], figures: [] };
const SAVE_AFTER = 700;

export type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * The person's library: shown at once from local state, saved a moment after the last change.
 * The server answers each save with the pinned photos it could find, which replaces what's shown.
 */
export function useRoom() {
  const [room, setRoom] = useState<Room | null>(null);
  const [photos, setPhotos] = useState<Map<string, BoardPhoto>>(new Map());
  const [visits, setVisits] = useState<PlaceVisit[]>([]);
  const [state, setState] = useState<SaveState>("idle");
  const timer = useRef(0);
  const latest = useRef<Room | null>(null);

  useEffect(() => {
    let live = true;
    api.library().then(
      (lib) => {
        if (!live) return;
        const room = { ...lib.room, magnets: lib.room.magnets ?? [] };
        latest.current = room;
        setRoom(room);
        setPhotos(new Map(lib.photos.map((p) => [p.id, p])));
        setVisits(lib.visits ?? []);
      },
      () => live && setRoom(EMPTY),
    );
    return () => {
      live = false;
      window.clearTimeout(timer.current);
    };
  }, []);

  const save = useCallback(async () => {
    const r = latest.current;
    if (!r) return;
    setState("saving");
    try {
      const lib = await api.saveLibrary(r);
      setPhotos((had) => new Map([...had, ...lib.photos.map((p) => [p.id, p] as const)]));
      setState("saved");
    } catch {
      setState("error");
    }
  }, []);

  /** Change the room; `extra` adds photos the board hasn't seen yet, such as ones just picked. */
  const update = useCallback((fn: (r: Room) => Room, extra: BoardPhoto[] = []) => {
    const base = latest.current;
    if (!base) return;
    const next = fn(base);
    latest.current = next;
    setRoom(next);
    if (extra.length) setPhotos((had) => new Map([...had, ...extra.map((p) => [p.id, p] as const)]));
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(save, SAVE_AFTER);
  }, [save]);

  return { room, photos, visits, state, update, retry: save };
}
