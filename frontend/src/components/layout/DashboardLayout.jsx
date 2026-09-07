import React from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import BottomNav from "./BottomNav";

export default function DashboardLayout({ sidebarItems, pageTitle, children }) {
  return (
    <div className="flex min-h-screen bg-paper">
      <Sidebar items={sidebarItems} />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar title={pageTitle} />
        <main className="flex-1 p-4 md:p-6 max-w-6xl w-full mx-auto">{children}</main>
        <BottomNav />
      </div>
    </div>
  );
}