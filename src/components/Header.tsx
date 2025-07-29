import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import logo from "../../src/assets/images/logo.jpg";

interface HeaderProps {
  onNewOrderClick?: () => void;
  currentPage?: "orders" | "analytics" | "management";
  onNavigate?: (page: "orders" | "analytics" | "management") => void;
}

const Header: React.FC<HeaderProps> = ({
  onNewOrderClick,
  currentPage = "orders",
  onNavigate,
}) => {
  const { userName, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-6xl px-6 py-4 mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full">
              <img src={logo} className="rounded-full" alt="logo" />
            </div>
            <div>
              <h1
                className="text-xl font-semibold text-gray-800"
                style={{ fontFamily: "Fredoka, sans-serif" }}
              >
                HerbCey
              </h1>
              <p className="text-sm text-gray-500">Admin</p>
            </div>
          </div>

          {/* Quick Navigation */}
          <div className="flex items-center space-x-1">
            <button
              onClick={() => onNavigate?.("orders")}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                currentPage === "orders"
                  ? "bg-primary text-white"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              <div className="flex items-center space-x-2">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                  />
                </svg>
                <span>Orders</span>
              </div>
            </button>

            <button
              onClick={() => onNavigate?.("management")}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                currentPage === "management"
                  ? "bg-primary text-white"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              <div className="flex items-center space-x-2">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
                <span>Management</span>
              </div>
            </button>

            <button
              onClick={() => onNavigate?.("analytics")}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                currentPage === "analytics"
                  ? "bg-primary text-white"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              <div className="flex items-center space-x-2">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                <span>Analytics</span>
              </div>
            </button>
          </div>

          {/* User Profile with Auth */}
          <div className="flex items-center space-x-4">
            {/* User Name */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">{userName}</span>
            </div>

            {/* User Avatar with Logout */}
            <div className="relative group">
              <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full cursor-pointer">
                <span className="text-sm text-gray-600">👤</span>
              </div>

              {/* Logout Dropdown */}
              <div className="absolute right-0 z-10 hidden w-32 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg group-hover:block">
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 rounded-lg hover:bg-red-50 hover:text-red-600"
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
