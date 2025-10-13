// smsService.ts - Text.lk SMS Gateway Service
// This service handles sending SMS notifications to customers

interface SMSResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
}

interface OrderDetails {
  customerName: string;
  phoneNumber: string;
  trackingId: string;
  products: Array<{
    name: string;
    quantity: number;
  }>;
  totalAmount: number;
  paymentMethod?: "COD" | "Bank Transfer";
}

// Configuration
const TEXT_LK_API_TOKEN =
  "1815|4ZBjrp1ECMw9qmnj70oCEKhNpg00ZrOFBL5YD9mz39f4961a";
const TEXT_LK_BASE_URL = "https://app.text.lk/api/v3";

// Helper function to format phone number for Sri Lanka
function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/[\s\-\(\)]/g, "");

  if (cleaned.startsWith("0")) {
    cleaned = "94" + cleaned.substring(1);
  }

  if (!cleaned.startsWith("94")) {
    cleaned = "94" + cleaned;
  }

  return cleaned;
}

// Helper function to create thank you message
function createThankYouMessage(orderDetails: OrderDetails): string {
  const productList = orderDetails.products
    .map((p) => `${p.quantity}x ${p.name}`)
    .join(", ");

  const totalDisplay =
    orderDetails.paymentMethod === "Bank Transfer"
      ? `Rs. ${orderDetails.totalAmount.toLocaleString()} (Paid)`
      : `Rs. ${orderDetails.totalAmount.toLocaleString()}`;

  return `Dear ${orderDetails.customerName},\n\nThank you for your order! We are processing it now.\n\nWaybill ID: ${orderDetails.trackingId}\nProducts: ${productList}\nTotal: ${totalDisplay}\n\nFor delivery updates, contact Farder Express Courier Service: 0112 812 512\n\n-HerbCey Team-`;
}

/**
 * Send a simple SMS message using Text.lk API with CORS proxy
 */
export async function sendSMS(
  phoneNumber: string,
  message: string
): Promise<SMSResponse> {
  try {
    const formattedPhone = formatPhoneNumber(phoneNumber);

    // Use CORS proxy for browser requests
    const apiUrl =
      "https://corsproxy.io/?" +
      encodeURIComponent(`${TEXT_LK_BASE_URL}/sms/send`);

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TEXT_LK_API_TOKEN}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        recipient: formattedPhone,
        sender_id: "HerbCey",
        type: "plain",
        message: message,
      }),
    });

    const data = await response.json();

    if (response.ok && data.status === "success") {
      console.log("SMS sent successfully to:", formattedPhone);
      return {
        success: true,
        message: "SMS sent successfully",
        data: data.data,
      };
    } else {
      console.error("Failed to send SMS:", data);
      return {
        success: false,
        error: data.message || "Failed to send SMS",
      };
    }
  } catch (error) {
    console.error("Error sending SMS:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Send order confirmation SMS to customer
 */
export async function sendOrderConfirmationSMS(
  orderDetails: OrderDetails
): Promise<SMSResponse> {
  try {
    const message = createThankYouMessage(orderDetails);
    const result = await sendSMS(orderDetails.phoneNumber, message);

    if (result.success) {
      console.log(
        `Order confirmation SMS sent for order ${orderDetails.trackingId}`
      );
    } else {
      console.error(
        `Failed to send order confirmation SMS for order ${orderDetails.trackingId}`
      );
    }

    return result;
  } catch (error) {
    console.error("Error in sendOrderConfirmationSMS:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Validate phone number format
 */
export function isValidPhoneNumber(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-\(\)]/g, "");
  const localPattern = /^0[0-9]{9}$/;
  const internationalPattern = /^94[0-9]{9}$/;

  return localPattern.test(cleaned) || internationalPattern.test(cleaned);
}

/**
 * Test SMS functionality - sends a test message
 */
export async function sendTestSMS(phoneNumber: string): Promise<SMSResponse> {
  try {
    const message =
      "This is a test message from HerbCey. SMS integration is working!";
    return await sendSMS(phoneNumber, message);
  } catch (error) {
    console.error("Error sending test SMS:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

// Export types for use in other files
export type { SMSResponse, OrderDetails };
