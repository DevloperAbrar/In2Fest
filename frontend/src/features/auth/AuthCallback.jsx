import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Loader from "../../components/common/Loader";

export default function AuthCallback() {
  const [params] = useSearchParams();
  const { setTokenFromGoogleCallback } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const token = params.get("token");
    if (token) {
      setTokenFromGoogleCallback(token).then(() => navigate("/dashboard"));
    } else {
      navigate("/login?error=auth_failed");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <Loader fullScreen />;
}