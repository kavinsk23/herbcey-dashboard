// priceHistoryService.ts - Service for tracking product price history over time

const SPREADSHEET_ID = process.env.REACT_APP_GOOGLE_SHEET_ID || "";
const PRICE_HISTORY_SHEET = "Price_History";

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes: fresh window
const ERROR_COOLDOWN_MS = 30 * 1000; // 30 seconds: minimum gap between retries after a failure

let cachedHistory: PriceHistoryRow[] | null = null;
let cacheTimestamp = 0;
let lastErrorTimestamp = 0;
let inflight: Promise<PriceHistoryRow[]> | null = null;

export interface PriceHistoryRow {
  id: string;
  productId: string;
  productName: string;
  cost: number;
  price: number;
  effectiveFrom: string; // "YYYY-MM-DD"
  effectiveTo: string; // "YYYY-MM-DD" or "" if still active
}

export function getPriceHistory(): Promise<PriceHistoryRow[]> {
  const now = Date.now();

  // Cache hit: data is still fresh — return a copy so callers can't mutate the cache
  if (cachedHistory !== null && now - cacheTimestamp < CACHE_TTL_MS) {
    return Promise.resolve([...cachedHistory]);
  }

  // Inflight deduplication: a fetch is already in progress, share it
  if (inflight) return inflight;

  // Error cooldown: the last fetch failed recently — serve stale data if available,
  // otherwise empty, to avoid hammering the API (e.g. during a 429 window)
  if (now - lastErrorTimestamp < ERROR_COOLDOWN_MS) {
    return Promise.resolve(cachedHistory ? [...cachedHistory] : []);
  }

  const promise: Promise<PriceHistoryRow[]> = (async () => {
    try {
      const accessToken = localStorage.getItem("google_access_token");
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${PRICE_HISTORY_SHEET}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );

      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);

      const data = await response.json();
      const rows = data.values || [];

      const result: PriceHistoryRow[] = rows.slice(1).map((row: any[]) => ({
        id: row[0] || "",
        productId: row[1] || "",
        productName: row[2] || "",
        cost: parseFloat(row[3]) || 0,
        price: parseFloat(row[4]) || 0,
        effectiveFrom: row[5] || "",
        effectiveTo: row[6] || "",
      }));

      cachedHistory = result;
      cacheTimestamp = Date.now();
      lastErrorTimestamp = 0; // clear any previous error state on success
      return [...result];
    } catch (error) {
      console.error("Error loading price history:", error);
      lastErrorTimestamp = Date.now();
      // Serve stale data if we have any, so the UI degrades gracefully
      return cachedHistory ? [...cachedHistory] : [];
    } finally {
      inflight = null;
    }
  })();

  inflight = promise;
  return promise;
}

// Invalidate the cache so the next getPriceHistory() call goes to the API.
// Call this before mutating the sheet so a partial write failure always
// forces a fresh read rather than using stale cachedHistory.
export function invalidatePriceHistoryCache() {
  cachedHistory = null;
  cacheTimestamp = 0;
}

// Get the selling price that was active on a given date for a product
export function getPriceForDate(
  history: PriceHistoryRow[],
  productName: string,
  dateStr: string,
): number {
  if (!dateStr || history.length === 0) return 0;

  const date = new Date(dateStr);

  const match = history.find((row) => {
    if (row.productName !== productName) return false;
    const from = new Date(row.effectiveFrom);
    const to = row.effectiveTo ? new Date(row.effectiveTo) : null;
    return date >= from && (to === null || date <= to);
  });

  return match ? match.price : 0;
}

// Get the cost that was active on a given date for a product
export function getCostForDate(
  history: PriceHistoryRow[],
  productName: string,
  dateStr: string,
): number {
  if (!dateStr || history.length === 0) return 0;

  const date = new Date(dateStr);

  const match = history.find((row) => {
    if (row.productName !== productName) return false;
    const from = new Date(row.effectiveFrom);
    const to = row.effectiveTo ? new Date(row.effectiveTo) : null;
    return date >= from && (to === null || date <= to);
  });

  return match ? match.cost : 0;
}

// Called when price or cost changes — closes current active row, opens new one from this month
export async function recordPriceChange(
  productId: string,
  productName: string,
  newCost: number,
  newPrice: number,
): Promise<{ success: boolean; error?: string }> {
  try {
    const accessToken = localStorage.getItem("google_access_token");
    const history = await getPriceHistory();

    // Find the currently active row for this product (Effective_To is blank)
    const activeRowIndex = history.findIndex(
      (row) => row.productId === productId && row.effectiveTo === "",
    );

    const now = new Date();

    // Last day of PREVIOUS month — e.g. if today is April 27, this is March 31
    const lastDayPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0)
      .toISOString()
      .split("T")[0];

    // First day of CURRENT month — e.g. April 1
    const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0];

    // Invalidate before the first write so that any partial failure (PUT succeeds,
    // append fails) forces a fresh fetch rather than serving stale cachedHistory
    invalidatePriceHistoryCache();

    // Close the active row by writing Effective_To into column G
    if (activeRowIndex !== -1) {
      // +2 because: slice(1) removes header, and sheets rows are 1-based
      const sheetRowNumber = activeRowIndex + 2;

      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${PRICE_HISTORY_SHEET}!G${sheetRowNumber}?valueInputOption=RAW`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ values: [[lastDayPrevMonth]] }),
        },
      );
    }

    // Append the new active row
    const newId = `ph_${Date.now()}`;
    const appendRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${PRICE_HISTORY_SHEET}:append?valueInputOption=RAW`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          values: [
            [
              newId,
              productId,
              productName,
              newCost,
              newPrice,
              firstDayThisMonth,
              "",
            ],
          ],
        }),
      },
    );

    if (!appendRes.ok) {
      const errorText = await appendRes.text();
      throw new Error(`Failed to append: ${appendRes.status} - ${errorText}`);
    }

    console.log(
      `Price history recorded for ${productName}: ${newPrice} from ${firstDayThisMonth}`,
    );
    return { success: true };
  } catch (error) {
    console.error("Error recording price change:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
