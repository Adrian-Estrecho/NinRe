import type { PlaceVisit } from "../types";
import { PLACES } from "./places";

export type Continent = "Asia" | "Europe" | "Africa" | "North America" | "South America" | "Oceania";

/** A country with a holder on the board. `id` is its lowercase ISO code; `also` holds other names and its best-known places. */
export interface Country {
  id: string;
  name: string;
  /** What's printed on the magnet's ribbon. */
  label: string;
  also: string[];
  continent: Continent;
}

type Known = Omit<Country, "continent">;
const C = (id: string, name: string, label: string, also: string[] = []): Known => ({ id, name, label, also });

/** Other names, and the best-known places, of the countries people from home go to most. */
const KNOWN_AS: Known[] = [
  C("ph", "Philippines", "Philippines", ["pilipinas", "ph", "luzon", "visayas", "mindanao", "ncr", "metro manila", "manila", "quezon city", "cebu", "davao", "boracay", "palawan", "siargao", "bohol", "baguio", "iloilo"]),
  C("jp", "Japan", "Japan", ["nippon", "tokyo", "kyoto", "osaka", "sapporo", "hokkaido", "okinawa", "nara", "fukuoka", "hiroshima", "nagoya", "yokohama"]),
  C("kr", "South Korea", "Korea", ["korea", "republic of korea", "seoul", "busan", "jeju", "incheon"]),
  C("tw", "Taiwan", "Taiwan", ["taipei", "kaohsiung", "taichung", "tainan"]),
  C("hk", "Hong Kong", "Hong Kong", ["hong kong sar", "kowloon"]),
  C("mo", "Macau", "Macau", ["macao", "macau sar"]),
  C("cn", "China", "China", ["prc", "beijing", "shanghai", "shenzhen", "guangzhou", "xiamen", "chengdu", "xi'an"]),
  C("sg", "Singapore", "Singapore"),
  C("th", "Thailand", "Thailand", ["bangkok", "chiang mai", "phuket", "krabi", "pattaya", "koh samui"]),
  C("my", "Malaysia", "Malaysia", ["kuala lumpur", "penang", "langkawi", "sabah", "sarawak", "kota kinabalu", "malacca", "melaka"]),
  C("id", "Indonesia", "Indonesia", ["bali", "jakarta", "yogyakarta", "lombok", "ubud", "komodo"]),
  C("vn", "Vietnam", "Vietnam", ["viet nam", "hanoi", "ha noi", "da nang", "ho chi minh city", "saigon", "hoi an", "ha long bay", "nha trang"]),
  C("kh", "Cambodia", "Cambodia", ["siem reap", "phnom penh", "angkor wat"]),
  C("la", "Laos", "Laos", ["lao pdr", "vientiane", "luang prabang"]),
  C("mm", "Myanmar", "Myanmar", ["burma", "yangon", "bagan", "mandalay"]),
  C("in", "India", "India", ["delhi", "new delhi", "mumbai", "agra", "goa", "jaipur"]),
  C("np", "Nepal", "Nepal", ["kathmandu", "pokhara"]),
  C("lk", "Sri Lanka", "Sri Lanka", ["colombo", "kandy"]),
  C("mv", "Maldives", "Maldives", ["malé", "male"]),
  C("ae", "United Arab Emirates", "UAE", ["uae", "dubai", "abu dhabi", "sharjah", "emirates"]),
  C("qa", "Qatar", "Qatar", ["doha"]),
  C("sa", "Saudi Arabia", "Saudi Arabia", ["ksa", "riyadh", "jeddah", "mecca", "makkah", "medina"]),
  C("tr", "Türkiye", "Türkiye", ["turkey", "turkiye", "istanbul", "cappadocia", "antalya"]),
  C("eg", "Egypt", "Egypt", ["cairo", "giza", "luxor"]),
  C("gr", "Greece", "Greece", ["athens", "santorini", "mykonos", "crete"]),
  C("it", "Italy", "Italy", ["italia", "rome", "roma", "venice", "florence", "milan", "amalfi", "naples"]),
  C("fr", "France", "France", ["paris", "nice", "lyon", "provence", "marseille"]),
  C("es", "Spain", "Spain", ["españa", "espana", "barcelona", "madrid", "seville", "ibiza", "mallorca"]),
  C("pt", "Portugal", "Portugal", ["lisbon", "porto", "madeira", "algarve"]),
  C("gb", "United Kingdom", "UK", ["uk", "great britain", "britain", "england", "scotland", "wales", "london", "edinburgh", "manchester"]),
  C("ie", "Ireland", "Ireland", ["dublin"]),
  C("de", "Germany", "Germany", ["deutschland", "berlin", "munich", "frankfurt", "hamburg"]),
  C("nl", "Netherlands", "Netherlands", ["holland", "amsterdam", "rotterdam"]),
  C("ch", "Switzerland", "Switzerland", ["zurich", "geneva", "lucerne", "interlaken", "zermatt"]),
  C("at", "Austria", "Austria", ["vienna", "salzburg", "hallstatt"]),
  C("cz", "Czechia", "Czechia", ["czech republic", "prague"]),
  C("is", "Iceland", "Iceland", ["reykjavík", "reykjavik"]),
  C("us", "United States", "USA", ["usa", "us", "united states of america", "america", "hawaii", "honolulu", "new york", "california", "los angeles", "san francisco", "las vegas", "guam", "seattle", "chicago", "florida"]),
  C("ca", "Canada", "Canada", ["vancouver", "toronto", "montreal", "banff"]),
  C("mx", "Mexico", "Mexico", ["méxico", "cancun", "mexico city"]),
  C("br", "Brazil", "Brazil", ["brasil", "rio de janeiro", "são paulo", "sao paulo"]),
  C("au", "Australia", "Australia", ["sydney", "melbourne", "brisbane", "perth", "gold coast", "cairns"]),
  C("nz", "New Zealand", "New Zealand", ["aotearoa", "auckland", "queenstown", "wellington"]),
];

