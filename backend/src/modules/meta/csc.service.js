const axios = require("axios");
const { getRedisClient } = require("../../config/redis");
const { AppError } = require("../../middleware/error.middleware");

const CSC_BASE = "https://api.countrystatecity.in/v1";
const STATES_TTL = 60 * 60 * 24 * 30; // 30 days  - states never change
const CITIES_TTL = 60 * 60 * 24 * 30; // 30 days  - cities barely change

function authHeaders() {
  if (!process.env.CSC_API_KEY) {
    throw new AppError("City lookup is not configured on the server (missing CSC_API_KEY)", 500);
  }
  return { "X-CSCAPI-KEY": process.env.CSC_API_KEY };
}

async function getIndianStates() {
  const cacheKey = "csc:states:IN";
  const redis = await getRedisClient();
  if (redis) {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  }

  let response;
  try {
    response = await axios.get(`${CSC_BASE}/countries/IN/states`, { headers: authHeaders(), timeout: 8000 });
  } catch (err) {
    throw new AppError("Could not reach the states lookup service, please try again", 502);
  }

  const states = response.data.map((s) => ({ name: s.name, iso2: s.iso2 }));
  if (redis) await redis.setEx(cacheKey, STATES_TTL, JSON.stringify(states));
  return states;
}

async function getCitiesForState(stateCode) {
  const cacheKey = `csc:cities:IN:${stateCode}`;
  const redis = await getRedisClient();
  if (redis) {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  }

  let response;
  try {
    response = await axios.get(`${CSC_BASE}/countries/IN/states/${stateCode}/cities`, {
      headers: authHeaders(),
      timeout: 8000
    });
  } catch (err) {
    throw new AppError("Could not reach the cities lookup service, please try again", 502);
  }

  if (!Array.isArray(response.data) || !response.data.length) {
    throw new AppError("No cities found for this state", 404);
  }

  const cities = response.data.map((c) => ({ name: c.name }));
  if (redis) await redis.setEx(cacheKey, CITIES_TTL, JSON.stringify(cities));
  return cities;
}

module.exports = { getIndianStates, getCitiesForState };