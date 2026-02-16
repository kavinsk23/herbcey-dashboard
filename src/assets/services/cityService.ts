// src/assets/services/cityService.ts

// Types for city data - Updated to match your sheet structure
export interface City {
  name: string;
  city_id?: number;
  zone_id?: number;
  zone_name?: string;
  district_id?: number;
  district_name?: string;
  // Keep backward compatibility
  region?: string;
  deliveryDays?: number;
  specialNotes?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  error?: string;
  data?: T;
}

// Configuration - Your sheet name is "Cities"
const GOOGLE_API_KEY = process.env.REACT_APP_GOOGLE_API_KEY || "";
const SPREADSHEET_ID = process.env.REACT_APP_GOOGLE_SHEET_ID || "";
const CITY_SHEET_NAME = "Cities"; // Your actual sheet name

// Cache for cities to reduce API calls
let citiesCache: City[] = [];
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

/**
 * Get all cities from Google Sheets
 */
export async function getCitiesFromSheet(): Promise<ApiResponse<City[]>> {
  try {
    // Check cache first
    const now = Date.now();
    if (citiesCache.length > 0 && now - cacheTimestamp < CACHE_DURATION) {
      console.log("📦 Using cached cities:", citiesCache.length);
      return { success: true, data: citiesCache };
    }

    // Check if API key or Sheet ID is configured
    if (!GOOGLE_API_KEY || GOOGLE_API_KEY === "") {
      console.warn("⚠️ Google API Key not configured. Using default cities.");
      const defaultCities = getDefaultCities();
      citiesCache = defaultCities;
      cacheTimestamp = now;
      return { success: true, data: defaultCities };
    }

    if (!SPREADSHEET_ID || SPREADSHEET_ID === "") {
      console.warn("⚠️ Google Sheet ID not configured. Using default cities.");
      const defaultCities = getDefaultCities();
      citiesCache = defaultCities;
      cacheTimestamp = now;
      return { success: true, data: defaultCities };
    }

    console.log("🔍 Fetching cities from Google Sheets...");
    console.log("📊 Sheet ID:", SPREADSHEET_ID);
    console.log("📑 Sheet Name:", CITY_SHEET_NAME);

    // Get data from your "Cities" sheet
    const response = await getSheetData(CITY_SHEET_NAME);

    if (response.success && response.data && response.data.length > 0) {
      // Cache the results
      citiesCache = response.data;
      cacheTimestamp = now;
      console.log(
        `✅ Loaded ${response.data.length} cities from "Cities" sheet`,
      );
      return response;
    } else {
      console.log("⚠️ No city data found from API, using default cities");
      const defaultCities = getDefaultCities();
      citiesCache = defaultCities;
      cacheTimestamp = now;
      return { success: true, data: defaultCities };
    }
  } catch (error) {
    console.error("❌ Error fetching cities from Google Sheets:", error);
    // Return default cities on error
    return {
      success: true,
      data: getDefaultCities(),
    };
  }
}

/**
 * Get data from a specific sheet
 */
async function getSheetData(sheetName: string): Promise<ApiResponse<City[]>> {
  try {
    // Try with access token first (for authenticated requests)
    const accessToken = localStorage.getItem("google_access_token");

    let url: string;
    let requestInit: RequestInit = {};

    if (accessToken) {
      // Use OAuth token if available
      url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(sheetName)}`;
      requestInit = {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      };
      console.log("🔐 Using OAuth token");
    } else {
      // Fallback to API key
      url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(sheetName)}?key=${GOOGLE_API_KEY}&majorDimension=ROWS`;
      console.log("🔑 Using API key");
    }

    console.log("📡 Fetching from URL:", url.replace(GOOGLE_API_KEY, "HIDDEN"));

    const response = await fetch(url, requestInit);
    console.log("📡 API Response status:", response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error("❌ API Error Response:", errorData || response.statusText);

      // Handle specific error cases
      if (response.status === 404) {
        throw new Error(
          `Sheet "${sheetName}" not found. Please check the sheet name.`,
        );
      } else if (response.status === 403) {
        throw new Error(
          "Access forbidden. Please make sure your sheet is publicly accessible or you have proper authentication.",
        );
      } else if (response.status === 400) {
        throw new Error("Bad request. Please check your API key and sheet ID.");
      }

      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const rows = data.values || [];

    console.log(`📊 Retrieved ${rows.length} rows from sheet`);

    if (rows.length === 0) {
      return { success: false, error: "Empty sheet" };
    }

    // Parse the rows based on your column structure
    const cities = parseCityRows(rows);

    return { success: true, data: cities };
  } catch (error) {
    console.error(`❌ Error fetching sheet ${sheetName}:`, error);
    throw error;
  }
}

