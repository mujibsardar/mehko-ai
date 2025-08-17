import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Interview from "./components/overlay/Interview.jsx";
import Mapper from "./components/overlay/Mapper.jsx";
import Admin from "./components/admin/Admin.jsx";
import DashboardApp from "./components/dashboard/DashboardApp.jsx";
import Landing from "./components/landing/Landing.jsx"; // NEW

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<DashboardApp />} />
      <Route path="/landing" element={<Landing />} /> {/* NEW */}
      {/* Admin tools */}
      <Route path="/admin" element={<Admin />} />
      <Route path="/mapper/:app/:form" element={<Mapper />} />
      <Route path="/interview/:app/:form" element={<Interview />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
