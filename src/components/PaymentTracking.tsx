import React, { useState, useRef, useEffect } from "react";
import {
  updatePaymentsFromCsv,
  validateCsvFormat,
} from "../assets/services/csvPaymentService";
import {
  getFailedTrackings,
  addFailedTracking,
  retryFailedTracking,
  updateFailedTracking,
  deleteFailedTracking,
} from "../assets/services/failTrackingService";

interface FailedTracking {
  id: string;
  trackingId: string;
  reason: string;
  attemptCount: number;
  firstFailed: string;
  lastAttempt: string;
  status: "Failed" | "Retry" | "Resolved";
  errorDetails?: string;
}

const PaymentTracking = () => {
  // CSV Upload state
  const [isUploadingCsv, setIsUploadingCsv] = useState(false);
  const [showUploadResults, setShowUploadResults] = useState(false);
  const [uploadResults, setUploadResults] = useState<any>(null);
  const [lastUploadTime, setLastUploadTime] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Failed trackings state
  const [failedTrackings, setFailedTrackings] = useState<FailedTracking[]>([]);
  const [loadingFailedTrackings, setLoadingFailedTrackings] = useState(true);
  const [errorLoadingTrackings, setErrorLoadingTrackings] = useState<
    string | null
  >(null);
  const [retryingTrackings, setRetryingTrackings] = useState<Set<string>>(
    new Set()
  );

  // Filters
  const [statusFilter, setStatusFilter] = useState<
    "All" | "Failed" | "Retry" | "Resolved"
  >("All");
  const [searchFilter, setSearchFilter] = useState("");

  // Load failed trackings on component mount and set up polling
  useEffect(() => {
    loadFailedTrackings();

    // Set up real-time polling every 30 seconds
    const interval = setInterval(() => {
      loadFailedTrackings();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const loadFailedTrackings = async () => {
    try {
      setLoadingFailedTrackings(true);
      setErrorLoadingTrackings(null);

      const result = await getFailedTrackings();

      if (result.success && result.data) {
        setFailedTrackings(result.data);
      } else {
        setErrorLoadingTrackings(
          result.error || "Failed to load failed trackings"
        );
      }
    } catch (error) {
      console.error("Error loading failed trackings:", error);
      setErrorLoadingTrackings(
        "An unexpected error occurred while loading failed trackings"
      );
    } finally {
      setLoadingFailedTrackings(false);
    }
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

      // Add failed trackings to FailTrackings sheet
      if (result.details) {
        for (const detail of result.details) {
          if (detail.status === "not_found" || detail.status === "error") {
            await addFailedTracking({
              trackingId: detail.waybillId,
              reason:
                detail.status === "not_found"
                  ? "Order not found in system"
                  : "Update failed",
              errorDetails: detail.message,
            });
          }
        }

        // Reload failed trackings to show new entries
        await loadFailedTrackings();
      }
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

  // Retry failed tracking
  const handleRetryTracking = async (tracking: FailedTracking) => {
    try {
      setRetryingTrackings((prev) => new Set(prev).add(tracking.id));

      const result = await retryFailedTracking(tracking.id);

      if (result.success) {
        // Reload failed trackings to get updated status
        await loadFailedTrackings();
        alert(`Successfully retried tracking ${tracking.trackingId}`);
      } else {
        alert(`Failed to retry tracking: ${result.error}`);
      }
    } catch (error) {
      console.error("Error retrying tracking:", error);
      alert("An unexpected error occurred while retrying");
    } finally {
      setRetryingTrackings((prev) => {
        const newSet = new Set(prev);
        newSet.delete(tracking.id);
        return newSet;
      });
    }
  };

  // Mark tracking as resolved
  const handleMarkResolved = async (tracking: FailedTracking) => {
    try {
      const result = await updateFailedTracking(tracking.id, {
        ...tracking,
        status: "Resolved",
        lastAttempt: new Date().toISOString(),
      });

      if (result.success) {
        await loadFailedTrackings();
        alert(`Tracking ${tracking.trackingId} marked as resolved`);
      } else {
        alert(`Failed to update tracking: ${result.error}`);
      }
    } catch (error) {
      console.error("Error marking as resolved:", error);
      alert("An unexpected error occurred");
    }
  };

  // Delete tracking
  const handleDeleteTracking = async (tracking: FailedTracking) => {
    if (
      // eslint-disable-next-line no-restricted-globals
      !confirm(
        `Are you sure you want to delete tracking ${tracking.trackingId}?`
      )
    ) {
      return;
    }

    try {
      const result = await deleteFailedTracking(tracking.id);

      if (result.success) {
        await loadFailedTrackings();
        alert(`Tracking ${tracking.trackingId} deleted successfully`);
      } else {
        alert(`Failed to delete tracking: ${result.error}`);
      }
    } catch (error) {
      console.error("Error deleting tracking:", error);
      alert("An unexpected error occurred");
    }
  };

  // Filter failed trackings
  const filteredTrackings = failedTrackings.filter((tracking) => {
    const matchesStatus =
      statusFilter === "All" || tracking.status === statusFilter;
    const matchesSearch =
      !searchFilter ||
      tracking.trackingId.toLowerCase().includes(searchFilter.toLowerCase()) ||
      tracking.reason.toLowerCase().includes(searchFilter.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Failed":
        return "bg-red-100 text-red-800 border-red-200";
      case "Retry":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Resolved":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hidden file input for CSV upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        style={{ display: "none" }}
        onChange={handleCsvFileSelect}
      />

      {/* Main Content */}
      <div className=" py-4 mx-auto max-w-7xl">
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

          {/* Failed Trackings Section */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Failed Tracking Numbers
                  </h2>
                </div>
                <div className="flex gap-4">
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
                  <button
                    onClick={loadFailedTrackings}
                    disabled={loadingFailedTrackings}
                    className="flex items-center px-3 py-2 space-x-2 text-sm text-gray-600 transition-colors border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    <svg
                      className={`w-4 h-4 ${
                        loadingFailedTrackings ? "animate-spin" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="flex items-center mt-4 space-x-4">
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Status Filter
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="All">All</option>
                    <option value="Failed">Failed</option>
                    <option value="Retry">Retry</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Search
                  </label>
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Search by tracking ID or reason..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="p-6">
              {/* Loading state */}
              {loadingFailedTrackings && (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-b-2 border-blue-600 rounded-full animate-spin"></div>
                  <span className="ml-2 text-gray-600">
                    Loading failed trackings...
                  </span>
                </div>
              )}

              {/* Error state */}
              {errorLoadingTrackings && (
                <div className="p-4 text-red-700 bg-red-50 border border-red-200 rounded-lg">
                  <p>Error loading failed trackings: {errorLoadingTrackings}</p>
                  <button
                    onClick={loadFailedTrackings}
                    className="mt-2 text-sm text-red-600 underline"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Failed trackings table */}
              {!loadingFailedTrackings && !errorLoadingTrackings && (
                <>
                  {filteredTrackings.length === 0 ? (
                    <div className="py-8 text-center text-gray-500">
                      No failed trackings found
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                              Tracking ID
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                              Status
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                              Reason
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                              Attempts
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                              Last Attempt
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {filteredTrackings.map((tracking) => (
                            <tr key={tracking.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                {tracking.trackingId}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(
                                    tracking.status
                                  )}`}
                                >
                                  {tracking.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {tracking.reason}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {tracking.attemptCount}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {new Date(
                                  tracking.lastAttempt
                                ).toLocaleString()}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center space-x-2">
                                  {tracking.status !== "Resolved" && (
                                    <button
                                      onClick={() =>
                                        handleRetryTracking(tracking)
                                      }
                                      disabled={retryingTrackings.has(
                                        tracking.id
                                      )}
                                      className="px-2 py-1 text-xs text-blue-600 transition-colors border border-blue-300 rounded hover:bg-blue-50 disabled:opacity-50"
                                    >
                                      {retryingTrackings.has(tracking.id)
                                        ? "Retrying..."
                                        : "Retry"}
                                    </button>
                                  )}
                                  {tracking.status !== "Resolved" && (
                                    <button
                                      onClick={() =>
                                        handleMarkResolved(tracking)
                                      }
                                      className="px-2 py-1 text-xs text-green-600 transition-colors border border-green-300 rounded hover:bg-green-50"
                                    >
                                      Mark Resolved
                                    </button>
                                  )}
                                  <button
                                    onClick={() =>
                                      handleDeleteTracking(tracking)
                                    }
                                    className="px-2 py-1 text-xs text-red-600 transition-colors border border-red-300 rounded hover:bg-red-50"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
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

export default PaymentTracking;
