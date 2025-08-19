

export default function App() {
  return (
    <Routes>
      {/* User dashboard */}
      <Route path="/dashboard/*" element={<DashboardApp />} />

      {/* Admin */}
      <Route path="/admin" element={<Admin />} />
      <Route path="/admin/mapper/:appId/:formId" element={<Mapper />} />
      <Route path="/admin/interview/:appId/:formId" element={<Interview />} />

      {/* Default */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
