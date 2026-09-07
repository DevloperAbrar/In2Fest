import React from "react";

export default function Footer({ venueName }) {
  return (
    <footer className="bg-gray-900 text-gray-300 py-10 mt-16">
      <div className="max-w-6xl mx-auto px-6 text-center text-sm">
        <p>© {new Date().getFullYear()} {venueName}. All rights reserved.</p>
        <p className="mt-1 text-gray-500">Powered by In2Fest</p>
      </div>
    </footer>
  );
}