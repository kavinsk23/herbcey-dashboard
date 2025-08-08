import React, { useState } from "react";

type StatusType =
  | "All"
  | "Preparing"
  | "Packed"
  | "Shipped"
  | "Dispatched"
  | "Delivered"
  | "Rescheduled"
  | "Returned"
  | "Damaged";
type ProductType = "All" | "Oil" | "Shampoo" | "Conditioner";
type PaymentStatusType = "All" | "COD Paid" | "COD Unpaid" | "Bank Transfer";

interface FilterSectionProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  trackingSearch: string;
  setTrackingSearch: (value: string) => void;
  selectedStatus: StatusType[];
  setSelectedStatus: (status: StatusType[]) => void;
  selectedProduct: ProductType[];
  setSelectedProduct: (product: ProductType[]) => void;
  selectedPaymentStatus: PaymentStatusType[];
  setSelectedPaymentStatus: (status: PaymentStatusType[]) => void;
  startDate: string;
  setStartDate: (date: string) => void;
  endDate: string;
  setEndDate: (date: string) => void;
  showDateFilter: boolean;
  setShowDateFilter: (show: boolean) => void;
  clearFilters: () => void;
  filteredOrdersLength: number;
  totalOrdersLength: number;
  // Pagination props
  itemsPerPage: number;
  setItemsPerPage: (count: number) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
}

