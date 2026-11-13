import type { PlaceKind } from "../types";
import { WORLD, WORLD_WIKI, type Region, type Row } from "./world-places";

export type { Region } from "./world-places";
export const REGIONS: Region[] = ["Asia", "Europe", "Americas", "Middle East & Africa", "Oceania"];

/**
 * Ready-made destinations for the Plan tab, so there's something to look at before anyone types a place:
 * every attraction with where it is, how long to give it, and where it sits on the map. No server or Claude needed.
 */

export interface IdeaPlace {
  name: string;
  area: string;
  kind: PlaceKind;
  why: string;
  time: string;
  lat: number;
  lng: number;
  /** The Wikipedia article its photo comes from. */
  wiki: string;
}

export interface Idea {
  id: string;
  name: string;
  /** One line on what it's loved for. */
  summary: string;
  /** Which place's photo stands for the whole destination. */
  cover: number;
  /** A good length for a first trip, which NinRe AI starts from. */
  days: number;
  region: Region;
  /** One of the six shown first on the Plan tab. */
  featured: boolean;
  places: IdeaPlace[];
}

/** Wikipedia articles for places whose usual name isn't the article's title. */
const WIKI: Record<string, string> = {
  "Senso-ji": "Sensō-ji", "Meiji Jingu": "Meiji Shrine", "Tsukiji Outer Market": "Tsukiji fish market", "Fushimi Inari Taisha": "Fushimi Inari-taisha",
  "Arashiyama Bamboo Grove": "Arashiyama", "Dotonbori": "Dōtonbori", "Hiroshima Peace Memorial": "Hiroshima Peace Memorial",
  "Gyeongbokgung Palace": "Gyeongbokgung", "Myeongdong": "Myeong-dong", "DMZ tour": "Korean Demilitarized Zone", "Nami Island": "Namiseom",
  "Bulguksa Temple": "Bulguksa", "Jagalchi Fish Market": "Jagalchi Market",
  "Binondo food crawl": "Binondo", "Taal Volcano view": "Taal Volcano", "Mayon Volcano": "Mayon", "White Beach": "Boracay",
  "Bacuit Bay island hopping": "El Nido, Palawan", "Kayangan Lake": "Coron Island", "Puerto Princesa Underground River": "Puerto Princesa Subterranean River National Park",
  "Cloud 9": "Siargao",
  "Yaowarat": "Yaowarat Road", "Doi Suthep": "Wat Phra That Doi Suthep", "Big Buddha": "Great Buddha of Phuket", "Railay Beach": "Railay",
  "Tegallalang Rice Terraces": "Tegallalang", "Sacred Monkey Forest": "Ubud Monkey Forest", "Ubud Art Market": "Ubud", "Mount Batur sunrise": "Mount Batur",
  "Ulun Danu Beratan": "Pura Ulun Danu Bratan", "Lempuyang Temple": "Pura Lempuyang Luhur", "Seminyak Beach": "Seminyak", "Jimbaran Bay seafood": "Jimbaran",
  "Uluwatu Temple": "Pura Luhur Uluwatu", "Kelingking Beach": "Nusa Penida",
  "Duomo di Milano": "Milan Cathedral", "Grand Canal & Rialto Bridge": "Rialto Bridge", "Florence Duomo": "Florence Cathedral", "Uffizi Gallery": "Uffizi",
};

const rows = (r: Row[]): IdeaPlace[] =>
  r.map(([name, area, kind, lat, lng, time, why]) => ({ name, area, kind, lat, lng, time, why, wiki: WIKI[name] ?? WORLD_WIKI[name] ?? name }));

