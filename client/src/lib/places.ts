import type { Place } from "../types";

export type KnownPlace = Place & { lat: number; lng: number };

const RAW: [string, string, number, number, string][] = [
  ["Tagaytay", "Cavite", 14.1153, 120.9621, "TAG"], ["Intramuros", "Manila", 14.5896, 120.9747, "INT"], ["Binondo", "Manila", 14.6, 120.974, "BIN"],
  ["Manila Bay", "Roxas Blvd, Manila", 14.564, 120.981, "MNB"], ["BGC", "Taguig", 14.5509, 121.0503, "BGC"], ["Makati", "Metro Manila", 14.5547, 121.0244, "MKT"],
  ["Maginhawa", "Quezon City", 14.643, 121.061, "QCY"], ["Antipolo", "Rizal", 14.586, 121.176, "ANT"], ["Los Baños", "Laguna", 14.17, 121.24, "LBS"],
  ["Nasugbu", "Batangas", 14.073, 120.633, "NSB"], ["Anilao", "Batangas", 13.76, 120.927, "ANL"], ["Puerto Galera", "Oriental Mindoro", 13.505, 120.954, "PGL"],
  ["Baguio", "Benguet", 16.4023, 120.596, "BAG"], ["Sagada", "Mountain Province", 17.084, 120.9, "SAG"], ["Banaue", "Ifugao", 16.92, 121.058, "BNU"],
  ["Vigan", "Ilocos Sur", 17.5747, 120.3869, "VIG"], ["Pagudpud", "Ilocos Norte", 18.56, 120.79, "PAG"], ["San Juan", "La Union", 16.66, 120.327, "ELU"],
  ["Baler", "Aurora", 15.759, 121.562, "BLR"], ["Subic", "Zambales", 14.82, 120.27, "SBC"], ["Anawangin Cove", "Zambales", 14.88, 120.07, "ANW"],
  ["Clark", "Pampanga", 15.185, 120.546, "CRK"], ["Batanes", "Basco", 20.4487, 121.9702, "BSO"], ["Legazpi", "Albay", 13.1391, 123.7438, "LGP"],
  ["Caramoan", "Camarines Sur", 13.77, 123.863, "CRM"], ["Coron", "Palawan", 11.9986, 120.2043, "CRN"], ["El Nido", "Palawan", 11.1956, 119.4075, "ENI"],
  ["Puerto Princesa", "Palawan", 9.7392, 118.7353, "PPS"], ["Boracay", "Aklan", 11.9674, 121.9248, "BOR"], ["Iloilo City", "Iloilo", 10.7202, 122.5621, "ILO"],
  ["Guimaras", "Western Visayas", 10.5929, 122.6325, "GUI"], ["Bacolod", "Negros Occidental", 10.6765, 122.9509, "BCD"], ["Cebu City", "Cebu", 10.3157, 123.8854, "CEB"],
  ["Moalboal", "Cebu", 9.95, 123.397, "MOA"], ["Oslob", "Cebu", 9.463, 123.38, "OSL"], ["Bantayan Island", "Cebu", 11.17, 123.72, "BTY"],
  ["Chocolate Hills", "Bohol", 9.8297, 124.1397, "BHL"], ["Panglao", "Bohol", 9.575, 123.77, "PGO"], ["Dumaguete", "Negros Oriental", 9.3068, 123.3054, "DGT"],
  ["Siquijor", "Siquijor", 9.1999, 123.5952, "SQJ"], ["Siargao", "Surigao del Norte", 9.787, 126.156, "SIA"], ["Camiguin", "Northern Mindanao", 9.173, 124.729, "CMG"],
  ["Davao City", "Davao", 7.1907, 125.4553, "DVO"], ["Samal Island", "Davao del Norte", 7.07, 125.71, "SML"], ["Cagayan de Oro", "Misamis Oriental", 8.4542, 124.6319, "CGY"],
  ["Zamboanga", "Zamboanga", 6.9214, 122.079, "ZAM"], ["Tacloban", "Leyte", 11.244, 125.004, "TAC"],
  ["Kyoto", "Japan", 35.0116, 135.7681, "KYO"], ["Tokyo", "Japan", 35.6762, 139.6503, "TYO"], ["Osaka", "Japan", 34.6937, 135.5023, "OSA"],
  ["Sapporo", "Japan", 43.0618, 141.3545, "SPK"], ["Seoul", "South Korea", 37.5665, 126.978, "SEL"], ["Jeju", "South Korea", 33.4996, 126.5312, "CJU"],
  ["Taipei", "Taiwan", 25.033, 121.5654, "TPE"], ["Hong Kong", "China", 22.3193, 114.1694, "HKG"], ["Macau", "China", 22.1987, 113.5439, "MFM"],
  ["Singapore", "Singapore", 1.3521, 103.8198, "SIN"], ["Bangkok", "Thailand", 13.7563, 100.5018, "BKK"], ["Chiang Mai", "Thailand", 18.7883, 98.9853, "CNX"],
  ["Phuket", "Thailand", 7.8804, 98.3923, "HKT"], ["Bali", "Indonesia", -8.5069, 115.2625, "DPS"], ["Kuala Lumpur", "Malaysia", 3.139, 101.6869, "KUL"],
  ["Hanoi", "Vietnam", 21.0278, 105.8342, "HAN"], ["Da Nang", "Vietnam", 16.0544, 108.2022, "DAD"], ["Ho Chi Minh City", "Vietnam", 10.8231, 106.6297, "SGN"],
  ["Siem Reap", "Cambodia", 13.3671, 103.8448, "REP"], ["Sydney", "Australia", -33.8688, 151.2093, "SYD"], ["Melbourne", "Australia", -37.8136, 144.9631, "MEL"],
  ["Dubai", "United Arab Emirates", 25.2048, 55.2708, "DXB"], ["Malé", "Maldives", 4.1755, 73.5093, "MLE"], ["Istanbul", "Türkiye", 41.0082, 28.9784, "IST"],
  ["Santorini", "Greece", 36.3932, 25.4615, "JTR"], ["Rome", "Italy", 41.9028, 12.4964, "ROM"], ["Paris", "France", 48.8566, 2.3522, "PAR"],
  ["Barcelona", "Spain", 41.3874, 2.1686, "BCN"], ["London", "United Kingdom", 51.5072, -0.1276, "LON"], ["Reykjavík", "Iceland", 64.1466, -21.9426, "RKV"],
  ["New York", "United States", 40.7128, -74.006, "NYC"], ["San Francisco", "United States", 37.7749, -122.4194, "SFO"], ["Los Angeles", "United States", 34.0522, -118.2437, "LAX"],
  ["Honolulu", "Hawaii", 21.3069, -157.8583, "HNL"], ["Vancouver", "Canada", 49.2827, -123.1207, "YVR"],
];

export const PLACES: KnownPlace[] = RAW.map(([name, region, lat, lng, code]) => ({ name, region, lat, lng, code }));

export const KINDS = ["Date night", "Trip", "Anniversary", "Day out", "Food trip", "Road trip", "Staycation", "Firsts"];

export function findPlace(name: string): KnownPlace {
  const p = PLACES.find((x) => x.name === name);
  if (!p) throw new Error(`Unknown place ${name}`);
  return { ...p };
}
