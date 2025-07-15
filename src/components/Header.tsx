import React from "react";
import logo from "../../src/assets/images/logo.jpg";

interface HeaderProps {
  onNewOrderClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onNewOrderClick }) => {
  return (
    <header className="bg-white border-b border-black-200">
      <div className="max-w-6xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center">
              <img src={logo} className="rounded-full" alt="logo" />
            </div>
            <div>
              <h1
                className="text-xl font-semibold text-black-800"
                style={{ fontFamily: "Fredoka, sans-serif" }}
              >
                HerbCey
              </h1>
              <p className="text-sm text-black-500">Admin</p>
            </div>
          </div>

          {/* New Order Button and User Profile */}
          <div className="flex items-center space-x-4">
            <button
              onClick={onNewOrderClick}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center space-x-2 text-sm font-medium"
            >
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span>New Order</span>
            </button>

            <div className="w-8 h-8 bg-black-100 rounded-full flex items-center justify-center">
              <span className="text-black-600 text-sm">👤</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
