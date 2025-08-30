import React, { useState, useMemo, useEffect, useRef } from "react";

interface BranchContact {
  id: number;
  branch: string;
  contactNo1?: string;
  contactNo2?: string;
  contactNo3?: string;
  additionalInfo?: string;
}

const GoogleSheetBranchLookup = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBranch, setSelectedBranch] = useState<BranchContact | null>(
    null
  );
  const [branches, setBranches] = useState<BranchContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const GOOGLE_API_KEY =
    process.env.REACT_APP_GOOGLE_API_KEY || "YOUR_GOOGLE_API_KEY";
  const SPREADSHEET_ID =
    process.env.REACT_APP_GOOGLE_SHEET_ID || "YOUR_GOOGLE_SHEET_ID";
  const SHEET_NAME = "BranchNumbers";

  const loadBranchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const accessToken = localStorage.getItem("google_access_token");

      let response;
      if (accessToken) {
        response = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );
      } else {
        response = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}?key=${GOOGLE_API_KEY}`
        );
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.status}`);
      }

      const data = await response.json();
      const rows = data.values || [];

      // Skip header row and convert to BranchContact format
      const branchData: BranchContact[] = rows
        .slice(1)
        .map((row: any[], index: number) => ({
          id: parseInt(row[0]) || index + 1,
          branch: row[1] || "",
          contactNo1: row[2] || "",
          contactNo2: row[3] || "",
          contactNo3: row[4] || "",
          additionalInfo: row[5] || "",
        }))
        .filter((branch: { branch: string }) => branch.branch.trim() !== "");

      setBranches(branchData);
      console.log("Loaded branches:", branchData);
    } catch (err) {
      console.error("Error loading branch data:", err);
      setError(
        `Error loading data: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadBranchData();
  }, []);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current &&
        suggestionsRef.current &&
        !inputRef.current.contains(event.target as Node) &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const suggestions = useMemo(() => {
    if (!searchTerm.trim() || selectedBranch) return [];

    return branches
      .filter((branch) =>
        branch.branch.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .slice(0, 5); // Show max 5 suggestions
  }, [branches, searchTerm, selectedBranch]);

  const formatPhoneNumber = (phone: string) => {
    if (!phone) return "";
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 10) {
      return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(
        6
      )}`;
    }
    return phone;
  };

  const getContactNumbers = (branch: BranchContact) => {
    const contacts = [];
    if (branch.contactNo1) contacts.push(branch.contactNo1);
    if (branch.contactNo2) contacts.push(branch.contactNo2);
    if (branch.contactNo3) contacts.push(branch.contactNo3);
    return contacts;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setSelectedBranch(null);
    setShowSuggestions(value.trim().length > 0);
  };

  const handleSuggestionClick = (branch: BranchContact) => {
    setSelectedBranch(branch);
    setSearchTerm(branch.branch);
    setShowSuggestions(false);
  };

  const handleClear = () => {
    setSearchTerm("");
    setSelectedBranch(null);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  return (
    <div className="mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Branch Contact Finder
        </h2>
        <button
          onClick={loadBranchData}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
        >
          <svg
            className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
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

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex">
            <svg
              className="h-5 w-5 text-red-400 mt-0.5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            Loading branch data from Google Sheets...
          </p>
        </div>
      ) : branches.length > 0 ? (
        <>
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700">
              Successfully loaded {branches.length} branches from Google Sheets
            </p>
          </div>

          {/* Search Input with Autocomplete */}
          <div className="relative mb-6">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                ref={inputRef}
                type="text"
                placeholder="Type city/branch name to search..."
                value={searchTerm}
                onChange={handleInputChange}
                onFocus={() =>
                  setShowSuggestions(
                    searchTerm.trim().length > 0 && !selectedBranch
                  )
                }
                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {searchTerm && (
                <button
                  onClick={handleClear}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div
                ref={suggestionsRef}
                className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
              >
                {suggestions.map((branch) => (
                  <div
                    key={branch.id}
                    onClick={() => handleSuggestionClick(branch)}
                    className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-gray-900 font-medium">
                        {branch.branch}
                      </span>
                      <span className="text-sm text-gray-500">
                        {getContactNumbers(branch).length} contact(s)
                      </span>
                    </div>
                    {branch.additionalInfo && (
                      <span className="text-xs text-blue-600">
                        {branch.additionalInfo}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected Branch Details */}
          {selectedBranch && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <svg
                  className="w-6 h-6 text-blue-600 mr-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <h3 className="text-xl font-bold text-gray-900">
                  {selectedBranch.branch}
                </h3>
                {selectedBranch.additionalInfo &&
                  selectedBranch.additionalInfo.trim() !== "" && (
                    <span className="ml-3 px-3 py-1 bg-blue-200 text-blue-800 text-sm rounded-full">
                      {selectedBranch.additionalInfo}
                    </span>
                  )}
              </div>

              <div className="space-y-3">
                {getContactNumbers(selectedBranch).map((contact, index) => (
                  <div
                    key={index}
                    className="flex items-center bg-white p-3 rounded-lg border"
                  >
                    <svg
                      className="w-5 h-5 text-green-600 mr-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      />
                    </svg>
                    <a
                      href={`tel:${contact.replace(/\D/g, "")}`}
                      className="text-blue-600 hover:text-blue-800 hover:underline font-mono text-lg flex-1"
                    >
                      {formatPhoneNumber(contact)}
                    </a>
                    {index === 0 && (
                      <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                        Primary
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-4 text-sm text-gray-600">
                Branch ID: {selectedBranch.id} •{" "}
                {getContactNumbers(selectedBranch).length} contact number(s)
              </div>
            </div>
          )}

          {/* Empty State */}
          {!selectedBranch && searchTerm.trim() === "" && (
            <div className="text-center py-8 text-gray-500">
              <svg
                className="w-12 h-12 mx-auto mb-4 text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <p>Start typing to search for branch contacts</p>
              <p className="text-sm mt-2">
                {branches.length} branches available
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>
            No branch data loaded. Click refresh to load from Google Sheets.
          </p>
        </div>
      )}
    </div>
  );
};

export default GoogleSheetBranchLookup;
