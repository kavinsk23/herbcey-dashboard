import React, { useState, useEffect } from "react";
import FilterSection from "../components/FilterSection";
import OrderCard from "../components/OrderCard";
import OrderForm from "../components/OrderForm";
import {
  getAllOrders,
  addOrderToSheet,
  updateOrderInSheet,
  deleteOrderFromSheet,
} from "../assets/services/googleSheetsService";

type StatusType =
  | "All"
  | "Preparing"
  | "Packed"
  | "Shipped"
  | "Dispatched"
  | "Delivered"
  | "Reschedule"
  | "Return"
  | "Transfer"
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
  status:
    | "Preparing"
    | "Packed"
    | "Shipped"
    | "Dispatched"
    | "Delivered"
    | "Reschedule"
    | "Return"
    | "Transfer"
    | "Damaged";
  orderDate: string;
  paymentMethod: "COD" | "Bank Transfer";
  paymentReceived?: boolean;
  tracking?: string;
  freeShipping?: boolean;
  lastUpdated?: string;
}

const Orders: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [trackingSearch, setTrackingSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<StatusType[]>(["All"]);
  const [selectedProduct, setSelectedProduct] = useState<ProductType[]>([
    "All",
  ]);
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<
    PaymentStatusType[]
  >(["All"]);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [showDateFilter, setShowDateFilter] = useState(false);

  // Pagination state - moved inside the component
  const [itemsPerPage, setItemsPerPage] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);

  // OrderForm state
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [formMode, setFormMode] = useState<"create" | "update">("create");

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load orders from Google Sheets on component mount
  useEffect(() => {
    loadOrdersFromSheets();
  }, []);

  const loadOrdersFromSheets = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await getAllOrders();

      if (result.success && result.data) {
        // Convert sheet data back to Order format
        const convertedOrders: Order[] = result.data.map((sheetOrder) => {
          // Parse customer info back to separate fields
          const customerLines = sheetOrder.customerInfo.split("\n");
          const name = customerLines[0] || "";
          const address = customerLines.slice(1, -1).join(", ") || "";
          const contact = customerLines[customerLines.length - 1] || "";

          // Reconstruct products array
          const products = [];
          if (sheetOrder.oilQty > 0) {
            products.push({
              name: "Oil",
              quantity: sheetOrder.oilQty,
              price: 950,
            });
          }
          if (sheetOrder.shampooQty > 0) {
            products.push({
              name: "Shampoo",
              quantity: sheetOrder.shampooQty,
              price: 1350,
            });
          }
          if (sheetOrder.conditionerQty > 0) {
            products.push({
              name: "Conditioner",
              quantity: sheetOrder.conditionerQty,
              price: 1350,
            });
          }

          return {
            name,
            addressLine1: address,
            addressLine2: "",
            addressLine3: "",
            contact,
            products,
            status: sheetOrder.orderStatus as Order["status"],
            orderDate: sheetOrder.orderDate,
            paymentMethod: sheetOrder.paymentMethod as Order["paymentMethod"],
            paymentReceived: sheetOrder.paymentReceived,
            tracking: sheetOrder.trackingId,
            freeShipping: sheetOrder.freeShipping,
            lastUpdated: sheetOrder.lastUpdated,
          };
        });

        setOrders(convertedOrders);
      } else {
        setError(result.error || "Failed to load orders");
      }
    } catch (err) {
      console.error("Error loading orders:", err);
      setError("An unexpected error occurred while loading orders");
    } finally {
      setLoading(false);
    }
  };

  // Utility function to parse date strings into comparable timestamps
  const parseOrderDate = (dateString: string): number => {
    if (!dateString) return 0;

    // Handle different date formats
    let parsedDate: Date;

    // If it's already a valid ISO string or standard format
    if (dateString.includes("T") || dateString.includes("-")) {
      parsedDate = new Date(dateString);
    } else {
      // Handle locale-specific formats like "1/8/2025, 10:30:45 AM"
      parsedDate = new Date(dateString);
    }

    // Return timestamp, or 0 if invalid
    return isNaN(parsedDate.getTime()) ? 0 : parsedDate.getTime();
  };

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
      selectedStatus.includes("All") || selectedStatus.includes(order.status);

    const matchesProduct =
      selectedProduct.includes("All") ||
      order.products.some((product) =>
        selectedProduct.includes(product.name as ProductType)
      );

    const matchesPaymentStatus =
      selectedPaymentStatus.includes("All") ||
      (selectedPaymentStatus.includes("COD Paid") &&
        order.paymentMethod === "COD" &&
        order.paymentReceived) ||
      (selectedPaymentStatus.includes("COD Unpaid") &&
        order.paymentMethod === "COD" &&
        !order.paymentReceived) ||
      (selectedPaymentStatus.includes("Bank Transfer") &&
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

  // Get paginated orders sorted by creation date - LATEST FIRST
  const sortedOrders = filteredOrders.sort((a, b) => {
    // Sort by orderDate only (most recent first)
    const aOrderTime = parseOrderDate(a.orderDate);
    const bOrderTime = parseOrderDate(b.orderDate);
    if (aOrderTime !== bOrderTime) {
      return bOrderTime - aOrderTime; // Most recent first
    }

    // If dates are same, sort by tracking ID (descending for newer tracking numbers)
    if (a.tracking && b.tracking) {
      return b.tracking.localeCompare(a.tracking);
    }

    // Final fallback: sort by name
    return a.name.localeCompare(b.name);
  });

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedOrders = sortedOrders.slice(startIndex, endIndex);

  const clearFilters = () => {
    setSearchTerm("");
    setTrackingSearch("");
    setSelectedStatus(["All"]);
    setSelectedProduct(["All"]);
    setSelectedPaymentStatus(["All"]);
    setStartDate("");
    setEndDate("");
    setShowDateFilter(false);
    setCurrentPage(1); // Reset to first page when clearing filters
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
  const handleOrderSubmit = async (orderData: Order) => {
    try {
      if (formMode === "create") {
        const result = await addOrderToSheet(orderData);

        if (result.success) {
          alert(
            `Order created successfully! Tracking ID: ${result.trackingId}`
          );
          // Reload orders from Google Sheets
          await loadOrdersFromSheets();
        } else {
          alert(`Error creating order: ${result.error}`);
        }
      } else {
        if (editingOrder?.tracking) {
          const result = await updateOrderInSheet(
            editingOrder.tracking,
            orderData
          );

          if (result.success) {
            alert("Order updated successfully!");
            // Reload orders from Google Sheets
            await loadOrdersFromSheets();
          } else {
            alert(`Error updating order: ${result.error}`);
          }
        }
      }
    } catch (error) {
      console.error("Error submitting order:", error);
      alert("An unexpected error occurred. Please try again.");
    }
  };

  const handleOrderDelete = async () => {
    if (!editingOrder?.tracking) return;

    if (
      !window.confirm(
        `Are you sure you want to delete order ${editingOrder.tracking}?`
      )
    ) {
      return;
    }

    try {
      const result = await deleteOrderFromSheet(editingOrder.tracking);

      if (result.success) {
        alert("Order deleted successfully!");
        setShowOrderForm(false);
        setEditingOrder(null);
        await loadOrdersFromSheets();
      } else {
        alert(`Error deleting order: ${result.error}`);
      }
    } catch (error) {
      console.error("Error deleting order:", error);
      alert("An unexpected error occurred while deleting the order.");
    }
  };

  const hasDateFilter = startDate || endDate;

  if (loading) {
    return (
      <div className="container px-4 py-8 mx-auto">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto border-b-2 rounded-full animate-spin border-primary"></div>
            <p className="mt-4 text-gray-600">Loading orders...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container px-4 py-8 mx-auto">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <div className="mb-4 text-xl text-red-500">⚠️</div>
            <h2 className="mb-2 text-xl font-semibold text-gray-900">
              Error Loading Orders
            </h2>
            <p className="mb-4 text-gray-600">{error}</p>
            <button
              onClick={loadOrdersFromSheets}
              className="px-4 py-2 text-white transition-colors rounded-lg bg-primary hover:bg-primary/90"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container px-4 py-8 pt-0 mx-auto">
      {/* Header with New Order Button */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Orders Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1">
            Sorted by order creation date (latest first)
          </p>
        </div>
        <button
          onClick={handleCreateOrder}
          className="flex items-center px-6 py-3 space-x-2 font-medium text-white transition-colors rounded-lg bg-primary hover:bg-primary/90"
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

      {/* Filter Section */}
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
        itemsPerPage={itemsPerPage}
        setItemsPerPage={setItemsPerPage}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
      />

      {/* Orders List with Scroll */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="h-[600px] overflow-y-auto p-4 space-y-4">
          {paginatedOrders.map((order, index) => (
            <OrderCard
              key={`${order.tracking}-${index}`}
              order={order}
              onUpdateClick={handleUpdateOrder}
            />
          ))}
        </div>
      </div>

      {/* No Results Message */}
      {filteredOrders.length === 0 &&
        (searchTerm ||
          trackingSearch ||
          !selectedStatus.includes("All") ||
          !selectedProduct.includes("All") ||
          !selectedPaymentStatus.includes("All") ||
          hasDateFilter) && (
          <div className="py-8 text-center">
            <p className="text-gray-500">
              No orders found matching your search criteria.
            </p>
          </div>
        )}

      {/* Empty state for no orders */}
      {orders.length === 0 && !loading && !error && (
        <div className="py-8 text-center">
          <div className="mb-4 text-6xl text-gray-400">📦</div>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">
            No Orders Found
          </h2>
          <p className="mb-6 text-gray-600">
            Get started by creating your first order
          </p>
          <button
            onClick={handleCreateOrder}
            className="px-6 py-3 text-white transition-colors rounded-lg bg-primary hover:bg-primary/90"
          >
            Create First Order
          </button>
        </div>
      )}

      {/* Order Form Modal */}
      <OrderForm
        isOpen={showOrderForm}
        onClose={() => setShowOrderForm(false)}
        onDelete={handleOrderDelete}
        onSubmit={handleOrderSubmit}
        initialOrder={editingOrder}
        mode={formMode}
      />
    </div>
  );
};

export default Orders;
