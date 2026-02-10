import React, { useState, useEffect, useRef } from "react";
import { getAllProductsFromSheet } from "../assets/services/productService";
import { getAllOrders } from "../assets/services/googleSheetsService";
import ConfirmationDialog from "./ConfirmationDialog";
import {
  createOrderTimestamp,
  formatDisplayDateTime,
} from "../utils/dateUtils";
import { getSheetStructure } from "../assets/services/dynamicColumnsService";
import {
  isValidPhoneNumber,
  sendOrderConfirmationSMS,
} from "../assets/services/smsService";

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
    | "Packed"
    | "Dispatched"
    | "Delivered"
    | "Reschedule"
    | "Return"
    | "Damaged"
    | "Transfer";
  orderDate: string;
  paymentMethod: "COD" | "Bank Transfer";
  paymentReceived?: boolean;
  tracking?: string;
  freeShipping?: boolean;
  lastUpdated?: string;
}

interface OrderFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (order: Order) => void;
  onDelete?: () => void;
  initialOrder?: Order | null;
  mode: "create" | "update";
}

interface ProductPrices {
  [key: string]: number;
}

const OrderForm: React.FC<OrderFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  initialOrder,
  mode,
}) => {
  const [productPrices, setProductPrices] = useState<ProductPrices>({
    Oil: 950,
    Shampoo: 1350,
    Conditioner: 1350,
  });

  const [availableProducts, setAvailableProducts] = useState<string[]>([
    "Oil",
    "Shampoo",
    "Conditioner",
  ]);

  const [formData, setFormData] = useState({
    customerInfo: "",
    trackingId: "",
    status: "Preparing" as
      | "Preparing"
      | "Shipped"
      | "Packed"
      | "Dispatched"
      | "Delivered"
      | "Reschedule"
      | "Return"
      | "Transfer"
      | "Damaged",
    paymentMethod: "COD" as "COD" | "Bank Transfer",
    paymentReceived: false,
    freeShipping: false,
    products: {} as Record<
      string,
      { selected: boolean; quantity: number; price: number }
    >,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [suggestedTrackingId, setSuggestedTrackingId] = useState<string>("");
  const [returnWarning, setReturnWarning] = useState<{
    show: boolean;
    orders: { trackingId: string; name: string; status: string }[];
  }>({ show: false, orders: [] });
  const cachedOrdersRef = useRef<
    { trackingId: string; customerInfo: string; orderStatus: string }[]
  >([]);

  // Confirmation dialog states
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Yes",
    cancelText: "Cancel",
    type: "warning" as "warning" | "danger" | "info",
    onConfirm: () => {},
  });

  // Load product prices from ProductManager
  useEffect(() => {
    const loadProductPrices = async () => {
      setLoadingProducts(true);
      try {
        // Get products from ProductManager
        const productResult = await getAllProductsFromSheet();

        // Get dynamic product columns from Orders sheet
        const sheetStructure = await getSheetStructure();

        const prices: ProductPrices = {};
        const products: string[] = [];

        // Add products from ProductManager
        if (
          productResult.success &&
          productResult.data &&
          productResult.data.length > 0
        ) {
          productResult.data.forEach((product) => {
            prices[product.name] = product.price;
            products.push(product.name);
          });
        }

        // Add products from dynamic columns (products that exist in orders)
        if (
          sheetStructure.success &&
          sheetStructure.data &&
          sheetStructure.data.productColumns
        ) {
          sheetStructure.data.productColumns.forEach((column) => {
            if (!products.includes(column.name)) {
              products.push(column.name);
              prices[column.name] = prices[column.name] || 0;
            }
          });
        }

        // Fallbacks
        if (products.length === 0) {
          const defaults = ["Oil", "Shampoo", "Conditioner"];
          const defaultPrices: ProductPrices = {
            Oil: 950,
            Shampoo: 1350,
            Conditioner: 1350,
          };
          defaults.forEach((name) => {
            prices[name] = defaultPrices[name];
            products.push(name);
          });
        }

        const preferredOrder = [
          "Oil",
          "Serum",
          "Spray",
          "Shampoo",
          "Conditioner",
          "Premium",
          "Castor",
        ];
        products.sort((a, b) => {
          const idxA = preferredOrder.indexOf(a);
          const idxB = preferredOrder.indexOf(b);
          return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
        });

        setProductPrices(prices);
        setAvailableProducts(products);
      } catch (error) {
        console.error("Failed to load product prices:", error);
      }
      setLoadingProducts(false);
    };

    // Generate suggested tracking ID for new orders
    const generateSuggestedTrackingId = () => {
      if (mode === "create") {
        // Get the last used tracking ID from localStorage or generate a default
        const lastTrackingId = localStorage.getItem("lastTrackingId");
        if (lastTrackingId && /^\d{8}$/.test(lastTrackingId)) {
          // Increment the last tracking ID by 1
          const nextId = (parseInt(lastTrackingId) + 1)
            .toString()
            .padStart(8, "0");
          setSuggestedTrackingId(nextId);
        } else {
          // Default starting tracking ID if none exists
          setSuggestedTrackingId("10000001");
        }
      }
    };

    const loadAllOrders = async () => {
      try {
        const result = await getAllOrders();
        if (result.success && result.data) {
          cachedOrdersRef.current = result.data.map((o) => ({
            trackingId: o.trackingId,
            customerInfo: o.customerInfo,
            orderStatus: o.orderStatus,
          }));
        }
      } catch (error) {
        console.error("Failed to load orders for return check:", error);
      }
    };

    if (isOpen) {
      loadProductPrices();
      generateSuggestedTrackingId();
      loadAllOrders();
    } else {
      setReturnWarning({ show: false, orders: [] });
    }
  }, [isOpen, mode]);

  // Initialize product state when prices are loaded or when initialOrder changes
  useEffect(() => {
    if (availableProducts.length > 0) {
      const productState: Record<
        string,
        { selected: boolean; quantity: number; price: number }
      > = {};

      // Initialize all available products
      availableProducts.forEach((productName) => {
        productState[productName] = {
          selected: false,
          quantity: 1,
          price: productPrices[productName] || 0,
        };
      });

      // If we're updating an existing order, set the selected products
      if (initialOrder && mode === "update") {
        initialOrder.products.forEach((product) => {
          if (product.name in productState) {
            productState[product.name] = {
              selected: true,
              quantity: product.quantity,
              price: product.price,
            };
          } else {
            // Handle case where product exists in order but not in available products
            productState[product.name] = {
              selected: true,
              quantity: product.quantity,
              price: product.price,
            };
            // Add to available products
            setAvailableProducts((prev) => [...prev, product.name]);
            setProductPrices((prev) => ({
              ...prev,
              [product.name]: product.price,
            }));
          }
        });
      }

      setFormData((prev) => ({
        ...prev,
        products: productState,
      }));
    }
  }, [availableProducts, productPrices, initialOrder, mode]);

  // Set form data when initialOrder changes or when mode changes
  useEffect(() => {
    if (
      initialOrder &&
      mode === "update" &&
      Object.keys(formData.products).length > 0
    ) {
      const addressParts = [];
      if (initialOrder.addressLine1)
        addressParts.push(initialOrder.addressLine1);
      if (initialOrder.addressLine2)
        addressParts.push(initialOrder.addressLine2);
      if (initialOrder.addressLine3)
        addressParts.push(initialOrder.addressLine3);

      const customerInfo = `${initialOrder.name}\n${addressParts.join("\n")}\n${
        initialOrder.contact
      }`;

      setFormData((prev) => ({
        ...prev,
        customerInfo,
        trackingId: initialOrder.tracking || "",
        status: initialOrder.status,
        paymentMethod: initialOrder.paymentMethod,
        paymentReceived:
          initialOrder.paymentMethod === "Bank Transfer"
            ? true
            : initialOrder.paymentReceived || false,
        freeShipping: initialOrder.freeShipping || false,
      }));
    } else if (mode === "create" && Object.keys(formData.products).length > 0) {
      setFormData((prev) => ({
        ...prev,
        customerInfo: "",
        trackingId: suggestedTrackingId, // Use suggested tracking ID
        status: "Preparing",
        paymentMethod: "COD",
        paymentReceived: false,
        freeShipping: false,
      }));
    }
  }, [initialOrder, mode, isOpen, suggestedTrackingId]);

  // Check contact number against orders with return statuses
  useEffect(() => {
    if (!formData.customerInfo.trim() || cachedOrdersRef.current.length === 0) {
      setReturnWarning({ show: false, orders: [] });
      return;
    }

    const lines = formData.customerInfo.split("\n").filter((l) => l.trim());
    if (lines.length < 2) return;

    // Contact is the last line; extract all phone numbers from it
    const contactLine = lines[lines.length - 1];
    const contacts = contactLine
      .split(/[,\s\n]+/)
      .map((c) => c.trim().replace(/\D/g, ""))
      .filter((c) => c.length >= 9);

    if (contacts.length === 0) {
      setReturnWarning({ show: false, orders: [] });
      return;
    }

    // DEBUG: Log to help troubleshoot
    const uniqueStatuses = Array.from(
      new Set(cachedOrdersRef.current.map((o) => o.orderStatus)),
    );
    console.log(
      "[Return Check] Cached orders:",
      cachedOrdersRef.current.length,
    );
    console.log("[Return Check] Unique statuses in sheet:", uniqueStatuses);
    console.log("[Return Check] Contacts extracted:", contacts);

    const matchingOrders = cachedOrdersRef.current
      .filter((order) => {
        const status = order.orderStatus?.toLowerCase().trim();
        if (
          ![
            "return complete",
            "return transfer",
            "return",
            "return pending",
          ].includes(status || "")
        )
          return false;

        // Check if any entered contact appears in this order's customerInfo
        return contacts.some((contact) => order.customerInfo.includes(contact));
      })
      .map((order) => {
        const nameFromInfo = order.customerInfo.split("\n")[0] || "Unknown";
        return {
          trackingId: order.trackingId,
          name: nameFromInfo,
          status: order.orderStatus,
        };
      });

    setReturnWarning({
      show: matchingOrders.length > 0,
      orders: matchingOrders,
    });
  }, [formData.customerInfo]);

  const parseCustomerInfo = (customerInfo: string) => {
    const lines = customerInfo.split("\n").filter((line) => line.trim());

    if (lines.length < 2) {
      return {
        name: lines[0] || "",
        addressLine1: "",
        addressLine2: "",
        contact: "",
      };
    }

    const name = lines[0];
    const contact = lines[lines.length - 1];
    const addressLines = lines.slice(1, -1);

    return {
      name,
      addressLine1: addressLines[0] || "",
      addressLine2: addressLines[1] || "",
      addressLine3: addressLines[2] || "",
      contact,
    };
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.customerInfo.trim()) {
      newErrors.customerInfo = "Customer information is required";
    } else {
      const { name, addressLine1, contact } = parseCustomerInfo(
        formData.customerInfo,
      );
      if (!name.trim()) newErrors.customerInfo = "Name is required";
      if (!addressLine1.trim())
        newErrors.customerInfo = "Address Line 1 is required";
      if (!contact.trim())
        newErrors.customerInfo = "At least one contact is required";

      if (contact.trim()) {
        const contacts = contact
          .split(/[,\s\n]+/)
          .map((c) => c.trim())
          .filter((c) => c);
        const invalidContacts = contacts.filter(
          (c) => !/^\d{10}$/.test(c.replace(/\D/g, "")),
        );
        if (invalidContacts.length > 0) {
          newErrors.customerInfo = "All contact numbers must be 10 digits";
        }
      }
    }

    if (!formData.trackingId.trim()) {
      newErrors.trackingId = "Tracking ID is required";
    } else if (!/^\d{8}$/.test(formData.trackingId.trim())) {
      newErrors.trackingId = "Tracking ID must be exactly 8 digits";
    }

    const hasSelectedProduct = Object.values(formData.products).some(
      (product) => product.selected,
    );
    if (!hasSelectedProduct) {
      newErrors.products = "Please select at least one product";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Confirmation dialog handlers
  const handleCloseConfirmation = () => {
    setConfirmDialog({
      isOpen: true,
      title: "Close Form",
      message:
        "Are you sure you want to close? Any unsaved changes will be lost.",
      confirmText: "Yes, Close",
      cancelText: "Keep Editing",
      type: "warning",
      onConfirm: () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        onClose();
      },
    });
  };

  const handleDeleteConfirmation = () => {
    if (!onDelete) return;

    setConfirmDialog({
      isOpen: true,
      title: "Delete Order",
      message:
        "Are you sure you want to delete this order? This action cannot be undone.",
      confirmText: "Yes, Delete",
      cancelText: "Cancel",
      type: "danger",
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        try {
          setIsSubmitting(true);
          await onDelete();
          onClose();
        } catch (error) {
          console.error("Error deleting order:", error);
        } finally {
          setIsSubmitting(false);
        }
      },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const { name, addressLine1, addressLine2, addressLine3, contact } =
        parseCustomerInfo(formData.customerInfo);

      const selectedProducts = Object.entries(formData.products)
        .filter(([_, product]) => product.selected)
        .map(([name, product]) => ({
          name,
          quantity: product.quantity,
          price: product.price,
        }));

      const currentTimestamp = createOrderTimestamp();

      // Localized date and time string
      const orderData: Order = {
        name,
        addressLine1,
        addressLine2,
        addressLine3,
        contact: contact,
        products: selectedProducts,
        status: formData.status,
        orderDate:
          mode === "create"
            ? currentTimestamp
            : initialOrder?.orderDate || currentTimestamp,
        paymentMethod: formData.paymentMethod,
        paymentReceived:
          formData.paymentMethod === "Bank Transfer"
            ? true
            : formData.paymentReceived,
        freeShipping: formData.freeShipping,
        tracking: formData.trackingId,
        lastUpdated: currentTimestamp, // Always update this to current time
      };

      // Submit the order
      await onSubmit(orderData);

      // ====== SEND SMS FOR NEW ORDERS ======
      if (mode === "create") {
        try {
          // Extract first phone number
          const contacts = contact
            .split(/[,\s\n]+/)
            .map((c) => c.trim())
            .filter((c) => c);

          const primaryContact = contacts[0];

          if (primaryContact && isValidPhoneNumber(primaryContact)) {
            // Calculate total
            const subtotal = selectedProducts.reduce(
              (sum, product) => sum + product.price * product.quantity,
              0,
            );

            const totalAmount = formData.freeShipping
              ? subtotal
              : subtotal + 350;

            // Send SMS
            sendOrderConfirmationSMS({
              customerName: name,
              phoneNumber: primaryContact,
              trackingId: formData.trackingId,
              products: selectedProducts,
              totalAmount: totalAmount,
              paymentMethod: formData.paymentMethod,
            })
              .then((smsResult) => {
                if (smsResult.success) {
                  console.log("✅ SMS sent to:", primaryContact);
                } else {
                  console.error("⚠️ SMS failed:", smsResult.error);
                }
              })
              .catch((error) => {
                console.error("⚠️ SMS error:", error);
              });

            console.log(`📱 SMS queued for ${primaryContact}`);
          } else {
            console.warn("⚠️ Invalid phone number, SMS not sent");
          }
        } catch (smsError) {
          console.error("Error in SMS process:", smsError);
        }
      }
      // ====== END SMS CODE ======

      // Save the tracking ID as the last used one for future suggestions
      if (mode === "create") {
        localStorage.setItem("lastTrackingId", formData.trackingId);
      }

      onClose();
    } catch (error) {
      console.error("Error submitting order:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    // For tracking ID, only allow digits and limit to 8 characters
    if (field === "trackingId") {
      value = value.replace(/\D/g, "").slice(0, 8); // Remove non-digits and limit to 8 chars
    }

    // Automatically set paymentReceived to true if payment method is Bank Transfer
    if (field === "paymentMethod" && value === "Bank Transfer") {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
        paymentReceived: true,
      }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleProductChange = (
    productName: string,
    field: string,
    value: any,
  ) => {
    setFormData((prev) => ({
      ...prev,
      products: {
        ...prev.products,
        [productName]: {
          ...prev.products[productName],
          [field]: value,
        },
      },
    }));
    if (errors.products) {
      setErrors((prev) => ({ ...prev, products: "" }));
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
    }).format(amount);
  };

  const calculateTotal = () => {
    const subtotal = Object.entries(formData.products)
      .filter(([_, product]) => product.selected)
      .reduce((sum, [name, product]) => {
        return sum + product.price * product.quantity;
      }, 0);

    return formData.freeShipping ? subtotal : subtotal + 350;
  };

  const totalAmount = calculateTotal();

  // Print function with empty lines using non-breaking spaces
  const handlePrint = () => {
    if (!formData.trackingId.trim()) {
      alert("Please enter a tracking ID before printing");
      return;
    }

    const { name, addressLine1, addressLine2, addressLine3, contact } =
      parseCustomerInfo(formData.customerInfo);

    if (!name.trim() || !addressLine1.trim()) {
      alert("Please enter complete customer information before printing");
      return;
    }

    const selectedProducts = Object.entries(formData.products).filter(
      ([_, product]) => product.selected,
    );

    if (selectedProducts.length === 0) {
      alert("Please select at least one product before printing");
      return;
    }
    const currentTimestamp = createOrderTimestamp();

    // Create print content with non-breaking space lines for gaps
    const printContent = `
  <!DOCTYPE html>
  <html>
    <head>
      <title>Order Receipt - ${formData.trackingId}</title>
      <style>
        @page {
          size: 80mm auto;
          margin: 0;
        }
        @media print {
          body { margin: 0; padding: 0; }
        }
        body {
          font-family: 'Arial', sans-serif;
          font-size: 12px;
          font-weight: normal;
          line-height: 1.3;
          margin: 0;
          padding: 2mm;
          width: 100%;
          box-sizing: border-box;
          color: #000000;
        }
        .center {
          text-align: center;
        }
        .bold {
          font-weight: bold;
        }
        .flex-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 1px 0;
        }
        .gap {
          height: 0.6em;
          line-height: 0.6em;
        }
        .product-line {
          border-bottom: 1px dotted #ccc;
          padding-bottom: 1px;
          margin-bottom: 1px;
        }
        .total-section {
          border-top: 1px solid #000;
          padding-top: 3px;
          margin-top: 3px;
        }
        .tracking {
          font-size: 13px;
          text-align: center;
          border: 1px solid #000;
          padding: 2px;
          margin: 2px 0;
        }
        .customer-info {
          background-color: #f9f9f9;
          padding: 3px;
          margin: 3px 0;
          border-left: 2px solid #000;
        }
        .total-amount {
          font-size: 12px;
        }
        .bottom-margin {
          height: 0.5in;
          width: 100%;
        }
      </style>
    </head>
    <body>
      <div class="gap">&nbsp;</div>
      
      <div class="tracking bold">TRACKING: ${formData.trackingId}</div>
      <div class="gap">&nbsp;</div>
      
      <div class="customer-info">
        <div class="bold">${name}</div>
        <div class="bold">${addressLine1}${
          addressLine2 ? `<br/>${addressLine2}` : ""
        }</div>
        ${addressLine3 ? `<div>${addressLine3}</div>` : ""}
        <div class="bold">${contact}</div>
      </div>
      <div class="gap">&nbsp;</div>
     
      <div style="border-top: 1px solid #000; padding-top: 2px;">
        ${selectedProducts
          .map(
            ([name, product]) => `
          <div class="flex-row product-line">                
            <span>${product.quantity} x ${name}</span>
            <span>${formatCurrency(product.price * product.quantity)}</span>
          </div>
        `,
          )
          .join("")}
      </div>
      <div class="gap">&nbsp;</div>
      
      <div class="total-section">
        ${
          !formData.freeShipping
            ? `
          <div class="flex-row">
            <span>Subtotal:</span>
            <span>${formatCurrency(totalAmount - 350)}</span>
          </div>
          <div class="flex-row">
            <span>Delivery:</span>
            <span>${formatCurrency(350)}</span>
          </div>
        `
            : `
          <div class="flex-row">
            <span>Subtotal:</span>
            <span>${formatCurrency(totalAmount)}</span>
          </div>
          <div class="flex-row">
            <span>Delivery:</span>
            <span>FREE</span>
          </div>
        `
        }
        
        <div class="flex-row bold total-amount" style="border-top: 1px solid #000; padding-top: 3px; margin-top: 3px;">
          <span>TOTAL:</span>
          <span>${
            formData.paymentMethod === "Bank Transfer"
              ? "0 (PAID)"
              : formatCurrency(totalAmount)
          }</span>
        </div>
        <div class="gap">&nbsp;</div>
        <div class="gap">&nbsp;</div>
        <div class="gap">&nbsp;</div>
        <div class="gap">&nbsp;</div>
      </div>
      
      <div class="gap">&nbsp;</div>
      <div class="gap">&nbsp;</div>
      <div class="gap">&nbsp;</div>
      
      <!-- 0.5 inch bottom margin before cut -->
      <div class="bottom-margin">&nbsp;</div>
      
    </body>
  </html>
`;
    // Open print window
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();

      // Auto print after content loads
      printWindow.addEventListener("load", () => {
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 250);
      });
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
        <div className="bg-white rounded-xl w-full max-w-5xl max-h-[95vh] flex flex-col">
          {/* Fixed Header */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-800">
              {mode === "create" ? "Create New Order" : "Update Order"}
            </h2>
            <button
              onClick={handleCloseConfirmation}
              className="text-gray-500 transition-colors hover:text-gray-700"
              disabled={isSubmitting}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Loading State for Products */}
          {loadingProducts && (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-b-2 rounded-full animate-spin border-primary"></div>
              <span className="ml-2 text-gray-600">Loading products...</span>
            </div>
          )}

          {/* Scrollable Content */}
          {!loadingProducts && (
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 gap-6 p-5">
                {/* Left Column */}
                <div className="space-y-2">
                  {/* Customer Information */}
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-gray-800">
                      Customer Information
                    </h3>

                    <div>
                      <label className="block mb-1 text-sm font-medium text-gray-700">
                        Customer Details *
                      </label>
                      <div className="mb-1 text-xs text-gray-500">
                        Format: Name, Address Line 1, Address Line 2 (optional),
                        Contact(s)
                      </div>
                      <textarea
                        value={formData.customerInfo}
                        onChange={(e) =>
                          handleInputChange("customerInfo", e.target.value)
                        }
                        className={`w-full px-3 py-2 border rounded-lg min-h-36 text-sm ${
                          errors.customerInfo
                            ? "border-red-500"
                            : "border-gray-300"
                        }`}
                        placeholder="John Doe&#10;123 Main Street&#10;Colombo 01&#10;0771234567 0779876543"
                        rows={5}
                        disabled={isSubmitting}
                      />
                      {errors.customerInfo && (
                        <p className="mt-1 text-xs text-red-500">
                          {errors.customerInfo}
                        </p>
                      )}
                      {returnWarning.show && (
                        <div className="p-3 mt-2 border border-red-300 rounded-lg bg-red-50">
                          <div className="flex items-start space-x-2">
                            <svg
                              className="flex-shrink-0 w-5 h-5 mt-0.5 text-red-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            <div>
                              <p className="text-sm font-semibold text-red-800">
                                Return - Previous Order Found
                              </p>
                              <p className="mt-1 text-xs text-red-700">
                                This contact has{" "}
                                {returnWarning.orders.length === 1
                                  ? "a previous order"
                                  : `${returnWarning.orders.length} previous orders`}{" "}
                                with a return status:
                              </p>
                              <ul className="mt-1 space-y-0.5">
                                {returnWarning.orders.map((order) => (
                                  <li
                                    key={order.trackingId}
                                    className="text-xs text-red-700"
                                  >
                                    Tracking: {order.trackingId} ({order.name})
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tracking Information */}
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-gray-800">
                      Tracking Information
                    </h3>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-sm font-medium text-gray-700">
                          Tracking ID *
                        </label>
                        {mode === "create" && suggestedTrackingId && (
                          <button
                            type="button"
                            onClick={() =>
                              setFormData((prev) => ({
                                ...prev,
                                trackingId: suggestedTrackingId,
                              }))
                            }
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            Use suggested: {suggestedTrackingId}
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={formData.trackingId}
                        onChange={(e) =>
                          handleInputChange("trackingId", e.target.value)
                        }
                        className={`w-full px-3 py-2 text-sm border rounded-lg ${
                          errors.trackingId
                            ? "border-red-500"
                            : "border-gray-300"
                        }`}
                        placeholder={
                          mode === "create"
                            ? suggestedTrackingId || "12345678"
                            : "12345678"
                        }
                        disabled={isSubmitting}
                      />
                      {mode === "create" && suggestedTrackingId && (
                        <div className="mt-1 text-xs text-gray-500">
                          Suggested next ID: {suggestedTrackingId} (editable)
                        </div>
                      )}
                      {errors.trackingId && (
                        <p className="mt-1 text-xs text-red-500">
                          {errors.trackingId}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Status */}
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-gray-800">
                      Order Status
                    </h3>

                    <div>
                      <label className="block mb-1 text-sm font-medium text-gray-700">
                        Status
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) =>
                          handleInputChange("status", e.target.value)
                        }
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                        disabled={isSubmitting}
                      >
                        <option value="Preparing">Preparing</option>
                        <option value="Packed">Packed</option>
                        <option value="Shipped">Shipped</option>
                        <option value="Dispatched">Dispatched</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Reschedule">Reschedule</option>
                        <option value="Return">Return</option>
                        <option value="Damaged">Damaged</option>
                      </select>
                    </div>
                  </div>

                  {/* Payment Information */}
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-gray-800">
                      Payment Information
                    </h3>

                    <div>
                      <label className="block mb-1 text-sm font-medium text-gray-700">
                        Payment Method
                      </label>
                      <div className="flex space-x-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="paymentMethod"
                            value="COD"
                            checked={formData.paymentMethod === "COD"}
                            onChange={(e) =>
                              handleInputChange("paymentMethod", e.target.value)
                            }
                            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                            disabled={isSubmitting}
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            Cash on Delivery
                          </span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="paymentMethod"
                            value="Bank Transfer"
                            checked={formData.paymentMethod === "Bank Transfer"}
                            onChange={(e) =>
                              handleInputChange("paymentMethod", e.target.value)
                            }
                            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                            disabled={isSubmitting}
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            Bank Transfer
                          </span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.paymentReceived}
                          onChange={(e) =>
                            handleInputChange(
                              "paymentReceived",
                              e.target.checked,
                            )
                          }
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          disabled={
                            isSubmitting ||
                            formData.paymentMethod === "Bank Transfer"
                          }
                        />
                        <span className="text-sm text-gray-700">
                          Payment Received
                        </span>
                        {formData.paymentMethod === "Bank Transfer" && (
                          <span className="text-xs text-gray-500">
                            (Auto-set for Bank Transfer)
                          </span>
                        )}
                      </label>
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-2">
                  {/* Products Selection */}
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-gray-800">
                      Select Products
                    </h3>
                    {errors.products && (
                      <p className="text-sm text-red-500">{errors.products}</p>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(formData.products).map(
                        ([productName, product]) => {
                          const productColorMap: Record<string, string> = {
                            Oil: "border-emerald-700 bg-emerald-50",
                            Shampoo: "border-cyan-700 bg-cyan-50",
                            Conditioner: "border-pink-700 bg-pink-50",
                            Spray: "border-blue-600 bg-blue-50",
                            Serum: "border-purple-700 bg-purple-50",
                            Premium: "border-amber-600 bg-amber-50",
                            Castor: "border-lime-700 bg-lime-50",
                          };
                          const selectedColor =
                            productColorMap[productName] ||
                            "border-primary bg-primary/10";
                          return (
                            <div
                              key={productName}
                              className={`p-3 border rounded-lg transition-all ${selectedColor} ${
                                product.selected ? "" : "opacity-70"
                              }`}
                            >
                              <div className="flex items-center space-x-3">
                                <input
                                  type="checkbox"
                                  checked={product.selected}
                                  onChange={(e) =>
                                    handleProductChange(
                                      productName,
                                      "selected",
                                      e.target.checked,
                                    )
                                  }
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                  disabled={isSubmitting}
                                />
                                <div className="flex-1 min-w-0">
                                  <span className="text-sm font-medium text-gray-800">
                                    {productName}
                                  </span>
                                  <div className="text-xs font-medium text-gray-900">
                                    {formatCurrency(product.price)}
                                  </div>
                                </div>
                              </div>

                              {product.selected && (
                                <div className="flex items-center justify-between pt-2 mt-2 border-t border-black/10">
                                  <div className="flex items-center space-x-2">
                                    <label className="text-xs text-gray-700">
                                      Qty:
                                    </label>
                                    <input
                                      type="number"
                                      min="1"
                                      max="99"
                                      value={product.quantity}
                                      onChange={(e) =>
                                        handleProductChange(
                                          productName,
                                          "quantity",
                                          parseInt(e.target.value) || 1,
                                        )
                                      }
                                      className="w-12 px-2 py-1 text-xs text-center border border-gray-300 rounded focus:outline-none focus:ring-2"
                                      disabled={isSubmitting}
                                    />
                                  </div>
                                  <span className="text-xs font-semibold text-gray-800">
                                    {formatCurrency(
                                      product.price * product.quantity,
                                    )}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        },
                      )}
                    </div>
                  </div>

                  {/* Order Summary */}
                  <div className="p-3 rounded-lg bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.freeShipping}
                          onChange={(e) =>
                            handleInputChange("freeShipping", e.target.checked)
                          }
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          disabled={isSubmitting}
                        />
                        <span className="text-sm text-gray-700">
                          Free Delivery
                        </span>
                      </label>
                      <span
                        className={
                          formData.freeShipping
                            ? "text-gray-400 line-through text-sm"
                            : "text-sm"
                        }
                      >
                        {formatCurrency(350)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-800">
                        Total Amount:
                      </span>
                      <span className="text-lg font-bold text-primary">
                        {formatCurrency(totalAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Fixed Footer with Action Buttons */}
          <div className="flex items-center justify-end px-6 py-3 space-x-3 border-t border-gray-200 bg-gray-50">
            {mode === "update" && onDelete && (
              <button
                type="button"
                onClick={handleDeleteConfirmation}
                className="px-4 py-2 mr-auto text-sm text-white transition-colors bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Deleting..." : "Delete Order"}
              </button>
            )}

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center px-4 py-2 text-sm text-gray-700 transition-colors border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting || loadingProducts}
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                />
              </svg>
              Print Receipt
            </button>

            <button
              type="button"
              onClick={handleCloseConfirmation}
              className="px-4 py-2 text-sm text-gray-700 transition-colors border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-4 py-2 text-sm text-white transition-colors rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting || loadingProducts}
            >
              {isSubmitting
                ? mode === "create"
                  ? "Creating..."
                  : "Updating..."
                : mode === "create"
                  ? "Create Order"
                  : "Update Order"}
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        type={confirmDialog.type}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() =>
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }))
        }
      />
    </>
  );
};

export default OrderForm;
