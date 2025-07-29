// AnalyticsFilters.tsx
import React from "react";

interface AnalyticsFiltersProps {
  timePeriod: "daily" | "monthly" | "yearly";
  selectedProduct: string; // Changed from union type to string
  selectedMetric: "revenue" | "orders" | "both";
  dateRange: {
    startDate: string;
    endDate: string;
  };
  availableProducts?: string[]; // Added this prop
  onTimePeriodChange: (period: "daily" | "monthly" | "yearly") => void;
  onProductChange: (product: string) => void; // Changed from union type to string
  onMetricChange: (metric: "revenue" | "orders" | "both") => void;
  onDateRangeChange: (dateRange: {
    startDate: string;
    endDate: string;
  }) => void;
}

const AnalyticsFilters: React.FC<AnalyticsFiltersProps> = ({
  timePeriod,
  selectedProduct,
  selectedMetric,
  dateRange,
  availableProducts = ["all", "Oil", "Shampoo", "Conditioner"], // Default fallback
  onTimePeriodChange,
  onProductChange,
  onMetricChange,
  onDateRangeChange,
}) => {
  const handleStartDateChange = (value: string) => {
    onDateRangeChange({
      ...dateRange,
      startDate: value,
    });
  };

  const handleEndDateChange = (value: string) => {
    onDateRangeChange({
      ...dateRange,
      endDate: value,
    });
  };

  // Quick date range presets
  const setQuickDateRange = (preset: string) => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date(now);

    switch (preset) {
      case "today":
        startDate = new Date(now);
        break;
      case "yesterday":
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 1);
        endDate = new Date(startDate);
        break;
      case "last7days":
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case "last30days":
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 30);
        break;
      case "thisMonth":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case "lastMonth":
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case "thisYear":
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
      case "lastYear":
        startDate = new Date(now.getFullYear() - 1, 0, 1);
        endDate = new Date(now.getFullYear() - 1, 11, 31);
        break;
      default:
        return;
    }

    onDateRangeChange({
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Analytics Filters
            </h3>
            <p className="text-sm text-gray-500">
              Customize your analytics view with filters and date ranges
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                onTimePeriodChange("monthly");
                onProductChange("all");
                onMetricChange("both");
                setQuickDateRange("thisMonth");
              }}
              className="px-3 py-1 text-xs font-medium text-gray-600 transition-colors bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Quick Date Range Buttons */}
        <div className="mb-6">
          <label className="block mb-2 text-sm font-medium text-gray-700">
            Quick Date Ranges
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Today", value: "today" },
              { label: "Yesterday", value: "yesterday" },
              { label: "Last 7 days", value: "last7days" },
              { label: "Last 30 days", value: "last30days" },
              { label: "This Month", value: "thisMonth" },
              { label: "Last Month", value: "lastMonth" },
              { label: "This Year", value: "thisYear" },
              { label: "Last Year", value: "lastYear" },
            ].map((preset) => (
              <button
                key={preset.value}
                onClick={() => setQuickDateRange(preset.value)}
                className="px-3 py-1 text-xs font-medium text-gray-600 transition-colors bg-gray-100 rounded-md hover:bg-primary hover:text-white"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Filters Grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          {/* Time Period Filter */}
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">
              Time Period
            </label>
            <select
              value={timePeriod}
              onChange={(e) =>
                onTimePeriodChange(
                  e.target.value as "daily" | "monthly" | "yearly"
                )
              }
              className="w-full px-3 py-2 transition-colors border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="daily">Daily</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>

          {/* Product Filter - UPDATED */}
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">
              Product Filter
            </label>
            <select
              value={selectedProduct}
              onChange={(e) => onProductChange(e.target.value)} // Removed type assertion
              className="w-full px-3 py-2 transition-colors border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              {availableProducts.map((product) => (
                <option key={product} value={product}>
                  {product === "all" ? "All Products" : product}
                </option>
              ))}
            </select>
          </div>

          {/* Metric View Filter */}
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">
              Metric View
            </label>
            <select
              value={selectedMetric}
              onChange={(e) =>
                onMetricChange(e.target.value as "revenue" | "orders" | "both")
              }
              className="w-full px-3 py-2 transition-colors border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="both">Revenue & Orders</option>
              <option value="revenue">Revenue Only</option>
              <option value="orders">Orders Only</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">
              Start Date
            </label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              className="w-full px-3 py-2 transition-colors border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">
              End Date
            </label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => handleEndDateChange(e.target.value)}
              className="w-full px-3 py-2 transition-colors border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsFilters;
