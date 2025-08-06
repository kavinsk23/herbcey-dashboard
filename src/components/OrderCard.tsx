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
    Shipped: "bg-purple-100 text-purple-800 border-purple-200",
    Dispatched: "bg-indigo-100 text-indigo-800 border-indigo-200",
    Delivered: "bg-green-100 text-green-800 border-green-200",
    Returned: "bg-amber-100 text-amber-800 border-amber-200",
    Damaged: "bg-red-100 text-red-800 border-red-200",
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

  // ESC/POS Auto-cut commands based on Xprinter documentation
  const CUT_COMMANDS = {
    FULL_CUT: "\x1B\x64\x00", // ESC d 0 - Full cut
    PARTIAL_CUT: "\x1B\x64\x01", // ESC d 1 - Partial cut
    FULL_CUT_ALT: "\x1D\x56\x00", // GS V 0 - Full cut (alternative)
    PARTIAL_CUT_ALT: "\x1D\x56\x01", // GS V 1 - Partial cut (alternative)
    FEED_AND_CUT: "\x1B\x64\x03", // ESC d 3 - Feed to cut position then cut
    INITIALIZE: "\x1B\x40", // ESC @ - Initialize printer
    LINE_FEED: "\x0A", // LF - Line feed
  };

  // Send raw ESC/POS commands to printer
  const sendRawCommand = async (command: string) => {
    try {
      // Method 1: Web Serial API (Chrome/Edge)
      if ("serial" in navigator) {
        const port = await (navigator as any).serial.requestPort();
        await port.open({ baudRate: 9600 });
        const writer = port.writable.getWriter();
        const encoder = new TextEncoder();
        await writer.write(encoder.encode(command));
        writer.releaseLock();
        await port.close();
        return true;
      }

      // Method 2: Electron IPC (if available)
      if (window.electronAPI?.sendToPrinter) {
        window.electronAPI.sendToPrinter(command);
        return true;
      }

      // Method 3: Raw printer helper (Windows)
      if (window.rawPrinterHelper?.sendRaw) {
        window.rawPrinterHelper.sendRaw(command);
        return true;
      }

      console.warn("No direct printer communication method available");
      return false;
    } catch (error) {
      console.error("Failed to send raw command:", error);
      return false;
    }
  };

  // Manual cut commands
  const handleFullCut = () => sendRawCommand(CUT_COMMANDS.FULL_CUT);
  const handlePartialCut = () => sendRawCommand(CUT_COMMANDS.PARTIAL_CUT);
  const handleFeedAndCut = () => sendRawCommand(CUT_COMMANDS.FEED_AND_CUT);

  // Print without auto-cut
  const handlePrintOnly = () => {
    const printContent = createPrintContent(false);
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

  // Print with auto-cut
  const handlePrintWithCut = () => {
    const printContent = createPrintContent(true);
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.addEventListener("load", () => {
        setTimeout(async () => {
          printWindow.print();
          // Wait for print to complete, then send cut command
          setTimeout(async () => {
            await sendRawCommand(CUT_COMMANDS.FULL_CUT);
            printWindow.close();
          }, 1000);
        }, 250);
      });
    }
  };

  // Direct ESC/POS printing with embedded cut command
  const handleDirectPrint = async () => {
    const receiptData = `${CUT_COMMANDS.INITIALIZE}
Tracking: ${order.tracking || "N/A"}

${order.name}
${order.addressLine1}
${order.addressLine2 || ""}
${order.addressLine3 || ""}
${contacts.join(", ")}

${order.products
  .map(
    (product) =>
      `${product.quantity} x ${product.name.padEnd(15)} ${formatCurrency(
        product.price * product.quantity
      ).padStart(10)}`
  )
  .join("\n")}

${
  !order.freeShipping
    ? `Subtotal: ${formatCurrency(subtotal).padStart(20)}
Delivery: ${formatCurrency(350).padStart(20)}`
    : `Subtotal: ${formatCurrency(subtotal).padStart(20)}
Shipping: ${"FREE".padStart(20)}`
}

Total: ${formatCurrency(finalTotal).padStart(25)}

${CUT_COMMANDS.LINE_FEED}${CUT_COMMANDS.LINE_FEED}${CUT_COMMANDS.LINE_FEED}${
      CUT_COMMANDS.FULL_CUT
    }`;

    const success = await sendRawCommand(receiptData);
    if (!success) {
      // Fallback to regular print
      handlePrintWithCut();
    }
  };

  // Create print content helper
  const createPrintContent = (includeCut: boolean) => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Order Receipt - ${order.tracking}</title>
          <meta charset="UTF-8">
          <style>
            @page {
              size: 80mm auto;
              margin: 0;
            }
            @media print {
              body { margin: 0; padding: 0; }
              .cut-command { display: none; }
            }
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              font-weight: normal;
              line-height: 1.2;
              margin: 0;
              padding: 2mm;
              width: 100%;
              box-sizing: border-box;
              color: #000000;
            }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .flex-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .gap { height: 1em; line-height: 1em; }
            .cut-command {
              position: absolute;
              left: -9999px;
              visibility: hidden;
            }
          </style>
        </head>
        <body>
          <div class="gap">&nbsp;</div>
          <div class="gap">&nbsp;</div>
          <div class="gap">&nbsp;</div>
          
          <div class="bold">Tracking: ${order.tracking || "N/A"}</div>
          <div class="gap">&nbsp;</div>
          
          <div>${order.name}</div>
          <div>
            ${order.addressLine1}${
      order.addressLine2 ? `<br/>${order.addressLine2}` : ""
    }
          </div>
          ${order.addressLine3 ? `<div>${order.addressLine3}</div>` : ""}
          <div>${contacts.join(", ")}</div>
          <div class="gap">&nbsp;</div>
         
          ${order.products
            .map(
              (product) => `
            <div class="flex-row">                
              <span>${product.quantity} x&nbsp;</span>
              <span>${product.name}&nbsp;</span>
              <span>${formatCurrency(product.price * product.quantity)}</span>
            </div>
          `
            )
            .join("")}
          <div class="gap">&nbsp;</div>
          
          ${
            !order.freeShipping
              ? `
            <div class="flex-row">
              <span>Subtotal: ${formatCurrency(subtotal)}</span>
            </div>
            <div class="flex-row">
              <span>Delivery: ${formatCurrency(350)}</span>
            </div>
          `
              : `
            <div class="flex-row">
              <span>Subtotal: ${formatCurrency(subtotal)}</span>
            </div>
            <div class="flex-row">
              <span>Shipping: FREE</span>
            </div>
          `
          }
          <div class="gap">&nbsp;</div>
          
          <div class="flex-row bold">
            <span>Total: ${formatCurrency(finalTotal)}</span>
          </div>
          <div class="gap">&nbsp;</div>
          <div class="gap">&nbsp;</div>
          <div class="gap">&nbsp;</div>
          
          <div class="gap">&nbsp;</div>
          <div class="gap">&nbsp;</div>
          <div class="gap">&nbsp;</div>
          
          ${
            includeCut
              ? `
          <!-- ESC/POS Auto-cut command -->
          <div class="cut-command">
            <span style="white-space: pre;">&#27;d&#0;</span>
          </div>
          `
              : ""
          }
          
        </body>
      </html>
    `;
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
                    {formatCurrency(finalTotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Action Buttons with Dropdown */}
        <div className="flex flex-col items-center justify-center flex-shrink-0 gap-1">
          {/* Print Options Dropdown */}
          <div className="relative group">
            <button
              onClick={handlePrintWithCut}
              className="w-24 px-3 py-1 text-xs text-gray-700 transition-colors border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-1"
            >
              Print & Cut
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {/* Dropdown Menu */}
            <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
              <div className="p-1">
                <button
                  onClick={handlePrintWithCut}
                  className="w-full px-3 py-2 text-xs text-left text-gray-700 hover:bg-gray-50 rounded flex items-center gap-2"
                >
                  <svg
                    className="w-3 h-3"
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
                  Print + Cut
                </button>
                <button
                  onClick={handleDirectPrint}
                  className="w-full px-3 py-2 text-xs text-left text-gray-700 hover:bg-gray-50 rounded flex items-center gap-2"
                >
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  Direct Print
                </button>
                <button
                  onClick={handlePrintOnly}
                  className="w-full px-3 py-2 text-xs text-left text-gray-700 hover:bg-gray-50 rounded flex items-center gap-2"
                >
                  <svg
                    className="w-3 h-3"
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
                  Print Only
                </button>
                <hr className="my-1 border-gray-200" />
                <button
                  onClick={handleFullCut}
                  className="w-full px-3 py-2 text-xs text-left text-red-600 hover:bg-red-50 rounded flex items-center gap-2"
                >
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                    />
                  </svg>
                  Full Cut
                </button>
                <button
                  onClick={handlePartialCut}
                  className="w-full px-3 py-2 text-xs text-left text-orange-600 hover:bg-orange-50 rounded flex items-center gap-2"
                >
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                    />
                  </svg>
                  Partial Cut
                </button>
                <button
                  onClick={handleFeedAndCut}
                  className="w-full px-3 py-2 text-xs text-left text-blue-600 hover:bg-blue-50 rounded flex items-center gap-2"
                >
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                  Feed & Cut
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={() => onUpdateClick && onUpdateClick(order)}
            className="w-24 px-3 py-1 text-xs text-white transition-colors bg-indigo-600 rounded-lg hover:bg-indigo-700"
          >
            Edit
          </button>
        </div>
      </div>
    </div>
  );
};

// Type declarations for external APIs
declare global {
  interface Window {
    electronAPI?: {
      sendToPrinter: (data: string) => void;
      printReceipt: (data: string) => void;
    };
    rawPrinterHelper?: {
      sendRaw: (data: string) => void;
    };
  }
}

export default OrderCard;
