import React from "react";
import logo from "../../src/assets/images/logo.jpg";

interface HeaderProps {
  onNewOrderClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onNewOrderClick }) => {
  return (
    <header className="bg-white border-b border-black-200">
      <div className="max-w-6xl px-6 py-4 mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full">
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
              className="flex items-center px-4 py-2 space-x-2 text-sm font-medium text-white transition-colors rounded-lg bg-primary hover:bg-primary/90"
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

            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-black-100">
              <span className="text-sm text-black-600">👤</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
