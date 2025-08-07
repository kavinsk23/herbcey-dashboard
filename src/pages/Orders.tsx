import React, { useState, useEffect, useRef } from "react";
import FilterSection from "../components/FilterSection";
import OrderCard from "../components/OrderCard";
import OrderForm from "../components/OrderForm";
import {
  getAllOrders,
  addOrderToSheet,
  updateOrderInSheet,
  deleteOrderFromSheet,
} from "../assets/services/googleSheetsService";
import {
  updatePaymentsFromCsv,
  validateCsvFormat,
} from "../assets/services/csvPaymentService";

type StatusType =
  | "All"
  | "Preparing"
  | "Shipped"
  | "Dispatched"
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
  status:
    | "Preparing"
    | "Shipped"
    | "Dispatched"
    | "Delivered"
    | "Returned"
    | "Damaged";
  orderDate: string;
  paymentMethod: "COD" | "Bank Transfer";
  paymentReceived?: boolean;
  tracking?: string;
  freeShipping?: boolean;
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
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // OrderForm state
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [formMode, setFormMode] = useState<"create" | "update">("create");

  // CSV Upload state
  const [isUploadingCsv, setIsUploadingCsv] = useState(false);
  const [showUploadResults, setShowUploadResults] = useState(false);
  const [uploadResults, setUploadResults] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
              price: 1750,
            });
          }
          if (sheetOrder.conditionerQty > 0) {
            products.push({
              name: "Conditioner",
              quantity: sheetOrder.conditionerQty,
              price: 1850,
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

  // CSV Upload handlers
  const handleCsvUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleCsvFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingCsv(true);

      // Validate file format
      const isValidFormat = await validateCsvFormat(file);
      if (!isValidFormat) {
        alert(
          'Invalid CSV format. Please ensure the file contains "Waybill ID" and "Order ID" columns.'
        );
        return;
      }

      // Process the CSV
      const result = await updatePaymentsFromCsv(file);
      setUploadResults(result);
      setShowUploadResults(true);

      // Reload orders if any were updated
      if (result.updated > 0) {
        await loadOrdersFromSheets();
      }
    } catch (error) {
      console.error("Error processing CSV:", error);
      alert(
        `Error processing CSV: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsUploadingCsv(false);
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
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

  // Get paginated orders
  const sortedOrders = filteredOrders.sort(
    (a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()
  );

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
    <div className="container px-4 py-8 mx-auto">
      {/* Header with New Order and Upload CSV buttons */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Orders Dashboard</h1>
        <div className="flex space-x-3">
          <button
            onClick={handleCsvUploadClick}
            disabled={isUploadingCsv}
            className="flex items-center px-4 py-2 space-x-2 font-medium text-gray-700 transition-colors bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploadingCsv ? (
              <>
                <div className="w-4 h-4 border-b-2 border-gray-700 rounded-full animate-spin"></div>
                <span>Processing...</span>
              </>
            ) : (
              <>
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
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <span>Upload CSV</span>
              </>
            )}
          </button>
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
      </div>

      {/* Hidden file input for CSV upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        style={{ display: "none" }}
        onChange={handleCsvFileSelect}
      />

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
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
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

      {/* Upload Results Modal */}
      {showUploadResults && uploadResults && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                CSV Upload Results
              </h3>
            </div>

            <div className="px-6 py-4 overflow-y-auto max-h-96">
              <div className="mb-4 space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">Processed:</span>
                  <span>{uploadResults.processed} records</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-green-600">Updated:</span>
                  <span className="text-green-600">
                    {uploadResults.updated} payments
                  </span>
                </div>
                {uploadResults.errors.length > 0 && (
                  <div className="flex justify-between">
                    <span className="font-medium text-red-600">Errors:</span>
                    <span className="text-red-600">
                      {uploadResults.errors.length}
                    </span>
                  </div>
                )}
              </div>

              {/* Detailed results */}
              <div className="mt-6">
                <h4 className="mb-3 font-medium text-gray-900">Details:</h4>
                <div className="space-y-2 text-sm">
                  {uploadResults.details.map((detail: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 rounded bg-gray-50"
                    >
                      <span className="font-mono">{detail.waybillId}</span>
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            detail.status === "updated"
                              ? "bg-green-100 text-green-800"
                              : detail.status === "not_found"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {detail.status === "updated"
                            ? "Updated"
                            : detail.status === "not_found"
                            ? "Not Found"
                            : "Error"}
                        </span>
                        {detail.message && (
                          <span className="text-xs text-gray-600">
                            {detail.message}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Show errors if any */}
              {uploadResults.errors.length > 0 && (
                <div className="mt-6">
                  <h4 className="mb-3 font-medium text-red-600">Errors:</h4>
                  <div className="space-y-1 text-sm">
                    {uploadResults.errors.map(
                      (error: string, index: number) => (
                        <div
                          key={index}
                          className="p-2 text-red-800 rounded bg-red-50"
                        >
                          {error}
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => setShowUploadResults(false)}
                className="px-4 py-2 text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
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
