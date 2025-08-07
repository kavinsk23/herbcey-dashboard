// csvPaymentService.ts - Service for updating payment status from CSV
// This service reads CSV files and updates payment status in Google Sheets

interface CsvRecord {
  "Waybill ID": string;
  "Order ID": string;
  "Weight (kg)": string;
  Client: string;
  "Order Date": string;
  "Last Scan Date": string;
  "Parcel Descp": string;
  "Delivered By": string;
  "Delivery Status": string;
  Amount: string;
  "Delivery Fee": string;
  "COD Commission": string;
  "Return Fee": string;
}

interface PaymentUpdateResult {
  success: boolean;
  processed: number;
  updated: number;
  errors: string[];
  details: {
    waybillId: string;
    status: "updated" | "not_found" | "error";
    message?: string;
  }[];
}

// Configuration
const SPREADSHEET_ID =
  process.env.REACT_APP_GOOGLE_SHEET_ID || "YOUR_GOOGLE_SHEET_ID";
const SHEET_NAME = "Orders"; // Your orders sheet name

// Function to parse CSV file
async function parseCsvFile(file: File): Promise<CsvRecord[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const csvText = e.target?.result as string;
        const lines = csvText.split("\n");

        if (lines.length < 2) {
          throw new Error(
            "CSV file must have at least a header row and one data row"
          );
        }

        // Parse header
        const headers = lines[0]
          .split(",")
          .map((h) => h.trim().replace(/"/g, ""));

        // Parse data rows
        const records: CsvRecord[] = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const values = line.split(",").map((v) => v.trim().replace(/"/g, ""));
          const record = {} as CsvRecord;

          headers.forEach((header, index) => {
            (record as any)[header] = values[index] || "";
          });

          records.push(record);
        }

        resolve(records);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

// Function to get all orders from Google Sheets
async function getAllOrdersForUpdate(): Promise<any[]> {
  const accessToken = localStorage.getItem("google_access_token");
  if (!accessToken) {
    throw new Error("No access token found. Please sign in first.");
  }

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get orders: ${response.status}`);
  }

  const data = await response.json();
  return data.values || [];
}

// Function to update a specific cell in Google Sheets
async function updatePaymentStatus(rowIndex: number): Promise<boolean> {
  const accessToken = localStorage.getItem("google_access_token");
  if (!accessToken) {
    throw new Error("No access token found. Please sign in first.");
  }

  // Column I is index 8 (0-based), but in A1 notation it's column I
  const cellRange = `${SHEET_NAME}!I${rowIndex + 1}`;

  const response = await fetch(
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

  return response.ok;
}

// Main function to process CSV and update payments
export async function updatePaymentsFromCsv(
  file: File
): Promise<PaymentUpdateResult> {
  const result: PaymentUpdateResult = {
    success: false,
    processed: 0,
    updated: 0,
    errors: [],
    details: [],
  };

  try {
    // Step 1: Parse the CSV file
    console.log("Parsing CSV file...");
    const csvRecords = await parseCsvFile(file);
    result.processed = csvRecords.length;

    if (csvRecords.length === 0) {
      result.errors.push("No records found in CSV file");
      return result;
    }

    // Step 2: Get all orders from Google Sheets
    console.log("Fetching orders from Google Sheets...");
    const sheetRows = await getAllOrdersForUpdate();

    if (sheetRows.length < 2) {
      result.errors.push("No orders found in Google Sheets");
      return result;
    }

    // Step 3: Process each CSV record
    console.log(`Processing ${csvRecords.length} CSV records...`);

    for (const csvRecord of csvRecords) {
      const waybillId = csvRecord["Waybill ID"];

      if (!waybillId) {
        result.details.push({
          waybillId: "Unknown",
          status: "error",
          message: "Missing Waybill ID in CSV record",
        });
        continue;
      }

      try {
        // Find matching order in Google Sheets (skip header row)
        // Tracking ID is in column A (index 0)
        let foundRowIndex = -1;

        for (let i = 1; i < sheetRows.length; i++) {
          const trackingId = sheetRows[i][0]?.toString().trim();
          if (trackingId === waybillId) {
            foundRowIndex = i;
            break;
          }
        }

        if (foundRowIndex === -1) {
          result.details.push({
            waybillId,
            status: "not_found",
            message: "Order not found in Google Sheets",
          });
          continue;
        }

        // Check if payment is already marked as received
        const currentPaymentStatus = sheetRows[foundRowIndex][8]; // Column I (Payment Received)
        if (currentPaymentStatus === "Yes") {
          result.details.push({
            waybillId,
            status: "updated",
            message: "Payment already marked as received",
          });
          continue;
        }

        // Update payment status
        const updateSuccess = await updatePaymentStatus(foundRowIndex);

        if (updateSuccess) {
          result.updated++;
          result.details.push({
            waybillId,
            status: "updated",
            message: "Payment status updated successfully",
          });
        } else {
          result.details.push({
            waybillId,
            status: "error",
            message: "Failed to update payment status",
          });
        }

        // Add small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        result.details.push({
          waybillId,
          status: "error",
          message: error instanceof Error ? error.message : "Unknown error",
        });
        result.errors.push(
          `Error processing ${waybillId}: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    }

    result.success =
      result.updated > 0 ||
      (result.processed > 0 && result.errors.length === 0);
    console.log(
      `Payment update completed. Updated: ${result.updated}/${result.processed}`
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    result.errors.push(errorMessage);
    console.error("Error in updatePaymentsFromCsv:", error);
  }

  return result;
}

// Function to validate CSV format
export function validateCsvFormat(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      resolve(false);
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const csvText = e.target?.result as string;
        const firstLine = csvText.split("\n")[0];

        // Check if it contains the expected headers
        const hasWaybillId = firstLine.includes("Waybill ID");
        const hasOrderId = firstLine.includes("Order ID");

        resolve(hasWaybillId && hasOrderId);
      } catch {
        resolve(false);
      }
    };

    reader.onerror = () => resolve(false);
    reader.readAsText(file, "utf-8");
  });
}
