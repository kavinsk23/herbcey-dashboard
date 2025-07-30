// existingwaybill.ts - Corrected FDE Domestic API Service
// Updated based on official API documentation

interface FDEWaybillData {
  client_id?: string;
  api_key?: string;
  waybill_id: string;
  order_id?: string;
  parcel_weight?: string | number;
  parcel_description?: string;
  recipient_name?: string;
  recipient_contact_1?: string;
  recipient_contact_2?: string;
  recipient_address?: string;
  recipient_city?: string;
  amount?: string | number;
  exchange?: string;
  current_status?: string;
  delivery_date?: string;
  booking_date?: string;
  sender_name?: string;
  sender_city?: string;
  service_type?: string;
}

// Updated API response structure based on documentation
interface FDEApiResponse {
  status: number; // 200 for success
  waybill_no?: string;
  message?: string;
  error?: string;
  // Additional fields that might be returned
  recipient_city?: string;
  recipient_name?: string;
  recipient_address?: string;
  recipient_contact_1?: string;
  recipient_contact_2?: string;
  current_status?: string;
  delivery_date?: string;
  amount?: string | number;
  parcel_description?: string;
  parcel_weight?: string | number;
}

interface ApiResponse<T = any> {
  success: boolean;
  error?: string;
  data?: T;
  fromCache?: boolean;
}

interface WaybillCache {
  [waybillId: string]: {
    data: FDEWaybillData;
    lastFetched: number;
    expires: number;
  };
}

interface BulkWaybillResult {
  success: boolean;
  results: {
    [waybillId: string]: {
      success: boolean;
      data?: FDEWaybillData;
      error?: string;
    };
  };
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

class ExistingWaybillService {
  private static instance: ExistingWaybillService;
  private cache: WaybillCache = {};
  private readonly API_URL =
    "https://www.fdedomestic.com/api/parcel/existing_waybill_api_v1.php";
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes cache
  private readonly REQUEST_DELAY = 300; // 300ms between requests

  // FDE API Credentials - You need to set these
  private readonly CLIENT_ID = "8493"; // From the documentation
  private readonly API_KEY = "111a527705fd2b246b5f"; // From the documentation

  private constructor() {
    this.loadCacheFromStorage();
  }

  public static getInstance(): ExistingWaybillService {
    if (!ExistingWaybillService.instance) {
      ExistingWaybillService.instance = new ExistingWaybillService();
    }
    return ExistingWaybillService.instance;
  }

  // Cache management methods remain the same
  private saveCacheToStorage(): void {
    try {
      localStorage.setItem("fde_waybill_cache", JSON.stringify(this.cache));
    } catch (error) {
      console.warn("Failed to save waybill cache:", error);
    }
  }

  private loadCacheFromStorage(): void {
    try {
      const cachedData = localStorage.getItem("fde_waybill_cache");
      if (cachedData) {
        this.cache = JSON.parse(cachedData);
        this.cleanExpiredCache();
      }
    } catch (error) {
      console.warn("Failed to load waybill cache:", error);
      this.cache = {};
    }
  }

  private cleanExpiredCache(): void {
    const now = Date.now();
    Object.keys(this.cache).forEach((waybillId) => {
      if (this.cache[waybillId].expires < now) {
        delete this.cache[waybillId];
      }
    });
    this.saveCacheToStorage();
  }

  private isCached(waybillId: string): boolean {
    const cached = this.cache[waybillId];
    return cached && cached.expires > Date.now();
  }

  private getCachedData(waybillId: string): FDEWaybillData | null {
    if (this.isCached(waybillId)) {
      return this.cache[waybillId].data;
    }
    return null;
  }

