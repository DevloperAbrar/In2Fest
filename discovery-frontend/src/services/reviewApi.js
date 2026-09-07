import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const reviewApi = axios.create({ baseURL: `${API_BASE_URL}/reviews` });

export default reviewApi;