import React, { useState, useRef } from "react";
import ProductManager from "../components/ProductManager";
import ExpenseManager from "../components/ExpenseManager";
import {
  updatePaymentsFromCsv,
  validateCsvFormat,
} from "../assets/services/csvPaymentService";

const Management = () => {
  // Set default date range to current month
  const [dateRange] = useState(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-based (0 = January)

    // First day of current month
    const startDate = new Date(currentYear, currentMonth, 1);
    // Last day of current month
    const endDate = new Date(currentYear, currentMonth + 1, 0);

    return {
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
    };
  });

  // CSV Upload state
  const [isUploadingCsv, setIsUploadingCsv] = useState(false);
  const [showUploadResults, setShowUploadResults] = useState(false);
  const [uploadResults, setUploadResults] = useState<any>(null);
  const [lastUploadTime, setLastUploadTime] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExpensesUpdate = (summary: {
    totalExpenses: number;
    expensesByType: Record<string, number>;
    monthlyExpenses: Record<string, number>;
  }) => {
    // You can use this to show a summary or update other components
    console.log("Expenses updated:", summary);
  };

  const handleCostsUpdate = (costs: Record<string, number>) => {
    // You can use this to track product cost changes
    console.log("Product costs updated:", costs);
  };

  // CSV Upload handlers
  const handleCsvUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleCsvFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingCsv(true);

      // Validate file format
      const isValidFormat = await validateCsvFormat(file);
      if (!isValidFormat) {
        alert(
          'Invalid CSV format. Please ensure the file contains "Waybill ID" and "Order ID" columns.'
        );
        return;
      }

      // Process the CSV
      const result = await updatePaymentsFromCsv(file);
      setUploadResults(result);
      setShowUploadResults(true);
      setLastUploadTime(new Date().toLocaleString());
    } catch (error) {
      console.error("Error processing CSV:", error);
      alert(
        `Error processing CSV: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsUploadingCsv(false);
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-8 mx-auto max-w-7xl">
          <div className="flex items-center justify-between">
            <div className="flex-1 text-center">
              <h1 className="text-3xl font-bold text-gray-900">
                Business Management
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Manage your products, expenses, and business operations
              </p>
            </div>

            {/* CSV Upload Button */}
            <div className="flex flex-col items-end space-y-2">
              <button
                onClick={handleCsvUploadClick}
                disabled={isUploadingCsv}
                className="flex items-center px-4 py-2 space-x-2 font-medium text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploadingCsv ? (
                  <>
                    <div className="w-4 h-4 border-b-2 border-white rounded-full animate-spin"></div>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    <span>Upload Payment CSV</span>
                  </>
                )}
              </button>

              {/* Last Upload Status */}
              {lastUploadTime && (
                <div className="text-xs text-gray-500">
                  Last upload: {lastUploadTime}
                </div>
              )}

              {/* Upload Success Indicator */}
              {uploadResults?.success && (
                <div className="flex items-center space-x-1 text-xs text-green-600">
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>{uploadResults.updated} payments updated</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Hidden file input for CSV upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        style={{ display: "none" }}
        onChange={handleCsvFileSelect}
      />

      {/* Main Content */}
      <div className="px-6 py-8 mx-auto max-w-7xl">
        <div className="space-y-8">
          {/* CSV Upload Status Card */}
          {uploadResults && (
            <div
              className={`p-4 rounded-lg border-l-4 ${
                uploadResults.success
                  ? "bg-green-50 border-green-400"
                  : "bg-red-50 border-red-400"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div
                    className={`flex-shrink-0 w-5 h-5 ${
                      uploadResults.success ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {uploadResults.success ? (
                      <svg fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      <svg fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                  <div className="ml-3">
                    <h3
                      className={`text-sm font-medium ${
                        uploadResults.success
                          ? "text-green-800"
                          : "text-red-800"
                      }`}
                    >
                      CSV Upload{" "}
                      {uploadResults.success ? "Completed" : "Failed"}
                    </h3>
                    <div
                      className={`text-sm ${
                        uploadResults.success
                          ? "text-green-700"
                          : "text-red-700"
                      }`}
                    >
                      <p>Processed: {uploadResults.processed} records</p>
                      <p>Updated: {uploadResults.updated} payment statuses</p>
                      {uploadResults.errors.length > 0 && (
                        <p>Errors: {uploadResults.errors.length}</p>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowUploadResults(true)}
                  className={`text-sm font-medium ${
                    uploadResults.success
                      ? "text-green-600 hover:text-green-500"
                      : "text-red-600 hover:text-red-500"
                  }`}
                >
                  View Details
                </button>
              </div>
            </div>
          )}

          {/* Product Management Section */}
          <div>
            <div className="mb-6">
              <h2 className="mb-2 text-xl font-semibold text-gray-900">
                Product Management
              </h2>
              <p className="text-sm text-gray-600">
                Manage your product costs, prices, and profit margins
              </p>
            </div>
            <ProductManager onCostsUpdate={handleCostsUpdate} />
          </div>

          {/* Expense Management Section */}
          <div>
            <div className="mb-6">
              <h2 className="mb-2 text-xl font-semibold text-gray-900">
                Expense Management
              </h2>
              <p className="text-sm text-gray-600">
                Track and manage your business expenses for the current month
              </p>
            </div>
            <ExpenseManager
              dateRange={dateRange}
              onExpensesUpdate={handleExpensesUpdate}
            />
          </div>
        </div>
      </div>

      {/* Upload Results Modal */}
      {showUploadResults && uploadResults && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                CSV Upload Results
              </h3>
            </div>

            <div className="px-6 py-4 overflow-y-auto max-h-96">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 rounded-lg bg-blue-50">
                  <div className="text-2xl font-bold text-blue-600">
                    {uploadResults.processed}
                  </div>
                  <div className="text-sm text-blue-700">Records Processed</div>
                </div>
                <div className="p-4 rounded-lg bg-green-50">
                  <div className="text-2xl font-bold text-green-600">
                    {uploadResults.updated}
                  </div>
                  <div className="text-sm text-green-700">Payments Updated</div>
                </div>
              </div>

              {/* Success Rate */}
              {uploadResults.processed > 0 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      Success Rate
                    </span>
                    <span className="text-sm text-gray-600">
                      {(
                        (uploadResults.updated / uploadResults.processed) *
                        100
                      ).toFixed(1)}
                      %
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full">
                    <div
                      className="h-2 bg-green-600 rounded-full"
                      style={{
                        width: `${
                          (uploadResults.updated / uploadResults.processed) *
                          100
                        }%`,
                      }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Detailed results */}
              <div className="mb-6">
                <h4 className="mb-3 font-medium text-gray-900">
                  Processing Details:
                </h4>
                <div className="space-y-2 overflow-y-auto text-sm max-h-48">
                  {uploadResults.details.map((detail: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                    >
                      <span className="font-mono text-sm">
                        {detail.waybillId}
                      </span>
                      <div className="flex items-center space-x-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            detail.status === "updated"
                              ? "bg-green-100 text-green-800"
                              : detail.status === "not_found"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {detail.status === "updated"
                            ? "Updated"
                            : detail.status === "not_found"
                            ? "Not Found"
                            : "Error"}
                        </span>
                        {detail.message && (
                          <span
                            className="text-xs text-gray-600 truncate max-w-32"
                            title={detail.message}
                          >
                            {detail.message}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Show errors if any */}
              {uploadResults.errors.length > 0 && (
                <div>
                  <h4 className="mb-3 font-medium text-red-600">Errors:</h4>
                  <div className="space-y-2 text-sm">
                    {uploadResults.errors.map(
                      (error: string, index: number) => (
                        <div
                          key={index}
                          className="p-3 text-xs text-red-800 rounded-lg bg-red-50"
                        >
                          {error}
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => setUploadResults(null)}
                className="px-4 py-2 text-gray-600 transition-colors bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Clear Results
              </button>
              <button
                onClick={() => setShowUploadResults(false)}
                className="px-4 py-2 text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Management;
