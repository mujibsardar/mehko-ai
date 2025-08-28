import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import DashboardApp from "./components/dashboard/DashboardApp";
import Admin from "./components/admin/Admin";
import Mapper from "./components/overlay/Mapper";
import Interview from "./components/overlay/Interview";
import ProtectedAdminRoute from "./components/auth/ProtectedAdminRoute";
import PrivacyPolicy from "./components/legal/PrivacyPolicy";
import TermsOfService from "./components/legal/TermsOfService";
import CookiePolicy from "./components/legal/CookiePolicy";

export default function App() {
  return (
    <Routes>
      {/* User dashboard */}
      <Route path="/dashboard/*" element={<DashboardApp />} />

      {/* Admin */}
      <Route
        path="/admin"
        element={
          <ProtectedAdminRoute>
            <Admin />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="/admin/mapper/:appId/:formId"
        element={
          <ProtectedAdminRoute>
            <Mapper />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="/admin/interview/:appId/:formId"
        element={
          <ProtectedAdminRoute>
            <Interview />
          </ProtectedAdminRoute>
        }
      />

      {/* Legal Pages */}
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/cookies" element={<CookiePolicy />} />

      {/* Default */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