/**
 * Every country, as a holder on the board: the 193 UN members, Vatican City and Palestine, and Taiwan, Hong Kong and
 * Macau, which travellers count as their own. Each is "code Name" or "code Name/Label" when the name is too long for
 * the ribbon; continents in the order the board shows them, nearest home first.
 */
const WORLD: [Continent, string][] = [
  ["Asia", "af Afghanistan|am Armenia|az Azerbaijan|bh Bahrain|bd Bangladesh|bt Bhutan|bn Brunei|kh Cambodia|cn China|cy Cyprus|ge Georgia|hk Hong Kong|in India|id Indonesia|ir Iran|iq Iraq|il Israel|jp Japan|jo Jordan|kz Kazakhstan|kw Kuwait|kg Kyrgyzstan|la Laos|lb Lebanon|mo Macau|my Malaysia|mv Maldives|mn Mongolia|mm Myanmar|np Nepal|kp North Korea|om Oman|pk Pakistan|ps Palestine|ph Philippines|qa Qatar|sa Saudi Arabia|sg Singapore|kr South Korea/Korea|lk Sri Lanka|sy Syria|tw Taiwan|tj Tajikistan|th Thailand|tl Timor-Leste|tr Türkiye|tm Turkmenistan|ae United Arab Emirates/UAE|uz Uzbekistan|vn Vietnam|ye Yemen"],
  ["Oceania", "au Australia|fj Fiji|ki Kiribati|mh Marshall Islands|fm Micronesia|nr Nauru|nz New Zealand|pw Palau|pg Papua New Guinea/Papua N. Guinea|ws Samoa|sb Solomon Islands|to Tonga|tv Tuvalu|vu Vanuatu"],
  ["Europe", "al Albania|ad Andorra|at Austria|by Belarus|be Belgium|ba Bosnia and Herzegovina/Bosnia|bg Bulgaria|hr Croatia|cz Czechia|dk Denmark|ee Estonia|fi Finland|fr France|de Germany|gr Greece|hu Hungary|is Iceland|ie Ireland|it Italy|lv Latvia|li Liechtenstein|lt Lithuania|lu Luxembourg|mt Malta|md Moldova|mc Monaco|me Montenegro|nl Netherlands|mk North Macedonia|no Norway|pl Poland|pt Portugal|ro Romania|ru Russia|sm San Marino|rs Serbia|sk Slovakia|si Slovenia|es Spain|se Sweden|ch Switzerland|ua Ukraine|gb United Kingdom/UK|va Vatican City"],
  ["North America", "ag Antigua and Barbuda/Antigua|bs Bahamas|bb Barbados|bz Belize|ca Canada|cr Costa Rica|cu Cuba|dm Dominica|do Dominican Republic/Dominican Rep.|sv El Salvador|gd Grenada|gt Guatemala|ht Haiti|hn Honduras|jm Jamaica|mx Mexico|ni Nicaragua|pa Panama|kn Saint Kitts and Nevis/St Kitts & Nevis|lc Saint Lucia|vc Saint Vincent and the Grenadines/St Vincent|tt Trinidad and Tobago/Trinidad|us United States/USA"],
  ["South America", "ar Argentina|bo Bolivia|br Brazil|cl Chile|co Colombia|ec Ecuador|gy Guyana|py Paraguay|pe Peru|sr Suriname|uy Uruguay|ve Venezuela"],
  ["Africa", "dz Algeria|ao Angola|bj Benin|bw Botswana|bf Burkina Faso|bi Burundi|cv Cabo Verde|cm Cameroon|cf Central African Republic/C. African Rep.|td Chad|km Comoros|cg Congo|cd DR Congo|ci Côte d'Ivoire|dj Djibouti|eg Egypt|gq Equatorial Guinea/Eq. Guinea|er Eritrea|sz Eswatini|et Ethiopia|ga Gabon|gm Gambia|gh Ghana|gn Guinea|gw Guinea-Bissau|ke Kenya|ls Lesotho|lr Liberia|ly Libya|mg Madagascar|mw Malawi|ml Mali|mr Mauritania|mu Mauritius|ma Morocco|mz Mozambique|na Namibia|ne Niger|ng Nigeria|rw Rwanda|st São Tomé and Príncipe/São Tomé|sn Senegal|sc Seychelles|sl Sierra Leone|so Somalia|za South Africa|ss South Sudan|sd Sudan|tz Tanzania|tg Togo|tn Tunisia|ug Uganda|zm Zambia|zw Zimbabwe"],
];