/** The six destinations shown first, with the most places each. */
const FEATURED: Omit<Idea, "region" | "featured">[] = [
  {
    id: "japan",
    name: "Japan",
    summary: "Temples and neon, hot springs and street food, all joined up by the fastest trains in the world.",
    cover: 8,
    days: 7,
    places: rows([
      ["Senso-ji", "Asakusa, Tokyo", "culture", 35.7148, 139.7967, "1-2 hours", "Tokyo's oldest temple, reached through a lane of snack and souvenir stalls."],
      ["Shibuya Crossing", "Shibuya, Tokyo", "landmark", 35.6595, 139.7005, "1 hour", "The world's busiest crossing; watch it from above at Shibuya Sky at dusk."],
      ["Meiji Jingu", "Harajuku, Tokyo", "culture", 35.6764, 139.6993, "1 hour", "A calm forest shrine a few steps from the bustle of Harajuku."],
      ["Tokyo Skytree", "Sumida, Tokyo", "landmark", 35.7101, 139.8107, "1-2 hours", "The tallest tower in Japan, with Mount Fuji in view on clear days."],
      ["Tsukiji Outer Market", "Chuo, Tokyo", "food", 35.6654, 139.7707, "2 hours", "Breakfast sushi, tamagoyaki and grilled scallops from tiny market stalls."],
      ["Hakone", "Kanagawa", "water", 35.2324, 139.1069, "A full day", "Hot spring inns, a pirate ship on Lake Ashi and a ropeway over steaming valleys."],
      ["Lake Kawaguchi", "Mount Fuji, Yamanashi", "nature", 35.517, 138.752, "A full day", "The classic view of Mount Fuji, best with the Chureito Pagoda in spring."],
      ["Shirakawa-go", "Gifu", "culture", 36.2578, 136.906, "Half a day", "A village of steep thatched farmhouses, magical under winter snow."],
      ["Fushimi Inari Taisha", "Kyoto", "culture", 34.9671, 135.7727, "2-3 hours", "Thousands of vermilion torii gates winding up a wooded mountain."],
      ["Kinkaku-ji", "Kyoto", "culture", 35.0394, 135.7292, "1 hour", "The Golden Pavilion, mirrored in its pond."],
      ["Kiyomizu-dera", "Kyoto", "culture", 34.9949, 135.785, "1-2 hours", "A wooden temple stage over the trees, with old streets of Higashiyama below."],
      ["Arashiyama Bamboo Grove", "Kyoto", "nature", 35.017, 135.6713, "1-2 hours", "Towering bamboo paths; go early before the crowds."],
      ["Nara Park", "Nara", "nature", 34.6851, 135.843, "Half a day", "Bowing deer roam free around the giant Buddha of Todai-ji."],
      ["Dotonbori", "Osaka", "food", 34.6687, 135.5013, "2-3 hours", "Osaka's neon canal street of takoyaki, okonomiyaki and the Glico sign."],
      ["Osaka Castle", "Osaka", "landmark", 34.6873, 135.5262, "1-2 hours", "A grand castle keep in a park full of cherry blossom in spring."],
      ["Universal Studios Japan", "Osaka", "activity", 34.6654, 135.4323, "A full day", "Home of Super Nintendo World and the Wizarding World of Harry Potter."],
      ["Hiroshima Peace Memorial", "Hiroshima", "culture", 34.3955, 132.4536, "2 hours", "A moving park and museum around the A-Bomb Dome."],
      ["Itsukushima Shrine", "Miyajima, Hiroshima", "culture", 34.2959, 132.3199, "Half a day", "The great torii gate that seems to float at high tide."],
    ]),
  },
  {
    id: "korea",
    name: "South Korea",
    summary: "Royal palaces and K-culture in Seoul, beaches in Busan and volcanic Jeju to the south.",
    cover: 0,
    days: 5,
    places: rows([
      ["Gyeongbokgung Palace", "Seoul", "culture", 37.5796, 126.977, "2 hours", "Seoul's grandest palace; rent a hanbok and get in free."],
      ["Bukchon Hanok Village", "Seoul", "culture", 37.5826, 126.9831, "1-2 hours", "Hilly lanes of traditional tiled-roof houses between two palaces."],
      ["N Seoul Tower", "Seoul", "landmark", 37.5512, 126.9882, "1-2 hours", "City views from Namsan, and its fences of love locks."],
      ["Myeongdong", "Seoul", "shopping", 37.5636, 126.985, "2-3 hours", "Skincare shops by day, street food stalls by night."],
      ["Gwangjang Market", "Seoul", "food", 37.57, 126.9996, "1-2 hours", "Bindaetteok, mayak gimbap and live octopus at a century-old market."],
      ["Lotte World", "Seoul", "activity", 37.5111, 127.0982, "A full day", "A huge indoor theme park, with Lotte World Tower next door."],
      ["DMZ tour", "Paju", "activity", 37.8893, 126.74, "A full day", "Look across into North Korea from the edge of the demilitarised zone."],
      ["Nami Island", "Chuncheon", "nature", 37.7913, 127.5258, "Half a day", "Tree-lined avenues famous from K-dramas, golden in autumn."],
      ["Bulguksa Temple", "Gyeongju", "culture", 35.79, 129.332, "2 hours", "A UNESCO temple in Korea's ancient Silla capital."],
      ["Haeundae Beach", "Busan", "water", 35.1587, 129.1604, "Half a day", "Busan's big city beach, with seafood and skyline views."],
      ["Gamcheon Culture Village", "Busan", "culture", 35.0975, 129.0106, "2 hours", "Pastel houses stacked up a hillside, full of murals and cafés."],
      ["Jagalchi Fish Market", "Busan", "food", 35.0966, 129.0306, "1-2 hours", "Pick your seafood downstairs and have it cooked upstairs."],
      ["Seongsan Ilchulbong", "Jeju", "nature", 33.458, 126.9425, "2 hours", "A volcanic crater rising from the sea; climb it for sunrise."],
      ["Hallasan", "Jeju", "nature", 33.3617, 126.5292, "A full day", "South Korea's highest peak, a dormant volcano in the middle of Jeju."],
    ]),
  },
  {
    id: "philippines",
    name: "Philippines",
    summary: "Seven thousand islands of limestone lagoons, white sand, rice terraces and some of Asia's friendliest people.",
    cover: 7,
    days: 7,
    places: rows([
      ["Intramuros", "Manila", "culture", 14.5896, 120.9747, "Half a day", "The old walled city of Spanish Manila, best seen by bamboo bike or kalesa."],
      ["Binondo food crawl", "Manila", "food", 14.6, 120.974, "2-3 hours", "The world's oldest Chinatown: dumplings, hopia and fried siopao."],
      ["Taal Volcano view", "Tagaytay", "nature", 14.1, 120.94, "Half a day", "A volcano in a lake, seen from cool ridge cafés over a bowl of bulalo."],
      ["Banaue Rice Terraces", "Ifugao", "nature", 16.934, 121.137, "A full day", "Two-thousand-year-old terraces carved into the Cordillera mountains."],
      ["Calle Crisologo", "Vigan, Ilocos Sur", "culture", 17.5713, 120.3876, "2 hours", "Cobbled streets of Spanish-era houses, best by kalesa at night."],
      ["Mayon Volcano", "Albay", "nature", 13.166, 123.672, "Half a day", "The perfect cone, framed by the Cagsawa church ruins."],
      ["White Beach", "Boracay", "water", 11.96, 121.926, "A full day", "Four kilometres of powder-white sand and famous sunsets."],
      ["Bacuit Bay island hopping", "El Nido, Palawan", "water", 11.15, 119.37, "A full day", "Hidden lagoons and limestone cliffs by outrigger boat."],
      ["Kayangan Lake", "Coron, Palawan", "water", 11.953, 120.223, "Half a day", "A glassy lake inside limestone walls, with the most photographed viewpoint in the country."],
      ["Puerto Princesa Underground River", "Palawan", "nature", 10.193, 118.926, "Half a day", "Paddle into a river that runs for kilometres under the mountains."],
      ["Kawasan Falls", "Badian, Cebu", "water", 9.804, 123.374, "Half a day", "Turquoise pools for canyoneering, jumping and swimming."],
      ["Chocolate Hills", "Bohol", "nature", 9.8297, 124.1397, "Half a day", "Over a thousand grassy hills that turn brown in the dry season."],
      ["Cloud 9", "Siargao", "water", 9.813, 126.165, "Half a day", "The surf break that made Siargao famous, with a boardwalk to watch from."],
    ]),
  },
  {
    id: "thailand",
    name: "Thailand",
    summary: "Golden temples, night markets and island-dotted seas, with some of the best food anywhere.",
    cover: 1,
    days: 7,
    places: rows([
      ["Grand Palace", "Bangkok", "culture", 13.75, 100.4913, "2-3 hours", "The dazzling royal palace and the Temple of the Emerald Buddha."],
      ["Wat Arun", "Bangkok", "culture", 13.7437, 100.4889, "1 hour", "The Temple of Dawn, its porcelain spire glowing over the river at sunset."],
      ["Yaowarat", "Chinatown, Bangkok", "food", 13.7398, 100.51, "2-3 hours", "Bangkok's best street-food night, from oyster omelettes to mango sticky rice."],
      ["Chatuchak Weekend Market", "Bangkok", "shopping", 13.7999, 100.5501, "Half a day", "Fifteen thousand stalls selling almost everything."],
      ["Ayutthaya Historical Park", "Ayutthaya", "culture", 14.356, 100.56, "A full day", "Ruined temples of the old Siamese capital, an easy day trip from Bangkok."],
      ["Doi Suthep", "Chiang Mai", "culture", 18.8048, 98.9216, "2-3 hours", "A gilded mountaintop temple with views over Chiang Mai."],
      ["Chiang Mai Night Bazaar", "Chiang Mai", "shopping", 18.786, 99.001, "2-3 hours", "Crafts, khao soi and live music every evening."],
      ["Elephant Nature Park", "Chiang Mai", "activity", 19.214, 98.859, "A full day", "An ethical sanctuary to feed and walk with rescued elephants."],
      ["Wat Rong Khun", "Chiang Rai", "culture", 19.8243, 99.7631, "1-2 hours", "The White Temple, a shimmering modern fantasy of a temple."],
      ["Big Buddha", "Phuket", "landmark", 7.8277, 98.3128, "1 hour", "A huge marble Buddha watching over the island."],
      ["Phang Nga Bay", "Phang Nga", "water", 8.275, 98.501, "A full day", "Sea kayaks between towering limestone islands, James Bond Island among them."],
      ["Railay Beach", "Krabi", "water", 8.011, 98.838, "A full day", "A cliff-walled beach reached only by boat, loved by climbers."],
      ["Phi Phi Islands", "Krabi", "water", 7.7407, 98.7784, "A full day", "Maya Bay's turquoise water and snorkelling with reef fish."],
    ]),
  },
  {
    id: "bali",
    name: "Bali",
    summary: "Indonesia's island of temples, rice terraces, surf and slow sunsets.",
    cover: 5,
    days: 5,
    places: rows([
      ["Tegallalang Rice Terraces", "Ubud", "nature", -8.4312, 115.2793, "2 hours", "Emerald terraces carved down a valley, with swings over the edge."],
      ["Sacred Monkey Forest", "Ubud", "nature", -8.5188, 115.2585, "1-2 hours", "Mossy temples in a jungle full of cheeky macaques."],
      ["Ubud Art Market", "Ubud", "shopping", -8.5068, 115.263, "1-2 hours", "Woven bags, sarongs and carvings; bargaining expected."],
      ["Tirta Empul", "Tampaksiring", "culture", -8.4153, 115.3153, "1-2 hours", "A water temple where Balinese come to bathe in holy springs."],
      ["Mount Batur sunrise", "Kintamani", "activity", -8.242, 115.375, "Half a day", "A pre-dawn hike up an active volcano for sunrise over the lake."],
      ["Ulun Danu Beratan", "Bedugul", "water", -8.2752, 115.1668, "1-2 hours", "A temple that seems to float on a misty mountain lake."],
      ["Lempuyang Temple", "Karangasem", "culture", -8.391, 115.631, "Half a day", "The Gates of Heaven, framing Mount Agung."],
      ["Tanah Lot", "Tabanan", "culture", -8.6212, 115.0868, "2 hours", "A sea temple on a rock, best at sunset."],
      ["Seminyak Beach", "Seminyak", "water", -8.6913, 115.1568, "Half a day", "Beach clubs, surf lessons and bean bags for the sunset."],
      ["Jimbaran Bay seafood", "Jimbaran", "food", -8.774, 115.166, "2-3 hours", "Grilled fish dinners at tables right on the sand."],
      ["Uluwatu Temple", "Uluwatu", "culture", -8.8291, 115.0849, "2-3 hours", "A clifftop temple with a fire dance as the sun goes down."],
      ["Kelingking Beach", "Nusa Penida", "water", -8.7505, 115.474, "A full day", "The T-rex shaped cliff over a hidden white beach."],
    ]),
  },
  {
    id: "italy",
    name: "Italy",
    summary: "Ancient Rome, Renaissance art, canals, coastlines, and pasta in every town.",
    cover: 8,
    days: 7,
    places: rows([
      ["Duomo di Milano", "Milan", "landmark", 45.4642, 9.1916, "2 hours", "A gothic cathedral with a rooftop walk among its spires."],
      ["Lake Como", "Bellagio, Lombardy", "water", 45.985, 9.26, "A full day", "Villas, gardens and ferries between lakeside villages."],
      ["Grand Canal & Rialto Bridge", "Venice", "water", 45.438, 12.3359, "Half a day", "Venice's main street, best seen from a vaporetto or gondola."],
      ["St Mark's Basilica", "Venice", "culture", 45.4345, 12.3397, "2 hours", "Golden mosaics on the city's grand square."],
      ["Cinque Terre", "Liguria", "nature", 44.127, 9.71, "A full day", "Five colourful fishing villages joined by cliff paths."],
      ["Leaning Tower of Pisa", "Pisa", "landmark", 43.723, 10.3966, "1-2 hours", "Climb the famous tilt on the Field of Miracles."],
      ["Florence Duomo", "Florence", "culture", 43.7731, 11.256, "2-3 hours", "Brunelleschi's dome, with the city's best view from the top."],
      ["Uffizi Gallery", "Florence", "culture", 43.7678, 11.2553, "Half a day", "Botticelli, Leonardo and the heart of Renaissance art."],
      ["Colosseum", "Rome", "landmark", 41.8902, 12.4922, "2-3 hours", "The great arena of ancient Rome, beside the Roman Forum."],
      ["Trevi Fountain", "Rome", "landmark", 41.9009, 12.4833, "30 minutes", "Throw a coin over your shoulder to make sure you come back."],
      ["Vatican Museums", "Vatican City", "culture", 41.9065, 12.4536, "Half a day", "Endless galleries ending under Michelangelo's Sistine Chapel ceiling."],
      ["Trastevere", "Rome", "food", 41.8897, 12.4697, "2-3 hours", "Ivy-covered lanes and trattorias for cacio e pepe and carbonara."],
      ["Pompeii", "Campania", "culture", 40.751, 14.4869, "Half a day", "A whole Roman town frozen by Vesuvius in 79 AD."],
      ["Amalfi Coast", "Positano, Campania", "water", 40.6281, 14.485, "A full day", "Pastel towns stacked on cliffs above the sea."],
    ]),
  },
];

/** Every ready-made destination: the featured six first, then the rest of the world by region. */
export const IDEAS: Idea[] = [
  ...FEATURED.map((d) => ({ ...d, region: (d.id === "italy" ? "Europe" : "Asia") as Region, featured: true })),
  ...WORLD.map((w) => ({ ...w, featured: false, places: rows(w.places) })),
];

/** Every place in every destination, with where it belongs. */
export const ALL_PLACES = IDEAS.flatMap((idea) => idea.places.map((place, index) => ({ idea, place, index })));

export const ideaById = (id: string) => IDEAS.find((d) => d.id === id) ?? null;

/** The middle of a destination's places, where its pin goes on the map of destinations. */
export function centerOf(idea: Idea): { lat: number; lng: number } {
  const n = idea.places.length;
  return { lat: idea.places.reduce((a, p) => a + p.lat, 0) / n, lng: idea.places.reduce((a, p) => a + p.lng, 0) / n };
}

/** Google Maps for the place, searched by name so it lands on the place's own page. */
export const mapsFor = (p: IdeaPlace) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.name}, ${p.area}`)}`;
