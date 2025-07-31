import React, { useState } from "react";
import ProductManager from "../components/ProductManager";
import ExpenseManager from "../components/ExpenseManager";

const Management = () => {
  // Set default date range to current month
  const [dateRange] = useState(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-based (0 = January)

    // First day of current month
    const startDate = new Date(currentYear, currentMonth, 1);
    // Last day of current month
    const endDate = new Date(currentYear, currentMonth + 1, 0);

    return {
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
    };
  });

  const handleExpensesUpdate = (summary: {
    totalExpenses: number;
    expensesByType: Record<string, number>;
    monthlyExpenses: Record<string, number>;
  }) => {
    // You can use this to show a summary or update other components
    console.log("Expenses updated:", summary);
  };

  const handleCostsUpdate = (costs: Record<string, number>) => {
    // You can use this to track product cost changes
    console.log("Product costs updated:", costs);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-8 mx-auto max-w-7xl">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">
              Business Management
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Manage your products, expenses, and business operations
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-8 mx-auto max-w-7xl">
        <div className="space-y-8">
          {/* Product Management Section */}
          <div>
            <div className="mb-6">
              <h2 className="mb-2 text-xl font-semibold text-gray-900">
                Product Management
              </h2>
              <p className="text-sm text-gray-600">
                Manage your product costs, prices, and profit margins
              </p>
            </div>
            <ProductManager onCostsUpdate={handleCostsUpdate} />
          </div>

          {/* Expense Management Section */}
          <div>
            <div className="mb-6">
              <h2 className="mb-2 text-xl font-semibold text-gray-900">
                Expense Management
              </h2>
              <p className="text-sm text-gray-600">
                Track and manage your business expenses for the current month
              </p>
            </div>
            <ExpenseManager
              dateRange={dateRange}
              onExpensesUpdate={handleExpensesUpdate}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Management;