// Names people also write, for countries not in the list above.
const MORE_NAMES: Record<string, string[]> = {
  cz: ["czech republic", "prague"], ci: ["ivory coast"], sz: ["swaziland"], cv: ["cape verde"], tl: ["east timor"], ru: ["russian federation", "moscow"],
  va: ["vatican", "holy see"], cd: ["drc", "democratic republic of the congo"], cg: ["republic of the congo"], mk: ["macedonia"], ps: ["palestinian territories"],
  pg: ["png"], fm: ["federated states of micronesia"], kp: ["dprk"], mn: ["ulaanbaatar"], pe: ["machu picchu", "cusco", "lima"], ar: ["buenos aires"],
  ma: ["marrakech", "marrakesh"], ke: ["nairobi"], za: ["cape town", "johannesburg"], tz: ["zanzibar"], hr: ["dubrovnik", "split"], hu: ["budapest"],
  pl: ["krakow", "warsaw"], no: ["oslo"], se: ["stockholm"], dk: ["copenhagen"], fi: ["helsinki"], be: ["brussels"], jo: ["petra", "amman"],
};

const known = new Map(KNOWN_AS.map((c) => [c.id, c]));
export const CONTINENTS: Continent[] = WORLD.map(([c]) => c);
export const COUNTRIES: Country[] = WORLD.flatMap(([continent, list]) => list.split("|").map((entry): Country => {
  const [, id, rest] = entry.match(/^(\w\w) (.+)$/)!;
  const [name, label = name] = rest.split("/");
  const k = known.get(id);
  return { id, name, label: k?.label ?? label, also: [...(k?.also ?? []), ...(MORE_NAMES[id] ?? [])], continent };
}));

/** The Philippines' provinces and regions, so a page set in "Cebu" or "Ilocos Sur" counts towards its magnet. */
const PH_REGIONS = [
  "abra", "agusan del norte", "agusan del sur", "aklan", "albay", "antique", "apayao", "aurora", "basilan", "bataan", "batanes", "batangas",
  "benguet", "biliran", "bohol", "bukidnon", "bulacan", "cagayan", "camarines norte", "camarines sur", "camiguin", "capiz", "catanduanes",
  "cavite", "cebu", "cotabato", "davao de oro", "davao del norte", "davao del sur", "davao occidental", "davao oriental", "dinagat islands",
  "eastern samar", "guimaras", "ifugao", "ilocos norte", "ilocos sur", "iloilo", "isabela", "kalinga", "la union", "laguna", "lanao del norte",
  "lanao del sur", "leyte", "maguindanao", "marinduque", "masbate", "misamis occidental", "misamis oriental", "mountain province",
  "negros occidental", "negros oriental", "northern samar", "nueva ecija", "nueva vizcaya", "occidental mindoro", "oriental mindoro", "mindoro",
  "palawan", "pampanga", "pangasinan", "quezon", "quirino", "rizal", "romblon", "samar", "sarangani", "siquijor", "sorsogon", "south cotabato",
  "southern leyte", "sultan kudarat", "sulu", "surigao del norte", "surigao del sur", "tarlac", "tawi-tawi", "zambales", "zamboanga",
  "zamboanga del norte", "zamboanga del sur", "zamboanga sibugay", "basco", "taguig", "makati", "pasig", "marikina", "parañaque", "pasay",
  "western visayas", "central visayas", "eastern visayas", "northern mindanao", "bicol", "calabarzon", "mimaropa", "cordillera", "car", "barmm",
];

const fold = (s: string) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").trim().toLowerCase().replace(/\s+/g, " ");

const BY_NAME = new Map<string, Country>();
for (const c of COUNTRIES) for (const n of [c.name, c.label, ...c.also]) BY_NAME.set(fold(n), c);
const PH = BY_NAME.get("philippines")!;
for (const r of PH_REGIONS) if (!BY_NAME.has(fold(r))) BY_NAME.set(fold(r), PH);
// Every place the app already knows brings its country, whether its region is a province or the country itself.
const KNOWN = new Map(PLACES.map((p) => [fold(p.name), p.region]));

