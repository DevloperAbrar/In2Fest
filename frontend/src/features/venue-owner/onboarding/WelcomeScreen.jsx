import React from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../../components/common/Button";

export default function WelcomeScreen() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-bold text-primary-600 mb-3">Welcome to In2Fest</h1>
        <p className="text-gray-500 mb-8">
          Let's get your venue online with a professional website and a complete
          booking management system  - no developer needed.
        </p>
        <Button onClick={() => navigate("/dashboard/onboarding/details")} className="w-full">
          Get Started
        </Button>
      </div>
    </div>
  );
}