/**
 * Parse rows based on your column structure
 */
function parseCityRows(rows: any[][]): City[] {
  if (rows.length === 0) return [];

  // Get header row and find column indices
  const headers = rows[0].map((header) =>
    String(header || "")
      .toLowerCase()
      .trim(),
  );

  console.log("📊 Headers found:", headers);

  // Map column indices based on header names
  const columnIndices = {
    city_id: headers.findIndex(
      (h) => h === "city_id" || h.includes("city_id") || h.includes("city id"),
    ),
    city_name: headers.findIndex(
      (h) =>
        h === "city_name" ||
        h === "city name" ||
        h === "city" ||
        h.includes("city_name"),
    ),
    zone_id: headers.findIndex(
      (h) => h === "zone_id" || h.includes("zone_id") || h.includes("zone id"),
    ),
    zone_name: headers.findIndex(
      (h) =>
        h === "zone name" ||
        h === "zone_name" ||
        h === "zone" ||
        h.includes("zone name"),
    ),
    district_id: headers.findIndex(
      (h) =>
        h === "district_id" ||
        h.includes("district_id") ||
        h.includes("district id"),
    ),
    district_name: headers.findIndex(
      (h) =>
        h === "district name" ||
        h === "district_name" ||
        h === "district" ||
        h.includes("district name"),
    ),
  };

  console.log("📍 Column mapping:", columnIndices);

  // Parse each row (skip header row)
  const cities: City[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const city: City = {
      name: "",
    };

    // Extract city name
    if (columnIndices.city_name >= 0 && row[columnIndices.city_name]) {
      city.name = String(row[columnIndices.city_name]).trim();
    } else if (columnIndices.city_name === -1 && row[0]) {
      // Fallback: assume first column is city name
      city.name = String(row[0]).trim();
    }

    // Only add if we have a city name
    if (!city.name) continue;

    // Extract city_id
    if (columnIndices.city_id >= 0 && row[columnIndices.city_id]) {
      const id = parseInt(
        String(row[columnIndices.city_id]).replace(/\D/g, ""),
      );
      if (!isNaN(id)) city.city_id = id;
    }

    // Extract zone_id
    if (columnIndices.zone_id >= 0 && row[columnIndices.zone_id]) {
      const zoneId = parseInt(
        String(row[columnIndices.zone_id]).replace(/\D/g, ""),
      );
      if (!isNaN(zoneId)) city.zone_id = zoneId;
    }

    // Extract zone_name
    if (columnIndices.zone_name >= 0 && row[columnIndices.zone_name]) {
      city.zone_name = String(row[columnIndices.zone_name]).trim();
    }

    // Extract district_id
    if (columnIndices.district_id >= 0 && row[columnIndices.district_id]) {
      const districtId = parseInt(
        String(row[columnIndices.district_id]).replace(/\D/g, ""),
      );
      if (!isNaN(districtId)) city.district_id = districtId;
    }

    // Extract district_name
    if (columnIndices.district_name >= 0 && row[columnIndices.district_name]) {
      city.district_name = String(row[columnIndices.district_name]).trim();
    }

    // Set region to district_name or zone_name for backward compatibility
    city.region = city.district_name || city.zone_name || "";

    cities.push(city);
  }

  console.log(`🏙️ Parsed ${cities.length} cities`);
  if (cities.length > 0) {
    console.log("📋 Sample city:", cities[0]);
  }

  return cities;
}

/**
 * Search cities with autocomplete
 */
