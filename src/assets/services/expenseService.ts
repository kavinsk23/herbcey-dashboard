// expenseService.js - Dedicated service for expense management
// This uses the Google Sheets REST API directly without Node.js dependencies

// Types for Expenses
interface Expense {
  id: string;
  type: "Shampoo" | "Conditioner" | "Oil" | "Other";
  amount: number;
  note: string;
  date: string;
}

interface SheetExpense {
  id: string;
  type: string;
  amount: number;
  note: string;
  date: string;
  timestamp: string;
}

interface ApiResponse<T = any> {
  success: boolean;
  error?: string;
  data?: T;
}

// Configuration - Using same spreadsheet but different sheet
const GOOGLE_API_KEY =
  process.env.REACT_APP_GOOGLE_API_KEY || "YOUR_GOOGLE_API_KEY";
const SPREADSHEET_ID =
  process.env.REACT_APP_GOOGLE_SHEET_ID || "YOUR_GOOGLE_SHEET_ID";
const EXPENSES_SHEET_NAME = "Expenses"; // This sheet needs to be created in your Google Sheets

// Function to convert expense to sheet row format
function expenseToSheetRow(expense: Expense): (string | number)[] {
  return [
    expense.id,
    expense.type,
    expense.amount,
    expense.note || "",
    expense.date,
    new Date().toISOString().split("T")[0], // timestamp
  ];
}

// Function to add a new expense to Google Sheets
export async function addExpenseToSheet(
  expense: Expense
): Promise<ApiResponse> {
  try {
    const accessToken = localStorage.getItem("google_access_token");
    if (!accessToken) {
      throw new Error("No access token found. Please sign in first.");
    }

    const rowData = expenseToSheetRow(expense);

    // Append new expense row
    const appendRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${EXPENSES_SHEET_NAME}:append?valueInputOption=RAW`,
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
        `Failed to add expense: ${appendRes.status} - ${errorText}`
      );
    }

    console.log("Expense added successfully to Google Sheets");
    return {
      success: true,
      data: expense,
    };
  } catch (error) {
    console.error("Error adding expense:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Function to get all expenses from the sheet
export async function getAllExpensesFromSheet(): Promise<
  ApiResponse<SheetExpense[]>
> {
  try {
    const accessToken = localStorage.getItem("google_access_token");

    let response;
    if (accessToken) {
      response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${EXPENSES_SHEET_NAME}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
    } else {
      // Fallback to API key if no access token
      response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${EXPENSES_SHEET_NAME}?key=${GOOGLE_API_KEY}`
      );
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const rows = data.values || [];

    // Skip header row if it exists and convert to SheetExpense format
    const expenses: SheetExpense[] = rows.slice(1).map((row: any[]) => ({
      id: row[0] || "",
      type: row[1] || "",
      amount: parseFloat(row[2]) || 0,
      note: row[3] || "",
      date: row[4] || "",
      timestamp: row[5] || "",
    }));

    console.log("Expenses fetched successfully from Google Sheets");
    return { success: true, data: expenses };
  } catch (error) {
    console.error("Error fetching expenses from Google Sheets:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Function to update an existing expense
export async function updateExpenseInSheet(
  expenseId: string,
  updatedExpense: Expense
): Promise<ApiResponse> {
  try {
    const accessToken = localStorage.getItem("google_access_token");
    if (!accessToken) {
      throw new Error("No access token found. Please sign in first.");
    }

    // Get all data to find the row with the expense ID
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${EXPENSES_SHEET_NAME}`,
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
      (row: any[], index: number) => index > 0 && row[0] === expenseId
    );

    if (rowIndex === -1) {
      throw new Error("Expense not found");
    }

    // Prepare updated row data
    const updatedRowData = expenseToSheetRow(updatedExpense);
    const actualRowNumber = rowIndex + 1; // Convert to 1-based indexing

    // Update the row
    const updateResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${EXPENSES_SHEET_NAME}!A${actualRowNumber}:F${actualRowNumber}?valueInputOption=RAW`,
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
        `Failed to update expense: ${updateResponse.status} - ${errorText}`
      );
    }

    console.log("Expense updated successfully in Google Sheets");
    return { success: true };
  } catch (error) {
    console.error("Error updating expense in Google Sheets:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Function to delete an expense from Google Sheets
export async function deleteExpenseFromSheet(
  expenseId: string
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
      (s: any) => s.properties.title === EXPENSES_SHEET_NAME
    );

    if (!sheet) {
      throw new Error(`Sheet "${EXPENSES_SHEET_NAME}" not found`);
    }

    const sheetId = sheet.properties.sheetId;

    // Get all data to find the row with the expense ID
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${EXPENSES_SHEET_NAME}`,
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
      (row: any[], index: number) => index > 0 && row[0] === expenseId
    );

    if (rowIndex === -1) {
      throw new Error("Expense not found");
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
        `Failed to delete expense: ${deleteResponse.status} - ${errorText}`
      );
    }

    console.log("Expense deleted successfully from Google Sheets");
    return { success: true };
  } catch (error) {
    console.error("Error deleting expense from Google Sheets:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Function to get expense summary/analytics
export async function getExpenseSummary(
  startDate?: string,
  endDate?: string
): Promise<
  ApiResponse<{
    totalExpenses: number;
    expensesByType: Record<string, number>;
    monthlyExpenses: Record<string, number>;
  }>
> {
  try {
    const result = await getAllExpensesFromSheet();

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "Failed to fetch expenses",
      };
    }

    const expenses = result.data;

    // Filter by date range if provided
    const filteredExpenses = expenses.filter((expense) => {
      if (!startDate || !endDate) return true;
      const expenseDate = new Date(expense.date);
      return (
        expenseDate >= new Date(startDate) && expenseDate <= new Date(endDate)
      );
    });

    // Calculate totals
    const totalExpenses = filteredExpenses.reduce(
      (sum, expense) => sum + expense.amount,
      0
    );

    // Group by type
    const expensesByType = filteredExpenses.reduce((acc, expense) => {
      acc[expense.type] = (acc[expense.type] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    // Group by month
    const monthlyExpenses = filteredExpenses.reduce((acc, expense) => {
      const monthKey = expense.date.substring(0, 7); // YYYY-MM format
      acc[monthKey] = (acc[monthKey] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    return {
      success: true,
      data: {
        totalExpenses,
        expensesByType,
        monthlyExpenses,
      },
    };
  } catch (error) {
    console.error("Error calculating expense summary:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
