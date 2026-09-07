import React from "react";
import TeamLoginForm from "./TeamLoginForm.jsx";

export default function TeamLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <h1 className="text-2xl font-bold text-primary-600 text-center mb-1">In2Fest</h1>
        <p className="text-sm text-gray-500 text-center mb-6">Team member sign in</p>
        <TeamLoginForm />
      </div>
    </div>
  );
}