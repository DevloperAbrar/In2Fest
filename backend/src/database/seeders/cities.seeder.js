const { City } = require("../models");

const DEFAULT_CITIES = [
  { name: "Indore", slug: "indore", state: "Madhya Pradesh", state_slug: "madhya-pradesh", latitude: 22.7196, longitude: 75.8577 },
  { name: "Bhopal", slug: "bhopal", state: "Madhya Pradesh", state_slug: "madhya-pradesh", latitude: 23.2599, longitude: 77.4126 },
  { name: "Ujjain", slug: "ujjain", state: "Madhya Pradesh", state_slug: "madhya-pradesh", latitude: 23.1765, longitude: 75.7885 },
  { name: "Gwalior", slug: "gwalior", state: "Madhya Pradesh", state_slug: "madhya-pradesh", latitude: 26.2183, longitude: 78.1828 },
  { name: "Jabalpur", slug: "jabalpur", state: "Madhya Pradesh", state_slug: "madhya-pradesh", latitude: 23.1815, longitude: 79.9864 },
  { name: "Dewas", slug: "dewas", state: "Madhya Pradesh", state_slug: "madhya-pradesh", latitude: 22.9676, longitude: 76.0534 },
  { name: "Ratlam", slug: "ratlam", state: "Madhya Pradesh", state_slug: "madhya-pradesh", latitude: 23.3315, longitude: 75.0367 },
  { name: "Mumbai", slug: "mumbai", state: "Maharashtra", state_slug: "maharashtra", latitude: 19.0760, longitude: 72.8777 },
  { name: "Pune", slug: "pune", state: "Maharashtra", state_slug: "maharashtra", latitude: 18.5204, longitude: 73.8567 },
  { name: "Delhi", slug: "delhi", state: "Delhi", state_slug: "delhi", latitude: 28.7041, longitude: 77.1025 },
  { name: "Jaipur", slug: "jaipur", state: "Rajasthan", state_slug: "rajasthan", latitude: 26.9124, longitude: 75.7873 },
  { name: "Ahmedabad", slug: "ahmedabad", state: "Gujarat", state_slug: "gujarat", latitude: 23.0225, longitude: 72.5714 },
  { name: "Surat", slug: "surat", state: "Gujarat", state_slug: "gujarat", latitude: 21.1702, longitude: 72.8311 },
  { name: "Bengaluru", slug: "bengaluru", state: "Karnataka", state_slug: "karnataka", latitude: 12.9716, longitude: 77.5946 },
  { name: "Hyderabad", slug: "hyderabad", state: "Telangana", state_slug: "telangana", latitude: 17.3850, longitude: 78.4867 },
  { name: "Lucknow", slug: "lucknow", state: "Uttar Pradesh", state_slug: "uttar-pradesh", latitude: 26.8467, longitude: 80.9462 }
];

async function seedCities() {
  for (const cityData of DEFAULT_CITIES) {
    const existing = await City.findOne({ where: { slug: cityData.slug } });
    if (!existing) {
      await City.create(cityData);
      console.log(`[SEED] City created: ${cityData.name}`);
    }
  }
}

module.exports = { seedCities };