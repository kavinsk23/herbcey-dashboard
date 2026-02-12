// Fixed Google Sheets Service - Browser Compatible
// This uses the Google Sheets REST API directly without Node.js dependencies

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
  mainCity?: string; // ADDED: Main City field
  contact: string;
  products: Product[];
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
}

interface SheetOrder {
  trackingId: string;
  customerInfo: string;
  mainCity: string; // ADDED: Main City field
  oilQty: number;
  shampooQty: number;
  conditionerQty: number;
  sprayQty: number;
  serumQty: number;
  premiumQty: number;
  castorQty: number;
  totalAmount: number;
  orderStatus: string;
  paymentMethod: string;
  paymentReceived: boolean;
  freeShipping: boolean;
  orderDate: string;
  lastUpdated: string;
  [key: string]: any;
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
const SHEET_NAME = "Orders"; // Change this to your sheet name

// Product prices (UPDATED to include Spray and Serum)
const PRODUCT_PRICES: Record<string, number> = {
  Oil: 950,
  Shampoo: 1350,
  Conditioner: 1350,
  Spray: 980,
  Serum: 1600,
  Premium: 2600,
  Castor: 2400,
};

const SHIPPING_COST: number = 350;

// Function to calculate total amount
function calculateTotal(
  products: Product[],
  freeShipping: boolean = false,
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

// Function to convert order to sheet row format - UPDATED to include Main City at Column Q (index 16)
function orderToSheetRow(order: Order): (string | number)[] {
  const oilQty = order.products.find((p) => p.name === "Oil")?.quantity || 0;
  const shampooQty =
    order.products.find((p) => p.name === "Shampoo")?.quantity || 0;
  const conditionerQty =
    order.products.find((p) => p.name === "Conditioner")?.quantity || 0;
  const sprayQty =
    order.products.find((p) => p.name === "Spray")?.quantity || 0;
  const serumQty =
    order.products.find((p) => p.name === "Serum")?.quantity || 0;
  const premiumQty =
    order.products.find((p) => p.name === "Premium")?.quantity || 0;
  const castorQty =
    order.products.find((p) => p.name === "Castor")?.quantity || 0;

  const totalAmount = calculateTotal(order.products, order.freeShipping);

  // Base row data (columns A through P)
  const rowData = [
    order.tracking || `LK${Date.now()}`, // A (0): Tracking ID
    formatCustomerInfo(order), // B (1): Customer Info
    oilQty, // C (2): Oil Qty
    shampooQty, // D (3): Shampoo Qty
    conditionerQty, // E (4): Conditioner Qty
    totalAmount, // F (5): Total Amount
    order.status, // G (6): Order Status
    order.paymentMethod, // H (7): Payment Method
    order.paymentReceived ? "Yes" : "No", // I (8): Payment Received
    order.freeShipping ? "Yes" : "No", // J (9): Free Shipping
    order.orderDate, // K (10): Order Date
    new Date().toISOString().split("T")[0], // L (11): Last Updated
    sprayQty, // M (12): Spray Qty
    serumQty, // N (13): Serum Qty
    premiumQty, // O (14): Premium Qty
    castorQty, // P (15): Castor Qty
  ];

  // Add Main City at Column Q (index 16)
  rowData.push(order.mainCity || ""); // Q (16): Main City

  return rowData;
}

// Function to add a new order to Google Sheets
export async function addOrderToSheet(order: Order): Promise<AddOrderResponse> {
  try {
    const accessToken = localStorage.getItem("google_access_token");
    if (!accessToken) {
      throw new Error("No access token found. Please sign in first.");
    }

    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!metaRes.ok) {
      throw new Error(`Failed to read sheet: ${metaRes.status}`);
    }

    const rowData = orderToSheetRow(order);
    const trackingId = rowData[0] as string;

    // Append new order row
    const appendRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}:append?valueInputOption=RAW`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          values: [rowData],
        }),
      },
    );

    if (!appendRes.ok) {
      throw new Error(`Failed to add order: ${appendRes.status}`);
    }

    return {
      success: true,
      trackingId,
      data: rowData,
    };
  } catch (error) {
    console.error("Error adding order:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Function to update an existing order - UPDATED to include Main City
export async function updateOrderInSheet(
  trackingId: string,
  updatedOrder: Order,
): Promise<ApiResponse> {
  try {
    const accessToken = localStorage.getItem("google_access_token");
    if (!accessToken) {
      throw new Error("No access token found. Please sign in first.");
    }

    // Get all data to find the row with the tracking ID
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const rows = data.values || [];

    // Find the row index (skip header row)
    const rowIndex = rows.findIndex(
      (row: any[], index: number) => index > 0 && row[0] === trackingId,
    );

    if (rowIndex === -1) {
      throw new Error("Order not found");
    }

    // Prepare updated row data
    const updatedRowData = orderToSheetRow(updatedOrder);
    const actualRowNumber = rowIndex + 1; // Convert to 1-based indexing

    // Update the row - NOW INCLUDES COLUMN Q
    const updateResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!A${actualRowNumber}:Q${actualRowNumber}?valueInputOption=RAW`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          values: [updatedRowData],
        }),
      },
    );

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(
        `Failed to update order: ${updateResponse.status} - ${errorText}`,
      );
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

