// Dynamic Columns Service for Orders Sheet
// src/assets/services/dynamicColumnsService.ts

interface ApiResponse<T = any> {
  success: boolean;
  error?: string;
  data?: T;
}

interface ProductColumn {
  name: string;
  columnIndex: number;
  headerName: string;
}

interface SheetStructure {
  headers: string[];
  productColumns: ProductColumn[];
  totalColumns: number;
}

// Configuration
const SPREADSHEET_ID =
  process.env.REACT_APP_GOOGLE_SHEET_ID || "YOUR_GOOGLE_SHEET_ID";
const SHEET_NAME = "Orders";

// Default static columns (A to L)
const STATIC_COLUMNS = [
  "Tracking ID", // A
  "Customer Info", // B
  "Oil Qty", // C
  "Shampoo Qty", // D
  "Conditioner Qty", // E
  "Total Amount", // F
  "Order Status", // G
  "Payment Method", // H
  "Payment Received", // I
  "Free Shipping", // J
  "Order Date", // K
  "Last Updated", // L
];

// Product prices for calculations
const PRODUCT_PRICES: Record<string, number> = {
  Oil: 950,
  Shampoo: 1350,
  Conditioner: 1350,
};

const SHIPPING_COST: number = 350;

// Get column letter from index (0=A, 1=B, etc.)
function getColumnLetter(index: number): string {
  let letter = "";
  while (index >= 0) {
    letter = String.fromCharCode(65 + (index % 26)) + letter;
    index = Math.floor(index / 26) - 1;
  }
  return letter;
}

// Get current sheet structure
export async function getSheetStructure(): Promise<
  ApiResponse<SheetStructure>
> {
  try {
    const accessToken = localStorage.getItem("google_access_token");
    if (!accessToken) {
      throw new Error("No access token found. Please sign in first.");
    }

    // Get the first row (headers)
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!1:1`,
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
    const headers = data.values?.[0] || [];

    // Find product columns (anything after "Last Updated" that ends with " Qty")
    const lastUpdatedIndex = headers.findIndex(
      (h: string) => h === "Last Updated"
    );
    const productColumns: ProductColumn[] = [];

    for (let i = lastUpdatedIndex + 1; i < headers.length; i++) {
      const header = headers[i];
      if (header && header.endsWith(" Qty")) {
        const productName = header.replace(" Qty", "");
        productColumns.push({
          name: productName,
          columnIndex: i,
          headerName: header,
        });
      }
    }

    return {
      success: true,
      data: {
        headers,
        productColumns,
        totalColumns: headers.length,
      },
    };
  } catch (error) {
    console.error("Error getting sheet structure:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Add a new product column to the orders sheet
export async function addProductColumn(
  productName: string
): Promise<ApiResponse> {
  try {
    const accessToken = localStorage.getItem("google_access_token");
    if (!accessToken) {
      throw new Error("No access token found. Please sign in first.");
    }

    // First, get current sheet structure
    const structureResult = await getSheetStructure();
    if (!structureResult.success || !structureResult.data) {
      throw new Error("Failed to get sheet structure");
    }

    const { headers, productColumns, totalColumns } = structureResult.data;

    // Check if column already exists
    const existingColumn = productColumns.find(
      (col) => col.name === productName
    );
    if (existingColumn) {
      return {
        success: true,
        data: {
          message: "Column already exists",
          columnIndex: existingColumn.columnIndex,
        },
      };
    }

    // Calculate new column index (after last existing column)
    const newColumnIndex = totalColumns;
    const newColumnLetter = getColumnLetter(newColumnIndex);
    const newHeaderName = `${productName} Qty`;

    // Add the new header
    const updateResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!${newColumnLetter}1?valueInputOption=RAW`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          values: [[newHeaderName]],
        }),
      }
    );

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(
        `Failed to add column: ${updateResponse.status} - ${errorText}`
      );
    }

    // Initialize all existing rows with 0 for the new column
    if (totalColumns > 0) {
      await initializeNewColumn(newColumnLetter);
    }

    console.log(
      `Successfully added column "${newHeaderName}" at position ${newColumnLetter}`
    );
    return {
      success: true,
      data: {
        message: "Column added successfully",
        columnIndex: newColumnIndex,
        columnLetter: newColumnLetter,
        headerName: newHeaderName,
      },
    };
  } catch (error) {
    console.error("Error adding product column:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Initialize new column with 0 values for existing rows
async function initializeNewColumn(columnLetter: string): Promise<void> {
  try {
    const accessToken = localStorage.getItem("google_access_token");
    if (!accessToken) {
      throw new Error("No access token found");
    }

    // Get all data to count rows
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}`,
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

    if (rows.length > 1) {
      // If there are data rows (excluding header)
      // Create array of 0s for all data rows
      const initValues = Array(rows.length - 1).fill([0]);

      // Update the column starting from row 2
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!${columnLetter}2:${columnLetter}${rows.length}?valueInputOption=RAW`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            values: initValues,
          }),
        }
      );
    }
  } catch (error) {
    console.error("Error initializing new column:", error);
  }
}

