import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Interview from "./components/overlay/Interview.jsx";
import Mapper from "./components/overlay/Mapper.jsx";
import Admin from "./components/admin/Admin.jsx";

// TODO: when you’re ready, plug your dashboard component here:
// import DashboardApp from "./components/your/DashboardApp";

export default function App() {
  return (
    <Routes>
      {/* TEMP: send home to a useful interview demo (adjust as needed) */}
      <Route
        path="/"
        element={<Navigate to="/interview/los_angeles_mehko/page1" replace />}
      />

      {/* Admin tools */}
      <Route path="/admin" element={<Admin />} />
      <Route path="/mapper/:app/:form" element={<Mapper />} />
      <Route path="/interview/:app/:form" element={<Interview />} />

      {/* When dashboard is ready: */}
      {/* <Route path="/" element={<DashboardApp />} /> */}
    </Routes>
  );
}
