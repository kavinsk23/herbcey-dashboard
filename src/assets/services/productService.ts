// productService.js - Service for product management with Google Sheets

interface ProductCost {
  id: string;
  name: string;
  cost: number;
  price: number;
  lastUpdated: string;
}

interface SheetProduct {
  id: string;
  name: string;
  cost: number;
  price: number;
  lastUpdated: string;
}

interface ApiResponse<T = any> {
  success: boolean;
  error?: string;
  data?: T;
}

// Configuration
const GOOGLE_API_KEY =
  process.env.REACT_APP_GOOGLE_API_KEY || "YOUR_GOOGLE_API_KEY";
const SPREADSHEET_ID =
  process.env.REACT_APP_GOOGLE_SHEET_ID || "YOUR_GOOGLE_SHEET_ID";
const PRODUCTS_SHEET_NAME = "Products"; // This sheet needs to be created in your Google Sheets

// Function to convert product to sheet row format
function productToSheetRow(product: ProductCost): (string | number)[] {
  return [
    product.id,
    product.name,
    product.cost,
    product.price,
    product.lastUpdated,
  ];
}

// Function to add a new product to Google Sheets
export async function addProductToSheet(
  product: ProductCost
): Promise<ApiResponse> {
  try {
    const accessToken = localStorage.getItem("google_access_token");
    if (!accessToken) {
      throw new Error("No access token found. Please sign in first.");
    }

    const rowData = productToSheetRow(product);

    // Append new product row
    const appendRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${PRODUCTS_SHEET_NAME}:append?valueInputOption=RAW`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          values: [rowData],
        }),
      }
    );

    if (!appendRes.ok) {
      const errorText = await appendRes.text();
      throw new Error(
        `Failed to add product: ${appendRes.status} - ${errorText}`
      );
    }

    console.log("Product added successfully to Google Sheets");
    return {
      success: true,
      data: product,
    };
  } catch (error) {
    console.error("Error adding product:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Function to get all products from the sheet
export async function getAllProductsFromSheet(): Promise<
  ApiResponse<SheetProduct[]>
> {
  try {
    const accessToken = localStorage.getItem("google_access_token");

    let response;
    if (accessToken) {
      response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${PRODUCTS_SHEET_NAME}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
    } else {
      // Fallback to API key if no access token
      response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${PRODUCTS_SHEET_NAME}?key=${GOOGLE_API_KEY}`
      );
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const rows = data.values || [];

    // Skip header row if it exists and convert to SheetProduct format
    const products: SheetProduct[] = rows.slice(1).map((row: any[]) => ({
      id: row[0] || "",
      name: row[1] || "",
      cost: parseFloat(row[2]) || 0,
      price: parseFloat(row[3]) || 0,
      lastUpdated: row[4] || "",
    }));

    console.log("Products fetched successfully from Google Sheets");
    return { success: true, data: products };
  } catch (error) {
    console.error("Error fetching products from Google Sheets:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Function to update an existing product
export async function updateProductInSheet(
  productId: string,
  updatedProduct: ProductCost
): Promise<ApiResponse> {
  try {
    const accessToken = localStorage.getItem("google_access_token");
    if (!accessToken) {
      throw new Error("No access token found. Please sign in first.");
    }

    // Get all data to find the row with the product ID
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${PRODUCTS_SHEET_NAME}`,
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
      (row: any[], index: number) => index > 0 && row[0] === productId
    );

    if (rowIndex === -1) {
      throw new Error("Product not found");
    }

    // Prepare updated row data
    const updatedRowData = productToSheetRow(updatedProduct);
    const actualRowNumber = rowIndex + 1; // Convert to 1-based indexing

    // Update the row
    const updateResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${PRODUCTS_SHEET_NAME}!A${actualRowNumber}:E${actualRowNumber}?valueInputOption=RAW`,
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
      const errorText = await updateResponse.text();
      throw new Error(
        `Failed to update product: ${updateResponse.status} - ${errorText}`
      );
    }

    console.log("Product updated successfully in Google Sheets");
    return { success: true };
  } catch (error) {
    console.error("Error updating product in Google Sheets:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Function to delete a product from Google Sheets
export async function deleteProductFromSheet(
  productId: string
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
      }
    );

    if (!metadataResponse.ok) {
      throw new Error(
        `Failed to get spreadsheet metadata: ${metadataResponse.status}`
      );
    }

    const metadata = await metadataResponse.json();
    const sheet = metadata.sheets.find(
      (s: any) => s.properties.title === PRODUCTS_SHEET_NAME
    );

    if (!sheet) {
      throw new Error(`Sheet "${PRODUCTS_SHEET_NAME}" not found`);
    }

    const sheetId = sheet.properties.sheetId;

    // Get all data to find the row with the product ID
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${PRODUCTS_SHEET_NAME}`,
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
      (row: any[], index: number) => index > 0 && row[0] === productId
    );

    if (rowIndex === -1) {
      throw new Error("Product not found");
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
      }
    );

    if (!deleteResponse.ok) {
      const errorText = await deleteResponse.text();
      throw new Error(
        `Failed to delete product: ${deleteResponse.status} - ${errorText}`
      );
    }

    console.log("Product deleted successfully from Google Sheets");
    return { success: true };
  } catch (error) {
    console.error("Error deleting product from Google Sheets:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Function to sync all products to sheet
export async function syncAllProductsToSheet(
  products: ProductCost[]
): Promise<ApiResponse> {
  try {
    const accessToken = localStorage.getItem("google_access_token");
    if (!accessToken) {
      throw new Error("No access token found. Please sign in first.");
    }

    // Convert all products to sheet rows
    const allRows = [
      ["ID", "Name", "Cost", "Price", "Last Updated"], // Header
      ...products.map(productToSheetRow),
    ];

    // Clear and update the entire sheet
    const updateResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${PRODUCTS_SHEET_NAME}!A:E?valueInputOption=RAW`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          values: allRows,
        }),
      }
    );

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(
        `Failed to sync products: ${updateResponse.status} - ${errorText}`
      );
    }

    console.log("All products synced successfully to Google Sheets");
    return { success: true };
  } catch (error) {
    console.error("Error syncing products to Google Sheets:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
