import { useEffect, useState } from "react";
import { metaService } from "../services/metaService";

// Loads the Marketplace Profile schema for a category. The previous schema stays
// available while the next one loads, so the form never flashes empty.
export function useProfileSchema(categorySlug, secondary = []) {
  const secondaryKey = (secondary || []).join(",");
  const [schema, setSchema] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    metaService
      .getProfileSchema(categorySlug, secondaryKey ? secondaryKey.split(",") : [])
      .then((res) => {
        if (!cancelled) setSchema(res.data.data);
      })
      .catch(() => {
        // keep whatever schema we already had
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [categorySlug, secondaryKey]);

  return { schema, loading };
}