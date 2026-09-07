import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const publicAuthApi = axios.create({
  baseURL: `${API_BASE_URL}/public-auth`,
  withCredentials: true // required so the publicRefreshToken cookie is sent/received
});

export default publicAuthApi;
export { API_BASE_URL };