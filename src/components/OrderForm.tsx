import React, { useState, useEffect } from "react";

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

interface OrderFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (order: Order) => void;
  onDelete?: () => void;
  initialOrder?: Order | null;
  mode: "create" | "update";
}

const OrderForm: React.FC<OrderFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  initialOrder,
  mode,
}) => {
  const [formData, setFormData] = useState({
    customerInfo: "",
    status: "Preparing" as
      | "Preparing"
      | "Shipped"
      | "Delivered"
      | "Returned"
      | "Damaged",
    paymentMethod: "COD" as "COD" | "Bank Transfer",
    paymentReceived: false,
    freeShipping: false,
    products: {
      Oil: { selected: false, quantity: 1, price: 950 },
      Shampoo: { selected: false, quantity: 1, price: 1750 },
      Conditioner: { selected: false, quantity: 1, price: 1850 },
    },
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialOrder && mode === "update") {
      const productState = {
        Oil: { selected: false, quantity: 1, price: 950 },
        Shampoo: { selected: false, quantity: 1, price: 1750 },
        Conditioner: { selected: false, quantity: 1, price: 1850 },
      };

      initialOrder.products.forEach((product) => {
        if (product.name in productState) {
          productState[product.name as keyof typeof productState] = {
            selected: true,
            quantity: product.quantity,
            price: product.price,
          };
        }
      });

      const customerInfo = `${initialOrder.name}\n${initialOrder.addressLine1}\n${initialOrder.contact}`;

      setFormData({
        customerInfo,
        status: initialOrder.status,
        paymentMethod: initialOrder.paymentMethod,
        paymentReceived: initialOrder.paymentReceived || false,
        freeShipping: initialOrder.freeShipping || false,
        products: productState,
      });
    } else if (mode === "create") {
      setFormData({
        customerInfo: "",
        status: "Preparing",
        paymentMethod: "COD",
        paymentReceived: false,
        freeShipping: false,
        products: {
          Oil: { selected: false, quantity: 1, price: 950 },
          Shampoo: { selected: false, quantity: 1, price: 1750 },
          Conditioner: { selected: false, quantity: 1, price: 1850 },
        },
      });
    }
  }, [initialOrder, mode, isOpen]);

  const parseCustomerInfo = (customerInfo: string) => {
    const lines = customerInfo.split("\n").filter((line) => line.trim());
    return {
      name: lines[0] || "",
      address: lines.slice(1, -1).join("\n") || "",
      contact: lines[lines.length - 1] || "",
    };
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.customerInfo.trim()) {
      newErrors.customerInfo = "Customer information is required";
    } else {
      const { name, address, contact } = parseCustomerInfo(
        formData.customerInfo
      );
      if (!name.trim()) newErrors.customerInfo = "Name is required";
      if (!address.trim()) newErrors.customerInfo = "Address is required";
      if (!contact.trim()) newErrors.customerInfo = "Contact is required";
      if (!/^\d{10}$/.test(contact.replace(/\D/g, ""))) {
        newErrors.customerInfo = "Contact must be 10 digits";
      }
    }

    const hasSelectedProduct = Object.values(formData.products).some(
      (product) => product.selected
    );
    if (!hasSelectedProduct) {
      newErrors.products = "Please select at least one product";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const { name, address, contact } = parseCustomerInfo(
        formData.customerInfo
      );

      const selectedProducts = Object.entries(formData.products)
        .filter(([_, product]) => product.selected)
        .map(([name, product]) => ({
          name,
          quantity: product.quantity,
          price: product.price,
        }));

      const orderData: Order = {
        name,
        addressLine1: address,
        addressLine2: "",
        addressLine3: "",
        contact,
        products: selectedProducts,
        status: formData.status,
        orderDate: new Date().toISOString().split("T")[0],
        paymentMethod: formData.paymentMethod,
        paymentReceived: formData.paymentReceived,
        freeShipping: formData.freeShipping,
        tracking: initialOrder?.tracking || `LK${Date.now()}`,
      };

      await onSubmit(orderData);
      onClose();
    } catch (error) {
      console.error("Error submitting order:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;

    try {
      setIsSubmitting(true);
      await onDelete();
      onClose();
    } catch (error) {
      console.error("Error deleting order:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleProductChange = (
    productName: string,
    field: string,
    value: any
  ) => {
    setFormData((prev) => ({
      ...prev,
      products: {
        ...prev.products,
        [productName]: {
          ...prev.products[productName as keyof typeof prev.products],
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-xl w-full max-w-5xl max-h-[95vh] flex flex-col">
        {/* Fixed Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">
            {mode === "create" ? "Create New Order" : "Update Order"}
          </h2>
          <button
            onClick={onClose}
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

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 gap-6 p-5">
            {/* Left Column */}
            <div className="space-y-4">
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
                    Format: Name, Address, Contact (each on new line)
                  </div>
                  <textarea
                    value={formData.customerInfo}
                    onChange={(e) =>
                      handleInputChange("customerInfo", e.target.value)
                    }
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm ${
                      errors.customerInfo ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="John Doe&#10;123 Main Street, Colombo 01&#10;0771234567"
                    rows={3}
                    disabled={isSubmitting}
                  />
                  {errors.customerInfo && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.customerInfo}
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
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    disabled={isSubmitting}
                  >
                    <option value="Preparing">Preparing</option>
                    <option value="Shipped">Shipped</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Returned">Returned</option>
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
                        className="w-4 h-4 border-gray-300 text-primary focus:ring-primary"
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
                        className="w-4 h-4 border-gray-300 text-primary focus:ring-primary"
                        disabled={isSubmitting}
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        Bank Transfer
                      </span>
                    </label>
                  </div>
                </div>

                {formData.paymentMethod === "COD" && (
                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.paymentReceived}
                        onChange={(e) =>
                          handleInputChange("paymentReceived", e.target.checked)
                        }
                        className="w-4 h-4 border-gray-300 rounded text-primary focus:ring-primary"
                        disabled={isSubmitting}
                      />
                      <span className="text-sm text-gray-700">
                        Payment Received
                      </span>
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              {/* Products Selection */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-800">
                  Select Products
                </h3>
                {errors.products && (
                  <p className="text-sm text-red-500">{errors.products}</p>
                )}

                <div className="space-y-2">
                  {Object.entries(formData.products).map(
                    ([productName, product]) => (
                      <div
                        key={productName}
                        className={`p-3 border rounded-lg transition-all ${
                          product.selected
                            ? "border-primary bg-primary/10"
                            : "border-gray-200"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={product.selected}
                              onChange={(e) =>
                                handleProductChange(
                                  productName,
                                  "selected",
                                  e.target.checked
                                )
                              }
                              className="w-4 h-4 border-gray-300 rounded text-primary focus:ring-primary"
                              disabled={isSubmitting}
                            />
                            <div>
                              <span className="font-medium text-gray-800 text-sm">
                                {productName}
                              </span>
                              <div className="flex items-center space-x-2 mt-1">
                                <input
                                  type="number"
                                  min="0"
                                  value={product.price}
                                  onChange={(e) =>
                                    handleProductChange(
                                      productName,
                                      "price",
                                      parseInt(e.target.value) || 0
                                    )
                                  }
                                  className="w-16 px-1 py-0.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary"
                                  disabled={isSubmitting}
                                />
                                <span className="text-xs text-gray-600">
                                  LKR each
                                </span>
                              </div>
                            </div>
                          </div>

                          {product.selected && (
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
                                    parseInt(e.target.value) || 1
                                  )
                                }
                                className="w-14 px-2 py-1 text-xs text-center border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary"
                                disabled={isSubmitting}
                              />
                              <span className="text-xs font-medium text-gray-800 min-w-20">
                                ={" "}
                                {formatCurrency(
                                  product.price * product.quantity
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
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
                      className="w-4 h-4 border-gray-300 rounded text-primary focus:ring-primary"
                      disabled={isSubmitting}
                    />
                    <span className="text-sm text-gray-700">Free Shipping</span>
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

        {/* Fixed Footer with Action Buttons */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-gray-200 bg-gray-50 space-x-3">
          {mode === "update" && onDelete && (
            <button
              type="button"
              onClick={handleDelete}
              className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Deleting..." : "Delete"}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSubmitting}
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
  );
};

export default OrderForm;