// Remove a product column from the orders sheet
export async function removeProductColumn(
  productName: string
): Promise<ApiResponse> {
  try {
    const accessToken = localStorage.getItem("google_access_token");
    if (!accessToken) {
      throw new Error("No access token found. Please sign in first.");
    }

    // Get current sheet structure
    const structureResult = await getSheetStructure();
    if (!structureResult.success || !structureResult.data) {
      throw new Error("Failed to get sheet structure");
    }

    const { productColumns } = structureResult.data;
    const columnToRemove = productColumns.find(
      (col) => col.name === productName
    );

    if (!columnToRemove) {
      return {
        success: true,
        data: { message: "Column does not exist" },
      };
    }

    // Get spreadsheet metadata to find sheet ID
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
      (s: any) => s.properties.title === SHEET_NAME
    );

    if (!sheet) {
      throw new Error(`Sheet "${SHEET_NAME}" not found`);
    }

    const sheetId = sheet.properties.sheetId;

    // Delete the column using batchUpdate
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
                  dimension: "COLUMNS",
                  startIndex: columnToRemove.columnIndex,
                  endIndex: columnToRemove.columnIndex + 1,
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
        `Failed to delete column: ${deleteResponse.status} - ${errorText}`
      );
    }

    console.log(`Successfully removed column "${columnToRemove.headerName}"`);
    return {
      success: true,
      data: { message: "Column removed successfully" },
    };
  } catch (error) {
    console.error("Error removing product column:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Helper functions for order processing
function formatCustomerInfo(order: any): string {
  const addressParts = [
    order.addressLine1,
    order.addressLine2,
    order.addressLine3,
  ]
    .filter((part): part is string => part !== undefined && part.trim() !== "")
    .join(", ");

  return `${order.name}\n${addressParts}\n${order.contact}`;
}

function calculateTotal(
  products: any[],
  freeShipping: boolean = false
): number {
  const subtotal = products.reduce((sum: number, product: any) => {
    const price = PRODUCT_PRICES[product.name] || product.price || 0;
    return sum + price * product.quantity;
  }, 0);

  return freeShipping ? subtotal : subtotal + SHIPPING_COST;
}

// Enhanced function to convert order to sheet row with dynamic columns
export async function orderToSheetRowDynamic(
  order: any
): Promise<(string | number)[]> {
  try {
    // Get current sheet structure
    const structureResult = await getSheetStructure();
    if (!structureResult.success || !structureResult.data) {
      throw new Error("Failed to get sheet structure");
    }

    const { productColumns } = structureResult.data;

    // Start with static columns
    const staticValues = [
      order.tracking || `LK${Date.now()}`,
      formatCustomerInfo(order),
      0, // Oil Qty (will be updated below)
      0, // Shampoo Qty (will be updated below)
      0, // Conditioner Qty (will be updated below)
      calculateTotal(order.products, order.freeShipping),
      order.status,
      order.paymentMethod,
      order.paymentReceived ? "Yes" : "No",
      order.freeShipping ? "Yes" : "No",
      order.orderDate,
      new Date().toISOString().split("T")[0],
    ];

    // Handle static product columns (Oil, Shampoo, Conditioner)
    const oilQty =
      order.products.find((p: any) => p.name === "Oil")?.quantity || 0;
    const shampooQty =
      order.products.find((p: any) => p.name === "Shampoo")?.quantity || 0;
    const conditionerQty =
      order.products.find((p: any) => p.name === "Conditioner")?.quantity || 0;

    staticValues[2] = oilQty;
    staticValues[3] = shampooQty;
    staticValues[4] = conditionerQty;

    // Add dynamic product columns
    const dynamicValues: number[] = [];
    for (const productCol of productColumns) {
      const qty =
        order.products.find((p: any) => p.name === productCol.name)?.quantity ||
        0;
      dynamicValues.push(qty);
    }

    return [...staticValues, ...dynamicValues];
  } catch (error) {
    console.error("Error creating dynamic sheet row:", error);
    // Fallback to static row format
    return orderToSheetRowStatic(order);
  }
}

// Fallback static function (original implementation)
function orderToSheetRowStatic(order: any): (string | number)[] {
  const oilQty =
    order.products.find((p: any) => p.name === "Oil")?.quantity || 0;
  const shampooQty =
    order.products.find((p: any) => p.name === "Shampoo")?.quantity || 0;
  const conditionerQty =
    order.products.find((p: any) => p.name === "Conditioner")?.quantity || 0;

  return [
    order.tracking || `LK${Date.now()}`,
    formatCustomerInfo(order),
    oilQty,
    shampooQty,
    conditionerQty,
    calculateTotal(order.products, order.freeShipping),
    order.status,
    order.paymentMethod,
    order.paymentReceived ? "Yes" : "No",
    order.freeShipping ? "Yes" : "No",
    order.orderDate,
    new Date().toISOString().split("T")[0],
  ];
}
