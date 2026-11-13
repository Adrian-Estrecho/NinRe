import type { PlaceKind } from "../types";

/**
 * The rest of the world's ready-made destinations, beyond the six featured ones in ideas.ts. Each place is
 * [name, area, kind, lat, lng, time, why]; ideas.ts turns them into the same shape as the featured ones.
 */

export type Region = "Asia" | "Europe" | "Americas" | "Middle East & Africa" | "Oceania";
export type Row = [name: string, area: string, kind: PlaceKind, lat: number, lng: number, time: string, why: string];

export interface RawIdea {
  id: string;
  name: string;
  region: Region;
  summary: string;
  cover: number;
  days: number;
  places: Row[];
}

export const WORLD: RawIdea[] = [
  /* ---------- Asia ---------- */
  {
    id: "vietnam", name: "Vietnam", region: "Asia", cover: 0, days: 8,
    summary: "Limestone bays, lantern-lit old towns and some of the best street food on earth.",
    places: [
      ["Ha Long Bay", "Quang Ninh", "water", 20.9101, 107.1839, "A full day", "Thousands of limestone islands in emerald water; stay overnight on a cruise."],
      ["Hoan Kiem Lake", "Hanoi", "landmark", 21.0287, 105.8524, "1 hour", "The calm heart of Hanoi, with a red bridge to a lakeside temple."],
      ["Hanoi Old Quarter", "Hanoi", "food", 21.0341, 105.85, "Half a day", "Pho, bun cha and egg coffee on tiny plastic stools."],
      ["Hoi An Ancient Town", "Hoi An", "culture", 15.8801, 108.338, "Half a day", "Yellow merchant houses and silk lanterns glowing over the river."],
      ["Golden Bridge", "Ba Na Hills, Da Nang", "landmark", 15.995, 107.9966, "Half a day", "A walkway held up by two giant stone hands above the clouds."],
      ["Phong Nha caves", "Quang Binh", "nature", 17.5906, 106.283, "A full day", "Some of the world's biggest caves, reached by boat along a jungle river."],
      ["Ben Thanh Market", "Ho Chi Minh City", "food", 10.7725, 106.698, "1-2 hours", "Saigon's busy market for snacks, coffee beans and souvenirs."],
      ["Mekong Delta", "Can Tho", "water", 10.0452, 105.7469, "A full day", "Floating markets and palm-lined canals by sampan."],
    ],
  },
  {
    id: "singapore", name: "Singapore", region: "Asia", cover: 0, days: 4,
    summary: "A garden city of futuristic skylines, hawker food and spotless streets.",
    places: [
      ["Gardens by the Bay", "Marina Bay", "nature", 1.2816, 103.8636, "2-3 hours", "Giant Supertrees that light up at night, and cloud-forest domes."],
      ["Marina Bay Sands", "Marina Bay", "landmark", 1.2834, 103.8607, "1-2 hours", "The rooftop SkyPark over the skyline."],
      ["Merlion", "Marina Bay", "landmark", 1.2868, 103.8545, "30 minutes", "Singapore's half-lion, half-fish mascot spouting into the bay."],
      ["Sentosa", "Sentosa", "activity", 1.2494, 103.8303, "A full day", "An island of beaches, Universal Studios and cable cars."],
      ["Chinatown", "Singapore", "culture", 1.2831, 103.8442, "2-3 hours", "Temples, shophouses and chicken rice at Maxwell Food Centre."],
      ["Lau Pa Sat", "Downtown, Singapore", "food", 1.2806, 103.8504, "1-2 hours", "A Victorian hawker hall where Satay Street opens at night."],
      ["Singapore Botanic Gardens", "Tanglin", "nature", 1.3138, 103.8159, "2 hours", "A UNESCO garden with the world's largest orchid display."],
      ["Jewel Changi Airport", "Changi", "shopping", 1.3602, 103.9898, "1-2 hours", "The world's tallest indoor waterfall, inside an airport."],
    ],
  },
  {
    id: "malaysia", name: "Malaysia", region: "Asia", cover: 0, days: 6,
    summary: "Twin towers and night markets, rainforest, tea hills and island beaches.",
    places: [
      ["Petronas Towers", "Kuala Lumpur", "landmark", 3.1579, 101.7116, "1-2 hours", "The steel twin towers, best seen lit up from KLCC Park."],
      ["Batu Caves", "Selangor", "culture", 3.2379, 101.684, "2 hours", "Rainbow steps up to a Hindu temple inside a limestone cave."],
      ["Jalan Alor", "Kuala Lumpur", "food", 3.1456, 101.7088, "2 hours", "KL's liveliest food street for satay and grilled seafood."],
      ["George Town", "Penang", "food", 5.4141, 100.3288, "A full day", "Street art, clan houses and Malaysia's best hawker food."],
      ["Langkawi Sky Bridge", "Langkawi", "landmark", 6.3864, 99.6618, "Half a day", "A curved bridge over the rainforest, reached by cable car."],
      ["Cameron Highlands", "Pahang", "nature", 4.4718, 101.3765, "A full day", "Cool hills of tea plantations and strawberry farms."],
      ["Malacca City", "Malacca", "culture", 2.1896, 102.2501, "A full day", "A riverside old town of Dutch red buildings and Peranakan food."],
      ["Mount Kinabalu", "Sabah, Borneo", "nature", 6.075, 116.5583, "Two days", "Borneo's highest peak, climbed overnight for sunrise."],
    ],
  },
  {
    id: "taiwan", name: "Taiwan", region: "Asia", cover: 2, days: 5,
    summary: "Night markets, mountain tea and marble gorges, all an hour or two from Taipei.",
    places: [
      ["Taipei 101", "Taipei", "landmark", 25.034, 121.5645, "1-2 hours", "Once the world's tallest tower; the view from the top is huge."],
      ["Shilin Night Market", "Taipei", "food", 25.088, 121.5241, "2-3 hours", "Fried chicken, bubble tea and stinky tofu at Taiwan's best-known market."],
      ["Jiufen", "New Taipei", "culture", 25.1093, 121.8445, "Half a day", "Lantern-lit teahouses on a hillside above the sea."],
      ["National Palace Museum", "Taipei", "culture", 25.1024, 121.5485, "Half a day", "Imperial treasures, including the famous jadeite cabbage."],
      ["Chiang Kai-shek Memorial Hall", "Taipei", "landmark", 25.0346, 121.5218, "1 hour", "A grand white hall with an hourly changing of the guard."],
      ["Taroko National Park", "Hualien", "nature", 24.1586, 121.6216, "A full day", "Marble gorges and trails along a turquoise river."],
      ["Sun Moon Lake", "Nantou", "water", 23.8573, 120.9158, "A full day", "A misty mountain lake circled by bike paths and temples."],
      ["Alishan", "Chiayi", "nature", 23.5104, 120.802, "A full day", "Sunrise over a sea of clouds, and forest railway rides."],
    ],
  },
  {
    id: "hongkong", name: "Hong Kong", region: "Asia", cover: 0, days: 4,
    summary: "A harbour city of skyscrapers, dim sum and hiking trails minutes from downtown.",
    places: [
      ["Victoria Peak", "Hong Kong Island", "landmark", 22.2759, 114.1455, "2-3 hours", "Ride the Peak Tram for the classic skyline view."],
      ["Star Ferry", "Tsim Sha Tsui", "water", 22.2934, 114.1689, "1 hour", "A cheap, century-old ferry across the harbour; ride it at night."],
      ["Avenue of Stars", "Tsim Sha Tsui", "landmark", 22.293, 114.174, "1 hour", "Waterfront walk for the Symphony of Lights at 8pm."],
      ["Temple Street Night Market", "Yau Ma Tei", "shopping", 22.3065, 114.17, "2 hours", "Fortune tellers, street opera and claypot rice."],
      ["Man Mo Temple", "Sheung Wan", "culture", 22.284, 114.15, "1 hour", "Incense coils hanging in a smoky 19th-century temple."],
      ["Tian Tan Buddha", "Lantau Island", "culture", 22.254, 113.905, "Half a day", "A giant bronze Buddha reached by the Ngong Ping cable car."],
      ["Dragon's Back", "Shek O", "nature", 22.2389, 114.2427, "Half a day", "An easy ridge hike ending at a surf beach."],
      ["Hong Kong Disneyland", "Lantau Island", "activity", 22.313, 114.0413, "A full day", "Disney with a Hong Kong twist, a short train ride from town."],
    ],
  },
  {
    id: "china", name: "China", region: "Asia", cover: 0, days: 10,
    summary: "The Great Wall, imperial palaces, karst rivers and cities that never sleep.",
    places: [
      ["Great Wall at Mutianyu", "Beijing", "landmark", 40.4319, 116.5704, "A full day", "The best-restored stretch near Beijing, with a toboggan down."],
      ["Forbidden City", "Beijing", "culture", 39.9163, 116.3972, "Half a day", "The vast palace of the Ming and Qing emperors."],
      ["Temple of Heaven", "Beijing", "culture", 39.8822, 116.4066, "2 hours", "Where emperors prayed for good harvests, now full of morning tai chi."],
      ["Terracotta Army", "Xi'an", "culture", 34.3853, 109.2785, "Half a day", "Thousands of life-size clay soldiers guarding an emperor's tomb."],
      ["The Bund", "Shanghai", "landmark", 31.24, 121.49, "2 hours", "A colonial waterfront facing Pudong's neon towers."],
      ["Li River", "Yangshuo, Guilin", "water", 24.7781, 110.4966, "A full day", "Bamboo rafts between karst peaks, the view on the 20-yuan note."],
      ["Zhangjiajie National Forest Park", "Hunan", "nature", 29.3249, 110.4343, "A full day", "Sandstone pillars that inspired Avatar's floating mountains."],
      ["Chengdu Panda Base", "Chengdu", "activity", 30.736, 104.146, "Half a day", "Giant pandas at breakfast; go early."],
    ],
  },
  {
    id: "india", name: "India", region: "Asia", cover: 0, days: 10,
    summary: "Marble palaces, desert forts, backwaters and spice markets, a country of many worlds.",
    places: [
      ["Taj Mahal", "Agra", "landmark", 27.1751, 78.0421, "Half a day", "The white marble tomb, best at sunrise before the crowds."],
      ["Chandni Chowk", "Delhi", "food", 28.6506, 77.2303, "Half a day", "Old Delhi's bazaar of parathas, jalebis and spices."],
      ["Amer Fort", "Jaipur", "culture", 26.9855, 75.8513, "Half a day", "A honey-coloured hill fort with a hall of mirrors."],
      ["Hawa Mahal", "Jaipur", "landmark", 26.9239, 75.8267, "1 hour", "The Palace of Winds and its 953 little windows."],
      ["Golden Temple", "Amritsar", "culture", 31.62, 74.8765, "Half a day", "A gold temple on a holy pool that feeds 100,000 people a day."],
      ["Varanasi ghats", "Varanasi", "culture", 25.3109, 83.0107, "A full day", "Evening aarti on the Ganges, and dawn boat rides past the ghats."],
      ["Palolem Beach", "Goa", "water", 15.01, 74.0232, "A full day", "A palm-fringed bay of beach huts and calm water."],
      ["Kerala backwaters", "Alappuzha", "water", 9.4981, 76.3388, "A full day", "A night on a houseboat through palm-lined canals."],
    ],
  },
  {
    id: "cambodia", name: "Cambodia", region: "Asia", cover: 0, days: 6,
    summary: "The temples of Angkor, riverside Phnom Penh and a gentle island coast.",
    places: [
      ["Angkor Wat", "Siem Reap", "culture", 13.4125, 103.867, "A full day", "The largest religious monument on earth; watch sunrise over its towers."],
      ["Bayon", "Siem Reap", "culture", 13.4413, 103.859, "2 hours", "A temple of 200 giant smiling stone faces."],
      ["Ta Prohm", "Siem Reap", "culture", 13.4349, 103.889, "2 hours", "Jungle roots wrapped around crumbling galleries."],
      ["Pub Street", "Siem Reap", "food", 13.3546, 103.8553, "2-3 hours", "Night markets, Khmer barbecue and street snacks."],
      ["Royal Palace", "Phnom Penh", "culture", 11.5637, 104.931, "2 hours", "Golden spires and the Silver Pagoda by the river."],
      ["Tuol Sleng Genocide Museum", "Phnom Penh", "culture", 11.5494, 104.9178, "2 hours", "A sobering school-turned-prison from the Khmer Rouge years."],
      ["Koh Rong", "Sihanoukville", "water", 10.71, 103.24, "A full day", "White beaches, and glowing plankton at night."],
      ["Kep Crab Market", "Kep", "food", 10.4829, 104.3167, "Half a day", "Fresh crab cooked with Kampot pepper by the sea."],
    ],
  },
  {
    id: "nepal", name: "Nepal", region: "Asia", cover: 2, days: 8,
    summary: "Himalayan peaks, prayer-flag trails and the old temple squares of Kathmandu.",
    places: [
      ["Kathmandu Durbar Square", "Kathmandu", "culture", 27.7045, 85.3073, "Half a day", "Pagoda temples and palaces where Kathmandu's kings were crowned."],
      ["Swayambhunath", "Kathmandu", "culture", 27.7149, 85.2904, "1-2 hours", "The Monkey Temple on a hill above the valley."],
      ["Boudhanath", "Kathmandu", "culture", 27.7215, 85.362, "1-2 hours", "A giant white stupa circled by pilgrims and butter lamps."],
      ["Bhaktapur Durbar Square", "Bhaktapur", "culture", 27.6722, 85.428, "Half a day", "A beautifully kept medieval town of potters and temples."],
      ["Phewa Lake", "Pokhara", "water", 28.2096, 83.959, "Half a day", "Paddle out for mirror views of the Annapurna peaks."],
      ["Sarangkot", "Pokhara", "activity", 28.244, 83.948, "Half a day", "Sunrise over the Himalayas, then paraglide down to the lake."],
      ["Chitwan National Park", "Chitwan", "nature", 27.5341, 84.4525, "Two days", "Jungle safaris for rhinos, elephants and maybe a tiger."],
      ["Everest Base Camp", "Khumbu", "nature", 28.0026, 86.8528, "Two weeks", "The classic trek to the foot of the world's highest mountain."],
    ],
  },

  /* ---------- Europe ---------- */
  {
    id: "france", name: "France", region: "Europe", cover: 0, days: 7,
    summary: "Paris cafés and museums, châteaux and lavender, the Alps and the Riviera.",
    places: [
      ["Eiffel Tower", "Paris", "landmark", 48.8584, 2.2945, "2-3 hours", "Ride up for Paris at sunset; it sparkles on the hour at night."],
      ["Louvre", "Paris", "culture", 48.8606, 2.3376, "Half a day", "The Mona Lisa, the Venus de Milo and miles of art."],
      ["Montmartre", "Paris", "culture", 48.8867, 2.3431, "Half a day", "A hilltop village of artists and cafés under the white Sacré-Cœur."],
      ["Palace of Versailles", "Versailles", "culture", 48.8049, 2.1204, "A full day", "The Sun King's palace, Hall of Mirrors and endless gardens."],
      ["Mont-Saint-Michel", "Normandy", "landmark", 48.6361, -1.5115, "A full day", "An abbey on a tidal island, cut off from land at high tide."],
      ["Château de Chambord", "Loire Valley", "culture", 47.6161, 1.517, "Half a day", "The grandest Renaissance château, with a double-spiral staircase."],
      ["Chamonix", "French Alps", "nature", 45.9237, 6.8694, "A full day", "Cable car up the Aiguille du Midi to face Mont Blanc."],
      ["Promenade des Anglais", "Nice", "water", 43.695, 7.265, "Half a day", "A seafront walk on the blue Riviera, then the old town market."],
    ],
  },
  {
    id: "spain", name: "Spain", region: "Europe", cover: 0, days: 7,
    summary: "Gaudí's Barcelona, Moorish palaces, tapas bars and long sunny beaches.",
    places: [
      ["Sagrada Família", "Barcelona", "culture", 41.4036, 2.1744, "2 hours", "Gaudí's unfinished basilica, a forest of stone and stained glass."],
      ["Park Güell", "Barcelona", "nature", 41.4145, 2.1527, "2 hours", "Gaudí's mosaic park with views over the city."],
      ["La Boqueria", "Barcelona", "food", 41.3818, 2.1716, "1-2 hours", "Barcelona's famous market for jamón, fruit and tapas at the bar."],
      ["Museo del Prado", "Madrid", "culture", 40.4138, -3.6921, "Half a day", "Velázquez, Goya and El Greco in one of the world's great galleries."],
      ["Mezquita of Córdoba", "Córdoba", "culture", 37.8789, -4.7794, "2 hours", "A forest of red-and-white arches inside a mosque turned cathedral."],
      ["Alcázar of Seville", "Seville", "culture", 37.3831, -5.9902, "2-3 hours", "Tiled palace rooms and gardens seen in Game of Thrones."],
      ["Alhambra", "Granada", "culture", 37.1761, -3.5881, "Half a day", "A Moorish palace of carved courtyards and fountains; book ahead."],
      ["Ibiza", "Balearic Islands", "water", 38.9067, 1.4206, "A full day", "Turquoise coves by day, famous clubs by night."],
    ],
  },
  {
    id: "uk", name: "United Kingdom", region: "Europe", cover: 4, days: 7,
    summary: "Royal London, Scottish castles and highlands, and storybook countryside.",
    places: [
      ["Tower of London", "London", "culture", 51.5081, -0.0759, "Half a day", "The Crown Jewels, Beefeaters and 900 years of history."],
      ["British Museum", "London", "culture", 51.5194, -0.127, "Half a day", "The Rosetta Stone and treasures from every corner of the world, free."],
      ["Buckingham Palace", "London", "landmark", 51.5014, -0.1419, "1 hour", "Catch the Changing of the Guard in the morning."],
      ["Borough Market", "London", "food", 51.5055, -0.091, "1-2 hours", "London's oldest food market, for street food and cheese."],
      ["Edinburgh Castle", "Edinburgh", "culture", 55.9486, -3.1999, "Half a day", "A castle on a volcanic rock above the Royal Mile."],
      ["Isle of Skye", "Scotland", "nature", 57.2736, -6.2155, "A full day", "Fairy Pools, the Old Man of Storr and wild coastal views."],
      ["Stonehenge", "Wiltshire", "landmark", 51.1789, -1.8262, "Half a day", "The mysterious stone circle, 5,000 years old."],
      ["Roman Baths", "Bath", "culture", 51.3811, -2.359, "2 hours", "Steaming Roman pools in a honey-stone Georgian city."],
    ],
  },
  {
    id: "greece", name: "Greece", region: "Europe", cover: 1, days: 8,
    summary: "Ancient ruins, whitewashed islands and long lunches by the sea.",
    places: [
      ["Acropolis of Athens", "Athens", "culture", 37.9715, 23.7257, "Half a day", "The Parthenon above Athens; go at opening time."],
      ["Oia", "Santorini", "landmark", 36.4618, 25.3753, "Half a day", "Blue domes and the famous caldera sunset."],
      ["Plaka", "Athens", "food", 37.9725, 23.73, "2-3 hours", "Old Athens lanes for souvlaki and tavernas under the Acropolis."],
      ["Delphi", "Phocis", "culture", 38.4824, 22.501, "Half a day", "The ancient oracle's site on the slopes of Mount Parnassus."],
      ["Meteora", "Thessaly", "culture", 39.7217, 21.6306, "A full day", "Monasteries perched on top of giant rock pillars."],
      ["Navagio", "Zakynthos", "water", 37.8595, 20.6249, "A full day", "Shipwreck Beach, in a cove of white cliffs and blue water."],
      ["Mykonos", "Cyclades", "water", 37.4467, 25.3289, "A full day", "Windmills, beach clubs and seafront bars."],
      ["Knossos", "Crete", "culture", 35.298, 25.163, "2-3 hours", "The palace of King Minos and the legend of the Minotaur."],
    ],
  },
  {
    id: "switzerland", name: "Switzerland", region: "Europe", cover: 0, days: 7,
    summary: "Alpine peaks, glassy lakes and the most scenic trains in the world.",
    places: [
      ["Matterhorn", "Zermatt", "nature", 45.9763, 7.6586, "A full day", "The iconic pyramid peak, seen from the Gornergrat railway."],
      ["Jungfraujoch", "Bernese Oberland", "nature", 46.5475, 7.9853, "A full day", "The Top of Europe station, with glacier views."],
      ["Lauterbrunnen", "Bernese Oberland", "nature", 46.5935, 7.9091, "Half a day", "A valley of 72 waterfalls under sheer cliffs."],
      ["Chapel Bridge", "Lucerne", "landmark", 47.0516, 8.3075, "1 hour", "A flower-lined wooden bridge from the 1300s."],
      ["Lake Lucerne", "Lucerne", "water", 47.0098, 8.43, "A full day", "Paddle steamers between mountain villages."],
      ["Glacier Express", "Andermatt", "activity", 46.6355, 8.594, "A full day", "A slow panoramic train over 291 bridges through the Alps."],
      ["Chillon Castle", "Montreux", "culture", 46.4142, 6.9275, "2 hours", "A fairytale castle on Lake Geneva."],
      ["Rhine Falls", "Schaffhausen", "water", 47.6779, 8.6155, "2 hours", "Europe's most powerful waterfall, with boats out to the rock."],
    ],
  },
  {
    id: "netherlands", name: "Netherlands", region: "Europe", cover: 6, days: 4,
    summary: "Canals, bikes, tulip fields and windmills.",
    places: [
      ["Rijksmuseum", "Amsterdam", "culture", 52.36, 4.8852, "Half a day", "Rembrandt's Night Watch and Vermeer's Milkmaid."],
      ["Van Gogh Museum", "Amsterdam", "culture", 52.3584, 4.8811, "2-3 hours", "The world's largest Van Gogh collection."],
      ["Anne Frank House", "Amsterdam", "culture", 52.3752, 4.884, "1-2 hours", "The hiding place behind the bookcase; book weeks ahead."],
      ["Zaanse Schans", "Zaandam", "culture", 52.474, 4.817, "Half a day", "Working windmills, clog makers and cheese farms."],
      ["Keukenhof", "Lisse", "nature", 52.2697, 4.5465, "Half a day", "Seven million tulips in bloom; open in spring only."],
      ["Kinderdijk", "South Holland", "landmark", 51.8833, 4.639, "Half a day", "Nineteen 18th-century windmills along the dykes."],
      ["Canals of Amsterdam", "Amsterdam", "water", 52.3667, 4.889, "1-2 hours", "A boat ride along the 17th-century canal belt."],
      ["Markthal", "Rotterdam", "food", 51.92, 4.487, "1-2 hours", "A giant arched market hall with a painted ceiling."],
    ],
  },
  {
    id: "portugal", name: "Portugal", region: "Europe", cover: 2, days: 6,
    summary: "Tiled hillside cities, pastel de nata and the wild Atlantic coast.",
    places: [
      ["Belém Tower", "Lisbon", "landmark", 38.6916, -9.216, "1 hour", "A riverside fortress, then custard tarts nearby."],
      ["Jerónimos Monastery", "Lisbon", "culture", 38.6979, -9.2068, "2 hours", "Lace-like stone cloisters from Portugal's age of discovery."],
      ["Pena Palace", "Sintra", "culture", 38.7876, -9.3906, "Half a day", "A candy-coloured palace on a forested hilltop."],
      ["Alfama", "Lisbon", "culture", 38.7114, -9.13, "Half a day", "Tram 28 through steep lanes and fado bars."],
      ["Ribeira", "Porto", "food", 41.1406, -8.6131, "Half a day", "The riverfront of port wine cellars and grilled sardines."],
      ["Livraria Lello", "Porto", "culture", 41.1469, -8.6149, "1 hour", "A neo-gothic bookshop with a red curved staircase."],
      ["Douro Valley", "Douro", "nature", 41.16, -7.79, "A full day", "Terraced vineyards and port tastings along the river."],
      ["Benagil Cave", "Algarve", "water", 37.0873, -8.4268, "Half a day", "A sea cave with a round window of sky, reached by kayak."],
    ],
  },
  {
    id: "germany", name: "Germany", region: "Europe", cover: 0, days: 7,
    summary: "Castles on the Rhine, beer gardens, Christmas markets and Berlin's history.",
    places: [
      ["Neuschwanstein Castle", "Bavaria", "culture", 47.5576, 10.7498, "Half a day", "The fairytale castle that inspired Disney."],
      ["Brandenburg Gate", "Berlin", "landmark", 52.5163, 13.3777, "1 hour", "Berlin's symbol of reunification."],
      ["East Side Gallery", "Berlin", "culture", 52.505, 13.4397, "1-2 hours", "The longest stretch of the Berlin Wall, covered in murals."],
      ["Cologne Cathedral", "Cologne", "culture", 50.9413, 6.9583, "1-2 hours", "A gothic giant; climb 533 steps to the top."],
      ["Marienplatz", "Munich", "food", 48.1374, 11.5755, "Half a day", "The Glockenspiel show, then beer and pretzels nearby."],
      ["Rothenburg ob der Tauber", "Bavaria", "culture", 49.3772, 10.1866, "Half a day", "A walled medieval town straight out of a storybook."],
      ["Heidelberg Castle", "Heidelberg", "culture", 49.4106, 8.7153, "2-3 hours", "Red sandstone ruins above an old university town."],
      ["Black Forest", "Triberg", "nature", 48.1306, 8.233, "A full day", "Dark woods, cuckoo clocks and cherry cake."],
    ],
  },
  {
    id: "turkiye", name: "Türkiye", region: "Europe", cover: 3, days: 8,
    summary: "Where Europe meets Asia: bazaars and mosques, balloons over fairy chimneys, a turquoise coast.",
    places: [
      ["Hagia Sophia", "Istanbul", "culture", 41.0086, 28.9802, "1-2 hours", "A 1,500-year-old church turned mosque under a vast dome."],
      ["Blue Mosque", "Istanbul", "culture", 41.0054, 28.9768, "1 hour", "Six minarets, and 20,000 blue tiles inside."],
      ["Grand Bazaar", "Istanbul", "shopping", 41.0107, 28.9681, "2-3 hours", "4,000 shops of carpets, lamps and spices under painted vaults."],
      ["Cappadocia", "Göreme", "activity", 38.6431, 34.8289, "A full day", "Sunrise hot-air balloons over the fairy chimneys."],
      ["Galata Tower", "Istanbul", "landmark", 41.0256, 28.9741, "1 hour", "A medieval tower with a 360° view over the Golden Horn."],
      ["Pamukkale", "Denizli", "water", 37.9204, 29.1205, "Half a day", "White terraces of warm mineral pools."],
      ["Ephesus", "Selçuk", "culture", 37.9395, 27.3417, "Half a day", "A whole Roman city, with the Library of Celsus."],
      ["Ölüdeniz", "Fethiye", "water", 36.5497, 29.1153, "A full day", "A lagoon beach watched from paragliders above."],
    ],
  },
  {
    id: "iceland", name: "Iceland", region: "Europe", cover: 4, days: 7,
    summary: "Waterfalls, glaciers, black beaches and the northern lights.",
    places: [
      ["Hallgrímskirkja", "Reykjavík", "landmark", 64.1417, -21.9266, "1 hour", "A church like a basalt organ, with views from the tower."],
      ["Blue Lagoon", "Grindavík", "water", 63.8804, -22.4495, "Half a day", "A milky-blue geothermal pool in a lava field."],
      ["Þingvellir", "Golden Circle", "nature", 64.2559, -21.1299, "2 hours", "Walk between the North American and European plates."],
      ["Strokkur", "Golden Circle", "nature", 64.3127, -20.3005, "1 hour", "A geyser that erupts every few minutes."],
      ["Seljalandsfoss", "South Coast", "nature", 63.6156, -19.9886, "1 hour", "A waterfall you can walk behind."],
      ["Gullfoss", "Golden Circle", "nature", 64.3271, -20.1199, "1-2 hours", "A two-step waterfall plunging into a canyon."],
      ["Reynisfjara", "Vík", "water", 63.4044, -19.0447, "1-2 hours", "A black sand beach with basalt columns; mind the waves."],
      ["Jökulsárlón", "Vatnajökull", "water", 64.0784, -16.2306, "2-3 hours", "Icebergs drifting in a glacier lagoon by Diamond Beach."],
    ],
  },

  /* ---------- The Americas ---------- */
  {
    id: "usa", name: "United States", region: "Americas", cover: 4, days: 10,
    summary: "Big cities, national parks and road trips from coast to coast.",
    places: [
      ["Statue of Liberty", "New York", "landmark", 40.6892, -74.0445, "Half a day", "Ferry out to Lady Liberty and Ellis Island."],
      ["Times Square", "New York", "landmark", 40.758, -73.9855, "1 hour", "Neon, Broadway shows and crowds day and night."],
      ["Central Park", "New York", "nature", 40.7829, -73.9654, "Half a day", "843 acres of lawns, lakes and bike paths in Manhattan."],
      ["Walt Disney World", "Orlando", "activity", 28.3852, -81.5639, "A full day", "Four theme parks of rides and fireworks."],
      ["Golden Gate Bridge", "San Francisco", "landmark", 37.8199, -122.4783, "2 hours", "Walk or bike across, fog permitting."],
      ["Yosemite National Park", "California", "nature", 37.8651, -119.5383, "A full day", "Granite cliffs, giant sequoias and waterfalls."],
      ["Las Vegas Strip", "Las Vegas", "activity", 36.1147, -115.1728, "A full day", "Casinos, shows and the Bellagio fountains."],
      ["Grand Canyon", "Arizona", "nature", 36.0544, -112.1401, "A full day", "Sunset at the South Rim over a mile-deep canyon."],
    ],
  },
  {
    id: "canada", name: "Canada", region: "Americas", cover: 1, days: 8,
    summary: "Turquoise lakes, the Rockies, wildlife and friendly cities.",
    places: [
      ["Banff National Park", "Alberta", "nature", 51.4968, -115.9281, "A full day", "Turquoise lakes and peaks in the Rockies."],
      ["Moraine Lake", "Banff", "water", 51.3217, -116.186, "Half a day", "The impossibly blue lake under ten peaks."],
      ["Jasper National Park", "Alberta", "nature", 52.8734, -117.9543, "A full day", "Glaciers, elk and the Icefields Parkway."],
      ["Stanley Park", "Vancouver", "nature", 49.3043, -123.1443, "Half a day", "Cycle the seawall around a rainforest park."],
      ["Whistler", "British Columbia", "activity", 50.1163, -122.9574, "A full day", "Skiing in winter, the Peak 2 Peak gondola in summer."],
      ["CN Tower", "Toronto", "landmark", 43.6426, -79.3871, "2 hours", "A glass floor 342 metres above Toronto."],
      ["Niagara Falls", "Ontario", "water", 43.0896, -79.0849, "A full day", "Ride the boat into the spray of Horseshoe Falls."],
      ["Old Quebec", "Quebec City", "culture", 46.8123, -71.205, "A full day", "A walled French old town under the Château Frontenac."],
    ],
  },
  {
    id: "mexico", name: "Mexico", region: "Americas", cover: 0, days: 8,
    summary: "Mayan ruins, Caribbean beaches, cenotes and tacos everywhere.",
    places: [
      ["Chichén Itzá", "Yucatán", "culture", 20.6843, -88.5678, "Half a day", "The great stepped pyramid of El Castillo."],
      ["Ik Kil", "Yucatán", "water", 20.661, -88.5506, "1-2 hours", "Swim in a deep sinkhole hung with vines."],
      ["Tulum", "Quintana Roo", "culture", 20.2148, -87.429, "Half a day", "Mayan ruins on a cliff over a turquoise beach."],
      ["Isla Mujeres", "Quintana Roo", "water", 21.2321, -86.731, "A full day", "Golf carts, Playa Norte and snorkelling."],
      ["Teotihuacan", "Mexico City", "culture", 19.6925, -98.8438, "Half a day", "Climb the Pyramid of the Sun; balloons at dawn."],
      ["Zócalo", "Mexico City", "landmark", 19.4326, -99.1332, "2 hours", "A huge square by the cathedral and the Aztec Templo Mayor."],
      ["Frida Kahlo Museum", "Mexico City", "culture", 19.3551, -99.1625, "2 hours", "The Blue House where Frida lived and painted."],
      ["Oaxaca", "Oaxaca", "food", 17.0732, -96.7266, "A full day", "Mole, mezcal and colourful markets."],
    ],
  },
  {
    id: "peru", name: "Peru", region: "Americas", cover: 0, days: 9,
    summary: "Machu Picchu, the Sacred Valley, desert oases and Lima's famous food.",
    places: [
      ["Machu Picchu", "Cusco Region", "culture", -13.1631, -72.545, "A full day", "The Inca citadel in the clouds; book permits early."],
      ["Sacred Valley", "Urubamba", "nature", -13.33, -72.09, "A full day", "Inca terraces at Pisac and Ollantaytambo."],
      ["Cusco", "Cusco", "culture", -13.532, -71.9675, "A full day", "The Inca capital of stone walls and colonial churches."],
      ["Rainbow Mountain", "Cusco Region", "nature", -13.8697, -71.303, "A full day", "A striped mountain at 5,000 metres; take it slowly."],
      ["Lake Titicaca", "Puno", "water", -15.8402, -70.0219, "A full day", "The floating reed islands of the Uros people."],
      ["Nazca Lines", "Ica", "landmark", -14.739, -75.13, "Half a day", "Giant desert drawings, seen from a small plane."],
      ["Huacachina", "Ica", "activity", -14.0875, -75.7626, "Half a day", "An oasis in the dunes for sandboarding and buggy rides."],
      ["Miraflores", "Lima", "food", -12.1211, -77.0297, "Half a day", "Clifftop walks and ceviche in South America's food capital."],
    ],
  },
  {
    id: "brazil", name: "Brazil", region: "Americas", cover: 0, days: 10,
    summary: "Rio's beaches and mountains, the falls of Iguazu, the Amazon and samba.",
    places: [
      ["Christ the Redeemer", "Rio de Janeiro", "landmark", -22.9519, -43.2105, "Half a day", "The statue over Rio, reached by a little cog train."],
      ["Sugarloaf Mountain", "Rio de Janeiro", "landmark", -22.9486, -43.1566, "Half a day", "Cable cars up for sunset over the bay."],
      ["Copacabana", "Rio de Janeiro", "water", -22.9711, -43.1822, "Half a day", "The wavy promenade and its beach kiosks."],
      ["Selarón Steps", "Rio de Janeiro", "culture", -22.9153, -43.1792, "1 hour", "Steps covered in tiles from around the world."],
      ["Iguazu Falls", "Foz do Iguaçu", "water", -25.6953, -54.4367, "A full day", "275 waterfalls on the border with Argentina."],
      ["Pelourinho", "Salvador", "culture", -12.9714, -38.51, "Half a day", "Pastel colonial streets and drumming."],
      ["Meeting of Waters", "Manaus", "water", -3.1366, -59.9055, "A full day", "Dark and sandy Amazon rivers flowing side by side without mixing."],
      ["Lençóis Maranhenses", "Maranhão", "nature", -2.4858, -43.128, "A full day", "White dunes with rainwater lagoons between them."],
    ],
  },

  /* ---------- Middle East & Africa ---------- */
  {
    id: "uae", name: "United Arab Emirates", region: "Middle East & Africa", cover: 0, days: 5,
    summary: "Desert dunes, record-breaking towers and grand mosques, from Dubai to Abu Dhabi.",
    places: [
      ["Burj Khalifa", "Dubai", "landmark", 25.1972, 55.2744, "2 hours", "The world's tallest building; go up at sunset."],
      ["The Dubai Mall", "Dubai", "shopping", 25.1985, 55.2796, "Half a day", "An aquarium, an ice rink and the fountain show outside."],
      ["Palm Jumeirah", "Dubai", "landmark", 25.1124, 55.139, "Half a day", "The palm-shaped island, with Atlantis at its tip."],
      ["Al Fahidi Historical Neighbourhood", "Dubai", "culture", 25.2637, 55.2995, "2 hours", "Old wind-tower houses, then an abra across the creek."],
      ["Gold Souk", "Dubai", "shopping", 25.2697, 55.297, "1-2 hours", "Shop windows glittering with gold."],
      ["Dubai desert safari", "Dubai", "activity", 24.95, 55.6, "Half a day", "Dune drives, camel rides and dinner under the stars."],
      ["Sheikh Zayed Grand Mosque", "Abu Dhabi", "culture", 24.4128, 54.475, "2 hours", "White marble domes and the world's largest hand-knotted carpet."],
      ["Louvre Abu Dhabi", "Abu Dhabi", "culture", 24.5338, 54.3984, "Half a day", "A museum under a dome that rains light."],
    ],
  },
  {
    id: "egypt", name: "Egypt", region: "Middle East & Africa", cover: 0, days: 8,
    summary: "Pyramids, pharaohs' temples, Nile cruises and Red Sea reefs.",
    places: [
      ["Pyramids of Giza", "Giza", "landmark", 29.9792, 31.1342, "Half a day", "The last standing Wonder of the Ancient World, and the Sphinx."],
      ["Grand Egyptian Museum", "Giza", "culture", 29.9945, 31.1194, "Half a day", "Tutankhamun's treasures in a huge new museum."],
      ["Khan el-Khalili", "Cairo", "shopping", 30.0477, 31.2623, "2-3 hours", "Cairo's old bazaar of lamps, spices and mint tea."],
      ["Karnak", "Luxor", "culture", 25.7188, 32.6573, "Half a day", "A forest of giant columns in the Hypostyle Hall."],
      ["Valley of the Kings", "Luxor", "culture", 25.7402, 32.6014, "Half a day", "The painted tombs of the pharaohs."],
      ["Philae", "Aswan", "culture", 24.0255, 32.884, "2 hours", "A temple to Isis on an island, reached by boat."],
      ["Abu Simbel", "Aswan", "culture", 22.3372, 31.6258, "Half a day", "Ramesses II's colossal temple, moved to save it from the Nile."],
      ["Ras Mohammed National Park", "Sharm El Sheikh", "water", 27.7333, 34.25, "A full day", "Some of the Red Sea's best coral reefs."],
    ],
  },
  {
    id: "morocco", name: "Morocco", region: "Middle East & Africa", cover: 2, days: 8,
    summary: "Souks and riads, the Atlas Mountains and the dunes of the Sahara.",
    places: [
      ["Jemaa el-Fnaa", "Marrakesh", "food", 31.6258, -7.9891, "Half a day", "A square of storytellers by day and food stalls by night."],
      ["Majorelle Garden", "Marrakesh", "nature", 31.6417, -8.0033, "1-2 hours", "A cobalt-blue villa in a cactus garden."],
      ["Chefchaouen", "Rif Mountains", "culture", 35.1688, -5.2636, "A full day", "The blue-washed mountain town."],
      ["Bahia Palace", "Marrakesh", "culture", 31.6216, -7.9831, "1 hour", "Painted ceilings and tiled courtyards."],
      ["Aït Benhaddou", "Ouarzazate", "culture", 31.047, -7.129, "Half a day", "A mud-brick fortress village seen in Gladiator."],
      ["Erg Chebbi", "Merzouga", "activity", 31.145, -4.02, "Two days", "A camel trek into the Sahara and a night in a desert camp."],
      ["Fes el Bali", "Fes", "culture", 34.064, -4.973, "A full day", "A maze of 9,000 lanes and the Chouara tannery."],
      ["Hassan II Mosque", "Casablanca", "culture", 33.6086, -7.6328, "2 hours", "A huge mosque over the Atlantic, with a towering minaret."],
    ],
  },
  {
    id: "southafrica", name: "South Africa", region: "Middle East & Africa", cover: 0, days: 10,
    summary: "Table Mountain, wine country, safaris and a wild coastline.",
    places: [
      ["Table Mountain", "Cape Town", "nature", -33.9628, 18.4098, "Half a day", "A cable car up the flat-topped mountain over Cape Town."],
      ["V&A Waterfront", "Cape Town", "food", -33.9036, 18.4207, "Half a day", "Harbour food markets with the mountain behind."],
      ["Robben Island", "Cape Town", "culture", -33.8076, 18.3712, "Half a day", "Where Nelson Mandela was held for 18 years."],
      ["Boulders Beach", "Simon's Town", "water", -34.1975, 18.451, "1-2 hours", "Swim beside a colony of African penguins."],
      ["Cape of Good Hope", "Cape Peninsula", "nature", -34.3568, 18.474, "A full day", "The rocky tip of the peninsula, with ostriches and baboons."],
      ["Stellenbosch", "Cape Winelands", "food", -33.9321, 18.8602, "A full day", "Wine tastings at Cape Dutch estates."],
      ["Kruger National Park", "Mpumalanga", "nature", -23.9884, 31.5547, "Two days", "Big Five safaris, self-drive or guided."],
      ["Blyde River Canyon", "Mpumalanga", "nature", -24.5753, 30.827, "A full day", "One of the largest green canyons in the world."],
    ],
  },

  /* ---------- Oceania ---------- */
  {
    id: "australia", name: "Australia", region: "Oceania", cover: 0, days: 10,
    summary: "Sydney's harbour, the Great Barrier Reef, Uluru and endless beaches.",
    places: [
      ["Sydney Opera House", "Sydney", "landmark", -33.8568, 151.2153, "2 hours", "Take a tour, or catch a show under the sails."],
      ["Sydney Harbour Bridge", "Sydney", "landmark", -33.8523, 151.2108, "2-3 hours", "Climb the arch for the city's best view."],
      ["Bondi Beach", "Sydney", "water", -33.8908, 151.2743, "Half a day", "Surf, then walk the clifftop path to Coogee."],
      ["Hosier Lane", "Melbourne", "food", -37.8164, 144.9692, "Half a day", "Street-art lanes and coffee in Melbourne's centre."],
      ["Twelve Apostles", "Great Ocean Road", "nature", -38.6662, 143.1047, "A full day", "Limestone stacks along a famous coastal drive."],
      ["Uluru", "Northern Territory", "nature", -25.3444, 131.0369, "A full day", "The red monolith glowing at sunset."],
      ["Great Barrier Reef", "Cairns", "water", -16.7, 146.0, "A full day", "Snorkel the world's largest coral reef."],
      ["Whitehaven Beach", "Whitsundays", "water", -20.2823, 149.0389, "A full day", "Pure white sand and swirling turquoise water."],
    ],
  },
  {
    id: "newzealand", name: "New Zealand", region: "Oceania", cover: 0, days: 10,
    summary: "Fiords, glaciers, hobbits and adventure.",
    places: [
      ["Milford Sound", "Fiordland", "water", -44.6414, 167.8974, "A full day", "Cruise under waterfalls in a mountain fiord."],
      ["Queenstown", "Otago", "activity", -45.0312, 168.6626, "A full day", "Bungy, jet boats and the Skyline gondola."],
      ["Aoraki / Mount Cook", "Canterbury", "nature", -43.595, 170.1418, "A full day", "New Zealand's highest peak and the Hooker Valley track."],
      ["Tongariro Alpine Crossing", "Ruapehu", "nature", -39.1333, 175.65, "A full day", "A volcanic day hike past emerald lakes."],
      ["Rotorua", "Bay of Plenty", "culture", -38.1368, 176.2497, "A full day", "Geysers, mud pools and Māori culture."],
      ["Waitomo Glowworm Caves", "Waikato", "nature", -38.2609, 175.1036, "2 hours", "A boat through a cave lit by thousands of glowworms."],
      ["Hobbiton Movie Set", "Matamata", "activity", -37.8721, 175.6829, "Half a day", "The Shire from The Lord of the Rings."],
      ["Bay of Islands", "Northland", "water", -35.22, 174.23, "A full day", "Dolphins and island sailing in the subtropical north."],
    ],
  },
];

