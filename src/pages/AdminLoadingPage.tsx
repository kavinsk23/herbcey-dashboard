import React from "react";
import { useNavigate } from "react-router-dom";
import logoTp from "../../src/assets/images/logo-tp.png";

const AdminLoadingPage = () => {
  const navigate = useNavigate();

  const handleMenuClick = (menuItem: "orders" | "analytics" | "management") => {
    navigate(`/admin/${menuItem}`);
  };

  return (
    <div className="min-h-screen bg-black-50">
      {/* Main Content */}
      <main className="max-w-6xl px-6 py-12 mx-auto">
        {/* Welcome */}
        <div className="mb-12 text-center">
          <img src={logoTp} alt="logo" className="mx-auto w-52" />
          <h2 className="mb-3 text-3xl font-semibold text-black-800">
            Welcome Back
          </h2>
          <p className="text-black-600">
            Manage orders, products, and see analytics
          </p>
        </div>

        {/* Menu Cards */}
        <div className="grid grid-cols-1 gap-6 mb-12 md:grid-cols-3">
          {/* Orders Card */}
          <div
            onClick={() => handleMenuClick("orders")}
            className="p-8 transition-all duration-200 bg-white border cursor-pointer rounded-xl border-black-200 hover:border-primary hover:shadow-lg group"
          >
            <div className="flex items-start space-x-4">
              <div className="flex items-center justify-center flex-shrink-0 w-12 h-12 transition-colors rounded-lg bg-primary/10 group-hover:bg-primary/20">
                <svg
                  className="w-6 h-6 text-primary group-hover:text-primary-dark"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
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
                <h3 className="mb-2 text-xl font-medium transition-colors text-black-800 group-hover:text-primary">
                  Orders
                </h3>
                <p className="mb-4 text-black-600">
                  View and manage customer orders and order details.
                </p>
                <div className="flex items-center text-sm font-medium transition-colors text-primary group-hover:text-primary-dark">
                  <span>View more</span>
                  <svg
                    className="w-4 h-4 ml-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
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

          {/* Products Card */}
          <div
            onClick={() => handleMenuClick("management")}
            className="p-8 transition-all duration-200 bg-white border cursor-pointer rounded-xl border-black-200 hover:border-primary hover:shadow-lg group"
          >
            <div className="flex items-start space-x-4">
              <div className="flex items-center justify-center flex-shrink-0 w-12 h-12 transition-colors rounded-lg bg-primary/10 group-hover:bg-primary/20">
                <svg
                  className="w-6 h-6 text-primary group-hover:text-primary-dark"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="mb-2 text-xl font-medium transition-colors text-black-800 group-hover:text-primary">
                  Products
                </h3>
                <p className="mb-4 text-black-600">
                  Manage product costs, prices, and profit margins.
                </p>
                <div className="flex items-center text-sm font-medium transition-colors text-primary group-hover:text-primary-dark">
                  <span>Manage products</span>
                  <svg
                    className="w-4 h-4 ml-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
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

          {/* Analytics Card */}
          <div
            onClick={() => handleMenuClick("analytics")}
            className="p-8 transition-all duration-200 bg-white border cursor-pointer rounded-xl border-black-200 hover:border-primary hover:shadow-lg group"
          >
            <div className="flex items-start space-x-4">
              <div className="flex items-center justify-center flex-shrink-0 w-12 h-12 transition-colors rounded-lg bg-primary/10 group-hover:bg-primary/20">
                <svg
                  className="w-6 h-6 text-primary group-hover:text-primary-dark"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
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
                <h3 className="mb-2 text-xl font-medium transition-colors text-black-800 group-hover:text-primary">
                  Analytics
                </h3>
                <p className="mb-4 text-black-600">
                  Track sales, inventory levels, and business performance
                </p>
                <div className="flex items-center text-sm font-medium transition-colors text-primary group-hover:text-primary-dark">
                  <span>View reports</span>
                  <svg
                    className="w-4 h-4 ml-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
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
