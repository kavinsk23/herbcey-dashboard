// stockService.ts

interface StockItem {
  id: string;
  productName: string;
  currentStock: number;
  minimumStock: number;
  lastUpdated: string;
  lastRestocked?: string;
  restockQuantity?: number;
}

const SPREADSHEET_ID =
  process.env.REACT_APP_GOOGLE_SHEET_ID || "YOUR_GOOGLE_SHEET_ID";
const STOCK_SHEET_NAME = "Stock"; // Name of the sheet for stock management

// Get all stock items from Google Sheets
export async function getAllStockFromSheet(): Promise<{
  success: boolean;
  data?: StockItem[];
  error?: string;
}> {
  try {
    const accessToken = localStorage.getItem("google_access_token");

    if (!accessToken) {
      throw new Error("No access token found. Please sign in first.");
    }

    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${STOCK_SHEET_NAME}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const rows = data.values || [];

    // Skip header row and convert to StockItem format
    const stockItems: StockItem[] = rows
      .slice(1)
      .map((row: any[], index: number) => ({
        id: row[0] || `stock_${index}`,
        productName: row[1] || "",
        currentStock: parseInt(row[2]) || 0,
        minimumStock: parseInt(row[3]) || 0,
        lastUpdated: row[4] || new Date().toISOString(),
        lastRestocked: row[5] || "",
        restockQuantity: parseInt(row[6]) || 0,
      }));

    return { success: true, data: stockItems };
  } catch (error) {
    console.error("Error fetching stock from Google Sheets:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Update a stock item in Google Sheets
export async function updateStockInSheet(
  stockId: string,
  stockItem: StockItem
): Promise<{ success: boolean; error?: string }> {
  try {
    const accessToken = localStorage.getItem("google_access_token");

    if (!accessToken) {
      throw new Error("No access token found. Please sign in first.");
    }

    // First, get all stock to find the row with the stock ID
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${STOCK_SHEET_NAME}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const rows = data.values || [];

    // Find the row index (skip header row)
    const rowIndex = rows.findIndex(
      (row: any[], index: number) => index > 0 && row[0] === stockId
    );

    if (rowIndex === -1) {
      throw new Error("Stock item not found");
    }

    const actualRowNumber = rowIndex + 1; // Convert to 1-based indexing

    // Prepare updated row data
    const updatedRowData = [
      stockItem.id,
      stockItem.productName,
      stockItem.currentStock,
      stockItem.minimumStock,
      stockItem.lastUpdated,
      stockItem.lastRestocked || "",
      stockItem.restockQuantity || 0,
    ];

    // Update the row
    const updateResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${STOCK_SHEET_NAME}!A${actualRowNumber}:G${actualRowNumber}?valueInputOption=RAW`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          values: [updatedRowData],
        }),
      }
    );

    if (!updateResponse.ok) {
      throw new Error(`Failed to update stock: ${updateResponse.status}`);
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating stock in Google Sheets:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Add a new stock item to Google Sheets
export async function addStockToSheet(
  stockItem: StockItem
): Promise<{ success: boolean; error?: string }> {
  try {
    const accessToken = localStorage.getItem("google_access_token");

    if (!accessToken) {
      throw new Error("No access token found. Please sign in first.");
    }

    // Prepare new row data
    const newRowData = [
      stockItem.id,
      stockItem.productName,
      stockItem.currentStock,
      stockItem.minimumStock,
      stockItem.lastUpdated,
      stockItem.lastRestocked || "",
      stockItem.restockQuantity || 0,
    ];

    // Append new stock row
    const appendResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${STOCK_SHEET_NAME}:append?valueInputOption=RAW`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          values: [newRowData],
        }),
      }
    );

    if (!appendResponse.ok) {
      throw new Error(`Failed to add stock: ${appendResponse.status}`);
    }

    return { success: true };
  } catch (error) {
    console.error("Error adding stock to Google Sheets:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Sync all stock items to Google Sheets (overwrite)
export async function syncAllStockToSheet(
  stockItems: StockItem[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const accessToken = localStorage.getItem("google_access_token");

    if (!accessToken) {
      throw new Error("No access token found. Please sign in first.");
    }

    // Prepare header row and data rows
    const headerRow = [
      "ID",
      "Product Name",
      "Current Stock",
      "Minimum Stock",
      "Last Updated",
      "Last Restocked",
      "Restock Quantity",
    ];

    const dataRows = stockItems.map((item) => [
      item.id,
      item.productName,
      item.currentStock,
      item.minimumStock,
      item.lastUpdated,
      item.lastRestocked || "",
      item.restockQuantity || 0,
    ]);

    // Update the entire sheet
    const updateResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${STOCK_SHEET_NAME}?valueInputOption=RAW`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          values: [headerRow, ...dataRows],
        }),
      }
    );

    if (!updateResponse.ok) {
      throw new Error(`Failed to sync stock: ${updateResponse.status}`);
    }

    return { success: true };
  } catch (error) {
    console.error("Error syncing stock to Google Sheets:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
