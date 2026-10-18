import type { Note, NoteColor, Page, Person, Photo } from "../types";
import { findPlace } from "./places";

/*
 * Sample pages fill an empty book so people can see how it reads. They're labelled as samples
 * everywhere they appear and disappear once the first real page is added.
 * Photos: Unsplash (see Photo credits in README.md).
 */
export const SAMPLE_PEOPLE: Record<"mara" | "josh", Person> = {
  mara: { id: "sample-mara", name: "Mara" },
  josh: { id: "sample-josh", name: "Josh" },
};

const photo = (file: string, caption: string, width: number, height: number): Photo => ({
  id: `sample-${file}`,
  url: `/samples/${file}.jpg`,
  caption,
  width,
  height,
});

let noteN = 0;
const note = (pageId: string, who: keyof typeof SAMPLE_PEOPLE, text: string, color: NoteColor): Note => ({
  id: `sample-note-${++noteN}`, pageId, author: SAMPLE_PEOPLE[who], text, color, createdAt: noteN, updatedAt: noteN,
});

const sample = (n: number, who: keyof typeof SAMPLE_PEOPLE, page: Omit<Page, "id" | "sample" | "createdAt" | "updatedAt" | "author" | "notes">, notes: [keyof typeof SAMPLE_PEOPLE, string, NoteColor][] = []): Page => ({
  ...page,
  id: `sample-${n}`,
  sample: true,
  author: SAMPLE_PEOPLE[who],
  notes: notes.map(([by, text, color]) => note(`sample-${n}`, by, text, color)),
  createdAt: n,
  updatedAt: n,
});

export const SAMPLES: Page[] = [
  sample(1, "mara", {
    title: "Bulalo and fog on the ridge", date: "2024-02-14", kind: "Date night", place: findPlace("Tagaytay"),
    photos: [photo("taal", "Taal, for ten seconds", 1000, 667), photo("bulalo", "one bowl, two spoons", 1000, 1500)],
    story: "We left Manila after work and hit Aguinaldo Highway traffic right at six. By the time we reached the ridge the fog had rolled in so thick we could barely see the lake.\n\nWe ordered one big bowl of bulalo and two rice and still fought over the marrow. Afterward we sat on the hood of the car under a borrowed blanket, waiting for the clouds to open over Taal. They opened for about ten seconds. Worth it.\n\nNext time: leave at four, bring a jacket, skip the second order of tawilis.",
  }, [["josh", "The marrow was mine. For the record.", "sky"]]),
  sample(2, "josh", {
    title: "Walking the walls of Intramuros", date: "2024-06-08", kind: "Day out", place: findPlace("Intramuros"),
    photos: [photo("fort-santiago", "Fort Santiago gate", 1000, 663), photo("kalesa", "our kalesa, our saviour", 1000, 1500)],
    story: "We meant to do the walking tour and ended up doing it backwards. Fort Santiago first, then the walls along Baluarte de San Diego, then a kalesa ride when our legs gave out.\n\nThe rain caught us near San Agustin, so we hid under the arches eating halo-halo from a cart that seemed to appear just for us. We counted the cannons (eleven) and argued about whether Rizal's footprints were real. Got home soaked and happy.",
  }),
  sample(3, "mara", {
    title: "Five days of salt and sunburn", date: "2025-04-17", kind: "Trip", place: findPlace("Siargao"),
    photos: [photo("siargao-road", "the coconut road", 1000, 749), photo("siargao-palms", "last sunset", 1000, 667)],
    story: "Our first plane trip together. We rented a scooter in General Luna and learned that \"just five minutes away\" means twenty.\n\nIsland hopping on day two: Naked Island, Daku for grilled fish, Guyam for the swing. We watched the surfers at Cloud 9 from the boardwalk every afternoon and never once tried it ourselves. Magpupungko at low tide was the bluest water either of us had ever seen.\n\nWe came home with matching tan lines and a jar of coconut jam that didn't survive the flight.",
  }, [["josh", "Next time we actually surf. Promise.", "mint"], ["mara", "You said that at Cloud 9 too.", "blush"]]),
  sample(4, "josh", {
    title: "Our second year, under the red gates", date: "2025-11-03", kind: "Anniversary", place: findPlace("Kyoto"),
    photos: [photo("kyoto-torii", "a thousand gates", 1000, 667)],
    story: "We set an alarm for 5:30 to have Fushimi Inari to ourselves, and mostly did, apart from one jogger and a lot of cats. We walked the gates until our calves burned, then took the long way down through the bamboo.\n\nThe afternoon went to Eikando, with the maples at their reddest, and the day ended with matcha soft serve we didn't need. Two years. We wrote our names on a little fox ema and left it there.",
  }, [["mara", "Happy two years. Same time next year?", "butter"]]),
];
