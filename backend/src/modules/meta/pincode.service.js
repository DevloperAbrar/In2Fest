const axios = require("axios");
const { City } = require("../../database/models");
const { slugify } = require("../../utils/slugify");
const { getRedisClient } = require("../../config/redis");
const { AppError } = require("../../middleware/error.middleware");

const CACHE_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days  - pincode-to-area mapping barely changes

async function lookupPincode(pincode) {
  if (!/^\d{6}$/.test(pincode)) {
    throw new AppError("Enter a valid 6-digit pincode", 400);
  }

  const cacheKey = `pincode:${pincode}`;
  const redis = await getRedisClient();

  if (redis) {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  }

  let response;
  try {
    response = await axios.get(`https://api.postalpincode.in/pincode/${pincode}`, { timeout: 8000 });
  } catch (err) {
    throw new AppError("Could not reach the pincode lookup service, please try again", 502);
  }

  const result = response.data && response.data[0];
  if (!result || result.Status !== "Success" || !Array.isArray(result.PostOffice) || !result.PostOffice.length) {
    throw new AppError("No location found for this pincode", 404);
  }

  const postOffices = result.PostOffice;
  const primary = postOffices[0];

  const payload = {
    pincode,
    district: primary.District,
    state: primary.State,
    post_offices: postOffices.map((po) => ({
      name: po.Name,
      branch_type: po.BranchType,
      block: po.Block
    }))
  };

  // Make sure a City row exists for this district/state so it can immediately
  // be used as a real service-area FK  - created from real API data, never guessed.
  payload.city = await findOrCreateCity(payload.district, payload.state);

  if (redis) await redis.setEx(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(payload));

  return payload;
}

async function findOrCreateCity(name, state) {
  const slug = slugify(name);
  const state_slug = slugify(state);

  const [city] = await City.findOrCreate({
    where: { slug },
    defaults: { name, slug, state, state_slug, active: true }
  });

  return city;
}

module.exports = { lookupPincode, findOrCreateCity };