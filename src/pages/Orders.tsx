import React, { useState } from "react";
import OrderCard from "../components/OrderCard";
import OrderForm from "../components/OrderForm";
import FilterSection from "../components/FilterSection";

// Mock data for demonstration
const mockOrders = [
  {
    name: "John Doe",
    addressLine1: "123 Main St, Colombo",
    addressLine2: "Sri Lanka",
    addressLine3: "",
    contact: "0761234567",
    products: [
      { name: "Oil", quantity: 2, price: 950 },
      { name: "Shampoo", quantity: 1, price: 1750 },
    ],
    status: "Preparing" as const,
    orderDate: "2023-05-15",
    paymentMethod: "COD" as const,
    paymentReceived: true,
    tracking: "LK123456789",
    freeShipping: false,
  },
  {
    name: "Jane Smith",
    addressLine1: "456 Ocean Ave, Galle",
    addressLine2: "",
    addressLine3: "Southern Province",
    contact: "0779876543",
    products: [
      { name: "Conditioner", quantity: 3, price: 1850 },
      { name: "Shampoo", quantity: 2, price: 1750 },
    ],
    status: "Shipped" as const,
    orderDate: "2023-05-18",
    paymentMethod: "Bank Transfer" as const,
    paymentReceived: true,
    tracking: "LK987654321",
    freeShipping: true,
  },
  {
    name: "David Johnson",
    addressLine1: "789 Hill St",
    addressLine2: "Kandy",
    addressLine3: "Central Province",
    contact: "0715551234",
    products: [
      { name: "Oil", quantity: 1, price: 950 },
      { name: "Conditioner", quantity: 2, price: 1850 },
    ],
    status: "Delivered" as const,
    orderDate: "2023-05-10",
    paymentMethod: "Bank Transfer" as const,
    paymentReceived: true,
    tracking: "LK456123789",
    freeShipping: false,
  },
  {
    name: "Maria Garcia",
    addressLine1: "321 Beach Rd",
    addressLine2: "Negombo",
    addressLine3: "",
    contact: "0768884567",
    products: [
      { name: "Shampoo", quantity: 1, price: 1750 },
      { name: "Conditioner", quantity: 1, price: 1850 },
    ],
    status: "Returned" as const,
    orderDate: "2023-05-20",
    paymentMethod: "COD" as const,
    paymentReceived: false,
    tracking: "LK789123456",
    freeShipping: true,
  },
  {
    name: "Raj Patel",
    addressLine1: "10 Temple Road",
    addressLine2: "",
    addressLine3: "Anuradhapura",
    contact: "0723334444",
    products: [{ name: "Oil", quantity: 1, price: 950 }],
    status: "Damaged" as const,
    orderDate: "2023-06-01",
    paymentMethod: "COD" as const,
    paymentReceived: false,
    tracking: "LK111222333",
    freeShipping: false,
  },
];

type StatusType =
  | "All"
  | "Preparing"
  | "Shipped"
  | "Delivered"
  | "Returned"
  | "Damaged";
type ProductType = "All" | "Oil" | "Shampoo" | "Conditioner";
type PaymentStatusType = "All" | "COD Paid" | "COD Unpaid" | "Bank Transfer";

interface Order {
  name: string;
  addressLine1: string;
  addressLine2?: string;
  addressLine3?: string;
  contact: string;
  products: {
    name: string;
    quantity: number;
    price: number;
  }[];
  status: "Preparing" | "Shipped" | "Delivered" | "Returned" | "Damaged";
  orderDate: string;
  paymentMethod: "COD" | "Bank Transfer";
  paymentReceived?: boolean;
  tracking?: string;
  freeShipping?: boolean;
}

const Orders: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [trackingSearch, setTrackingSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<StatusType>("All");
  const [selectedProduct, setSelectedProduct] = useState<ProductType>("All");
  const [selectedPaymentStatus, setSelectedPaymentStatus] =
    useState<PaymentStatusType>("All");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [showDateFilter, setShowDateFilter] = useState(false);

  // OrderForm state
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [formMode, setFormMode] = useState<"create" | "update">("create");

  const [orders, setOrders] = useState<Order[]>(mockOrders);

  const filteredOrders = orders.filter((order) => {
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

  // Handle creating new order
  const handleCreateOrder = () => {
    setFormMode("create");
    setEditingOrder(null);
    setShowOrderForm(true);
  };

  // Handle updating existing order
  const handleUpdateOrder = (order: Order) => {
    setFormMode("update");
    setEditingOrder(order);
    setShowOrderForm(true);
  };

  // Handle form submission
  const handleOrderSubmit = (orderData: Order) => {
    if (formMode === "create") {
      // Add new order to the list
      setOrders((prev) => [...prev, orderData]);
      console.log("Creating order:", orderData);
    } else {
      // Update existing order
      setOrders((prev) =>
        prev.map((order) =>
          order.tracking === editingOrder?.tracking ? orderData : order
        )
      );
      console.log("Updating order:", orderData);
    }
  };

  const hasDateFilter = startDate || endDate;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header with New Order Button */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Orders Dashboard</h1>
        <button
          onClick={handleCreateOrder}
          className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center space-x-2 font-medium"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          <span>New Order</span>
        </button>
      </div>

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
        totalOrdersLength={orders.length}
      />

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.map((order, index) => (
          <OrderCard
            key={`${order.tracking}-${index}`}
            order={order}
            onUpdateClick={handleUpdateOrder}
          />
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

      {/* Order Form Modal */}
      <OrderForm
        isOpen={showOrderForm}
        onClose={() => setShowOrderForm(false)}
        onSubmit={handleOrderSubmit}
        initialOrder={editingOrder}
        mode={formMode}
      />
    </div>
  );
};

export default Orders;
