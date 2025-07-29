// Updated App.tsx with Protected Routes
import React from "react";
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
import { AuthProvider } from "./auth/AuthContext";
import ProtectedRoute from "./auth/ProtectedRoute";

// Inner component that has access to router hooks
const AppContent = () => {
  const navigate = useNavigate();
  const location = useLocation();

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
    // Navigate to orders page if not already there
    if (location.pathname !== "/admin/orders") {
      navigate("/admin/orders");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        {/* Public route - Login */}
        <Route path="/" element={<GoogleLogin />} />

        {/* Protected routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <>
                <Header
                  currentPage={getCurrentPage()}
                  onNavigate={handleNavigate}
                  onNewOrderClick={handleNewOrderClick}
                />
                <main className="container px-4 py-6 mx-auto">
                  <AdminLoadingPage />
                </main>
              </>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/orders"
          element={
            <ProtectedRoute>
              <>
                <Header
                  currentPage={getCurrentPage()}
                  onNavigate={handleNavigate}
                  onNewOrderClick={handleNewOrderClick}
                />
                <main className="container px-4 py-6 mx-auto">
                  <Orders />
                </main>
              </>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/analytics"
          element={
            <ProtectedRoute>
              <>
                <Header
                  currentPage={getCurrentPage()}
                  onNavigate={handleNavigate}
                  onNewOrderClick={handleNewOrderClick}
                />
                <main className="container px-4 py-6 mx-auto">
                  <AnalyticsPage />
                </main>
              </>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/management"
          element={
            <ProtectedRoute>
              <>
                <Header
                  currentPage={getCurrentPage()}
                  onNavigate={handleNavigate}
                  onNewOrderClick={handleNewOrderClick}
                />
                <main className="container px-4 py-6 mx-auto">
                  <Management />
                </main>
              </>
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
};

export default App;
