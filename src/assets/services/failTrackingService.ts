// failTrackingService.ts - Service for managing failed tracking numbers in Google Sheets

interface FailedTracking {
  id: string;
  trackingId: string;
  reason: string;
  attemptCount: number;
  firstFailed: string;
  lastAttempt: string;
  status: "Failed" | "Retry" | "Resolved";
  errorDetails?: string;
}

interface SheetFailedTracking {
  id: string;
  trackingId: string;
  reason: string;
  attemptCount: number;
  firstFailed: string;
  lastAttempt: string;
  status: string;
  errorDetails: string;
}

interface ApiResponse<T = any> {
  success: boolean;
  error?: string;
  data?: T;
}

// Configuration
const SPREADSHEET_ID =
  process.env.REACT_APP_GOOGLE_SHEET_ID || "YOUR_GOOGLE_SHEET_ID";
const FAIL_TRACKING_SHEET_NAME = "FailTrackings";

// Function to convert FailedTracking to sheet row format
function failedTrackingToSheetRow(
  tracking: FailedTracking
): (string | number)[] {
  return [
    tracking.id,
    tracking.trackingId,
    tracking.reason,
    tracking.attemptCount,
    tracking.firstFailed,
    tracking.lastAttempt,
    tracking.status,
    tracking.errorDetails || "",
  ];
}

// Function to convert sheet row to FailedTracking
function sheetRowToFailedTracking(row: any[]): FailedTracking {
  return {
    id: row[0] || "",
    trackingId: row[1] || "",
    reason: row[2] || "",
    attemptCount: parseInt(row[3]) || 0,
    firstFailed: row[4] || "",
    lastAttempt: row[5] || "",
    status: (row[6] || "Failed") as "Failed" | "Retry" | "Resolved",
    errorDetails: row[7] || "",
  };
}

// Function to get all failed trackings from Google Sheets
export async function getFailedTrackings(): Promise<
  ApiResponse<FailedTracking[]>