// Function to delete an order from Google Sheets
export async function deleteOrderFromSheet(
  trackingId: string,
): Promise<ApiResponse> {
  try {
    const accessToken = localStorage.getItem("google_access_token");
    if (!accessToken) {
      throw new Error("No access token found. Please sign in first.");
    }

    // First, get the spreadsheet metadata to find the sheet ID
    const metadataResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!metadataResponse.ok) {
      throw new Error(
        `Failed to get spreadsheet metadata: ${metadataResponse.status}`,
      );
    }

    const metadata = await metadataResponse.json();
    const sheet = metadata.sheets.find(
      (s: any) => s.properties.title === SHEET_NAME,
    );

    if (!sheet) {
      throw new Error(`Sheet "${SHEET_NAME}" not found`);
    }

    const sheetId = sheet.properties.sheetId;

    // Get all data to find the row with the tracking ID
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const rows = data.values || [];

    // Find the row index (skip header row)
    const rowIndex = rows.findIndex(
      (row: any[], index: number) => index > 0 && row[0] === trackingId,
    );

    if (rowIndex === -1) {
      throw new Error("Order not found");
    }

    const actualRowNumber = rowIndex; // This is already 0-based for batchUpdate

    // Delete the row using the batchUpdate method
    const deleteResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId: sheetId,
                  dimension: "ROWS",
                  startIndex: actualRowNumber,
                  endIndex: actualRowNumber + 1,
                },
              },
            },
          ],
        }),
      },
    );

    if (!deleteResponse.ok) {
      const errorText = await deleteResponse.text();
      throw new Error(
        `Failed to delete order: ${deleteResponse.status} - ${errorText}`,
      );
    }

    console.log("Order deleted successfully from Google Sheets");
    return { success: true };
  } catch (error) {
    console.error("Error deleting order from Google Sheets:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Function to get all orders from the sheet - UPDATED to include Main City
export async function getAllOrders(): Promise<ApiResponse<SheetOrder[]>> {
  try {
    // First try with access token (for authenticated requests)
    const accessToken = localStorage.getItem("google_access_token");

    let response;
    if (accessToken) {
      response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
    } else {
      // Fallback to API key if no access token
      response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}?key=${GOOGLE_API_KEY}`,
      );
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const rows = data.values || [];

    // Skip header row and convert to SheetOrder format - INCLUDING MAIN CITY
    const orders: SheetOrder[] = rows.slice(1).map((row: any[]) => ({
      trackingId: row[0] || "",
      customerInfo: row[1] || "",
      mainCity: row[16] || "", // Q (16): Main City
      oilQty: parseInt(row[2]) || 0,
      shampooQty: parseInt(row[3]) || 0,
      conditionerQty: parseInt(row[4]) || 0,
      sprayQty: parseInt(row[12]) || 0,
      serumQty: parseInt(row[13]) || 0,
      premiumQty: parseInt(row[14]) || 0,
      castorQty: parseInt(row[15]) || 0,
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