export async function searchCities(
  query: string,
): Promise<ApiResponse<City[]>> {
  try {
    console.log(`🔍 Searching cities with query: "${query}"`);

    const result = await getCitiesFromSheet();

    if (!result.success || !result.data || result.data.length === 0) {
      console.warn("⚠️ No cities available for search");
      return { success: false, error: "No cities available" };
    }

    const lowerQuery = query.toLowerCase().trim();

    if (!lowerQuery) {
      // Return first 20 cities sorted alphabetically
      const sortedCities = [...result.data]
        .sort((a: City, b: City) => a.name.localeCompare(b.name))
        .slice(0, 20);
      console.log(`📋 Returning ${sortedCities.length} cities (no query)`);
      return { success: true, data: sortedCities };
    }

    // Filter cities that match the query
    const filteredCities = result.data
      .filter((city: City) => {
        const cityName = city.name.toLowerCase();
        const districtName = (city.district_name || "").toLowerCase();
        const zoneName = (city.zone_name || "").toLowerCase();
        const region = (city.region || "").toLowerCase();

        return (
          cityName.includes(lowerQuery) ||
          cityName.startsWith(lowerQuery) ||
          districtName.includes(lowerQuery) ||
          zoneName.includes(lowerQuery) ||
          region.includes(lowerQuery)
        );
      })
      .sort((a: City, b: City) => {
        // Prioritize exact matches and starts with
        const aExact = a.name.toLowerCase() === lowerQuery;
        const bExact = b.name.toLowerCase() === lowerQuery;
        const aStartsWith = a.name.toLowerCase().startsWith(lowerQuery);
        const bStartsWith = b.name.toLowerCase().startsWith(lowerQuery);

        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;

        return a.name.localeCompare(b.name);
      })
      .slice(0, 30);

    console.log(
      `📋 Found ${filteredCities.length} cities for query: "${query}"`,
    );
    return { success: true, data: filteredCities };
  } catch (error) {
    console.error("❌ Error searching cities:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Returns true if a line looks like a phone/contact line.
 * Matches Sri Lankan formats: 10-digit numbers, multiple numbers separated by spaces/commas.
 */
function isContactLine(line: string): boolean {
  const stripped = line.trim().replace(/[\s,\/]+/g, " ");
  // All tokens must look like phone numbers (7-12 digits, optional + prefix)
  const tokens = stripped.split(" ").filter((t) => t.length > 0);
  if (tokens.length === 0) return false;
  return tokens.every(
    (token) =>
      /^\+?\d{7,12}$/.test(token.replace(/\D/g, "")) && /\d{7,}/.test(token),
  );
}

/**
 * Detect city from address by matching against database.
 * Address format: Name / Address lines / City line / Contact line(s)
 * Strips contact lines from the end so city line becomes the true last line,
 * then scans from end to start with highest priority on the last content line.
 */
export async function detectCityFromAddress(
  address: string,
): Promise<ApiResponse<City | null>> {
  try {
    if (!address || address.trim().length < 3) {
      return { success: false, error: "Address too short" };
    }

    // Get all cities from cache or sheet
    const result = await getCitiesFromSheet();

    if (!result.success || !result.data || result.data.length === 0) {
      return { success: false, error: "No cities available" };
    }

    const cities = result.data;
    const addressLower = address.toLowerCase();
    const allLines = address.split("\n").filter((line) => line.trim());

    // Strip trailing contact/phone lines so city line becomes the last line
    // e.g. ["John Doe", "123 Main St", "Colombo 01", "0771234567"] → strip last
    const lines = [...allLines];
    while (lines.length > 1 && isContactLine(lines[lines.length - 1])) {
      lines.pop();
    }

    console.log("📍 Lines after stripping contacts:", lines);

    // Reversed lines: index 0 = city line (last non-contact line), index 1 = address line above it
    const reversedLines = [...lines].reverse();

    const words = address
      .split(/[\s,\n]+/)
      .filter((word) => word.trim().length > 2)
      .map((word) => word.toLowerCase().replace(/[^\w\s]/g, ""));

    // SCORING SYSTEM: Check different parts of address with priority
    const cityScores: Map<City, number> = new Map();

    cities.forEach((city) => {
      let score = 0;
      const cityNameLower = city.name.toLowerCase();
      const districtLower = (city.district_name || "").toLowerCase();
      const zoneLower = (city.zone_name || "").toLowerCase();

      // PRIORITY 1: reversedLines[0] is the true city line (contacts already stripped).
      // Score decays strongly as we move up the address.
      for (let i = 0; i < Math.min(3, reversedLines.length); i++) {
        const line = reversedLines[i].toLowerCase();

        if (line.includes(cityNameLower)) {
          // City line (i=0) = 150, one above (i=1) = 80, two above (i=2) = 40
          const baseScore = i === 0 ? 150 : i === 1 ? 80 : 40;
          score += baseScore;

          // Bonus: line is exactly the city name
          if (line.trim() === cityNameLower) {
            score += 80;
          }
          // Bonus: city name is at the end of the line (e.g. "Colombo 03")
          if (line.trim().endsWith(cityNameLower)) {
            score += 40;
          }
          // Bonus: city name is at the start of the line
          if (line.trim().startsWith(cityNameLower)) {
            score += 20;
          }
        }

        if (districtLower && line.includes(districtLower)) {
          score += i === 0 ? 40 : i === 1 ? 20 : 10;
        }

        if (zoneLower && line.includes(zoneLower)) {
          score += i === 0 ? 30 : i === 1 ? 15 : 5;
        }
      }

      // PRIORITY 2: Match in any line — scanned end to start with decaying score
      reversedLines.forEach((line, i) => {
        const lineLower = line.toLowerCase();
        if (lineLower.includes(cityNameLower)) {
          score += Math.max(3, 15 - i * 5);
        }
      });

      // PRIORITY 3: Match in individual words
      words.forEach((word) => {
        if (word === cityNameLower) {
          score += 50; // Exact word match
        } else if (cityNameLower.includes(word) && word.length > 3) {
          score += 15; // Partial match
        } else if (word.includes(cityNameLower) && cityNameLower.length > 3) {
          score += 10; // City name contained in word
        }
      });

      // PRIORITY 4: Postal code match
      const postalCodeMatch = address.match(/\b(\d{5})\b/);
      if (postalCodeMatch) {
        const postalCode = postalCodeMatch[1];
        // Check if this city is associated with this postal code
        if (city.city_id) {
          const cityIdStr = city.city_id.toString();
          if (postalCode.startsWith(cityIdStr.substring(0, 1))) {
            score += 25;
          }
          if (postalCode.substring(0, 2) === cityIdStr.substring(0, 2)) {
            score += 15;
          }
        }
      }

      // PRIORITY 5: District/Region match
      if (districtLower) {
        words.forEach((word) => {
          if (word.includes(districtLower) || districtLower.includes(word)) {
            score += 10;
          }
        });
        // Check if district name appears in address
        if (addressLower.includes(districtLower)) {
          score += 15;
        }
      }

      // PRIORITY 6: Zone match
      if (zoneLower) {
        if (addressLower.includes(zoneLower)) {
          score += 10;
        }
      }

      // PRIORITY 7: City appears in first line (lowest priority — likely a name, not city)
      if (lines.length > 0) {
        const firstLine = lines[0].toLowerCase();
        if (firstLine.includes(cityNameLower)) {
          score += 5;
        }
      }

      if (score > 0) {
        cityScores.set(city, score);
      }
    });

    // Sort by score and get best match
    const sortedCities = Array.from(cityScores.entries()).sort(
      (a, b) => b[1] - a[1],
    );

    if (sortedCities.length > 0) {
      const bestMatch = sortedCities[0][0];
      const bestScore = sortedCities[0][1];
      const secondScore = sortedCities.length > 1 ? sortedCities[1][1] : 0;

      // Only return if score is significant and better than second by a margin
      if (
        bestScore > 40 &&
        (bestScore - secondScore > 10 || sortedCities.length === 1)
      ) {
        console.log(
          `🏆 Best city match: ${bestMatch.name} (score: ${bestScore})`,
        );
        return { success: true, data: bestMatch };
      } else if (bestScore > 60) {
        // High confidence match
        console.log(
          `🏆 High confidence city match: ${bestMatch.name} (score: ${bestScore})`,
        );
        return { success: true, data: bestMatch };
      } else {
        console.log(
          `🤔 Low confidence city match: ${bestMatch.name} (score: ${bestScore})`,
        );
        return { success: true, data: null };
      }
    }

    console.log("❌ No matching city found in database");
    return { success: true, data: null };
  } catch (error) {
    console.error("❌ Error detecting city from address:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get unique districts
 */
export async function getDistricts(): Promise<ApiResponse<string[]>> {
  try {
    const result = await getCitiesFromSheet();

    if (!result.success || !result.data) {
      return { success: false, error: "Failed to load cities" };
    }

    const districts = result.data
      .map((city: City) => city.district_name)
      .filter(
        (district: string | undefined): district is string =>
          !!district && district.trim() !== "",
      )
      .filter(
        (district: string, index: number, self: string[]) =>
          self.indexOf(district) === index,
      )
      .sort();

    return { success: true, data: districts };
  } catch (error) {
    console.error("❌ Error getting districts:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get unique zones
 */
export async function getZones(): Promise<ApiResponse<string[]>> {
  try {
    const result = await getCitiesFromSheet();

    if (!result.success || !result.data) {
      return { success: false, error: "Failed to load cities" };
    }

    const zones = result.data
      .map((city: City) => city.zone_name)
      .filter(
        (zone: string | undefined): zone is string =>
          !!zone && zone.trim() !== "",
      )
      .filter(
        (zone: string, index: number, self: string[]) =>
          self.indexOf(zone) === index,
      )
      .sort();

    return { success: true, data: zones };
  } catch (error) {
    console.error("❌ Error getting zones:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get city by name
 */
export async function getCityByName(
  name: string,
): Promise<ApiResponse<City | null>> {
  try {
    const result = await getCitiesFromSheet();

    if (!result.success || !result.data) {
      return { success: false, error: "Failed to load cities" };
    }

    const city = result.data.find(
      (c: City) => c.name.toLowerCase() === name.toLowerCase(),
    );

    return { success: true, data: city || null };
  } catch (error) {
    console.error("❌ Error getting city by name:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Clear cache (useful for development)
 */
export function clearCitiesCache(): void {
  citiesCache = [];
  cacheTimestamp = 0;
  console.log("🗑️ City cache cleared");
}

/**
 * Test function to verify API connection
 */
export async function testCityService(): Promise<void> {
  console.log("🧪 Testing City Service...");
  console.log("📊 Configuration:", {
    hasApiKey: !!GOOGLE_API_KEY,
    hasSheetId: !!SPREADSHEET_ID,
    sheetName: CITY_SHEET_NAME,
    apiKeyLength: GOOGLE_API_KEY.length,
    sheetIdLength: SPREADSHEET_ID.length,
  });

  try {
    const result = await getCitiesFromSheet();
    console.log("🧪 Test result:", result);

    if (result.success && result.data) {
      console.log(`✅ Test passed! Loaded ${result.data.length} cities`);
      console.log("📋 First 3 cities:", result.data.slice(0, 3));

      // Test detection — city is at the end of the address
      const testAddress = "John Doe\n123 Main Street\nColombo 01\n0771234567";
      const detectionResult = await detectCityFromAddress(testAddress);
      console.log("🧪 City detection test:", detectionResult);
    } else {
      console.warn("⚠️ Test warning:", result.error);
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

/**
 * Default cities as fallback - Based on your actual data
 */
function getDefaultCities(): City[] {
  console.log("🏙️ Using default cities fallback");
  return [
    {
      name: "Warapitiya",
      city_id: 176,
      zone_id: 3,
      zone_name: "Outstation",
      district_id: 1,
      district_name: "Ampara",
      region: "Ampara",
    },
    {
      name: "Mawela",
      city_id: 1464,
      zone_id: 3,
      zone_name: "Outstation",
      district_id: 11,
      district_name: "Kandy",
      region: "Kandy",
    },
    {
      name: "Kelanimulla",
      city_id: 2830,
      zone_id: 2,
      zone_name: "Suburbs",
      district_id: 5,
      district_name: "Colombo",
      region: "Colombo",
    },
    {
      name: "Uduthuththiripitiya",
      city_id: 5373,
      zone_id: 3,
      zone_name: "Outstation",
      district_id: 7,
      district_name: "Gampaha",
      region: "Gampaha",
    },
    {
      name: "Galagedarah Homagama",
      city_id: 6300,
      zone_id: 3,
      zone_name: "Outstation",
      district_id: 5,
      district_name: "Colombo",
      region: "Colombo",
    },
    {
      name: "Colombo",
      zone_id: 2,
      zone_name: "Suburbs",
      district_id: 5,
      district_name: "Colombo",
      region: "Colombo",
    },
    {
      name: "Kandy",
      zone_id: 3,
      zone_name: "Outstation",
      district_id: 11,
      district_name: "Kandy",
      region: "Kandy",
    },
    {
      name: "Gampaha",
      zone_id: 3,
      zone_name: "Outstation",
      district_id: 7,
      district_name: "Gampaha",
      region: "Gampaha",
    },
    {
      name: "Negombo",
      zone_id: 3,
      zone_name: "Outstation",
      district_id: 7,
      district_name: "Gampaha",
      region: "Gampaha",
    },
    {
      name: "Jaffna",
      zone_id: 3,
      zone_name: "Outstation",
      district_id: 12,
      district_name: "Jaffna",
      region: "Jaffna",
    },
  ];
}
