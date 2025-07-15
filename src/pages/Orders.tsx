import React, { useState } from "react";
import OrderCard from "../components/OrderCard";
import FilterSection from "../components/FilterSection";

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

  const hasDateFilter = startDate || endDate;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        Orders Dashboard
      </h1>

      <FilterSection
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        trackingSearch={trackingSearch}
        setTrackingSearch={setTrackingSearch}
        selectedStatus={selectedStatus}
        setSelectedStatus={setSelectedStatus}
        selectedProduct={selectedProduct}
        setSelectedProduct={setSelectedProduct}
        selectedPaymentStatus={selectedPaymentStatus}
        setSelectedPaymentStatus={setSelectedPaymentStatus}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        showDateFilter={showDateFilter}
        setShowDateFilter={setShowDateFilter}
        clearFilters={clearFilters}
        filteredOrdersLength={filteredOrders.length}
        totalOrdersLength={sampleOrders.length}
      />

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
