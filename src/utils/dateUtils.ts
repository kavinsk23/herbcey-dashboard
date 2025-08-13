// src/utils/dateUtils.ts - Complete DateTime Utilities with Asia/Colombo Timezone

const TIMEZONE = "Asia/Colombo";

/**
 * Get current date in ISO format (YYYY-MM-DD) in Colombo time
 */
export function getCurrentISODate(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: TIMEZONE });
}

/**
 * Get current date and time in ISO-like format (YYYY-MM-DD HH:mm:ss) in Colombo time
 * This is the MAIN format we'll use for all order dates
 */
export function getCurrentISODateTime(): string {
  const now = new Date();
  const date = now.toLocaleDateString("en-CA", { timeZone: TIMEZONE });
  const time = now.toLocaleTimeString("en-GB", {
    timeZone: TIMEZONE,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  return `${date} ${time}`;
}

/**
 * Create ISO datetime from current time in Colombo time (primary function for new orders)
 */
export function createOrderTimestamp(): string {
  return getCurrentISODateTime();
}

/**
 * Format a Date object to ISO date string (YYYY-MM-DD) in Colombo time
 */
export function formatToISODate(date: Date): string {
  return date.toLocaleDateString("en-CA", { timeZone: TIMEZONE });
}

/**
 * Format a Date object to ISO datetime string (YYYY-MM-DD HH:mm:ss) in Colombo time
 */
export function formatToISODateTime(date: Date): string {
  const datePart = date.toLocaleDateString("en-CA", { timeZone: TIMEZONE });
  const timePart = date.toLocaleTimeString("en-GB", {
    timeZone: TIMEZONE,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  return `${datePart} ${timePart}`;
}

/**
 * Parse ISO date/datetime string to Date object, treating it as Colombo time
 * Handles: "YYYY-MM-DD", "YYYY-MM-DD HH:mm:ss", "YYYY-MM-DDTHH:mm:ss.sssZ"
 */
export function parseISODate(isoString: string): Date {
  // Handle both space and T separators
  const normalized = isoString.includes("T")
    ? isoString
    : isoString.replace(" ", "T");
  const date = new Date(normalized);

  // Adjust for Colombo timezone offset (UTC+5:30)
  const offset = date.getTimezoneOffset() + 330; // 330 minutes = 5.5 hours
  date.setMinutes(date.getMinutes() - offset);

  return date;
}

/**
 * Get the current month's date range in Colombo time
 * Returns dates only (YYYY-MM-DD) for range filtering
 */
export function getCurrentMonthRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-based

  // First day of current month in Colombo
  const startDate = new Date(currentYear, currentMonth, 1);
  // Last day of current month in Colombo
  const endDate = new Date(currentYear, currentMonth + 1, 0);

  return {
    startDate: formatToISODate(startDate), // "2025-08-01"
    endDate: formatToISODate(endDate), // "2025-08-31"
  };
}

/**
 * Check if a datetime is within a date range in Colombo time
 * dateTimeString: "2025-08-09 18:27:51"
 * startDate: "2025-08-01"
 * endDate: "2025-08-31"
 */
export function isDateTimeInRange(
  dateTimeString: string,
  startDate: string,
  endDate: string
): boolean {
  const dateTime = parseISODate(dateTimeString);
  const start = parseISODate(startDate + "T00:00:00"); // Start of day
  const end = parseISODate(endDate + "T23:59:59"); // End of day

  return dateTime >= start && dateTime <= end;
}

/**
 * Format ISO datetime for display in Colombo time (DD/MM/YYYY HH:mm)
 */
export function formatDisplayDateTime(isoDateTime: string): string {
  const date = parseISODate(isoDateTime);
  return date.toLocaleString("en-GB", {
    timeZone: TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format ISO date for display in Colombo time (DD/MM/YYYY)
 */
export function formatDisplayDate(isoDate: string): string {
  const date = parseISODate(isoDate + "T00:00:00");
  return date.toLocaleDateString("en-GB", { timeZone: TIMEZONE });
}

/**
 * Extract just the date part from datetime string
 * "2025-08-09 18:27:51" -> "2025-08-09"
 */
export function extractDateFromDateTime(isoDateTime: string): string {
  return isoDateTime.split(" ")[0];
}

/**
 * Get time part from datetime string in Colombo time
 * "2025-08-09 18:27:51" -> "18:27:51"
 */
export function extractTimeFromDateTime(isoDateTime: string): string {
  const date = parseISODate(isoDateTime);
  return date.toLocaleTimeString("en-GB", {
    timeZone: TIMEZONE,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * Get formatted time for display in Colombo time (HH:mm)
 * "2025-08-09 18:27:51" -> "18:27"
 */
export function extractDisplayTime(isoDateTime: string): string {
  const date = parseISODate(isoDateTime);
  return date.toLocaleTimeString("en-GB", {
    timeZone: TIMEZONE,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Check if a date string is today in Colombo time
 */
export function isToday(isoDateTime: string): boolean {
  const inputDate = extractDateFromDateTime(isoDateTime);
  const today = getCurrentISODate();
  return inputDate === today;
}

/**
 * Check if a date string is yesterday in Colombo time
 */
export function isYesterday(isoDateTime: string): boolean {
  const date = parseISODate(isoDateTime);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const yesterdayISO = formatToISODate(yesterday);
  const inputDateISO = extractDateFromDateTime(isoDateTime);

  return inputDateISO === yesterdayISO;
}

/**
 * Get relative time description in Colombo time
 */
export function getRelativeTimeDescription(isoDateTime: string): string {
  if (isToday(isoDateTime)) {
    return `Today at ${extractDisplayTime(isoDateTime)}`;
  } else if (isYesterday(isoDateTime)) {
    return `Yesterday at ${extractDisplayTime(isoDateTime)}`;
  } else {
    return formatDisplayDateTime(isoDateTime);
  }
}

/**
 * Test function to verify date parsing works correctly
 */
export function testDateParsing(): void {
  const testCases = [
    "2025-08-09 18:27:51", // New format
    "2025-08-09", // Date only
    "2025-7-1", // Old format
    "2025-12-25 23:59:59", // New Year's Eve
  ];

  console.log("🧪 Date Utils Test Results (Asia/Colombo Timezone):");
  console.log("==================================================");

  testCases.forEach((dateString) => {
    console.log(`\n📅 Testing: "${dateString}"`);
    console.log(`   Display Date: ${formatDisplayDate(dateString)}`);
    console.log(`   Display DateTime: ${formatDisplayDateTime(dateString)}`);
    console.log(`   Relative: ${getRelativeTimeDescription(dateString)}`);
    console.log(`   Is Today: ${isToday(dateString)}`);
    console.log(
      `   Is in Aug 2025: ${isDateTimeInRange(
        dateString,
        "2025-08-01",
        "2025-08-31"
      )}`
    );
  });

  console.log("\n✅ Date Utils Test Complete!");
}

// Default export with all functions
export default {
  getCurrentISODate,
  getCurrentISODateTime,
  createOrderTimestamp,
  formatToISODate,
  formatToISODateTime,
  parseISODate,
  getCurrentMonthRange,
  isDateTimeInRange,
  formatDisplayDate,
  formatDisplayDateTime,
  extractDateFromDateTime,
  extractTimeFromDateTime,
  extractDisplayTime,
  isToday,
  isYesterday,
  getRelativeTimeDescription,
  testDateParsing,
};
