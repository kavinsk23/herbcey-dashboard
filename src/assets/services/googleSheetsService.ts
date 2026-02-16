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
  mainCity?: string;
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
  mainCity: string;
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
  fdeStatus: string; // R (17): FDE waybill number — empty if not yet processed
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

// Configuration
const GOOGLE_API_KEY =
  process.env.REACT_APP_GOOGLE_API_KEY || "YOUR_GOOGLE_API_KEY";
const SPREADSHEET_ID =
  process.env.REACT_APP_GOOGLE_SHEET_ID || "YOUR_GOOGLE_SHEET_ID";
const SHEET_NAME = "Orders";

// Product prices
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

function calculateTotal(
  products: Product[],
  freeShipping: boolean = false,
): number {
  const subtotal = products.reduce((sum: number, product: Product) => {
    return sum + PRODUCT_PRICES[product.name] * product.quantity;
  }, 0);
  return freeShipping ? subtotal : subtotal + SHIPPING_COST;
}

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

// Column layout:
// A(0)  Tracking ID
// B(1)  Customer Info
// C(2)  Oil Qty
// D(3)  Shampoo Qty
// E(4)  Conditioner Qty
// F(5)  Total Amount
// G(6)  Order Status
// H(7)  Payment Method
// I(8)  Payment Received
// J(9)  Free Shipping
// K(10) Order Date
// L(11) Last Updated
// M(12) Spray Qty
// N(13) Serum Qty
// O(14) Premium Qty
// P(15) Castor Qty
// Q(16) Main City
// R(17) FDE Status (waybill number — written by updateFdeStatus only)

function orderToSheetRow(order: Order): (string | number)[] {
  const oilQty = order.products.find((p) => p.name === "Oil")?.quantity || 0;
  const shampooQty =
    order.products.find((p) => p.name === "Shampoo")?.quantity || 0;
  const condQty =
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

  return [
    order.tracking || `LK${Date.now()}`, // A (0)
    formatCustomerInfo(order), // B (1)
    oilQty, // C (2)
    shampooQty, // D (3)
    condQty, // E (4)
    totalAmount, // F (5)
    order.status, // G (6)
    order.paymentMethod, // H (7)
    order.paymentReceived ? "Yes" : "No", // I (8)
    order.freeShipping ? "Yes" : "No", // J (9)
    order.orderDate, // K (10)
    new Date().toISOString().split("T")[0], // L (11)
    sprayQty, // M (12)
    serumQty, // N (13)
    premiumQty, // O (14)
    castorQty, // P (15)
    order.mainCity || "", // Q (16)
    // R (17) fdeStatus intentionally NOT written here — managed by updateFdeStatus()
  ];
}

// Add a new order
export async function addOrderToSheet(order: Order): Promise<AddOrderResponse> {
  try {
    const accessToken = localStorage.getItem("google_access_token");
    if (!accessToken)
      throw new Error("No access token found. Please sign in first.");

    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!metaRes.ok) throw new Error(`Failed to read sheet: ${metaRes.status}`);

    const rowData = orderToSheetRow(order);
    const trackingId = rowData[0] as string;

    const appendRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}:append?valueInputOption=RAW`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ values: [rowData] }),
      },
    );
    if (!appendRes.ok)
      throw new Error(`Failed to add order: ${appendRes.status}`);

    return { success: true, trackingId, data: rowData };
  } catch (error) {
    console.error("Error adding order:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Update an existing order — writes A:Q only, never touches R (fdeStatus)
export async function updateOrderInSheet(
  trackingId: string,
  updatedOrder: Order,
): Promise<ApiResponse> {
  try {
    const accessToken = localStorage.getItem("google_access_token");
    if (!accessToken)
      throw new Error("No access token found. Please sign in first.");

    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();
    const rows = data.values || [];

    const rowIndex = rows.findIndex(
      (row: any[], index: number) => index > 0 && row[0] === trackingId,
    );
    if (rowIndex === -1) throw new Error("Order not found");

    const updatedRowData = orderToSheetRow(updatedOrder);
    const actualRowNumber = rowIndex + 1;

    // Update A:Q only — column R (fdeStatus) is never overwritten here
    const updateResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!A${actualRowNumber}:Q${actualRowNumber}?valueInputOption=RAW`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ values: [updatedRowData] }),
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

/**
 * Write the FDE waybill number to column R for a given tracking ID.
 * Called automatically by OrderCard after a successful FDE API response.
 */
export async function updateFdeStatus(
  trackingId: string,
  waybillNo: string,
): Promise<ApiResponse> {
  try {
    const accessToken = localStorage.getItem("google_access_token");
    if (!accessToken)
      throw new Error("No access token found. Please sign in first.");

    // Fetch column A to find the row number
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!A:A`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();
    const rows = data.values || [];

    const rowIndex = rows.findIndex(
      (row: any[], index: number) => index > 0 && row[0] === trackingId,
    );
    if (rowIndex === -1) throw new Error(`Order ${trackingId} not found`);

    const actualRowNumber = rowIndex + 1; // 1-based

    // Write waybill number to column R only
    const updateResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!R${actualRowNumber}?valueInputOption=RAW`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ values: [[waybillNo]] }),
      },
    );

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(
        `Failed to update FDE status: ${updateResponse.status} - ${errorText}`,
      );
    }

    console.log(`✅ FDE status saved for ${trackingId}: ${waybillNo}`);
    return { success: true };
  } catch (error) {
    console.error("Error updating FDE status:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Delete an order
export async function deleteOrderFromSheet(
  trackingId: string,
): Promise<ApiResponse> {
  try {
    const accessToken = localStorage.getItem("google_access_token");
    if (!accessToken)
      throw new Error("No access token found. Please sign in first.");

    const metadataResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!metadataResponse.ok)
      throw new Error(
        `Failed to get spreadsheet metadata: ${metadataResponse.status}`,
      );

    const metadata = await metadataResponse.json();
    const sheet = metadata.sheets.find(
      (s: any) => s.properties.title === SHEET_NAME,
    );
    if (!sheet) throw new Error(`Sheet "${SHEET_NAME}" not found`);

    const sheetId = sheet.properties.sheetId;

    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();
    const rows = data.values || [];

    const rowIndex = rows.findIndex(
      (row: any[], index: number) => index > 0 && row[0] === trackingId,
    );
    if (rowIndex === -1) throw new Error("Order not found");

    const actualRowNumber = rowIndex; // 0-based for batchUpdate

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

// Get all orders — includes fdeStatus from column R
export async function getAllOrders(): Promise<ApiResponse<SheetOrder[]>> {
  try {
    const accessToken = localStorage.getItem("google_access_token");

    let response;
    if (accessToken) {
      response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
    } else {
      response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}?key=${GOOGLE_API_KEY}`,
      );
    }

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();
    const rows = data.values || [];

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
      sprayQty: parseInt(row[12]) || 0,
      serumQty: parseInt(row[13]) || 0,
      premiumQty: parseInt(row[14]) || 0,
      castorQty: parseInt(row[15]) || 0,
      mainCity: row[16] || "", // Q (16)
      fdeStatus: row[17] || "", // R (17): FDE waybill number
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
