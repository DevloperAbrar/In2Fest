const axios = require("axios");
const env = require("./env");

const whatsappClient = axios.create({
  baseURL: env.whatsapp.apiUrl,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json"
  }
});

module.exports = { whatsappClient };