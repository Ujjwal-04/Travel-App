/* Popular tourist spots by city — shown first instead of random temples */
const CURATED_PLACES = {
  mumbai: [
    { name: "Gateway of India", lat: 18.922, lon: 72.8347, category: "Heritage", kinds: "monuments,historic" },
    { name: "Marine Drive", lat: 18.9432, lon: 72.8236, category: "Heritage", kinds: "viewpoint,historic" },
    { name: "Elephanta Caves", lat: 18.9633, lon: 72.9315, category: "Cave", kinds: "caves,archaeological_site" },
    { name: "Chhatrapati Shivaji Terminus", lat: 18.9398, lon: 72.8355, category: "Heritage", kinds: "historic_architecture,monuments" },
    { name: "Colaba Causeway", lat: 18.917, lon: 72.828, category: "Heritage", kinds: "historic_district" },
    { name: "Sanjay Gandhi National Park", lat: 19.2147, lon: 72.9106, category: "Park", kinds: "national_park" },
    { name: "Juhu Beach", lat: 19.0988, lon: 72.8267, category: "Beach", kinds: "beaches" },
    { name: "Bandra-Worli Sea Link", lat: 19.0402, lon: 72.8198, category: "Heritage", kinds: "bridges,viewpoint" },
  ],
  delhi: [
    { name: "India Gate", lat: 28.6129, lon: 77.2295, category: "Heritage", kinds: "monuments,memorial" },
    { name: "Red Fort", lat: 28.6562, lon: 77.241, category: "Fort", kinds: "forts,castles" },
    { name: "Qutub Minar", lat: 28.5244, lon: 77.1855, category: "Heritage", kinds: "monuments,historic" },
    { name: "Humayun's Tomb", lat: 28.5933, lon: 77.2507, category: "Heritage", kinds: "mausoleums,historic" },
    { name: "Akshardham", lat: 28.6127, lon: 77.2773, category: "Heritage", kinds: "monuments" },
    { name: "Chandni Chowk", lat: 28.6506, lon: 77.2302, category: "Heritage", kinds: "historic_district" },
    { name: "Lodhi Garden", lat: 28.5931, lon: 77.2194, category: "Park", kinds: "gardens" },
    { name: "National Museum", lat: 28.6119, lon: 77.2195, category: "Museum", kinds: "museums" },
  ],
  bangalore: [
    { name: "Lalbagh Botanical Garden", lat: 12.9507, lon: 77.5848, category: "Park", kinds: "botanical_gardens" },
    { name: "Bangalore Palace", lat: 12.9988, lon: 77.5921, category: "Heritage", kinds: "palaces,historic" },
    { name: "Cubbon Park", lat: 12.9763, lon: 77.5929, category: "Park", kinds: "gardens" },
    { name: "ISKCON Temple Bangalore", lat: 13.0099, lon: 77.5511, category: "Heritage", kinds: "monuments" },
    { name: "Tipu Sultan's Summer Palace", lat: 12.9592, lon: 77.5734, category: "Heritage", kinds: "palaces,historic" },
    { name: "Nandi Hills", lat: 13.3702, lon: 77.6835, category: "Hill", kinds: "mountains,viewpoint" },
    { name: "Bannerghatta National Park", lat: 12.8003, lon: 77.577, category: "Nature", kinds: "national_park,wildlife" },
  ],
  pune: [
    { name: "Shaniwar Wada", lat: 18.5196, lon: 73.8553, category: "Fort", kinds: "forts,historic" },
    { name: "Aga Khan Palace", lat: 18.5526, lon: 73.9018, category: "Heritage", kinds: "palaces,historic" },
    { name: "Sinhagad Fort", lat: 18.3665, lon: 73.7557, category: "Fort", kinds: "forts" },
    { name: "Dagdusheth Halwai Ganpati Temple", lat: 18.5167, lon: 73.8562, category: "Heritage", kinds: "monuments" },
    { name: "Raja Dinkar Kelkar Museum", lat: 18.5088, lon: 73.8561, category: "Museum", kinds: "museums" },
    { name: "Pashan Lake", lat: 18.536, lon: 73.78, category: "Lake", kinds: "lakes" },
    { name: "Osho Garden", lat: 18.5522, lon: 73.789, category: "Park", kinds: "gardens" },
  ],
  jaipur: [
    { name: "Amber Fort", lat: 26.9855, lon: 75.8513, category: "Fort", kinds: "forts,castles" },
    { name: "Hawa Mahal", lat: 26.9239, lon: 75.8267, category: "Heritage", kinds: "palaces,historic" },
    { name: "City Palace Jaipur", lat: 26.9258, lon: 75.8237, category: "Heritage", kinds: "palaces" },
    { name: "Jantar Mantar Jaipur", lat: 26.9248, lon: 75.8246, category: "Heritage", kinds: "monuments,historic" },
    { name: "Nahargarh Fort", lat: 26.9388, lon: 75.8155, category: "Fort", kinds: "forts" },
    { name: "Albert Hall Museum", lat: 26.9117, lon: 75.8194, category: "Museum", kinds: "museums" },
    { name: "Jal Mahal", lat: 26.953, lon: 75.846, category: "Lake", kinds: "palaces,lakes" },
  ],
  goa: [
    { name: "Baga Beach", lat: 15.5554, lon: 73.7517, category: "Beach", kinds: "beaches" },
    { name: "Calangute Beach", lat: 15.5439, lon: 73.7553, category: "Beach", kinds: "beaches" },
    { name: "Fort Aguada", lat: 15.492, lon: 73.7734, category: "Fort", kinds: "forts" },
    { name: "Dudhsagar Falls", lat: 15.3144, lon: 74.3144, category: "Waterfall", kinds: "waterfalls" },
    { name: "Basilica of Bom Jesus", lat: 15.5008, lon: 73.9116, category: "Heritage", kinds: "churches,historic" },
    { name: "Anjuna Flea Market", lat: 15.5833, lon: 73.7415, category: "Heritage", kinds: "historic_district" },
    { name: "Chapora Fort", lat: 15.6083, lon: 73.738, category: "Fort", kinds: "forts,viewpoint" },
  ],
  hyderabad: [
    { name: "Charminar", lat: 17.3616, lon: 78.4747, category: "Heritage", kinds: "monuments,historic" },
    { name: "Golconda Fort", lat: 17.3833, lon: 78.4011, category: "Fort", kinds: "forts" },
    { name: "Hussain Sagar Lake", lat: 17.4239, lon: 78.4738, category: "Lake", kinds: "lakes" },
    { name: "Ramoji Film City", lat: 17.2543, lon: 78.6808, category: "Park", kinds: "amusement_parks" },
    { name: "Salar Jung Museum", lat: 17.3715, lon: 78.4808, category: "Museum", kinds: "museums" },
    { name: "Chowmahalla Palace", lat: 17.3716, lon: 78.4715, category: "Heritage", kinds: "palaces" },
  ],
  chennai: [
    { name: "Marina Beach", lat: 13.050, lon: 80.2824, category: "Beach", kinds: "beaches" },
    { name: "Kapaleeshwarar Temple", lat: 13.0339, lon: 80.2696, category: "Heritage", kinds: "monuments" },
    { name: "Fort St. George", lat: 13.0797, lon: 80.287, category: "Fort", kinds: "forts,historic" },
    { name: "Government Museum Chennai", lat: 13.0707, lon: 80.2624, category: "Museum", kinds: "museums" },
    { name: "Mahabalipuram", lat: 12.6269, lon: 80.1924, category: "Heritage", kinds: "archaeological_site,monuments" },
    { name: "Guindy National Park", lat: 13.0067, lon: 80.2206, category: "Park", kinds: "national_park" },
  ],
  kolkata: [
    { name: "Victoria Memorial", lat: 22.5448, lon: 88.3426, category: "Heritage", kinds: "monuments,museums" },
    { name: "Howrah Bridge", lat: 22.5851, lon: 88.3468, category: "Heritage", kinds: "bridges,viewpoint" },
    { name: "Indian Museum Kolkata", lat: 22.5582, lon: 88.3509, category: "Museum", kinds: "museums" },
    { name: "Dakshineswar Kali Temple", lat: 22.6549, lon: 88.3575, category: "Heritage", kinds: "monuments" },
    { name: "Park Street", lat: 22.5512, lon: 88.3533, category: "Heritage", kinds: "historic_district" },
    { name: "Science City Kolkata", lat: 22.5396, lon: 88.4332, category: "Museum", kinds: "museums,science" },
  ],
  agra: [
    { name: "Taj Mahal", lat: 27.1751, lon: 78.0421, category: "Heritage", kinds: "monuments,mausoleums" },
    { name: "Agra Fort", lat: 27.1795, lon: 78.0211, category: "Fort", kinds: "forts" },
    { name: "Fatehpur Sikri", lat: 27.0945, lon: 77.6679, category: "Heritage", kinds: "ruins,historic" },
    { name: "Mehtab Bagh", lat: 27.1879, lon: 78.0422, category: "Park", kinds: "gardens,viewpoint" },
    { name: "Itimad-ud-Daulah", lat: 27.1926, lon: 78.0312, category: "Heritage", kinds: "mausoleums" },
  ],
  varanasi: [
    { name: "Dashashwamedh Ghat", lat: 25.3069, lon: 83.0107, category: "Heritage", kinds: "historic" },
    { name: "Assi Ghat", lat: 25.2878, lon: 83.0037, category: "Heritage", kinds: "historic" },
    { name: "Sarnath", lat: 25.3811, lon: 83.0214, category: "Heritage", kinds: "archaeological_site,ruins" },
    { name: "Ramnagar Fort", lat: 25.2794, lon: 83.0431, category: "Fort", kinds: "forts" },
    { name: "Manikarnika Ghat", lat: 25.3103, lon: 83.0077, category: "Heritage", kinds: "historic" },
  ],
  udaipur: [
    { name: "City Palace Udaipur", lat: 24.5764, lon: 73.6835, category: "Heritage", kinds: "palaces" },
    { name: "Lake Pichola", lat: 24.572, lon: 73.68, category: "Lake", kinds: "lakes" },
    { name: "Jag Mandir", lat: 24.57, lon: 73.678, category: "Heritage", kinds: "palaces" },
    { name: "Saheliyon Ki Bari", lat: 24.603, lon: 73.684, category: "Park", kinds: "gardens" },
    { name: "Fateh Sagar Lake", lat: 24.605, lon: 73.67, category: "Lake", kinds: "lakes" },
  ],
  mysore: [
    { name: "Mysore Palace", lat: 12.3051, lon: 76.6552, category: "Heritage", kinds: "palaces" },
    { name: "Chamundi Hills", lat: 12.2729, lon: 76.6709, category: "Hill", kinds: "mountains,viewpoint" },
    { name: "Brindavan Gardens", lat: 12.4244, lon: 76.5712, category: "Park", kinds: "gardens" },
    { name: "St. Philomena's Cathedral", lat: 12.321, lon: 76.653, category: "Heritage", kinds: "churches" },
  ],
  rishikesh: [
    { name: "Laxman Jhula", lat: 30.1264, lon: 78.3303, category: "Heritage", kinds: "bridges,historic" },
    { name: "Ram Jhula", lat: 30.128, lon: 78.325, category: "Heritage", kinds: "bridges" },
    { name: "Neer Garh Waterfall", lat: 30.116, lon: 78.28, category: "Waterfall", kinds: "waterfalls" },
    { name: "Beatles Ashram", lat: 30.129, lon: 78.322, category: "Heritage", kinds: "ruins" },
  ],
  manali: [
    { name: "Solang Valley", lat: 32.316, lon: 77.158, category: "Nature", kinds: "valleys,mountains" },
    { name: "Rohtang Pass", lat: 32.371, lon: 77.248, category: "Hill", kinds: "mountains,viewpoint" },
    { name: "Hadimba Temple", lat: 32.248, lon: 77.189, category: "Heritage", kinds: "monuments" },
    { name: "Old Manali", lat: 32.25, lon: 77.185, category: "Heritage", kinds: "historic_district" },
  ],
  paris: [
    { name: "Eiffel Tower", lat: 48.8584, lon: 2.2945, category: "Heritage", kinds: "monuments,towers" },
    { name: "Louvre Museum", lat: 48.8606, lon: 2.3376, category: "Museum", kinds: "museums" },
    { name: "Notre-Dame Cathedral", lat: 48.853, lon: 2.3499, category: "Heritage", kinds: "churches" },
    { name: "Arc de Triomphe", lat: 48.8738, lon: 2.295, category: "Heritage", kinds: "monuments" },
    { name: "Montmartre", lat: 48.8867, lon: 2.3431, category: "Heritage", kinds: "historic_district" },
  ],
  london: [
    { name: "Tower of London", lat: 51.5081, lon: -0.0759, category: "Heritage", kinds: "forts,historic" },
    { name: "British Museum", lat: 51.5194, lon: -0.127, category: "Museum", kinds: "museums" },
    { name: "Buckingham Palace", lat: 51.5014, lon: -0.1419, category: "Heritage", kinds: "palaces" },
    { name: "London Eye", lat: 51.5033, lon: -0.1196, category: "Heritage", kinds: "viewpoint" },
    { name: "Hyde Park", lat: 51.5073, lon: -0.1657, category: "Park", kinds: "gardens" },
  ],
  tokyo: [
    { name: "Senso-ji Temple", lat: 35.7148, lon: 139.7967, category: "Heritage", kinds: "temples" },
    { name: "Tokyo Skytree", lat: 35.7101, lon: 139.8107, category: "Heritage", kinds: "towers,viewpoint" },
    { name: "Shibuya Crossing", lat: 35.6595, lon: 139.7004, category: "Heritage", kinds: "historic_district" },
    { name: "Meiji Shrine", lat: 35.6764, lon: 139.6993, category: "Heritage", kinds: "shrines" },
    { name: "teamLab Borderless", lat: 35.626, lon: 139.783, category: "Museum", kinds: "museums,exhibition" },
  ],
  kyoto: [
    { name: "Fushimi Inari Shrine", lat: 34.9671, lon: 135.7727, category: "Heritage", kinds: "shrines" },
    { name: "Kinkaku-ji", lat: 35.0394, lon: 135.7292, category: "Heritage", kinds: "temples" },
    { name: "Arashiyama Bamboo Grove", lat: 35.017, lon: 135.671, category: "Nature", kinds: "gardens" },
    { name: "Kiyomizu-dera", lat: 34.9949, lon: 135.785, category: "Heritage", kinds: "temples" },
  ],
  "new york": [
    { name: "Statue of Liberty", lat: 40.6892, lon: -74.0445, category: "Heritage", kinds: "monuments" },
    { name: "Central Park", lat: 40.7829, lon: -73.9654, category: "Park", kinds: "gardens" },
    { name: "Times Square", lat: 40.758, lon: -73.9855, category: "Heritage", kinds: "historic_district" },
    { name: "Empire State Building", lat: 40.7484, lon: -73.9857, category: "Heritage", kinds: "towers,viewpoint" },
    { name: "Brooklyn Bridge", lat: 40.7061, lon: -73.9969, category: "Heritage", kinds: "bridges" },
  ],
  barcelona: [
    { name: "Sagrada Familia", lat: 41.4036, lon: 2.1744, category: "Heritage", kinds: "churches,monuments" },
    { name: "Park Güell", lat: 41.4145, lon: 2.1527, category: "Park", kinds: "gardens" },
    { name: "La Rambla", lat: 41.3851, lon: 2.1734, category: "Heritage", kinds: "historic_district" },
    { name: "Casa Batlló", lat: 41.3916, lon: 2.1649, category: "Heritage", kinds: "historic_architecture" },
  ],
  rome: [
    { name: "Colosseum", lat: 41.8902, lon: 12.4922, category: "Heritage", kinds: "ruins,monuments" },
    { name: "Vatican Museums", lat: 41.9065, lon: 12.4536, category: "Museum", kinds: "museums" },
    { name: "Trevi Fountain", lat: 41.9009, lon: 12.4833, category: "Heritage", kinds: "monuments" },
    { name: "Roman Forum", lat: 41.8925, lon: 12.4853, category: "Heritage", kinds: "ruins,archaeological_site" },
  ],
  bangkok: [
    { name: "Grand Palace", lat: 13.75, lon: 100.4913, category: "Heritage", kinds: "palaces" },
    { name: "Wat Pho", lat: 13.7465, lon: 100.493, category: "Heritage", kinds: "temples" },
    { name: "Chatuchak Market", lat: 13.7999, lon: 100.5501, category: "Heritage", kinds: "historic_district" },
    { name: "Wat Arun", lat: 13.7437, lon: 100.4888, category: "Heritage", kinds: "temples" },
  ],
  bali: [
    { name: "Tanah Lot", lat: -8.6211, lon: 115.0868, category: "Heritage", kinds: "temples,viewpoint" },
    { name: "Ubud Monkey Forest", lat: -8.5188, lon: 115.259, category: "Nature", kinds: "forests" },
    { name: "Tegallalang Rice Terraces", lat: -8.4312, lon: 115.279, category: "Nature", kinds: "valleys" },
    { name: "Uluwatu Temple", lat: -8.8294, lon: 115.084, category: "Heritage", kinds: "temples" },
  ],
  singapore: [
    { name: "Marina Bay Sands", lat: 1.2834, lon: 103.8607, category: "Heritage", kinds: "viewpoint" },
    { name: "Gardens by the Bay", lat: 1.2816, lon: 103.8636, category: "Park", kinds: "gardens" },
    { name: "Sentosa Island", lat: 1.2494, lon: 103.8303, category: "Beach", kinds: "beaches" },
    { name: "Singapore Zoo", lat: 1.4043, lon: 103.793, category: "Nature", kinds: "zoos" },
  ],
  dubai: [
    { name: "Burj Khalifa", lat: 25.1972, lon: 55.2744, category: "Heritage", kinds: "towers,viewpoint" },
    { name: "Dubai Mall", lat: 25.1985, lon: 55.2796, category: "Heritage", kinds: "historic_district" },
    { name: "Palm Jumeirah", lat: 25.1124, lon: 55.139, category: "Beach", kinds: "beaches" },
    { name: "Dubai Desert Safari", lat: 24.8607, lon: 55.2962, category: "Nature", kinds: "natural" },
  ],
  istanbul: [
    { name: "Hagia Sophia", lat: 41.0086, lon: 28.9802, category: "Heritage", kinds: "monuments,museums" },
    { name: "Blue Mosque", lat: 41.0055, lon: 28.9769, category: "Heritage", kinds: "mosques" },
    { name: "Grand Bazaar", lat: 41.0106, lon: 28.968, category: "Heritage", kinds: "historic_district" },
    { name: "Topkapi Palace", lat: 41.0115, lon: 28.9833, category: "Heritage", kinds: "palaces" },
  ],
  lisbon: [
    { name: "Belém Tower", lat: 38.6916, lon: -9.216, category: "Heritage", kinds: "forts,towers" },
    { name: "Jerónimos Monastery", lat: 38.6979, lon: -9.2067, category: "Heritage", kinds: "monasteries" },
    { name: "Alfama District", lat: 38.712, lon: -9.13, category: "Heritage", kinds: "historic_district" },
    { name: "São Jorge Castle", lat: 38.7139, lon: -9.1334, category: "Fort", kinds: "castles" },
  ],
  prague: [
    { name: "Charles Bridge", lat: 50.0865, lon: 14.4114, category: "Heritage", kinds: "bridges,historic" },
    { name: "Prague Castle", lat: 50.091, lon: 14.4016, category: "Fort", kinds: "castles" },
    { name: "Old Town Square", lat: 50.0875, lon: 14.4213, category: "Heritage", kinds: "historic_district" },
    { name: "Astronomical Clock", lat: 50.087, lon: 14.4207, category: "Heritage", kinds: "monuments" },
  ],
};

const CITY_ALIASES = {
  bombay: "mumbai",
  bengaluru: "bangalore",
  calcutta: "kolkata",
  benares: "varanasi",
  banaras: "varanasi",
  nyc: "new york",
  "new york city": "new york",
};

function curatedCityKey(city) {
  const raw = (city || "").toLowerCase().trim();
  const aliased = CITY_ALIASES[raw] || raw;
  return aliased.split(",")[0].trim();
}

function getCuratedPlaces(city) {
  const key = curatedCityKey(city);
  const list = CURATED_PLACES[key] || [];
  return list.map((p) => ({
    name: p.name,
    point: { lat: p.lat, lon: p.lon },
    kinds: p.kinds,
    category: p.category,
    _curated: true,
    rating: 4.7,
  }));
}
