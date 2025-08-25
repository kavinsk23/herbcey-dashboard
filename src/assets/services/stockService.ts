// stockService.ts - Enhanced with Order Update/Delete Stock Adjustments

import { getAllProductsFromSheet } from "./productService";

export interface StockItem {
  id: string;
  productName: string;
  currentStock: number;
  minimumStock: number;
  lastUpdated: string;
  lastRestocked?: string;
  restockQuantity?: number;
}

export interface ProductQuantity {
  name: string;
  quantity: number;
}

// Order interface for stock calculations
interface OrderForStock {
  products: ProductQuantity[];
}

const SPREADSHEET_ID =
  process.env.REACT_APP_GOOGLE_SHEET_ID || "YOUR_GOOGLE_SHEET_ID";
const STOCK_SHEET_NAME = "Stock";

// Helper function to get default stock levels for different products
function getDefaultStockLevel(productName: string): number {
  const defaults: Record<string, number> = {
    Oil: 100,
    Shampoo: 50,
    Conditioner: 50,
  };
  return defaults[productName] || 25;
}

// Helper function to get default minimum stock levels
function getDefaultMinimumStock(productName: string): number {
  const defaults: Record<string, number> = {
    Oil: 20,
    Shampoo: 10,
    Conditioner: 10,
  };
  return defaults[productName] || 5;
}

// Get all products from Products sheet and create/sync stock items
export async function syncStockWithProducts(): Promise<{
  success: boolean;
  data?: StockItem[];
  error?: string;
}> {
  try {
    console.log("Starting stock sync with products...");

    const productsResult = await getAllProductsFromSheet();
    if (!productsResult.success || !productsResult.data) {
      throw new Error("Failed to load products from Products sheet");
    }

    const products = productsResult.data;
    console.log("Loaded products from sheet:", products);

    const existingStockResult = await getAllStockFromSheet();
    const existingStock = existingStockResult.data || [];

    const syncedStockItems: StockItem[] = products.map((product) => {
      const existingStockItem = existingStock.find(
        (stock) => stock.productName === product.name
      );

      if (existingStockItem) {
        return {
          ...existingStockItem,
          id: `stock_${product.name.toLowerCase().replace(/\s+/g, "_")}`,
        };
      } else {
        return {
          id: `stock_${product.name.toLowerCase().replace(/\s+/g, "_")}`,
          productName: product.name,
          currentStock: getDefaultStockLevel(product.name),
          minimumStock: getDefaultMinimumStock(product.name),
          lastUpdated: new Date().toISOString(),
        };
      }
    });

    const syncResult = await syncAllStockToSheet(syncedStockItems);
    if (!syncResult.success) {
      throw new Error("Failed to sync stock to sheet");
    }

    console.log("Stock synced successfully with products");
    return { success: true, data: syncedStockItems };
  } catch (error) {
    console.error("Error syncing stock with products:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

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

    const rowIndex = rows.findIndex(
      (row: any[], index: number) => index > 0 && row[0] === stockId
    );

    if (rowIndex === -1) {
      throw new Error("Stock item not found");
    }

    const actualRowNumber = rowIndex + 1;
    const updatedRowData = [
      stockItem.id,
      stockItem.productName,
      stockItem.currentStock,
      stockItem.minimumStock,
      stockItem.lastUpdated,
      stockItem.lastRestocked || "",
      stockItem.restockQuantity || 0,
    ];

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

    const newRowData = [
      stockItem.id,
      stockItem.productName,
      stockItem.currentStock,
      stockItem.minimumStock,
      stockItem.lastUpdated,
      stockItem.lastRestocked || "",
      stockItem.restockQuantity || 0,
    ];

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

// Reduce stock for products in an order (for new orders)
export async function reduceStockForOrder(
  orderProducts: ProductQuantity[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const syncResult = await syncStockWithProducts();
    if (!syncResult.success || !syncResult.data) {
      return {
        success: false,
        error: syncResult.error || "Failed to sync stock with products",
      };
    }

    const updatedStock = syncResult.data.map((item) => {
      const orderProduct = orderProducts.find(
        (p) => p.name === item.productName
      );
      if (orderProduct) {
        return {
          ...item,
          currentStock: Math.max(0, item.currentStock - orderProduct.quantity),
          lastUpdated: new Date().toISOString(),
        };
      }
      return item;
    });

    const finalSyncResult = await syncAllStockToSheet(updatedStock);
    return finalSyncResult;
  } catch (error) {
    console.error("Error reducing stock for order:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// NEW: Restore stock when an order is deleted
export async function restoreStockForDeletedOrder(
  orderProducts: ProductQuantity[]
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("Restoring stock for deleted order:", orderProducts);

    const syncResult = await syncStockWithProducts();
    if (!syncResult.success || !syncResult.data) {
      return {
        success: false,
        error: syncResult.error || "Failed to sync stock with products",
      };
    }

    // Add back the quantities that were in the deleted order
    const updatedStock = syncResult.data.map((item) => {
      const orderProduct = orderProducts.find(
        (p) => p.name === item.productName
      );
      if (orderProduct) {
        return {
          ...item,
          currentStock: item.currentStock + orderProduct.quantity,
          lastUpdated: new Date().toISOString(),
        };
      }
      return item;
    });

    const finalSyncResult = await syncAllStockToSheet(updatedStock);

    if (finalSyncResult.success) {
      console.log("Stock restored successfully for deleted order");
    }

    return finalSyncResult;
  } catch (error) {
    console.error("Error restoring stock for deleted order:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// NEW: Adjust stock when an order is updated (handle quantity changes)
export async function adjustStockForUpdatedOrder(
  oldOrderProducts: ProductQuantity[],
  newOrderProducts: ProductQuantity[]
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("Adjusting stock for updated order");
    console.log("Old products:", oldOrderProducts);
    console.log("New products:", newOrderProducts);

    const syncResult = await syncStockWithProducts();
    if (!syncResult.success || !syncResult.data) {
      return {
        success: false,
        error: syncResult.error || "Failed to sync stock with products",
      };
    }

    // Calculate the difference for each product
    const updatedStock = syncResult.data.map((item) => {
      // Find quantities in old and new orders
      const oldProduct = oldOrderProducts.find(
        (p) => p.name === item.productName
      );
      const newProduct = newOrderProducts.find(
        (p) => p.name === item.productName
      );

      const oldQty = oldProduct?.quantity || 0;
      const newQty = newProduct?.quantity || 0;
      const quantityDifference = newQty - oldQty;

      if (quantityDifference !== 0) {
        console.log(
          `${item.productName}: ${oldQty} -> ${newQty} (diff: ${quantityDifference})`
        );

        // If difference is positive, reduce stock more
        // If difference is negative, add stock back
        return {
          ...item,
          currentStock: Math.max(0, item.currentStock - quantityDifference),
          lastUpdated: new Date().toISOString(),
        };
      }
      return item;
    });

    const finalSyncResult = await syncAllStockToSheet(updatedStock);

    if (finalSyncResult.success) {
      console.log("Stock adjusted successfully for updated order");
    }

    return finalSyncResult;
  } catch (error) {
    console.error("Error adjusting stock for updated order:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
