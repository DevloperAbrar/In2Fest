import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import api from "../lib/api";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function RegisterFreePage() {
  const [cities, setCities] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    business_name: "", owner_name: "", phone: "", whatsapp_number: "",
    city_id: "", locality: "", category_id: "", starting_price: "", about: "", photos: []
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    axios.get(`${API_BASE_URL}/meta/cities`).then(({ data }) => setCities(data.data));
    axios.get(`${API_BASE_URL}/meta/categories`).then(({ data }) => setCategories(data.data));
  }, []);

  const wordCount = form.about.trim().split(/\s+/).filter(Boolean).length;

  const handleSubmit = async () => {
    setError("");
    if (wordCount < 50) { setError("About section must be at least 50 words"); return; }
    if (!form.business_name || !form.owner_name || !form.phone || !form.city_id || !form.category_id) {
      setError("Please fill all required fields");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/listing/register`, form);
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">You're registered!</h1>
        <p className="text-sm text-gray-500">Your free listing is under review. You'll get a WhatsApp confirmation once it's approved.</p>
      </div>
    );
  }

  return (
    <>
      <Helmet><title>List Your Business Free - In2Fest</title></Helmet>
      <div className="max-w-xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">List your business for free</h1>
        <p className="text-sm text-gray-500 mb-6">Get discovered by customers on In2Fest, no subscription required.</p>

        <div className="space-y-3">
          <input className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Business name *"
            value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} />
          <input className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Owner name *"
            value={form.owner_name} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} />
          <input className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Phone number *"
            value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="WhatsApp number"
            value={form.whatsapp_number} onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })} />

          <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            value={form.city_id} onChange={(e) => setForm({ ...form, city_id: e.target.value })}>
            <option value="">Select city *</option>
            {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <input className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Locality / area"
            value={form.locality} onChange={(e) => setForm({ ...form, locality: e.target.value })} />

          <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
            <option value="">Select primary category *</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <input type="number" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Starting price (optional)"
            value={form.starting_price} onChange={(e) => setForm({ ...form, starting_price: e.target.value })} />

          <div>
            <textarea rows={5} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="About your business (minimum 50 words) *"
              value={form.about} onChange={(e) => setForm({ ...form, about: e.target.value })} />
            <p className={`text-xs mt-1 ${wordCount >= 50 ? "text-green-600" : "text-gray-400"}`}>{wordCount} / 50 words</p>
          </div>

          <p className="text-xs text-gray-400">Photo upload is coming soon  - you can add photos after your listing is approved.</p>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button disabled={loading} onClick={handleSubmit} className="w-full bg-primary-600 text-white text-sm py-2.5 rounded-lg disabled:opacity-50">
            {loading ? "Submitting..." : "Submit for Review"}
          </button>
        </div>
      </div>
    </>
  );
}