> {
  try {
    const accessToken = localStorage.getItem("google_access_token");
    if (!accessToken) {
      throw new Error("No access token found. Please sign in first.");
    }

    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${FAIL_TRACKING_SHEET_NAME}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get failed trackings: ${response.status}`);
    }

    const data = await response.json();
    const rows = data.values || [];

    if (rows.length === 0) {
      return { success: true, data: [] };
    }

    // Skip header row and convert to FailedTracking objects
    const failedTrackings: FailedTracking[] = rows
      .slice(1)
      .filter((row: any[]) => row.length > 0 && row[0]) // Filter out empty rows
      .map((row: any[]) => sheetRowToFailedTracking(row));

    return { success: true, data: failedTrackings };
  } catch (error) {
    console.error("Error getting failed trackings:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Function to add a new failed tracking to Google Sheets
export async function addFailedTracking(trackingData: {
  trackingId: string;
  reason: string;
  errorDetails?: string;
}): Promise<ApiResponse> {
  try {
    const accessToken = localStorage.getItem("google_access_token");
    if (!accessToken) {
      throw new Error("No access token found. Please sign in first.");
    }

    const now = new Date().toISOString();
    const newTracking: FailedTracking = {
      id: `FT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      trackingId: trackingData.trackingId,
      reason: trackingData.reason,
      attemptCount: 1,
      firstFailed: now,
      lastAttempt: now,
      status: "Failed",
      errorDetails: trackingData.errorDetails || "",
    };

    // Check if tracking already exists
    const existingResult = await getFailedTrackings();
    if (existingResult.success && existingResult.data) {
      const existingTracking = existingResult.data.find(
        (t) =>
          t.trackingId === trackingData.trackingId && t.status !== "Resolved"
      );

      if (existingTracking) {
        // Update existing tracking instead of creating new one
        return await updateFailedTracking(existingTracking.id, {
          ...existingTracking,
          attemptCount: existingTracking.attemptCount + 1,
          lastAttempt: now,
          errorDetails:
            trackingData.errorDetails || existingTracking.errorDetails,
        });
      }
    }

    const rowData = failedTrackingToSheetRow(newTracking);

    // Append new failed tracking row
    const appendRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${FAIL_TRACKING_SHEET_NAME}:append?valueInputOption=RAW`,
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
      throw new Error(`Failed to add failed tracking: ${appendRes.status}`);
    }

    console.log("Failed tracking added successfully:", newTracking.trackingId);
    return { success: true, data: newTracking };
  } catch (error) {
    console.error("Error adding failed tracking:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Function to update an existing failed tracking
export async function updateFailedTracking(
  trackingId: string,
  updatedTracking: FailedTracking
): Promise<ApiResponse> {
  try {
    const accessToken = localStorage.getItem("google_access_token");
    if (!accessToken) {
      throw new Error("No access token found. Please sign in first.");
    }

    // Get all data to find the row with the tracking ID
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${FAIL_TRACKING_SHEET_NAME}`,
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
      (row: any[], index: number) => index > 0 && row[0] === trackingId
    );

    if (rowIndex === -1) {
      throw new Error("Failed tracking not found");
    }

    // Prepare updated row data
    const updatedRowData = failedTrackingToSheetRow(updatedTracking);
    const actualRowNumber = rowIndex + 1; // Convert to 1-based indexing

    // Update the row
    const updateResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${FAIL_TRACKING_SHEET_NAME}!A${actualRowNumber}:H${actualRowNumber}?valueInputOption=RAW`,
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
        `Failed to update failed tracking: ${updateResponse.status} - ${errorText}`
      );
    }

    console.log("Failed tracking updated successfully");
    return { success: true };
  } catch (error) {
    console.error("Error updating failed tracking:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Function to delete a failed tracking from Google Sheets
export async function deleteFailedTracking(
  trackingId: string
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
      (s: any) => s.properties.title === FAIL_TRACKING_SHEET_NAME
    );

    if (!sheet) {
      throw new Error(`Sheet "${FAIL_TRACKING_SHEET_NAME}" not found`);
    }

    const sheetId = sheet.properties.sheetId;

    // Get all data to find the row with the tracking ID
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${FAIL_TRACKING_SHEET_NAME}`,
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
      (row: any[], index: number) => index > 0 && row[0] === trackingId
    );

    if (rowIndex === -1) {
      throw new Error("Failed tracking not found");
    }

    // Delete the row using batchUpdate
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
                  startIndex: rowIndex,
                  endIndex: rowIndex + 1,
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
        `Failed to delete failed tracking: ${deleteResponse.status} - ${errorText}`
      );
    }

    console.log("Failed tracking deleted successfully");
    return { success: true };
  } catch (error) {
    console.error("Error deleting failed tracking:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Function to retry a failed tracking by attempting to update payment status
export async function retryFailedTracking(
  trackingId: string
): Promise<ApiResponse> {
  try {
    const accessToken = localStorage.getItem("google_access_token");
    if (!accessToken) {
      throw new Error("No access token found. Please sign in first.");
    }

    // Get the failed tracking details
    const failedTrackingsResult = await getFailedTrackings();
    if (!failedTrackingsResult.success || !failedTrackingsResult.data) {
      throw new Error("Failed to get failed trackings data");
    }

    const failedTracking = failedTrackingsResult.data.find(
      (ft) => ft.id === trackingId
    );
    if (!failedTracking) {
      throw new Error("Failed tracking not found");
    }

    // Try to find and update the order in the main Orders sheet
    const ordersResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Orders`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!ordersResponse.ok) {
      throw new Error(`Failed to get orders: ${ordersResponse.status}`);
    }

    const ordersData = await ordersResponse.json();
    const orderRows = ordersData.values || [];

    // Find matching order by tracking ID (Column A)
    let foundOrderRowIndex = -1;
    for (let i = 1; i < orderRows.length; i++) {
      const orderTrackingId = orderRows[i][0]?.toString().trim();
      if (orderTrackingId === failedTracking.trackingId) {
        foundOrderRowIndex = i;
        break;
      }
    }

    if (foundOrderRowIndex === -1) {
      // Still not found, update failed tracking with new attempt
      await updateFailedTracking(trackingId, {
        ...failedTracking,
        attemptCount: failedTracking.attemptCount + 1,
        lastAttempt: new Date().toISOString(),
        status: "Failed",
        errorDetails: "Order still not found in system",
      });

      throw new Error("Order not found in system");
    }

    // Check if payment is already marked as received (Column I)
    const currentPaymentStatus = orderRows[foundOrderRowIndex][8];
    if (currentPaymentStatus === "Yes") {
      // Payment already received, mark as resolved
      await updateFailedTracking(trackingId, {
        ...failedTracking,
        attemptCount: failedTracking.attemptCount + 1,
        lastAttempt: new Date().toISOString(),
        status: "Resolved",
        errorDetails: "Payment already marked as received",
      });

      return { success: true, data: "Payment already marked as received" };
    }

    // Update payment status to "Yes"
    const cellRange = `Orders!I${foundOrderRowIndex + 1}`;
    const updateResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${cellRange}?valueInputOption=RAW`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          values: [["Yes"]],
        }),
      }
    );

    if (!updateResponse.ok) {
      // Update failed tracking with retry status
      await updateFailedTracking(trackingId, {
        ...failedTracking,
        attemptCount: failedTracking.attemptCount + 1,
        lastAttempt: new Date().toISOString(),
        status: "Retry",
        errorDetails: `Failed to update payment status: ${updateResponse.status}`,
      });

      throw new Error(
        `Failed to update payment status: ${updateResponse.status}`
      );
    }

    // Successfully updated, mark as resolved
    await updateFailedTracking(trackingId, {
      ...failedTracking,
      attemptCount: failedTracking.attemptCount + 1,
      lastAttempt: new Date().toISOString(),
      status: "Resolved",
      errorDetails: "Payment status updated successfully",
    });

    console.log(
      `Successfully retried and resolved tracking: ${failedTracking.trackingId}`
    );
    return { success: true, data: "Payment status updated successfully" };
  } catch (error) {
    console.error("Error retrying failed tracking:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Function to initialize the FailTrackings sheet with headers if it doesn't exist
export async function initializeFailTrackingsSheet(): Promise<ApiResponse> {
  try {
    const accessToken = localStorage.getItem("google_access_token");
    if (!accessToken) {
      throw new Error("No access token found. Please sign in first.");
    }

    // Check if sheet exists
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
    const sheetExists = metadata.sheets.some(
      (s: any) => s.properties.title === FAIL_TRACKING_SHEET_NAME
    );

    if (sheetExists) {
      return { success: true, data: "Sheet already exists" };
    }

    // Create the sheet
    const createResponse = await fetch(
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
              addSheet: {
                properties: {
                  title: FAIL_TRACKING_SHEET_NAME,
                },
              },
            },
          ],
        }),
      }
    );

    if (!createResponse.ok) {
      throw new Error(`Failed to create sheet: ${createResponse.status}`);
    }

    // Add headers
    const headers = [
      "ID",
      "Tracking ID",
      "Reason",
      "Attempt Count",
      "First Failed",
      "Last Attempt",
      "Status",
      "Error Details",
    ];

    const headerResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${FAIL_TRACKING_SHEET_NAME}!A1:H1?valueInputOption=RAW`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          values: [headers],
        }),
      }
    );

    if (!headerResponse.ok) {
      throw new Error(`Failed to add headers: ${headerResponse.status}`);
    }

    console.log("FailTrackings sheet initialized successfully");
    return { success: true, data: "Sheet created and initialized" };
  } catch (error) {
    console.error("Error initializing FailTrackings sheet:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
