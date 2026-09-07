const { AppError } = require("../../middleware/error.middleware");
const indiaData = require("../../data/india.json");

// Build lookup maps once at startup — no API calls, no Redis, no rate limits.
const statesByCode = new Map();
const statesList = indiaData.states.map((s) => {
  const state = { name: s.name, iso2: s.code };
  statesByCode.set(s.code.toUpperCase(), s);
  return state;
});

async function getIndianStates() {
  return statesList;
}

async function getCitiesForState(stateCode) {
  const state = statesByCode.get(String(stateCode || "").toUpperCase());

  if (!state) {
    throw new AppError("No cities found for this state", 404);
  }

  return state.cities.map((c) => ({ name: c.name }));
}

module.exports = { getIndianStates, getCitiesForState };