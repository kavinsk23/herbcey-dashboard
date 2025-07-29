// App.tsx
import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
  useLocation,
} from "react-router-dom";
import Header from "./components/Header";
import AdminLoadingPage from "./pages/AdminLoadingPage";
import Orders from "./pages/Orders";
import AnalyticsPage from "./pages/AnalyticsPage";
import GoogleLogin from "./pages/googleLogin";
import Management from "./pages/Management";

// Inner component that has access to router hooks
const AppContent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showOrderForm, setShowOrderForm] = useState(false);

  // Determine current page based on route
  const getCurrentPage = (): "orders" | "analytics" | "management" => {
    if (location.pathname.includes("/analytics")) {
      return "analytics";
    } else if (location.pathname.includes("/management")) {
      return "management";
    }
    return "orders";
  };

  // Handle navigation between pages
  const handleNavigate = (page: "orders" | "analytics" | "management") => {
    if (page === "orders") {
      navigate("/admin/orders");
    } else if (page === "analytics") {
      navigate("/admin/analytics");
    } else if (page === "management") {
      navigate("/admin/management");
    }
  };

  // Handle new order button click
  const handleNewOrderClick = () => {
    setShowOrderForm(true);
    // Navigate to orders page if not already there
    if (location.pathname !== "/admin/orders") {
      navigate("/admin/orders");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        currentPage={getCurrentPage()}
        onNavigate={handleNavigate}
        onNewOrderClick={handleNewOrderClick}
      />
      <main className="container px-4 py-6 mx-auto">
        <Routes>
          <Route path="/" element={<GoogleLogin />} />
          <Route path="/admin" element={<AdminLoadingPage />} />
          <Route path="/admin/orders" element={<Orders />} />
          <Route path="/admin/analytics" element={<AnalyticsPage />} />
          <Route path="/admin/management" element={<Management />} />
        </Routes>
      </main>
    </div>
  );
};

const App = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;
