import React from "react";
import logo from "../../src/assets/images/logo.jpg";

const Header = () => {
  return (
    <header className="bg-white border-b border-black-200">
      <div className="max-w-6xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center">
              <img src={logo} className="rounded-full" alt="logo" />{" "}
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
          <div className="w-8 h-8 bg-black-100 rounded-full flex items-center justify-center">
            <span className="text-black-600 text-sm">👤</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