  private cacheData(waybillId: string, data: FDEWaybillData): void {
    const now = Date.now();
    this.cache[waybillId] = {
      data,
      lastFetched: now,
      expires: now + this.CACHE_DURATION,
    };
    this.saveCacheToStorage();
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Updated API call method with correct parameters
  public async getWaybillInfo(
    waybillId: string
  ): Promise<ApiResponse<FDEWaybillData>> {
    try {
      // Check cache first
      const cachedData = this.getCachedData(waybillId);
      console.log("cache", cachedData);
      if (cachedData) {
        console.log(`📦 Using cached data for ${waybillId}`);
        return {
          success: true,
          data: cachedData,
          fromCache: true,
        };
      }

      if (!waybillId || waybillId.trim() === "") {
        return {
          success: false,
          error: "Waybill ID is required",
        };
      }

      // Clean waybill ID (remove CCP prefix if present)
      const cleanWaybillId = waybillId.replace(/^CCP/i, "").trim();
      console.log(`🧹 Processing waybill: ${waybillId} → ${cleanWaybillId}`);

      // Prepare form data with required credentials
      const formData = new FormData();
      formData.append("client_id", this.CLIENT_ID);
      formData.append("api_key", this.API_KEY);
      formData.append("waybill_id", cleanWaybillId);

      const data = {
        client_id: "8493",
        api_key: "111a527705fd2b246b5f",
        waybill_id: cleanWaybillId,
      };

      console.log(`🚀 Making API request for waybill: ${cleanWaybillId}`);

      const response = await fetch(this.API_URL, {
        method: "POST",
        body: formData,
        headers: {
          Accept: "application/json",
        },
      });

      console.log("res", response.json());

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: FDEApiResponse = await response.json();
      console.log(`📋 API Response for ${cleanWaybillId}:`, result);

      // Check if the API call was successful based on documentation
      if (result.status === 200 && result.waybill_no) {
        // Map the response to our data structure
        const waybillData: FDEWaybillData = {
          waybill_id: cleanWaybillId,
          client_id: this.CLIENT_ID,
          api_key: this.API_KEY,
          recipient_city: result.recipient_city,
          recipient_name: result.recipient_name,
          recipient_address: result.recipient_address,
          recipient_contact_1: result.recipient_contact_1,
          recipient_contact_2: result.recipient_contact_2,
          current_status: result.current_status,
          delivery_date: result.delivery_date,
          amount: result.amount,
          parcel_description: result.parcel_description,
          parcel_weight: result.parcel_weight,
        };

        // Cache the result
        this.cacheData(cleanWaybillId, waybillData);

        console.log(
          `✅ Successfully processed waybill ${cleanWaybillId}`,
          waybillData
        );

        return {
          success: true,
          data: waybillData,
          fromCache: false,
        };
      } else {
        const errorMsg =
          result.message || `API returned status: ${result.status}`;
        console.log(`❌ API call failed for ${cleanWaybillId}: ${errorMsg}`);
        return {
          success: false,
          error: errorMsg,
        };
      }
    } catch (error) {
      console.error(`💥 Error fetching waybill info for ${waybillId}:`, error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  // Get recipient city only (optimized for your current use case)
  public async getRecipientCity(waybillId: string): Promise<string | null> {
    try {
      console.log("track", waybillId);
      const result = await this.getWaybillInfo(waybillId);

      if (result.success && result.data?.recipient_city) {
        console.log(
          `🏙️ Found city for ${waybillId}: ${result.data.recipient_city}`
        );
        return result.data.recipient_city;
      }

      console.log(`🚫 No city found for ${waybillId}`);
      return null;
    } catch (error) {
      console.error(`Error getting city for waybill ${waybillId}:`, error);
      return null;
    }
  }

  // Bulk operations remain the same but with updated single call
  public async getBulkWaybillInfo(
    waybillIds: string[]
  ): Promise<BulkWaybillResult> {
    const results: BulkWaybillResult["results"] = {};
    let successful = 0;
    let failed = 0;

    console.log(
      `🔄 Fetching waybill info for ${waybillIds.length} waybills...`
    );

    for (let i = 0; i < waybillIds.length; i++) {
      const waybillId = waybillIds[i];

      try {
        const result = await this.getWaybillInfo(waybillId);

        if (result.success) {
          results[waybillId] = {
            success: true,
            data: result.data,
          };
          successful++;
          console.log(
            `✅ ${waybillId}: ${result.fromCache ? "cached" : "fetched"}`
          );
        } else {
          results[waybillId] = {
            success: false,
            error: result.error,
          };
          failed++;
          console.log(`❌ ${waybillId}: ${result.error}`);
        }

        // Add delay between requests (except for cached results)
        if (!result.fromCache && i < waybillIds.length - 1) {
          await this.delay(this.REQUEST_DELAY);
        }
      } catch (error) {
        results[waybillId] = {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
        failed++;
        console.log(`💥 ${waybillId}: Error occurred`);
      }
    }

    console.log(
      `📊 Bulk operation complete: ${successful}/${waybillIds.length} successful`
    );

    return {
      success: true,
      results,
      summary: {
        total: waybillIds.length,
        successful,
        failed,
      },
    };
  }

  // Get cities for multiple waybills
  public async getBulkCities(waybillIds: string[]): Promise<{
    [waybillId: string]: string | null;
  }> {
    const cities: { [waybillId: string]: string | null } = {};

    const bulkResult = await this.getBulkWaybillInfo(waybillIds);

    Object.entries(bulkResult.results).forEach(([waybillId, result]) => {
      cities[waybillId] =
        result.success && result.data?.recipient_city
          ? result.data.recipient_city
          : null;
    });

    return cities;
  }

  // Utility methods remain the same
  public clearCache(): void {
    this.cache = {};
    localStorage.removeItem("fde_waybill_cache");
    console.log("🗑️ Cache cleared");
  }

  public getCacheStats(): {
    totalEntries: number;
    validEntries: number;
    expiredEntries: number;
    oldestEntry?: string;
    newestEntry?: string;
  } {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;
    let oldestTime = Number.MAX_SAFE_INTEGER;
    let newestTime = 0;

    Object.values(this.cache).forEach((entry) => {
      if (entry.expires > now) {
        validEntries++;
      } else {
        expiredEntries++;
      }

      if (entry.lastFetched < oldestTime) {
        oldestTime = entry.lastFetched;
      }
      if (entry.lastFetched > newestTime) {
        newestTime = entry.lastFetched;
      }
    });

    return {
      totalEntries: Object.keys(this.cache).length,
      validEntries,
      expiredEntries,
      oldestEntry:
        oldestTime !== Number.MAX_SAFE_INTEGER
          ? new Date(oldestTime).toLocaleString()
          : undefined,
      newestEntry:
        newestTime > 0 ? new Date(newestTime).toLocaleString() : undefined,
    };
  }
}

// Export singleton instance and helper functions
export const existingWaybillService = ExistingWaybillService.getInstance();

// Helper functions for easy use
export const getWaybillInfo = (waybillId: string) =>
  existingWaybillService.getWaybillInfo(waybillId);

export const getRecipientCity = (waybillId: string) =>
  existingWaybillService.getRecipientCity(waybillId);

export const getBulkWaybillInfo = (waybillIds: string[]) =>
  existingWaybillService.getBulkWaybillInfo(waybillIds);

export const getBulkCities = (waybillIds: string[]) =>
  existingWaybillService.getBulkCities(waybillIds);

export const clearWaybillCache = () => existingWaybillService.clearCache();

export const getWaybillCacheStats = () =>
  existingWaybillService.getCacheStats();
