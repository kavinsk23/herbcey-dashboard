import React, { useState, useEffect } from "react";
import logoTp from "../../src/assets/images/logo-tp.png";

const AdminLoadingPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setIsLoading(false), 300);
          return 100;
        }
        return prev + Math.random() * 20;
      });
    }, 150);

    return () => clearInterval(interval);
  }, []);

  const handleMenuClick = (menuItem: string) => {
    alert(`Opening ${menuItem}...`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-sm w-full mx-4">
          <div className="w-16 h-16 mx-auto mb-6 bg-primary rounded-full flex items-center justify-center">
            <span className="text-2xl text-white">🌿</span>
          </div>
          <h1 className="text-2xl font-semibold text-black-800 mb-2">
            HerbCey Admin
          </h1>
          <p className="text-black-500 mb-8">Loading your dashboard...</p>

          <div className="w-full bg-black-100 rounded-full h-2 mb-4">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
          <p className="text-sm text-black-400">
            {Math.round(loadingProgress)}%
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black-50">
      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Welcome */}
        <div className="text-center mb-12">
          <img src={logoTp} alt="logo" className="w-52 mx-auto" />
          <h2 className="text-3xl font-semibold text-black-800 mb-3">
            Welcome Back
          </h2>
          <p className="text-black-600">Manage orders and see analytics</p>
        </div>

        {/* Menu Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* Orders */}
          <div
            onClick={() => handleMenuClick("Orders")}
            className="bg-white rounded-xl border border-black-200 p-8 cursor-pointer hover:border-primary hover:shadow-lg transition-all duration-200"
          >
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-6 h-6 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-medium text-black-800 mb-2">
                  Orders
                </h3>
                <p className="text-black-600 mb-4">
                  View and manage customer orders and order details.
                </p>
                <div className="flex items-center text-sm text-primary font-medium">
                  <span>View more</span>
                  <svg
                    className="w-4 h-4 ml-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Analytics */}
          <div
            onClick={() => handleMenuClick("Analytics")}
            className="bg-white rounded-xl border border-black-200 p-8 cursor-pointer hover:border-primary hover:shadow-lg transition-all duration-200"
          >
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-6 h-6 text-primary"
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
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-medium text-black-800 mb-2">
                  Analytics
                </h3>
                <p className="text-black-600 mb-4">
                  Track sales, inventory levels, and business performance
                </p>
                <div className="flex items-center text-sm text-primary font-medium">
                  <span>View reports</span>
                  <svg
                    className="w-4 h-4 ml-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminLoadingPage;
