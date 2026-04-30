// Notes Service — reads/writes order notes from column S of the Orders sheet.
// Intentionally separate from googleSheetsService.ts to avoid coupling.

const SPREADSHEET_ID =
  process.env.REACT_APP_GOOGLE_SHEET_ID || "YOUR_GOOGLE_SHEET_ID";
const SHEET_NAME = "Orders";

interface NoteResult {
  success: boolean;
  error?: string;
}

function getAccessToken(): string {
  const token = localStorage.getItem("google_access_token");
  if (!token) throw new Error("No access token found. Please sign in first.");
  return token;
}

async function findRowNumber(
  accessToken: string,
  trackingId: string,
): Promise<number> {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!A:A`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!response.ok)
    throw new Error(`Failed to read sheet: ${response.status}`);

  const data = await response.json();
  const rows: string[][] = data.values || [];

  const rowIndex = rows.findIndex(
    (row, index) => index > 0 && row[0] === trackingId,
  );
  if (rowIndex === -1) throw new Error(`Order ${trackingId} not found`);

  return rowIndex + 1; // 1-based sheet row number
}

/**
 * Fetches all notes at once — returns a map of trackingId → note text.
 * Reads columns A (tracking ID) and S (notes) in one API call.
 */
export async function getAllOrderNotes(): Promise<Record<string, string>> {
  try {
    const accessToken = getAccessToken();

    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!A:S`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!response.ok)
      throw new Error(`Failed to read notes: ${response.status}`);

    const data = await response.json();
    const rows: string[][] = data.values || [];

    const noteMap: Record<string, string> = {};
    rows.slice(1).forEach((row) => {
      const trackingId = row[0];
      const note = row[18] || ""; // column S (index 18)
      if (trackingId) noteMap[trackingId] = note;
    });

    return noteMap;
  } catch (error) {
    console.error("Error fetching order notes:", error);
    return {};
  }
}

/**
 * Saves a note to column S for the given tracking ID.
 */
export async function updateOrderNote(
  trackingId: string,
  note: string,
): Promise<NoteResult> {
  try {
    const accessToken = getAccessToken();
    const rowNumber = await findRowNumber(accessToken, trackingId);

    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!S${rowNumber}?valueInputOption=RAW`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ values: [[note]] }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to save note: ${response.status} - ${errorText}`);
    }

    return { success: true };
  } catch (error) {
    console.error("Error saving order note:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
