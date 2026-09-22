import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Loader from "../../components/common/Loader";

export default function AuthCallback() {
  const [params] = useSearchParams();
  const { setTokenFromGoogleCallback, startImpersonation } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const token = params.get("token");
    const mode = params.get("mode");
    if (token) {
      const handler = mode === "impersonate" ? startImpersonation(token) : setTokenFromGoogleCallback(token);
      handler.then(() => navigate("/dashboard"));
    } else {
      navigate("/login?error=auth_failed");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <Loader fullScreen />;
}