const FilterSection: React.FC<FilterSectionProps> = ({
  searchTerm,
  setSearchTerm,
  trackingSearch,
  setTrackingSearch,
  selectedStatus,
  setSelectedStatus,
  selectedProduct,
  setSelectedProduct,
  selectedPaymentStatus,
  setSelectedPaymentStatus,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  showDateFilter,
  setShowDateFilter,
  clearFilters,
  filteredOrdersLength,
  totalOrdersLength,
  itemsPerPage,
  setItemsPerPage,
  currentPage,
  setCurrentPage,
}) => {
  // State for collapse/expand
  const [isExpanded, setIsExpanded] = useState(false);

  const statusColors: Record<StatusType, string> = {
    All: "bg-gray-700 text-white",
    Preparing: "bg-blue-100 text-blue-800 border-blue-200",
    Packed: "bg-teal-100 text-teal-800 border-teal-200",
    Shipped: "bg-purple-100 text-purple-800 border-purple-200",
    Dispatched: "bg-indigo-100 text-indigo-800 border-indigo-200",
    Delivered: "bg-green-100 text-green-800 border-green-200",
    Returned: "bg-amber-100 text-amber-800 border-amber-200",
    Damaged: "bg-red-100 text-red-800 border-red-200",
    Rescheduled: "bg-orange-100 text-orange-800 border-orange-200",
  };

  const productColors: Record<ProductType, string> = {
    All: "bg-gray-700 text-white",
    Oil: "bg-emerald-700 text-white",
    Shampoo: "bg-cyan-700 text-white",
    Conditioner: "bg-pink-700 text-white",
  };

  const paymentStatusColors: Record<PaymentStatusType, string> = {
    All: "bg-gray-700 text-white",
    "COD Paid": "bg-green-100 text-green-800",
    "COD Unpaid": "bg-red-100 text-red-800",
    "Bank Transfer": "bg-blue-100 text-blue-800",
  };

  // Quick date range presets
  const setQuickDateRange = (preset: string) => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date(now);

    switch (preset) {
      case "today":
        startDate = new Date(now);
        endDate = new Date(now);
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

    setStartDate(startDate.toISOString().split("T")[0]);
    setEndDate(endDate.toISOString().split("T")[0]);
    setCurrentPage(1); // Reset to first page when changing date range
  };

  const formatDateRange = () => {
    if (!startDate && !endDate) return "Select Date Range";
    if (startDate && !endDate) return new Date(startDate).toLocaleDateString();
    if (!startDate && endDate) return new Date(endDate).toLocaleDateString();
    if (startDate === endDate) return new Date(startDate).toLocaleDateString();
    return `${new Date(startDate).toLocaleDateString()} - ${new Date(
      endDate
    ).toLocaleDateString()}`;
  };

  const hasDateFilter = startDate || endDate;

  // Handle multiple selection for status
  const handleStatusToggle = (status: StatusType) => {
    if (status === "All") {
      setSelectedStatus(["All"]);
    } else {
      const newSelection = selectedStatus.includes(status)
        ? selectedStatus.filter((s) => s !== status)
        : [...selectedStatus.filter((s) => s !== "All"), status];

      setSelectedStatus(newSelection.length === 0 ? ["All"] : newSelection);
    }
  };

  // Handle multiple selection for product
  const handleProductToggle = (product: ProductType) => {
    if (product === "All") {
      setSelectedProduct(["All"]);
    } else {
      const newSelection = selectedProduct.includes(product)
        ? selectedProduct.filter((p) => p !== product)
        : [...selectedProduct.filter((p) => p !== "All"), product];

      setSelectedProduct(newSelection.length === 0 ? ["All"] : newSelection);
    }
  };

  // Handle multiple selection for payment status
  const handlePaymentStatusToggle = (paymentStatus: PaymentStatusType) => {
    if (paymentStatus === "All") {
      setSelectedPaymentStatus(["All"]);
    } else {
      const newSelection = selectedPaymentStatus.includes(paymentStatus)
        ? selectedPaymentStatus.filter((p) => p !== paymentStatus)
        : [...selectedPaymentStatus.filter((p) => p !== "All"), paymentStatus];

      setSelectedPaymentStatus(
        newSelection.length === 0 ? ["All"] : newSelection
      );
    }
  };

  // Calculate pagination info
  const totalPages = Math.ceil(filteredOrdersLength / itemsPerPage);
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, filteredOrdersLength);

  // Handle items per page change
  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page
  };

  // Check if any filters are active (for showing filter indicator)
  const hasActiveFilters =
    searchTerm ||
    trackingSearch ||
    !selectedStatus.includes("All") ||
    !selectedProduct.includes("All") ||
    !selectedPaymentStatus.includes("All") ||
    hasDateFilter;

  return (
    <div className="border border-gray-200 rounded-lg bg-white shadow-sm mb-2">
      {/* Header with collapse/expand button */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium"
            >
              <svg
                className={`w-5 h-5 transform transition-transform duration-200 ${
                  isExpanded ? "rotate-90" : "rotate-0"
                }`}
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
              <span>Filters & Search</span>
            </button>

            {/* Filter indicator badge */}
            {hasActiveFilters && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary text-white">
                Active
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Results summary (always visible) */}
            <p className="text-sm text-gray-600">
              {filteredOrdersLength > 0
                ? `${filteredOrdersLength} of ${totalOrdersLength}`
                : "0"}{" "}
              orders
            </p>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-lg hover:bg-gray-200 transition-colors"
              >
                Clear All
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Collapsible content */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? "max-h-screen opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="p-4 space-y-4">
          {/* Search and Date Filter - Single Line */}
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <input
                type="text"
                placeholder="Search by name, address, or contact..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
              />
            </div>

            <div className="flex-1 min-w-48">
              <input
                type="text"
                placeholder="Search by tracking number..."
                value={trackingSearch}
                onChange={(e) => setTrackingSearch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
              />
            </div>

            <div className="relative w-56">
              <button
                onClick={() => setShowDateFilter(!showDateFilter)}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm text-left ${
                  hasDateFilter
                    ? "bg-primary text-white border-primary"
                    : "bg-white text-gray-700"
                }`}
              >
                {formatDateRange()}
              </button>

              {showDateFilter && (
                <div className="absolute top-full mt-2 z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-4 w-96">
                  <div className="space-y-4">
                    {/* Custom Date Inputs */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        min={startDate}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                      />
                    </div>
                    <div className="flex justify-between pt-2">
                      <button
                        onClick={() => setShowDateFilter(false)}
                        className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => setShowDateFilter(false)}
                        className="px-3 py-1 bg-primary text-white text-sm rounded hover:bg-primary/90"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Date Range Buttons */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  className="px-3 py-1 text-xs font-medium text-gray-600 transition-colors bg-gray-100 rounded-md hover:bg-primary hover:text-white whitespace-nowrap"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Status, Product, and Payment Filter Tabs */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">
                  Status:
                </span>
                <div className="flex flex-wrap gap-1">
                  {(Object.keys(statusColors) as StatusType[]).map((status) => (
                    <button
                      key={status}
                      onClick={() => handleStatusToggle(status)}
                      className={`px-2 py-1 text-xs rounded-lg border transition-all duration-200 ${
                        selectedStatus.includes(status)
                          ? statusColors[status]
                          : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {status}
                      {selectedStatus.includes(status) &&
                        selectedStatus.length > 1 &&
                        status !== "All" && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full"></span>
                        )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">
                  Product:
                </span>
                <div className="flex flex-wrap gap-1">
                  {(Object.keys(productColors) as ProductType[]).map(
                    (product) => (
                      <button
                        key={product}
                        onClick={() => handleProductToggle(product)}
                        className={`px-2 py-1 text-xs rounded-lg transition-all duration-200 ${
                          selectedProduct.includes(product)
                            ? productColors[product]
                            : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {product}
                        {selectedProduct.includes(product) &&
                          selectedProduct.length > 1 &&
                          product !== "All" && (
                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full"></span>
                          )}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">
                  Payment:
                </span>
                <div className="flex flex-wrap gap-1">
                  {(
                    Object.keys(paymentStatusColors) as PaymentStatusType[]
                  ).map((paymentStatus) => (
                    <button
                      key={paymentStatus}
                      onClick={() => handlePaymentStatusToggle(paymentStatus)}
                      className={`px-2 py-1 text-xs rounded-lg transition-all duration-200 ${
                        selectedPaymentStatus.includes(paymentStatus)
                          ? paymentStatusColors[paymentStatus]
                          : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {paymentStatus}
                      {selectedPaymentStatus.includes(paymentStatus) &&
                        selectedPaymentStatus.length > 1 &&
                        paymentStatus !== "All" && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full"></span>
                        )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Pagination Controls */}
          <div className="flex justify-between items-center pt-4 border-t border-gray-200">
            <div className="flex items-center gap-4">
              <p className="text-sm text-gray-600">
                Showing {filteredOrdersLength > 0 ? startItem : 0}-{endItem} of{" "}
                {filteredOrdersLength} orders
              </p>

              {/* Items per page selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Show:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) =>
                    handleItemsPerPageChange(Number(e.target.value))
                  }
                  className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                </select>
                <span className="text-sm text-gray-600">per page</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  {/* Previous button */}
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ←
                  </button>

                  {/* Page numbers */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-2 py-1 text-sm border rounded ${
                          currentPage === pageNum
                            ? "bg-primary text-white border-primary"
                            : "border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  {/* Next button */}
                  <button
                    onClick={() =>
                      setCurrentPage(Math.min(totalPages, currentPage + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    →
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterSection;