/** Wikipedia articles for world places whose usual name isn't the article's title. */
export const WORLD_WIKI: Record<string, string> = {
  "Hoi An Ancient Town": "Hội An", "Golden Bridge": "Golden Bridge (Vietnam)", "Phong Nha caves": "Phong Nha-Kẻ Bàng National Park",
  "Chinatown": "Chinatown, Singapore", "George Town": "George Town, Penang", "Avenue of Stars": "Avenue of Stars, Hong Kong",
  "Great Wall at Mutianyu": "Mutianyu", "Chengdu Panda Base": "Chengdu Research Base of Giant Panda Breeding", "Varanasi ghats": "Ghats in Varanasi",
  "Royal Palace": "Royal Palace, Phnom Penh", "Kep Crab Market": "Kep, Cambodia", "Mezquita of Córdoba": "Mosque–Cathedral of Córdoba",
  "Ribeira": "Ribeira (Porto)", "Blue Mosque": "Sultan Ahmed Mosque", "Whistler": "Whistler, British Columbia", "Oaxaca": "Oaxaca City",
  "Rainbow Mountain": "Vinicunca", "Christ the Redeemer": "Christ the Redeemer (statue)", "Copacabana": "Copacabana, Rio de Janeiro",
  "Selarón Steps": "Escadaria Selarón", "Lençóis Maranhenses": "Lençóis Maranhenses National Park", "Gold Souk": "Gold Souk, Dubai",
  "Dubai desert safari": "Dubai Desert Conservation Reserve", "Pyramids of Giza": "Giza pyramid complex", "Twelve Apostles": "The Twelve Apostles (Victoria)",
  "Grand Canyon": "Grand Canyon National Park", "Roman Baths": "Roman Baths (Bath)", "Miraflores": "Miraflores District, Lima",
  "Oia": "Oia, Greece", "Grand Bazaar": "Grand Bazaar, Istanbul", "Blue Lagoon": "Blue Lagoon (geothermal spa)", "Queenstown": "Queenstown, New Zealand", "Alishan": "Alishan National Scenic Area", "Dragon's Back": "Dragon's Back (hiking trail)",
};
