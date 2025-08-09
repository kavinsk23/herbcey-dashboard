import React from "react";

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
    | "Rescheduled"
    | "Return"
    | "Damaged";
  orderDate: string;
  paymentMethod: "COD" | "Bank Transfer";
  paymentReceived?: boolean;
  tracking?: string;
  freeShipping?: boolean;
}

interface OrderCardProps {
  order: Order;
  onUpdateClick?: (order: Order) => void;
}

const OrderCard: React.FC<OrderCardProps> = ({ order, onUpdateClick }) => {
  const formatPhone = (phone: string) => {
    return phone.replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3");
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
    }).format(amount);
  };

  // Parse multiple contact numbers
  const parseContacts = (contactString: string) => {
    return contactString
      .split(/[,\s\n]+/) // Split by comma, space, or newline
      .map((c) => c.trim())
      .filter((c) => c && /^\d+$/.test(c)); // Filter out empty strings and non-numeric
  };

  const statusColors = {
    Preparing: "bg-blue-100 text-blue-800 border-blue-200",
    Packed: "bg-teal-100 text-teal-800 border-teal-200",
    Shipped: "bg-purple-100 text-purple-800 border-purple-200",
    Dispatched: "bg-indigo-100 text-indigo-800 border-indigo-200",
    Delivered: "bg-green-100 text-green-800 border-green-200",
    Return: "bg-amber-100 text-amber-800 border-amber-200",
    Damaged: "bg-red-100 text-red-800 border-red-200",
    Rescheduled: "bg-orange-100 text-orange-800 border-orange-200",
  };

  const paymentColors = {
    COD: "bg-neutral-800 text-neutral-100",
    "Bank Transfer": "bg-black-800 text-black-100",
  };

  const productColors = {
    Oil: "bg-emerald-700 text-white",
    Shampoo: "bg-cyan-700 text-white",
    Conditioner: "bg-pink-700 text-white",
  };

  const totalAmount = order.products.reduce(
    (sum, product) => sum + product.price * product.quantity,
    0
  );

  const subtotal = order.products.reduce(
    (sum, product) => sum + product.price * product.quantity,
    0
  );

  const finalTotal = order.freeShipping ? subtotal : subtotal + 350;

  const contacts = parseContacts(order.contact);

  // Print function
  const handlePrint = () => {
    const printContent = `
  <!DOCTYPE html>
  <html>
    <head>
      <title>Order Receipt - ${order.tracking}</title>
      <style>
        @page {
          size: 80mm auto;
          margin: 0;
        }
        @media print {
          body { margin: 0; padding: 0; margin-bottom: 0.5in; }
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
      
      <div class="tracking bold">TRACKING: ${order.tracking || "N/A"}</div>
      <div class="gap">&nbsp;</div>
      
      <div class="customer-info">
        <div class="bold">${order.name}</div>
        <div class="bold">${order.addressLine1}${
      order.addressLine2 ? `<br/>${order.addressLine2}` : ""
    }</div>
        ${order.addressLine3 ? `<div>${order.addressLine3}</div>` : ""}
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
          </div>`
          )
          .join("")}
      </div>
      <div class="gap">&nbsp;</div>
      
      <div class="total-section">
        ${
          !order.freeShipping
            ? `
            <div class="flex-row">
              <span>Subtotal:</span>
              <span>${formatCurrency(subtotal)}</span>
            </div>
            <div class="flex-row">
              <span>Delivery:</span>
              <span>${formatCurrency(350)}</span>
            </div>`
            : `
            <div class="flex-row">
              <span>Subtotal:</span>
              <span>${formatCurrency(subtotal)}</span>
            </div>
            <div class="flex-row">
              <span>Delivery:</span>
              <span>FREE</span>
            </div>`
        }
        
        <div class="flex-row bold total-amount" style="border-top: 1px solid #000; padding-top: 3px; margin-top: 3px;">
          <span>TOTAL:</span>
          <span>${
            order.paymentMethod === "Bank Transfer"
              ? "0 (PAID)"
              : formatCurrency(finalTotal)
          }</span>
        </div>
        <div class="gap">&nbsp;</div>
        <div class="gap">&nbsp;</div>
        <div class="gap">&nbsp;</div>
        <div class="gap">&nbsp;</div>
      </div>
      
      <div class="bottom-margin">&nbsp;</div>
      
    </body>
  </html>
`; // Open print window
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

  return (
    <div className="overflow-hidden transition-shadow duration-200 bg-white border border-gray-200 rounded-lg shadow-sm max-h-44 hover:shadow-md">
      {/* Header with status and payment */}
      <div className="flex items-center justify-between border-b">
        <div className={`${statusColors[order.status]} px-3 py-2 flex-1`}>
          <span className="text-sm font-medium">{order.status}</span>
        </div>
        <div
          className={`${
            paymentColors[order.paymentMethod]
          } px-3 py-2 flex-1 text-center flex items-center justify-center space-x-2`}
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
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">{order.orderDate}</span>
          </div>
          {order.freeShipping && (
            <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded-full font-medium">
              Free Shipping
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
                {order.products.map((product, index) => (
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
                <tr className="font-medium bg-gray-50">
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
