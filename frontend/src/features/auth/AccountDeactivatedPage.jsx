import React from "react";
import { useSearchParams, Link } from "react-router-dom";
import { ShieldOff } from "lucide-react";

export default function AccountDeactivatedPage() {
  const [searchParams] = useSearchParams();
  const message = searchParams.get("msg") || "Your account has been deactivated. Please contact the venue owner.";
  const role = searchParams.get("role") || "owner";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center">
        <ShieldOff size={40} className="text-red-400 mx-auto mb-4" />
        <h1 className="text-lg font-semibold text-gray-800 mb-2">Account Deactivated</h1>
        <p className="text-sm text-gray-500 mb-6">{message}</p>
        <Link
          to={role === "team_member" ? "/team-login" : "/login"}
          className="inline-block bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}