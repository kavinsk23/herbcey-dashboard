import React, { useState } from "react";
import {
  formatDisplayDateTime,
  extractDateFromDateTime,
  extractDisplayTime,
  getRelativeTimeDescription,
  isToday,
  isYesterday,
} from "../utils/dateUtils";
import { updateFdeStatus } from "../assets/services/googleSheetsService";

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
    | "Transfer"
    | "Damaged";
  orderDate: string;
  paymentMethod: "COD" | "Bank Transfer";
  paymentReceived?: boolean;
  tracking?: string;
  freeShipping?: boolean;
  fdeStatus?: string; // R (17): waybill number — empty if not yet sent to FDE
}

interface OrderCardProps {
  order: Order;
  onUpdateClick?: (order: Order) => void;
}

const OrderCard: React.FC<OrderCardProps> = ({ order, onUpdateClick }) => {
  // If column R already has a waybill number, start the button in done state
  const alreadyProcessed = !!(order.fdeStatus && order.fdeStatus.trim() !== "");

  const [fdeState, setFdeState] = useState<{
    loading: boolean;
    success?: boolean;
    message?: string;
  }>({
    loading: false,
    success: alreadyProcessed ? true : undefined,
    message: alreadyProcessed ? "Done" : undefined,
  });

  const formatPhone = (phone: string) => {
    return phone.replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3");
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
    }).format(amount);
  };

  const parseContacts = (contactString: string) => {
    return contactString
      .split(/[,\s\n]+/)
      .map((c) => c.trim())
      .filter((c) => c && /^\d+$/.test(c));
  };

  const formatOrderDateTime = (dateTime: string) => {
    if (!dateTime) return "No date";
    try {
      if (isToday(dateTime)) {
        return `Today ${extractDisplayTime(dateTime)}`;
      } else if (isYesterday(dateTime)) {
        return `Yesterday ${extractDisplayTime(dateTime)}`;
      } else {
        const date = extractDateFromDateTime(dateTime);
        const time = extractDisplayTime(dateTime);
        return `${date} ${time}`;
      }
    } catch {
      return dateTime.split(" ")[0] || dateTime;
    }
  };

  const statusColors = {
    Preparing: "bg-blue-100 text-blue-800 border-blue-200",
    Packed: "bg-teal-100 text-teal-800 border-teal-200",
    Shipped: "bg-purple-100 text-purple-800 border-purple-200",
    Dispatched: "bg-indigo-100 text-indigo-800 border-indigo-200",
    Delivered: "bg-green-100 text-green-800 border-green-200",
    Return: "bg-amber-100 text-amber-800 border-amber-200",
    Damaged: "bg-red-100 text-red-800 border-red-200",
    Reschedule: "bg-orange-100 text-orange-800 border-orange-200",
    Transfer: "bg-pink-100 text-pink-800 border-pink-200",
  };

  const paymentColors = {
    COD: "bg-neutral-800 text-neutral-100",
    "Bank Transfer": "bg-black-800 text-black-100",
  };

  const productColors = {
    Oil: "bg-emerald-700 text-white",
    Shampoo: "bg-cyan-700 text-white",
    Conditioner: "bg-pink-700 text-white",
    Spray: "bg-blue-600 text-white",
    Serum: "bg-purple-700 text-white",
    Premium: "bg-amber-600 text-white",
    Castor: "bg-yellow-800 text-white",
  };

  const calculateTotal = () => {
    const subtotal = order.products.reduce(
      (sum, product) => sum + product.price * product.quantity,
      0,
    );
    return order.freeShipping ? subtotal : subtotal + 350;
  };

  const totalAmount = calculateTotal();
  const subtotal = order.products.reduce(
    (sum, product) => sum + product.price * product.quantity,
    0,
  );

  const contacts = parseContacts(order.contact);

  const handleFDE = async () => {
    // Block only if already succeeded — allow retry on failure
    if (!order.tracking || (alreadyProcessed && fdeState.success === true))
      return;

    setFdeState({ loading: true });

    try {
      const response = await fetch(
        `https://herbcey-v2.vercel.app/api/process-order/${order.tracking}`,
      );

      let data: any;
      try {
        data = await response.json();
      } catch {
        setFdeState({
          loading: false,
          success: false,
          message: "Invalid response",
        });
        return;
      }

      if (data.success) {
        // Only use the real waybill returned by FDE — never fall back to tracking ID
        const waybillNo: string = data.waybillNo || data.trackingId || "";

        // Persist to column R only if FDE returned an actual waybill number
        if (waybillNo && order.tracking) {
          updateFdeStatus(order.tracking, waybillNo).catch((err) =>
            console.error("Failed to save FDE status to sheet:", err),
          );
        }

        // Keep green permanently — successful FDE is a done state
        setFdeState({ loading: false, success: true, message: "Done" });
      } else {
        setFdeState({
          loading: false,
          success: false,
          message: data.message || "Failed",
        });
      }
    } catch (error) {
      console.error("FDE API error:", error);
      setFdeState({ loading: false, success: false, message: "Network error" });
    }
  };

  const getFDEButtonText = () => {
    if (fdeState.loading) return "Sending...";
    if (fdeState.success === true) return "✓ Success";
    if (fdeState.success === false) return "↺ Retry";
    return "FDE";
  };

  const getFDEButtonStyle = () => {
    if (fdeState.loading) return "bg-gray-400 text-white border-gray-400";
    if (fdeState.success === true)
      return "bg-green-600 text-white border-green-600";
    if (fdeState.success === false)
      return "bg-red-600 text-white border-red-600";
    return "bg-blue-600 text-white border-blue-600 hover:bg-blue-700";
  };

  // Disabled only when loading, no tracking, or already succeeded
  // Failed state stays clickable so user can retry
  const fdeDisabled =
    fdeState.loading ||
    !order.tracking ||
    (alreadyProcessed && fdeState.success === true);

  const handlePrint = () => {
    const printContent = `
  <!DOCTYPE html>
  <html>
    <head>
      <title>Order Receipt - ${order.tracking}</title>
      <style>
        @page { size: 80mm auto; margin: 0; }
        @media print { body { margin: 0; padding: 0; margin-bottom: 0.5in; } }
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
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .flex-row { display: flex; justify-content: space-between; align-items: center; margin: 1px 0; }
        .gap { height: 0.6em; line-height: 0.6em; }
        .product-line { border-bottom: 1px dotted #ccc; padding-bottom: 1px; margin-bottom: 1px; }
        .total-section { border-top: 1px solid #000; padding-top: 3px; margin-top: 3px; }
        .tracking { font-size: 13px; text-align: center; border: 1px solid #000; padding: 2px; margin: 2px 0; }
        .customer-info { background-color: #f9f9f9; padding: 3px; margin: 3px 0; border-left: 2px solid #000; }
        .total-amount { font-size: 12px; }
        .bottom-margin { height: 0.5in; width: 100%; }
      </style>
    </head>
    <body>
      <div class="gap">&nbsp;</div>
      <div class="tracking bold">TRACKING: ${order.tracking || "N/A"}</div>
      <div class="gap">&nbsp;</div>
      <div class="customer-info">
        <div class="bold">${order.name}</div>
        <div class="bold">${order.addressLine1}${order.addressLine2 ? `<br/>${order.addressLine2}` : ""}</div>
        ${order.addressLine3 ? `<div>${order.addressLine3}</div>` : ""}
        ${order.mainCity ? `<div>${order.mainCity}</div>` : ""}
        <div class="bold">${contacts.join(", ")}</div>
      </div>
      <div class="gap">&nbsp;</div>
      <div style="border-top: 1px solid #000; padding-top: 2px;">
        ${order.products
          .map(
            (product) => `
          <div class="flex-row product-line">
            <span>${product.quantity} x ${product.name}</span>
            <span>${formatCurrency(product.price * product.quantity)}</span>
          </div>`,
          )
          .join("")}
      </div>
      <div class="gap">&nbsp;</div>
      <div class="total-section">
        ${
          !order.freeShipping
            ? `<div class="flex-row"><span>Subtotal:</span><span>${formatCurrency(subtotal)}</span></div>
             <div class="flex-row"><span>Delivery:</span><span>${formatCurrency(350)}</span></div>`
            : `<div class="flex-row"><span>Subtotal:</span><span>${formatCurrency(subtotal)}</span></div>
             <div class="flex-row"><span>Delivery:</span><span>FREE</span></div>`
        }
        <div class="flex-row bold total-amount" style="border-top: 1px solid #000; padding-top: 3px; margin-top: 3px;">
          <span>TOTAL:</span>
          <span>${order.paymentMethod === "Bank Transfer" ? "0 (PAID)" : formatCurrency(totalAmount)}</span>
        </div>
        <div class="gap">&nbsp;</div>
        <div class="gap">&nbsp;</div>
        <div class="gap">&nbsp;</div>
        <div class="gap">&nbsp;</div>
      </div>
      <div class="bottom-margin">&nbsp;</div>
    </body>
  </html>`;

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

  return (
    <div className="overflow-hidden transition-shadow duration-200 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between border-b">
        <div className={`${statusColors[order.status]} px-3 py-2 flex-1`}>
          <span className="text-sm font-medium">{order.status}</span>
        </div>
        <div
          className={`${paymentColors[order.paymentMethod]} px-3 py-2 flex-1 text-center flex items-center justify-center space-x-2`}
        >
          <span className="text-sm font-medium">{order.paymentMethod}</span>
          {order.paymentMethod === "COD" && (
            <>
              {order.paymentReceived ? (
                <div className="flex items-center justify-center w-4 h-4 bg-green-500 rounded-full">
                  <svg
                    className="w-3 h-3 text-white"
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
              ) : (
                <div className="flex items-center justify-center w-4 h-4 bg-red-500 rounded-full">
                  <svg
                    className="w-3 h-3 text-white"
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
                </div>
              )}
            </>
          )}
        </div>
        <div className="flex justify-between flex-1 px-3 py-2 text-right bg-gray-100">
          <div className="flex flex-row items-center space-y-0.5">
            <span className="flex mr-2 text-sm font-medium text-gray-900">
              {order.orderDate.split(" ")[0]}
            </span>
            <span className="pb-0.5 text-xs text-gray-500">
              {order.orderDate.split(" ")[1]}
            </span>
          </div>
          {order.freeShipping && (
            <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded-full font-medium">
              Free Delivery
            </span>
          )}
          <span className="text-sm font-medium">{order.tracking || "N/A"}</span>
        </div>
      </div>

      <div className="flex justify-between w-full px-3 py-2">
        {/* Customer Info */}
        <div className="flex-shrink-0 mb-3 w-80">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-gray-900">{order.name}</h3>
            </div>
          </div>
          <div className="mt-1 space-y-1">
            <p className="text-sm text-gray-700">
              {order.addressLine1}
              {order.addressLine2 && (
                <>
                  <br />
                  {order.addressLine2}
                </>
              )}
            </p>
            {order.addressLine3 && (
              <p className="text-sm text-gray-700">{order.addressLine3}</p>
            )}
            {order.mainCity && (
              <p className="text-xs font-medium text-gray-500">
                📍 {order.mainCity}
              </p>
            )}
            <div className="space-y-0.5">
              {contacts.map((contact, index) => (
                <p key={index} className="text-sm font-medium text-indigo-600">
                  {formatPhone(contact)}
                </p>
              ))}
            </div>
          </div>
        </div>

        {/* Products Table */}
        <div className="flex-1 mx-4 mb-3">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="w-1/4 px-3 py-1 text-xs font-medium text-left text-gray-500">
                    Product
                  </th>
                  <th className="w-1/6 px-3 py-1 text-xs font-medium text-center text-gray-500">
                    Qty
                  </th>
                  <th className="w-1/4 px-3 py-1 text-xs font-medium text-right text-gray-500">
                    Price
                  </th>
                  <th className="w-1/3 px-3 py-1 text-xs font-medium text-right text-gray-500">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {order.products.map((product) => (
                  <tr key={product.name} className="border-b border-gray-100">
                    <td className="px-3 py-1">
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full ${
                          productColors[
                            product.name as keyof typeof productColors
                          ] || "bg-gray-100"
                        }`}
                      >
                        {product.name}
                      </span>
                    </td>
                    <td className="px-3 py-1 text-sm font-medium text-center">
                      x{product.quantity}
                    </td>
                    <td className="px-3 py-1 text-sm text-right">
                      {formatCurrency(product.price)}
                    </td>
                    <td className="px-3 py-1 text-sm font-medium text-right">
                      {formatCurrency(product.price * product.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-medium bg-gray-100 border-t border-gray-300">
                  <td colSpan={3} className="px-3 py-1 text-sm text-right">
                    Total:
                  </td>
                  <td className="px-3 py-1 text-sm font-bold text-right">
                    {formatCurrency(totalAmount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col items-center justify-center flex-shrink-0 gap-2">
          <button
            onClick={handleFDE}
            disabled={fdeDisabled}
            title={
              fdeState.success === true
                ? `Waybill: ${order.fdeStatus || "saved"}`
                : fdeState.success === false
                  ? fdeState.message || "Failed — click to retry"
                  : "Send to FDE"
            }
            className={`w-20 px-4 py-1 text-sm transition-colors border rounded-lg ${getFDEButtonStyle()} ${
              fdeDisabled ? "opacity-60 cursor-not-allowed" : ""
            }`}
          >
            {getFDEButtonText()}
          </button>
          <button
            onClick={handlePrint}
            className="w-20 px-4 py-1 text-sm text-gray-700 transition-colors border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Print
          </button>
          <button
            onClick={() => onUpdateClick && onUpdateClick(order)}
            className="w-20 px-4 py-1 text-sm text-white transition-colors bg-indigo-600 rounded-lg hover:bg-indigo-700"
          >
            Edit
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderCard;
