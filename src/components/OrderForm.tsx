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
import {
  searchCities,
  City,
  detectCityFromAddress,
} from "../assets/services/cityService";

// Add this to declare the timeout property on window
declare global {
  interface Window {
    cityDetectionTimeout?: NodeJS.Timeout;
  }
}

interface Order {
  name: string;
  addressLine1: string;
  addressLine2?: string;
  addressLine3?: string;
  mainCity?: string;
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
    mainCity: "",
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

  // City services
  const [citySuggestions, setCitySuggestions] = useState<City[]>([]);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [isDetectingCity, setIsDetectingCity] = useState(false);
  const [cityQuery, setCityQuery] = useState("");
  const cityInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

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

  // Click outside detection for city suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        cityInputRef.current &&
        !cityInputRef.current.contains(event.target as Node)
      ) {
        setShowCitySuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (window.cityDetectionTimeout) {
        clearTimeout(window.cityDetectionTimeout);
      }
    };
  }, []);

  // City search function
  const handleCitySearch = async (query: string) => {
    setCityQuery(query);

    if (query.trim().length < 2) {
      setCitySuggestions([]);
      setShowCitySuggestions(false);
      return;
    }

    setIsLoadingCities(true);
    try {
      const result = await searchCities(query);

      if (result.success && result.data) {
        setCitySuggestions(result.data);
        setShowCitySuggestions(result.data.length > 0);
      } else {
        setCitySuggestions([]);
        setShowCitySuggestions(false);
      }
    } catch (error) {
      console.error("Error searching cities:", error);
      setCitySuggestions([]);
      setShowCitySuggestions(false);
    } finally {
      setIsLoadingCities(false);
    }
  };

  // City selection function
  const handleCitySelect = (city: City) => {
    setFormData((prev) => ({ ...prev, mainCity: city.name }));
    setCitySuggestions([]);
    setShowCitySuggestions(false);
    setCityQuery("");

    if (cityInputRef.current) {
      cityInputRef.current.focus();
    }
  };

  /**
   * Auto-detect city from address using Google Sheets data
   */
  const handleAutoDetectCity = async (address: string) => {
    if (
      !address.trim() ||
      formData.mainCity.trim() ||
      isDetectingCity ||
      mode !== "create"
    ) {
      return;
    }

    setIsDetectingCity(true);
    try {
      console.log("🔍 Auto-detecting city from address...");
      const result = await detectCityFromAddress(address);

      if (result.success && result.data) {
        const detectedCity = result.data;
        console.log(`✅ Auto-detected city: ${detectedCity.name}`);

        setFormData((prev) => ({ ...prev, mainCity: detectedCity.name }));
        setCitySuggestions([detectedCity]);
        setShowCitySuggestions(false);
      } else {
        console.log("❌ Could not auto-detect city");
      }
    } catch (error) {
      console.error("Error in auto city detection:", error);
    } finally {
      setIsDetectingCity(false);
    }
  };

  /**
   * Manual detection button handler
   */
  const handleManualDetectCity = async () => {
    if (!formData.customerInfo.trim()) {
      alert("Please enter customer address first");
      return;
    }

    setIsDetectingCity(true);
    try {
      const result = await detectCityFromAddress(formData.customerInfo);

      if (result.success && result.data) {
        const detectedCity = result.data;
        setFormData((prev) => ({ ...prev, mainCity: detectedCity.name }));

        const searchResult = await searchCities(detectedCity.name);
        if (searchResult.success && searchResult.data) {
          setCitySuggestions(searchResult.data);
          setShowCitySuggestions(true);
        }

        if (cityInputRef.current) {
          cityInputRef.current.focus();
        }

        console.log(`✅ Manually detected city: ${detectedCity.name}`);
      } else {
        alert(
          "Could not detect a city from this address. Please type manually.",
        );
      }
    } catch (error) {
      console.error("Error detecting city:", error);
      alert("Error detecting city. Please try again or type manually.");
    } finally {
      setIsDetectingCity(false);
    }
  };

  /**
   * Handle customer info change with debounced city detection
   */
  const handleCustomerInfoChange = (value: string) => {
    handleInputChange("customerInfo", value);

    if (mode === "create" && !formData.mainCity) {
      if (window.cityDetectionTimeout) {
        clearTimeout(window.cityDetectionTimeout);
      }

      window.cityDetectionTimeout = setTimeout(() => {
        handleAutoDetectCity(value);
      }, 800);
    }
  };

  // Load product prices from ProductManager
  useEffect(() => {
    const loadProductPrices = async () => {
      setLoadingProducts(true);
      try {
        const productResult = await getAllProductsFromSheet();
        const sheetStructure = await getSheetStructure();

        const prices: ProductPrices = {};
        const products: string[] = [];

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

    const generateSuggestedTrackingId = () => {
      if (mode === "create") {
        const lastTrackingId = localStorage.getItem("lastTrackingId");
        if (lastTrackingId && /^\d{8}$/.test(lastTrackingId)) {
          const nextId = (parseInt(lastTrackingId) + 1)
            .toString()
            .padStart(8, "0");
          setSuggestedTrackingId(nextId);
        } else {
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

  // Initialize product state
  useEffect(() => {
    if (availableProducts.length > 0) {
      const productState: Record<
        string,
        { selected: boolean; quantity: number; price: number }
      > = {};

      availableProducts.forEach((productName) => {
        productState[productName] = {
          selected: false,
          quantity: 1,
          price: productPrices[productName] || 0,
        };
      });

      if (initialOrder && mode === "update") {
        initialOrder.products.forEach((product) => {
          if (product.name in productState) {
            productState[product.name] = {
              selected: true,
              quantity: product.quantity,
              price: product.price,
            };
          } else {
            productState[product.name] = {
              selected: true,
              quantity: product.quantity,
              price: product.price,
            };
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

  // Set form data for update mode
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

      const customerInfo = `${initialOrder.name}\n${addressParts.join("\n")}\n${initialOrder.contact}`;
      setFormData((prev) => ({
        ...prev,
        customerInfo,
        mainCity: initialOrder.mainCity || "",
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
        mainCity: "",
        trackingId: suggestedTrackingId,
        status: "Preparing",
        paymentMethod: "COD",
        paymentReceived: false,
        freeShipping: false,
      }));
    }
  }, [
    initialOrder,
    mode,
    isOpen,
    suggestedTrackingId,
    formData.products.length,
  ]);

  // Check contact number against orders with return statuses
  useEffect(() => {
    if (!formData.customerInfo.trim() || cachedOrdersRef.current.length === 0) {
      setReturnWarning({ show: false, orders: [] });
      return;
    }

    const lines = formData.customerInfo.split("\n").filter((l) => l.trim());
    if (lines.length < 2) return;

    const contactLine = lines[lines.length - 1];
    const contacts = contactLine
      .split(/[,\s\n]+/)
      .map((c) => c.trim().replace(/\D/g, ""))
      .filter((c) => c.length >= 9);

    if (contacts.length === 0) {
      setReturnWarning({ show: false, orders: [] });
      return;
    }

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

    if (!formData.mainCity.trim()) {
      newErrors.mainCity = "Main City is required";
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

      const orderData: Order = {
        name,
        addressLine1,
        addressLine2,
        addressLine3,
        mainCity: formData.mainCity.trim(),
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
        lastUpdated: currentTimestamp,
      };

      await onSubmit(orderData);

      if (mode === "create") {
        try {
          const contacts = contact
            .split(/[,\s\n]+/)
            .map((c) => c.trim())
            .filter((c) => c);

          const primaryContact = contacts[0];

          if (primaryContact && isValidPhoneNumber(primaryContact)) {
            const subtotal = selectedProducts.reduce(
              (sum, product) => sum + product.price * product.quantity,
              0,
            );

            const totalAmount = formData.freeShipping
              ? subtotal
              : subtotal + 350;

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
          }
        } catch (smsError) {
          console.error("Error in SMS process:", smsError);
        }
      }

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
    if (field === "trackingId") {
      value = value.replace(/\D/g, "").slice(0, 8);
    }

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
        ${
          formData.mainCity.trim()
            ? `<div class="bold">${formData.mainCity.trim()}</div>`
            : ""
        }
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
      
      <div class="bottom-margin">&nbsp;</div>
      
    </body>
  </html>
`;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();

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
                <div className="space-y-4">
                  {/* Customer Information */}
                  <div className="space-y-3">
                    {returnWarning.show && (
                      <div className="p-3 border border-red-300 rounded-lg bg-red-50">
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

                    {/* Customer Details Textarea */}
                    <div>
                      <label className="block mb-1 text-sm font-medium text-gray-700">
                        Customer Details *
                      </label>
                      <textarea
                        value={formData.customerInfo}
                        onChange={(e) =>
                          handleCustomerInfoChange(e.target.value)
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
                    </div>

                    {/* Main City Input with Auto-Detection */}
                    <div className="relative">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-sm font-medium text-gray-700">
                          Main City *
                          {isDetectingCity && (
                            <span className="ml-2 text-xs text-blue-500 animate-pulse">
                              ⏳ Detecting...
                            </span>
                          )}
                        </label>
                        {mode === "create" && (
                          <button
                            type="button"
                            onClick={handleManualDetectCity}
                            disabled={
                              isDetectingCity || !formData.customerInfo.trim()
                            }
                            className={`text-xs flex items-center ${
                              isDetectingCity || !formData.customerInfo.trim()
                                ? "text-gray-400 cursor-not-allowed"
                                : "text-blue-600 hover:text-blue-800"
                            }`}
                          >
                            <svg
                              className={`w-3 h-3 mr-1 ${isDetectingCity ? "animate-spin" : ""}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                            </svg>
                            {isDetectingCity ? "Detecting..." : "Detect City"}
                          </button>
                        )}
                      </div>

                      <div className="relative">
                        <input
                          ref={cityInputRef}
                          type="text"
                          value={formData.mainCity}
                          onChange={(e) => {
                            const value = e.target.value;
                            setFormData((prev) => ({
                              ...prev,
                              mainCity: value,
                            }));
                            handleCitySearch(value);
                            if (errors.mainCity) {
                              setErrors((prev) => ({ ...prev, mainCity: "" }));
                            }
                          }}
                          onFocus={() => {
                            if (
                              formData.mainCity.length >= 2 &&
                              citySuggestions.length > 0
                            ) {
                              setShowCitySuggestions(true);
                            }
                          }}
                          className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            errors.mainCity
                              ? "border-red-500"
                              : formData.mainCity && !isDetectingCity
                                ? "border-green-300 bg-green-50"
                                : isDetectingCity
                                  ? "border-blue-300 bg-blue-50"
                                  : "border-gray-300"
                          }`}
                          placeholder={
                            isDetectingCity
                              ? "Detecting city from address..."
                              : "City will auto-detect from address"
                          }
                          disabled={isSubmitting || isDetectingCity}
                          autoComplete="off"
                        />

                        {formData.mainCity && !isDetectingCity && (
                          <div className="absolute right-3 top-2.5">
                            <svg
                              className="w-4 h-4 text-green-500"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </div>
                        )}

                        {isDetectingCity && (
                          <div className="absolute right-3 top-2.5">
                            <div className="w-4 h-4 border-2 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
                          </div>
                        )}
                      </div>

                      {errors.mainCity && (
                        <p className="mt-1 text-xs text-red-500">
                          {errors.mainCity}
                        </p>
                      )}

                      {/* Loading indicator for city search */}
                      {isLoadingCities && !isDetectingCity && (
                        <div className="absolute right-3 top-8">
                          <div className="w-4 h-4 border-b-2 rounded-full animate-spin border-primary"></div>
                        </div>
                      )}

                      {/* City Suggestions Dropdown */}
                      {showCitySuggestions && citySuggestions.length > 0 && (
                        <div
                          ref={suggestionsRef}
                          className="absolute z-50 w-full mt-1 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg max-h-80"
                        >
                          {citySuggestions.map((city, index) => (
                            <div
                              key={city.city_id || `${city.name}-${index}`}
                              onClick={() => handleCitySelect(city)}
                              className="px-3 py-2 border-b border-gray-100 cursor-pointer hover:bg-blue-50 last:border-b-0"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium text-gray-900">
                                    {city.name}
                                  </div>
                                  <div className="text-xs text-gray-600">
                                    {city.district_name && (
                                      <span className="mr-2">
                                        📍 {city.district_name}
                                      </span>
                                    )}
                                    {city.zone_name && (
                                      <span className="text-blue-600">
                                        🏷️ {city.zone_name}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {city.city_id && (
                                  <div className="text-xs text-gray-400">
                                    ID: {city.city_id}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tracking Information */}
                  <div className="space-y-3">
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
