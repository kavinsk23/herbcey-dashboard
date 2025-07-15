import React from "react";

type StatusType =
  | "All"
  | "Preparing"
  | "Shipped"
  | "Delivered"
  | "Returned"
  | "Damaged";
type ProductType = "All" | "Oil" | "Shampoo" | "Conditioner";
type PaymentStatusType = "All" | "COD Paid" | "COD Unpaid" | "Bank Transfer";

interface FilterSectionProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  trackingSearch: string;
  setTrackingSearch: (value: string) => void;
  selectedStatus: StatusType;
  setSelectedStatus: (status: StatusType) => void;
  selectedProduct: ProductType;
  setSelectedProduct: (product: ProductType) => void;
  selectedPaymentStatus: PaymentStatusType;
  setSelectedPaymentStatus: (status: PaymentStatusType) => void;
  startDate: string;
  setStartDate: (date: string) => void;
  endDate: string;
  setEndDate: (date: string) => void;
  showDateFilter: boolean;
  setShowDateFilter: (show: boolean) => void;
  clearFilters: () => void;
  filteredOrdersLength: number;
  totalOrdersLength: number;
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
}) => {
  const statusColors: Record<StatusType, string> = {
    All: "bg-gray-700 text-white",
    Preparing: "bg-blue-100 text-blue-800 border-blue-200",
    Shipped: "bg-purple-100 text-purple-800 border-purple-200",
    Delivered: "bg-green-100 text-green-800 border-green-200",
    Returned: "bg-amber-100 text-amber-800 border-amber-200",
    Damaged: "bg-red-100 text-red-800 border-red-200",
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

  return (
    <div>
      {/* Search and Date Filter - Single Line */}
      <div className="flex flex-wrap gap-4 mb-4">
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
            <div className="absolute top-full mt-2 z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-4 w-80">
              <div className="space-y-3">
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

      {/* Status, Product, and Payment Filter Tabs - Same Line */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Status:</span>
          <div className="flex flex-wrap gap-1">
            {(Object.keys(statusColors) as StatusType[]).map((status) => (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={`px-2 py-1 text-xs rounded-lg border transition-all duration-200 ${
                  selectedStatus === status
                    ? statusColors[status]
                    : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Product:</span>
          <div className="flex flex-wrap gap-1">
            {(Object.keys(productColors) as ProductType[]).map((product) => (
              <button
                key={product}
                onClick={() => setSelectedProduct(product)}
                className={`px-2 py-1 text-xs rounded-lg transition-all duration-200 ${
                  selectedProduct === product
                    ? productColors[product]
                    : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50"
                }`}
              >
                {product}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Payment:</span>
          <div className="flex flex-wrap gap-1">
            {(Object.keys(paymentStatusColors) as PaymentStatusType[]).map(
              (paymentStatus) => (
                <button
                  key={paymentStatus}
                  onClick={() => setSelectedPaymentStatus(paymentStatus)}
                  className={`px-2 py-1 text-xs rounded-lg transition-all duration-200 ${
                    selectedPaymentStatus === paymentStatus
                      ? paymentStatusColors[paymentStatus]
                      : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {paymentStatus}
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Results and Clear Filters */}
      <div className="mb-4 flex justify-between items-center">
        <p className="text-sm text-gray-600">
          Showing {filteredOrdersLength} of {totalOrdersLength} orders
        </p>
        <button
          onClick={clearFilters}
          className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-lg hover:bg-gray-200 transition-colors"
        >
          Clear All
        </button>
      </div>
    </div>
  );
};

export default FilterSection;
