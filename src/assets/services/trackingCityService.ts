// trackingCityService.ts - Service to get cities for tracking IDs from Google Sheets

import { getRecipientCity } from "./existingWayBill";

interface TrackingCityData {
  trackingId: string;
  city: string | null;
  status: "success" | "failed" | "no_tracking";
  error?: string;
}

interface TrackingCityResult {
  success: boolean;
  data: TrackingCityData[];
  summary: {
    total: number;
    withTracking: number;
    citiesFound: number;
    citiesFailed: number;
  };
  error?: string;
}

// Configuration - same as your Google Sheets service
const GOOGLE_API_KEY =
  process.env.REACT_APP_GOOGLE_API_KEY || "YOUR_GOOGLE_API_KEY";
const SPREADSHEET_ID =
  process.env.REACT_APP_GOOGLE_SHEET_ID || "YOUR_GOOGLE_SHEET_ID";
const SHEET_NAME = "Orders"; // Your orders sheet name

/**
 * Get all tracking IDs from Google Sheets column A
 */
export async function getTrackingIdsFromSheet(): Promise<{
  success: boolean;
  trackingIds: string[];
  error?: string;
}> {
  try {
    const accessToken = localStorage.getItem("google_access_token");

    let response;
    if (accessToken) {
      // Use access token for authenticated requests
      response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!A:A`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
    } else {
      // Fallback to API key
      response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!A:A?key=${GOOGLE_API_KEY}`
      );
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    console.log(response);

    const data = await response.json();
    const rows = data.values || [];

    // Extract tracking IDs (skip header row)
    const trackingIds: string[] = rows
      .slice(1) // Skip header row
      .map((row: any[]) => row[0]) // Get column A value
      .filter((id: any) => id && typeof id === "string" && id.trim() !== "") // Filter out empty values
      .map((id: string) => id.trim()); // Clean whitespace

    console.log(
      `📋 Found ${trackingIds.length} tracking IDs from Google Sheets:`,
      trackingIds
    );

    return {
      success: true,
      trackingIds,
    };
  } catch (error) {
    console.error("Error fetching tracking IDs from Google Sheets:", error);
    return {
      success: false,
      trackingIds: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get cities for all tracking IDs from Google Sheets
 */
export async function getCitiesForAllTrackingIds(): Promise<TrackingCityResult> {
  try {
    console.log(
      "🚀 Starting to fetch cities for all tracking IDs from Google Sheets..."
    );

    // Step 1: Get all tracking IDs from Google Sheets
    const trackingResult = await getTrackingIdsFromSheet();

    if (!trackingResult.success) {
      return {
        success: false,
        data: [],
        summary: { total: 0, withTracking: 0, citiesFound: 0, citiesFailed: 0 },
        error: trackingResult.error,
      };
    }

    const trackingIds = trackingResult.trackingIds;
    console.log(`📊 Processing ${trackingIds.length} tracking IDs...`);

    // Step 2: Get cities for each tracking ID
    const results: TrackingCityData[] = [];
    let citiesFound = 0;
    let citiesFailed = 0;

    for (let i = 0; i < trackingIds.length; i++) {
      const trackingId = trackingIds[i];
      console.log(
        `🔍 [${i + 1}/${trackingIds.length}] Processing: ${trackingId}`
      );

      try {
        const city = await getRecipientCity(trackingId);

        if (city) {
          results.push({
            trackingId,
            city,
            status: "success",
          });
          citiesFound++;
          console.log(`✅ ${trackingId}: ${city}`);
        } else {
          results.push({
            trackingId,
            city: null,
            status: "failed",
            error: "City not found in FDE API",
          });
          citiesFailed++;
          console.log(`❌ ${trackingId}: City not found`);
        }

        // Add delay between requests to avoid rate limiting
        if (i < trackingIds.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      } catch (error) {
        results.push({
          trackingId,
          city: null,
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
        });
        citiesFailed++;
        console.log(`💥 ${trackingId}: Error - ${error}`);
      }
    }

    const summary = {
      total: trackingIds.length,
      withTracking: trackingIds.length,
      citiesFound,
      citiesFailed,
    };

    console.log("📈 Summary:", summary);

    return {
      success: true,
      data: results,
      summary,
    };
  } catch (error) {
    console.error("Error in getCitiesForAllTrackingIds:", error);
    return {
      success: false,
      data: [],
      summary: { total: 0, withTracking: 0, citiesFound: 0, citiesFailed: 0 },
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get city for a specific tracking ID (for individual order cards)
 */
export async function getCityForTrackingId(
  trackingId: string
): Promise<string | null> {
  try {
    console.log(`🔍 Getting city for tracking ID: ${trackingId}`);

    const city = await getRecipientCity(trackingId);

    if (city) {
      console.log(`✅ Found city for ${trackingId}: ${city}`);
      return city;
    } else {
      console.log(`❌ No city found for ${trackingId}`);
      return null;
    }
  } catch (error) {
    console.error(`💥 Error getting city for ${trackingId}:`, error);
    return null;
  }
}

/**
 * Create a map of tracking IDs to cities for easy lookup
 */
export async function createTrackingCityMap(): Promise<{
  success: boolean;
  cityMap: { [trackingId: string]: string | null };
  error?: string;
}> {
  try {
    const result = await getCitiesForAllTrackingIds();

    if (!result.success) {
      return {
        success: false,
        cityMap: {},
        error: result.error,
      };
    }

    // Create a map for easy lookup
    const cityMap: { [trackingId: string]: string | null } = {};

    result.data.forEach((item) => {
      cityMap[item.trackingId] = item.city;
    });

    console.log("🗺️ Created tracking-city map:", cityMap);

    return {
      success: true,
      cityMap,
    };
  } catch (error) {
    console.error("Error creating tracking-city map:", error);
    return {
      success: false,
      cityMap: {},
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Test function - fetch cities for first 5 tracking IDs
 */
export async function testCityFetch(): Promise<void> {
  console.log("🧪 Testing city fetch for first 5 tracking IDs...");

  const trackingResult = await getTrackingIdsFromSheet();

  if (!trackingResult.success) {
    console.error("❌ Failed to get tracking IDs:", trackingResult.error);
    return;
  }

  const testIds = trackingResult.trackingIds.slice(0, 5);
  console.log("🎯 Testing with tracking IDs:", testIds);

  for (const trackingId of testIds) {
    const city = await getCityForTrackingId(trackingId);
    console.log(`📍 ${trackingId} → ${city || "No city found"}`);
  }
}
