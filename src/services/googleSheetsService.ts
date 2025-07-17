// Simple Google Sheets Service - Browser Compatible
// This uses the Google Sheets REST API directly without Node.js dependencies

console.log("API Key:", process.env.REACT_APP_GOOGLE_API_KEY);
console.log("Sheet ID:", process.env.REACT_APP_GOOGLE_SHEET_ID);

// Types matching your React components
interface Product {
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  name: string;
  addressLine1: string;
  addressLine2?: string;
  addressLine3?: string;
  contact: string;
  products: Product[];
  status: "Preparing" | "Shipped" | "Delivered" | "Returned" | "Damaged";
  orderDate: string;
  paymentMethod: "COD" | "Bank Transfer";
  paymentReceived?: boolean;
  tracking?: string;
  freeShipping?: boolean;
}

interface SheetOrder {
  trackingId: string;
  customerInfo: string;
  oilQty: number;
  shampooQty: number;
  conditionerQty: number;
  totalAmount: number;
  orderStatus: string;
  paymentMethod: string;
  paymentReceived: boolean;
  freeShipping: boolean;
  orderDate: string;
  lastUpdated: string;
}

interface ApiResponse<T = any> {
  success: boolean;
  error?: string;
  data?: T;
}

interface AddOrderResponse extends ApiResponse {
  trackingId?: string;
}

// Configuration - You'll need to get an API key from Google Cloud Console
const GOOGLE_API_KEY =
  process.env.REACT_APP_GOOGLE_API_KEY || "YOUR_GOOGLE_API_KEY";
const SPREADSHEET_ID =
  process.env.REACT_APP_GOOGLE_SHEET_ID || "YOUR_GOOGLE_SHEET_ID";
const SHEET_NAME = "Sheet1"; // Change this to your sheet name

// Product prices (as defined in your React code)
const PRODUCT_PRICES: Record<string, number> = {
  Oil: 950,
  Shampoo: 1750,
  Conditioner: 1850,
};

const SHIPPING_COST: number = 350;

// Function to calculate total amount
function calculateTotal(
  products: Product[],
  freeShipping: boolean = false
): number {
  const subtotal = products.reduce((sum: number, product: Product) => {
    return sum + PRODUCT_PRICES[product.name] * product.quantity;
  }, 0);

  return freeShipping ? subtotal : subtotal + SHIPPING_COST;
}

// Function to format customer info for the sheet
function formatCustomerInfo(order: Order): string {
  const addressParts = [
    order.addressLine1,
    order.addressLine2,
    order.addressLine3,
  ]
    .filter((part): part is string => part !== undefined && part.trim() !== "")
    .join(", ");

  return `${order.name}\n${addressParts}\n${order.contact}`;
}

// Function to convert order to sheet row format
function orderToSheetRow(order: Order): (string | number)[] {
  const oilQty = order.products.find((p) => p.name === "Oil")?.quantity || 0;
  const shampooQty =
    order.products.find((p) => p.name === "Shampoo")?.quantity || 0;
  const conditionerQty =
    order.products.find((p) => p.name === "Conditioner")?.quantity || 0;
  const totalAmount = calculateTotal(order.products, order.freeShipping);

  return [
    order.tracking || `LK${Date.now()}`,
    formatCustomerInfo(order),
    oilQty,
    shampooQty,
    conditionerQty,
    totalAmount,
    order.status,
    order.paymentMethod,
    order.paymentReceived ? "Yes" : "No",
    order.freeShipping ? "Yes" : "No",
    order.orderDate,
    new Date().toISOString().split("T")[0],
  ];
}

// Function to add a new order to Google Sheets
export async function addOrderToSheet(order: Order): Promise<AddOrderResponse> {
  try {
    // First, get the current data to find the next empty row
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}?key=${GOOGLE_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const nextRow = (data.values?.length || 1) + 1;

    // Prepare the row data
    const rowData = orderToSheetRow(order);
    const trackingId = rowData[0] as string;

    // Add the new row
    const appendResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!A${nextRow}:L${nextRow}?valueInputOption=RAW&key=${GOOGLE_API_KEY}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          values: [rowData],
        }),
      }
    );

    if (!appendResponse.ok) {
      throw new Error(`Failed to add order: ${appendResponse.status}`);
    }

    console.log("Order added successfully to Google Sheets");
    return {
      success: true,
      trackingId: trackingId,
      data: rowData,
    };
  } catch (error) {
    console.error("Error adding order to Google Sheets:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Function to update an existing order
export async function updateOrderInSheet(
  trackingId: string,
  updatedOrder: Order
): Promise<ApiResponse> {
  try {
    // Get all data to find the row with the tracking ID
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}?key=${GOOGLE_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const rows = data.values || [];

    // Find the row index (skip header row)
    const rowIndex = rows.findIndex(
      (row: any[], index: number) => index > 0 && row[0] === trackingId
    );

    if (rowIndex === -1) {
      throw new Error("Order not found");
    }

    // Prepare updated row data
    const updatedRowData = orderToSheetRow({
      ...updatedOrder,
      tracking: trackingId,
    });
    const actualRowNumber = rowIndex + 1; // Convert to 1-based indexing

    // Update the row
    const updateResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!A${actualRowNumber}:L${actualRowNumber}?valueInputOption=RAW&key=${GOOGLE_API_KEY}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          values: [updatedRowData],
        }),
      }
    );

    if (!updateResponse.ok) {
      throw new Error(`Failed to update order: ${updateResponse.status}`);
    }

    console.log("Order updated successfully in Google Sheets");
    return { success: true };
  } catch (error) {
    console.error("Error updating order in Google Sheets:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Function to get all orders from the sheet
export async function getAllOrders(): Promise<ApiResponse<SheetOrder[]>> {
  try {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}?key=${GOOGLE_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const rows = data.values || [];

    // Skip header row and convert to SheetOrder format
    const orders: SheetOrder[] = rows.slice(1).map((row: any[]) => ({
      trackingId: row[0] || "",
      customerInfo: row[1] || "",
      oilQty: parseInt(row[2]) || 0,
      shampooQty: parseInt(row[3]) || 0,
      conditionerQty: parseInt(row[4]) || 0,
      totalAmount: parseFloat(row[5]) || 0,
      orderStatus: row[6] || "",
      paymentMethod: row[7] || "",
      paymentReceived: row[8] === "Yes",
      freeShipping: row[9] === "Yes",
      orderDate: row[10] || "",
      lastUpdated: row[11] || "",
    }));

    return { success: true, data: orders };
  } catch (error) {
    console.error("Error fetching orders from Google Sheets:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
