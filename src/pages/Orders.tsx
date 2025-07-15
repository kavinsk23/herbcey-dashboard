import React, { useState } from "react";
import OrderCard from "../components/OrderCard";

type StatusType =
  | "All"
  | "Preparing"
  | "Shipped"
  | "Delivered"
  | "Returned"
  | "Damaged";
type ProductType = "All" | "Oil" | "Shampoo" | "Conditioner";
type PaymentStatusType = "All" | "COD Paid" | "COD Unpaid" | "Bank Transfer";

const Orders = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [trackingSearch, setTrackingSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<StatusType>("All");
  const [selectedProduct, setSelectedProduct] = useState<ProductType>("All");
  const [selectedPaymentStatus, setSelectedPaymentStatus] =
    useState<PaymentStatusType>("All");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [showDateFilter, setShowDateFilter] = useState(false);

  const sampleOrders = [
    {
      name: "John Doe",
      addressLine1: "123 Main St, Colombo",
      addressLine2: "Sri Lanka",
      contact: "0761234567",
      products: [
        { name: "Oil", quantity: 2, price: 1200 },
        { name: "Shampoo", quantity: 1, price: 800 },
      ],
      status: "Preparing" as const,
      orderDate: "2023-05-15",
      paymentMethod: "COD" as const,
      paymentReceived: true,
      tracking: "LK123456789",
    },
    {
      name: "Jane Smith",
      addressLine1: "456 Ocean Ave, Galle",
      addressLine3: "Southern Province",
      contact: "0779876543",
      products: [
        { name: "Conditioner", quantity: 3, price: 950 },
        { name: "Shampoo", quantity: 2, price: 800 },
      ],
      status: "Shipped" as const,
      orderDate: "2023-05-18",
      paymentMethod: "Bank Transfer" as const,
      paymentReceived: true,
      tracking: "LK987654321",
    },
    {
      name: "David Johnson",
      addressLine1: "789 Hill St",
      addressLine2: "Kandy",
      addressLine3: "Central Province",
      contact: "0715551234",
      products: [
        { name: "Oil", quantity: 1, price: 1200 },
        { name: "Conditioner", quantity: 2, price: 950 },
      ],
      status: "Delivered" as const,
      orderDate: "2023-05-10",
      paymentMethod: "Bank Transfer" as const,
      paymentReceived: true,
      tracking: "LK456123789",
    },
    {
      name: "Maria Garcia",
      addressLine1: "321 Beach Rd",
      addressLine2: "Negombo",
      contact: "0768884567",
      products: [
        { name: "Shampoo", quantity: 1, price: 800 },
        { name: "Conditioner", quantity: 1, price: 950 },
      ],
      status: "Returned" as const,
      orderDate: "2023-05-20",
      paymentMethod: "COD" as const,
      paymentReceived: false,
      tracking: "LK789123456",
    },
    {
      name: "Raj Patel",
      addressLine1: "10 Temple Road",
      addressLine3: "Anuradhapura",
      contact: "0723334444",
      products: [{ name: "Oil", quantity: 1, price: 1200 }],
      status: "Damaged" as const,
      orderDate: "2023-06-01",
      paymentMethod: "COD" as const,
      paymentReceived: false,
      tracking: "LK111222333",
    },
  ];

  const statusColors: Record<StatusType, string> = {
    All: "bg-gray-100 text-gray-800 border-gray-200",
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
    All: "bg-gray-100 text-gray-800",
    "COD Paid": "bg-green-100 text-green-800",
    "COD Unpaid": "bg-red-100 text-red-800",
    "Bank Transfer": "bg-blue-100 text-blue-800",
  };

  const filteredOrders = sampleOrders.filter((order) => {
    const matchesGeneral =
      searchTerm === "" ||
      order.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.addressLine1.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.addressLine2?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.addressLine3?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.contact.includes(searchTerm);

    const matchesTracking =
      trackingSearch === "" ||
      order.tracking?.toLowerCase().includes(trackingSearch.toLowerCase());

    const matchesStatus =
      selectedStatus === "All" || order.status === selectedStatus;

    const matchesProduct =
      selectedProduct === "All" ||
      order.products.some((product) => product.name === selectedProduct);

    const matchesPaymentStatus =
      selectedPaymentStatus === "All" ||
      (selectedPaymentStatus === "COD Paid" &&
        order.paymentMethod === "COD" &&
        order.paymentReceived) ||
      (selectedPaymentStatus === "COD Unpaid" &&
        order.paymentMethod === "COD" &&
        !order.paymentReceived) ||
      (selectedPaymentStatus === "Bank Transfer" &&
        order.paymentMethod === "Bank Transfer");

    const orderDate = new Date(order.orderDate);
    const matchesDateRange =
      (!startDate || orderDate >= new Date(startDate)) &&
      (!endDate || orderDate <= new Date(endDate));

    return (
      matchesGeneral &&
      matchesTracking &&
      matchesStatus &&
      matchesProduct &&
      matchesPaymentStatus &&
      matchesDateRange
    );
  });

  const clearFilters = () => {
    setSearchTerm("");
    setTrackingSearch("");
    setSelectedStatus("All");
    setSelectedProduct("All");
    setSelectedPaymentStatus("All");
    setStartDate("");
    setEndDate("");
    setShowDateFilter(false);
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
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        Orders Dashboard
      </h1>

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
          Showing {filteredOrders.length} of {sampleOrders.length} orders
        </p>
        <button
          onClick={clearFilters}
          className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-lg hover:bg-gray-200 transition-colors"
        >
          Clear All
        </button>
      </div>

      <div className="space-y-4">
        {filteredOrders.map((order, index) => (
          <OrderCard key={`${order.tracking}-${index}`} order={order} />
        ))}
      </div>

      {/* No Results Message */}
      {filteredOrders.length === 0 &&
        (searchTerm ||
          trackingSearch ||
          selectedStatus !== "All" ||
          selectedProduct !== "All" ||
          selectedPaymentStatus !== "All" ||
          hasDateFilter) && (
          <div className="text-center py-8">
            <p className="text-gray-500">
              No orders found matching your search criteria.
            </p>
          </div>
        )}
    </div>
  );
};

export default Orders;
