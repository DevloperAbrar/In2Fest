import { useState, useEffect, useCallback } from "react";
import axiosInstance from "../lib/axiosInstance";

export function useFetch(url, options = {}) {
  const { skip = false, deps = [] } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(!!url && !skip); // don't show loading if url is null
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!url || skip) {
      setLoading(false); // make sure loading is cleared
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await axiosInstance.get(url);
      setData(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [url, skip]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, skip, ...deps]);

  return { data, loading, error, refetch: fetchData };
}