// A place that is itself a country (Hong Kong, Singapore) is that country, whatever its region says.
const COUNTRY_NAMED = new Map(COUNTRIES.flatMap((c) => [[fold(c.name), c], [fold(c.label), c]] as const));

const byId = new Map(COUNTRIES.map((c) => [c.id, c]));
export const countryById = (id: string) => byId.get(id);

/**
 * The country a place on a page is in, read from what's written: a place named after a country, then the region (or
 * its last part, as in "Shibuya, Tokyo, Japan"), then the place's own name, then a place the app knows by that name.
 * Null when it can't tell.
 */
export function countryOf(place: { name: string; region: string }): Country | null {
  const named = COUNTRY_NAMED.get(fold(place.name));
  if (named) return named;
  const tries = [place.region, place.region.split(",").pop() ?? "", place.name, place.name.split(",").pop() ?? ""].map(fold).filter(Boolean);
  for (const t of tries) {
    const hit = BY_NAME.get(t);
    if (hit) return hit;
  }
  const known = KNOWN.get(fold(place.name));
  return known ? BY_NAME.get(fold(known)) ?? null : null;
}

/** A place in a country, with the latest page set there. */
export interface Spot {
  name: string;
  region: string;
  bookId: string;
  pageId: string;
}

/** A country's magnet as earned: the places there (latest first), the first trip and the latest page, which a tap opens. */
export interface Earned {
  country: Country;
  spots: Spot[];
  pages: number;
  first: string;
  last: string;
  bookId: string;
  pageId: string;
}

/** The magnets someone has earned from the places on their pages, in the order they first went. */
export function earnedMagnets(visits: PlaceVisit[]): Earned[] {
  const got = new Map<string, Earned>();
  // Latest first, so each country's spots are too.
  for (const v of [...visits].sort((a, b) => b.last.localeCompare(a.last))) {
    const country = countryOf(v);
    if (!country) continue;
    const spot = { name: v.name, region: v.region, bookId: v.bookId, pageId: v.pageId };
    const had = got.get(country.id);
    if (!had) {
      got.set(country.id, { country, spots: v.name ? [spot] : [], pages: v.pages, first: v.first, last: v.last, bookId: v.bookId, pageId: v.pageId });
      continue;
    }
    had.pages += v.pages;
    if (v.name && !had.spots.some((s) => fold(s.name) === fold(v.name))) had.spots.push(spot);
    if (v.first < had.first) had.first = v.first;
    if (v.last > had.last) Object.assign(had, { last: v.last, bookId: v.bookId, pageId: v.pageId });
  }
  return [...got.values()].sort((a, b) => a.first.localeCompare(b.first) || a.country.name.localeCompare(b.country.name));
}

/** The page a magnet's words name: a place (or region) the person has been in that country, if the words say one. */
export function spotNamed(earned: Earned | null | undefined, words: string): Spot | null {
  const w = fold(words);
  if (!earned || !w) return null;
  return earned.spots.find((s) => fold(s.name) === w) ?? earned.spots.find((s) => fold(s.region) === w) ?? null;
}

/** The most words a magnet's ribbon holds. Mirrors MAGNET_TEXT in server/src/validate.ts. */
export const MAGNET_TEXT = 16;

// The trips people from home are proudest of, offered before the rest of what the app knows.
const FEATURED: Record<string, string[]> = {
  ph: ["Palawan", "Boracay", "Siargao", "Vigan", "Baguio", "Cebu", "Bohol", "El Nido", "Coron", "Batanes", "Sagada", "La Union", "Siquijor", "Camiguin", "Davao", "Tagaytay"],
};

/**
 * Things to write on a country's magnet: the places the person has been there and their regions, then places the app
 * knows in that country. Each fits on the ribbon, and none is the country's own name.
 */
export function suggestionsFor(country: Country, earned?: Earned | null, max = 14): string[] {
  const own = new Set([fold(country.name), fold(country.label)]);
  const out = new Map<string, string>();
  const add = (s: string) => {
    const t = s.split(",")[0].trim();
    const k = fold(t);
    if (k && t.length <= MAGNET_TEXT && !own.has(k) && !COUNTRY_NAMED.has(k) && !out.has(k)) out.set(k, t);
  };
  for (const s of earned?.spots ?? []) add(s.name);
  for (const s of earned?.spots ?? []) add(s.region);
  for (const s of FEATURED[country.id] ?? []) add(s);
  for (const p of PLACES) if (countryOf(p)?.id === country.id) add(p.name);
  for (const p of PLACES) if (countryOf(p)?.id === country.id) add(p.region);
  return [...out.values()].slice(0, max);
}
