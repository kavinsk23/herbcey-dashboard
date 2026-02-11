// City Service - Google Sheets Integration
// This uses the Google Sheets REST API directly without Node.js dependencies

// Types for city data
export interface City {
  name: string;
  region?: string;
  deliveryDays?: number;
  specialNotes?: string;
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
const CITY_SHEET_NAME = "Cities"; // Change this to your cities sheet name

// Cache for cities to reduce API calls
let citiesCache: City[] = [];
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

// Function to get all cities from Google Sheets
export async function getCitiesFromSheet(): Promise<ApiResponse<City[]>> {
  try {
    // Check cache first
    const now = Date.now();
    if (citiesCache.length > 0 && now - cacheTimestamp < CACHE_DURATION) {
      return { success: true, data: citiesCache };
    }

    // Try different possible sheet names
    const possibleSheetNames = [
      "Cities",
      "Delivery Cities",
      "City List",
      "Locations",
      "CityData",
      "Delivery Areas",
    ];

    let cities: City[] = [];

    for (const sheetName of possibleSheetNames) {
      try {
        const response = await getSheetData(sheetName);

        if (response.success && response.data) {
          cities = response.data;
          if (cities.length > 0) {
            // Cache the results
            citiesCache = cities;
            cacheTimestamp = now;
            console.log(
              `Found cities in sheet: ${sheetName}, count: ${cities.length}`,
            );
            break;
          }
        }
      } catch (error) {
        console.log(`Sheet "${sheetName}" not found or error:`, error);
        continue;
      }
    }

    // If no cities found, use default cities
    if (cities.length === 0) {
      console.log("No city sheet found, using default cities");
      cities = getDefaultCities();
      citiesCache = cities;
      cacheTimestamp = now;
    }

    return { success: true, data: cities };
  } catch (error) {
    console.error("Error fetching cities from Google Sheets:", error);
    return {
      success: true, // Return true with defaults
      data: getDefaultCities(),
    };
  }
}

// Helper function to get data from a specific sheet
async function getSheetData(sheetName: string): Promise<ApiResponse<City[]>> {
  try {
    // First try with access token (for authenticated requests)
    const accessToken = localStorage.getItem("google_access_token");

    let response;
    if (accessToken) {
      response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${sheetName}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
    } else {
      // Fallback to API key if no access token
      response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${sheetName}?key=${GOOGLE_API_KEY}`,
      );
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const rows = data.values || [];

    if (rows.length === 0) {
      return { success: false, error: "Empty sheet" };
    }

    // Try to find header row and determine column positions
    const headerRowIndex = findHeaderRow(rows);
    const columnMap = mapColumns(rows[headerRowIndex] || rows[0]);

    // Parse cities from rows (skip header rows)
    const startRow = headerRowIndex + 1;
    const cities: City[] = [];

    for (let i = startRow; i < rows.length; i++) {
      const row = rows[i];
      const city = parseCityRow(row, columnMap);
      if (city.name) {
        cities.push(city);
      }
    }

    return { success: true, data: cities };
  } catch (error) {
    throw error;
  }
}

// Find header row by looking for common column names
function findHeaderRow(rows: any[][]): number {
  const headerKeywords = [
    "city",
    "name",
    "region",
    "area",
    "delivery",
    "days",
    "notes",
  ];

  for (let i = 0; i < Math.min(3, rows.length); i++) {
    const row = rows[i];
    if (Array.isArray(row)) {
      const rowText = row.join(" ").toLowerCase();
      const hasHeaderKeywords = headerKeywords.some((keyword) =>
        rowText.includes(keyword),
      );
      if (hasHeaderKeywords) {
        return i;
      }
    }
  }

  return 0; // Default to first row if no header found
}

// Map column positions based on header names
function mapColumns(headerRow: any[]): Record<string, number> {
  const columnMap: Record<string, number> = {
    name: -1,
    region: -1,
    deliveryDays: -1,
    specialNotes: -1,
  };

  headerRow.forEach((cell, index) => {
    if (typeof cell === "string") {
      const lowerCell = cell.toLowerCase().trim();
      if (lowerCell.includes("city") || lowerCell.includes("name")) {
        columnMap.name = index;
      } else if (
        lowerCell.includes("region") ||
        lowerCell.includes("area") ||
        lowerCell.includes("province")
      ) {
        columnMap.region = index;
      } else if (lowerCell.includes("delivery") || lowerCell.includes("days")) {
        columnMap.deliveryDays = index;
      } else if (lowerCell.includes("note") || lowerCell.includes("remark")) {
        columnMap.specialNotes = index;
      }
    }
  });

  return columnMap;
}

// Parse a single row into City object
function parseCityRow(row: any[], columnMap: Record<string, number>): City {
  const city: City = {
    name: "",
  };

  if (columnMap.name >= 0 && row[columnMap.name]) {
    city.name = String(row[columnMap.name]).trim();
  }

  if (columnMap.region >= 0 && row[columnMap.region]) {
    city.region = String(row[columnMap.region]).trim();
  }

  if (columnMap.deliveryDays >= 0 && row[columnMap.deliveryDays]) {
    const days = parseInt(String(row[columnMap.deliveryDays]));
    if (!isNaN(days)) {
      city.deliveryDays = days;
    }
  }

  if (columnMap.specialNotes >= 0 && row[columnMap.specialNotes]) {
    city.specialNotes = String(row[columnMap.specialNotes]).trim();
  }

  return city;
}

// Search cities with autocomplete
export async function searchCities(
  query: string,
): Promise<ApiResponse<City[]>> {
  try {
    const result = await getCitiesFromSheet();

    if (!result.success || !result.data || result.data.length === 0) {
      return { success: false, error: "No cities available" };
    }

    const lowerQuery = query.toLowerCase().trim();

    if (!lowerQuery) {
      return {
        success: true,
        data: result.data.slice(0, 20), // Return first 20 cities if no query
      };
    }

    // Filter cities that match the query
    const filteredCities = result.data
      .filter((city) => {
        const cityName = city.name.toLowerCase();
        const cityRegion = (city.region || "").toLowerCase();

        return (
          cityName.includes(lowerQuery) ||
          cityRegion.includes(lowerQuery) ||
          cityName.startsWith(lowerQuery)
        );
      })
      .slice(0, 20); // Limit to 20 results

    return { success: true, data: filteredCities };
  } catch (error) {
    console.error("Error searching cities:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Get all unique regions
export async function getRegions(): Promise<ApiResponse<string[]>> {
  try {
    const result = await getCitiesFromSheet();

    if (!result.success || !result.data) {
      return { success: false, error: "Failed to load cities" };
    }

    const regions = result.data
      .map((city) => city.region)
      .filter((region): region is string => !!region && region.trim() !== "")
      .filter((region, index, self) => self.indexOf(region) === index) // Unique
      .sort();

    return { success: true, data: regions };
  } catch (error) {
    console.error("Error getting regions:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Clear cache (useful for development)
export function clearCitiesCache(): void {
  citiesCache = [];
  cacheTimestamp = 0;
  console.log("City cache cleared");
}

// Default cities as fallback
function getDefaultCities(): City[] {
  return [
    { name: "Colombo", region: "Western", deliveryDays: 1 },
    { name: "Kandy", region: "Central", deliveryDays: 2 },
    { name: "Galle", region: "Southern", deliveryDays: 2 },
    { name: "Jaffna", region: "Northern", deliveryDays: 3 },
    { name: "Negombo", region: "Western", deliveryDays: 1 },
    { name: "Matara", region: "Southern", deliveryDays: 2 },
    { name: "Anuradhapura", region: "North Central", deliveryDays: 3 },
    { name: "Polonnaruwa", region: "North Central", deliveryDays: 3 },
    { name: "Trincomalee", region: "Eastern", deliveryDays: 3 },
    { name: "Batticaloa", region: "Eastern", deliveryDays: 3 },
    { name: "Ratnapura", region: "Sabaragamuwa", deliveryDays: 2 },
    { name: "Kegalle", region: "Sabaragamuwa", deliveryDays: 2 },
    { name: "Badulla", region: "Uva", deliveryDays: 3 },
    { name: "Monaragala", region: "Uva", deliveryDays: 3 },
    { name: "Kurunegala", region: "North Western", deliveryDays: 2 },
    { name: "Puttalam", region: "North Western", deliveryDays: 2 },
    { name: "Kalutara", region: "Western", deliveryDays: 1 },
    { name: "Hambantota", region: "Southern", deliveryDays: 2 },
    { name: "Mannar", region: "Northern", deliveryDays: 3 },
    { name: "Vavuniya", region: "Northern", deliveryDays: 3 },
    { name: "Nuwara Eliya", region: "Central", deliveryDays: 2 },
    { name: "Gampaha", region: "Western", deliveryDays: 1 },
    { name: "Matale", region: "Central", deliveryDays: 2 },
    { name: "Ampara", region: "Eastern", deliveryDays: 3 },
    { name: "Kilinochchi", region: "Northern", deliveryDays: 3 },
  ];
}
