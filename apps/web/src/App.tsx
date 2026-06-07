import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Compose from "./pages/Compose";
import Campaigns from "./pages/Campaigns";
import Contacts from "./pages/Contacts";
import Approvals from "./pages/Approvals";
import Analytics from "./pages/Analytics";
import EmailHistory from "./pages/EmailHistory";
import Login from "./pages/Login";
import { useAuthStore } from "./hooks/useAuthStore";

export default function App() {
  const { token } = useAuthStore();

  if (!token) return <Login />;

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/compose" element={<Compose />} />
        <Route path="/campaigns" element={<Campaigns />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/approvals" element={<Approvals />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/emails" element={<EmailHistory />} />
      </Routes>
    </Layout>
  );
}
