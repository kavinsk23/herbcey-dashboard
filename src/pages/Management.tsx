import React, { useState } from "react";
import ProductManager from "../components/ProductManager";
import ExpenseManager from "../components/ExpenseManager";
import PaymentTracking from "../components/PaymentTracking";
import StockManager from "../components/StockManager";

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
      {/* Main Content */}
      <div className="pb-8 mx-auto max-w-7xl">
        <div>
          <h1 className="mb-4 text-2xl font-bold text-gray-900">
            Management Dashboard
          </h1>
        </div>
        <div className="space-y-8">
          <div>
            <StockManager products={[]} />
          </div>
          {/* Product Management Section */}
          <div>
            <ProductManager onCostsUpdate={handleCostsUpdate} />
          </div>

          {/* Expense Management Section */}
          <div>
            <ExpenseManager
              dateRange={dateRange}
              onExpensesUpdate={handleExpensesUpdate}
            />
          </div>
          {/* Payment Tracking Section */}
          <div>
            <PaymentTracking />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Management;
