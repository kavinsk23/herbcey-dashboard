import React, { useState, useEffect } from "react";
import {
  getAllStockFromSheet,
  syncAllStockToSheet,
  updateStockInSheet,
  addStockToSheet,
  syncStockWithProducts,
  fillBottles, // NEW: Import fill bottles function
} from "../assets/services/stockService";

interface StockItem {
  id: string;
  productName: string;
  emptyStock: number; // NEW: Empty bottles
  filledStock: number; // RENAMED: Was currentStock, now filledStock
  lastUpdated: string;
  lastRestocked?: string;
  restockQuantity?: number;
}

interface Product {
  name: string;
  cost: number;
  price: number;
}

interface StockManagerProps {
  products?: Product[];
  onStockUpdate?: (stock: Record<string, number>) => void;
}

const StockManager: React.FC<StockManagerProps> = ({ onStockUpdate }) => {
  const [stock, setStock] = useState<StockItem[]>([]);

  // Editing states
  const [isEditingEmptyStock, setIsEditingEmptyStock] = useState<string | null>(
    null
  );
  const [isEditingFilledStock, setIsEditingFilledStock] = useState<
    string | null
  >(null);
  const [tempEmptyStock, setTempEmptyStock] = useState<number>(0);
  const [tempFilledStock, setTempFilledStock] = useState<number>(0);

  // Restock and Fill states
  const [showRestock, setShowRestock] = useState<string | null>(null);
  const [showFill, setShowFill] = useState<string | null>(null); // NEW: Fill bottles
  const [restockQuantity, setRestockQuantity] = useState<number>(0);
  const [fillQuantity, setFillQuantity] = useState<number>(0); // NEW: Fill quantity

  const [loading, setLoading] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<string>("Loading...");
  const [showLowStockOnly, setShowLowStockOnly] = useState<boolean>(false);

  // Load and sync stock with products from Google Sheets on component mount
  useEffect(() => {
    loadAndSyncStock();
  }, []);

  // Update parent component when stock changes (send filled stock as that's what's sellable)
  useEffect(() => {
    if (stock.length > 0) {
      const stockMap = stock.reduce((acc, item) => {
        acc[item.productName] = item.filledStock; // Send filled stock to parent
        return acc;
      }, {} as Record<string, number>);
      onStockUpdate?.(stockMap);
    }
  }, [stock, onStockUpdate]);

  const loadAndSyncStock = async () => {
    setLoading(true);
    setSyncStatus("Syncing with Products sheet...");

    try {
      const result = await syncStockWithProducts();

      if (result.success && result.data && result.data.length > 0) {
        setStock(result.data);
        setSyncStatus("Synced");
        console.log("Stock synced with products successfully");
      } else {
        console.error("Failed to sync stock with products:", result.error);
        setSyncStatus("Sync failed - " + (result.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Failed to sync stock:", error);
      setSyncStatus("Sync failed");
    }

    setLoading(false);
  };

  const handleManualSync = async () => {
    await loadAndSyncStock();
  };

  const updateStockInSheets = async (updatedStock: StockItem) => {
    try {
      setSyncStatus("Updating...");
      const result = await updateStockInSheet(updatedStock.id, updatedStock);

      if (result.success) {
        setSyncStatus("Synced");
        return true;
      } else {
        setSyncStatus("Update failed");
        return false;
      }
    } catch (error) {
      console.error("Failed to update stock in sheet:", error);
      setSyncStatus("Update failed");
      return false;
    }
  };

  // Empty Stock editing functions
  const handleEmptyStockEditStart = (
    stockId: string,
    currentEmptyStock: number
  ) => {
    setIsEditingEmptyStock(stockId);
    setTempEmptyStock(currentEmptyStock);
  };

  const handleEmptyStockEditCancel = () => {
    setIsEditingEmptyStock(null);
    setTempEmptyStock(0);
  };

  const handleEmptyStockEditSave = async (stockId: string) => {
    if (tempEmptyStock < 0) {
      alert("Empty stock cannot be negative");
      return;
    }

    const updatedStockItem = stock.find((item) => item.id === stockId);
    if (!updatedStockItem) return;

    const newStockItem = {
      ...updatedStockItem,
      emptyStock: tempEmptyStock,
      lastUpdated: new Date().toISOString(),
    };

    const success = await updateStockInSheets(newStockItem);

    if (success) {
      setStock((prevStock) =>
        prevStock.map((item) => (item.id === stockId ? newStockItem : item))
      );
    } else {
      alert("Failed to update empty stock in Google Sheets");
    }

    setIsEditingEmptyStock(null);
    setTempEmptyStock(0);
  };

  // Filled Stock editing functions
  const handleFilledStockEditStart = (
    stockId: string,
    currentFilledStock: number
  ) => {
    setIsEditingFilledStock(stockId);
    setTempFilledStock(currentFilledStock);
  };

  const handleFilledStockEditCancel = () => {
    setIsEditingFilledStock(null);
    setTempFilledStock(0);
  };

  const handleFilledStockEditSave = async (stockId: string) => {
    if (tempFilledStock < 0) {
      alert("Filled stock cannot be negative");
      return;
    }

    const updatedStockItem = stock.find((item) => item.id === stockId);
    if (!updatedStockItem) return;

    const newStockItem = {
      ...updatedStockItem,
      filledStock: tempFilledStock,
      lastUpdated: new Date().toISOString(),
    };

    const success = await updateStockInSheets(newStockItem);

    if (success) {
      setStock((prevStock) =>
        prevStock.map((item) => (item.id === stockId ? newStockItem : item))
      );
    } else {
      alert("Failed to update filled stock in Google Sheets");
    }

    setIsEditingFilledStock(null);
    setTempFilledStock(0);
  };

  // Restock function (adds to EMPTY stock)
  const handleRestock = async (stockId: string) => {
    if (restockQuantity <= 0) {
      alert("Restock quantity must be greater than 0");
      return;
    }

    const updatedStockItem = stock.find((item) => item.id === stockId);
    if (!updatedStockItem) return;

    const newStockItem = {
      ...updatedStockItem,
      emptyStock: updatedStockItem.emptyStock + restockQuantity, // Add to empty stock
      lastUpdated: new Date().toISOString(),
      lastRestocked: new Date().toISOString(),
      restockQuantity: restockQuantity,
    };

    const success = await updateStockInSheets(newStockItem);

    if (success) {
      setStock((prevStock) =>
        prevStock.map((item) => (item.id === stockId ? newStockItem : item))
      );
      setShowRestock(null);
      setRestockQuantity(0);
    } else {
      alert("Failed to restock in Google Sheets");
    }
  };

  // NEW: Fill bottles function (converts empty to filled)
  const handleFill = async (stockId: string) => {
    if (fillQuantity <= 0) {
      alert("Fill quantity must be greater than 0");
      return;
    }

    const stockItem = stock.find((item) => item.id === stockId);
    if (!stockItem) return;

    const result = await fillBottles(stockItem.productName, fillQuantity);

    if (result.success) {
      // Update local state
      setStock((prevStock) =>
        prevStock.map((item) =>
          item.id === stockId
            ? {
                ...item,
                emptyStock: item.emptyStock - fillQuantity,
                filledStock: item.filledStock + fillQuantity,
                lastUpdated: new Date().toISOString(),
              }
            : item
        )
      );
      setShowFill(null);
      setFillQuantity(0);
      setSyncStatus("Bottles filled successfully");
    } else {
      alert(`Failed to fill bottles: ${result.error}`);
    }
  };

  const getStockStatusColor = (filledStock: number) => {
    if (filledStock === 0) return "bg-red-100 text-red-800";
    if (filledStock <= 10) return "bg-yellow-100 text-yellow-800"; // Low filled stock threshold
    return "bg-green-100 text-green-800";
  };

  const getStockStatusText = (filledStock: number) => {
    if (filledStock === 0) return "No Filled Stock";
    if (filledStock <= 10) return "Low Filled Stock";
    return "Good Stock";
  };

  const filteredStock = showLowStockOnly
    ? stock.filter((item) => item.filledStock <= 10) // Filter by filled stock
    : stock;

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Stock Management - Empty/Filled System
            </h3>
            <p className="text-sm text-gray-500">
              Track empty bottles (raw) and filled bottles (ready to sell)
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={showLowStockOnly}
                onChange={(e) => setShowLowStockOnly(e.target.checked)}
                className="border-gray-300 rounded text-primary focus:ring-primary"
              />
              <span className="text-sm text-gray-700">
                Show low filled stock only
              </span>
            </label>

            <button
              onClick={handleManualSync}
              className="px-3 py-1 text-xs text-blue-600 bg-blue-100 rounded hover:bg-blue-200"
              disabled={loading}
            >
              🔄 Sync Products
            </button>

            <div
              className={`px-3 py-1 text-xs font-medium rounded-full ${
                syncStatus === "Synced"
                  ? "text-green-700 bg-green-100"
                  : syncStatus.includes("Syncing") ||
                    syncStatus.includes("Updating")
                  ? "text-blue-700 bg-blue-100"
                  : syncStatus.includes("failed") ||
                    syncStatus.includes("Failed")
                  ? "text-red-700 bg-red-100"
                  : "text-gray-700 bg-gray-100"
              }`}
            >
              {loading ? "Loading..." : syncStatus}
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="overflow-hidden border border-gray-200 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Product
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Empty Stock
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Filled Stock
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Last Updated
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-right text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStock.map((item) => (
                <tr
                  key={item.id}
                  className={item.filledStock <= 10 ? "bg-yellow-50" : ""}
                >
                  <td className="px-6 py-4 text-left whitespace-nowrap">
                    <div className="flex items-center justify-start">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {item.productName}
                        </div>
                        <div className="text-xs text-gray-500">
                          Total: {item.emptyStock + item.filledStock} bottles
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Empty Stock Column */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    {isEditingEmptyStock === item.id ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          value={tempEmptyStock}
                          onChange={(e) =>
                            setTempEmptyStock(parseInt(e.target.value) || 0)
                          }
                          className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary"
                          autoFocus
                          min="0"
                        />
                        <button
                          onClick={() => handleEmptyStockEditSave(item.id)}
                          className="p-1 text-green-600 hover:text-green-800"
                          title="Save"
                          disabled={loading}
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={handleEmptyStockEditCancel}
                          className="p-1 text-red-600 hover:text-red-800"
                          title="Cancel"
                        >
                          <svg
                            className="w-4 h-4"
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
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-blue-600">
                          {item.emptyStock}
                        </span>
                        <button
                          onClick={() =>
                            handleEmptyStockEditStart(item.id, item.emptyStock)
                          }
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title="Edit empty stock"
                          disabled={loading}
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                      </div>
                    )}
                  </td>

                  {/* Filled Stock Column */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    {isEditingFilledStock === item.id ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          value={tempFilledStock}
                          onChange={(e) =>
                            setTempFilledStock(parseInt(e.target.value) || 0)
                          }
                          className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary"
                          autoFocus
                          min="0"
                        />
                        <button
                          onClick={() => handleFilledStockEditSave(item.id)}
                          className="p-1 text-green-600 hover:text-green-800"
                          title="Save"
                          disabled={loading}
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={handleFilledStockEditCancel}
                          className="p-1 text-red-600 hover:text-red-800"
                          title="Cancel"
                        >
                          <svg
                            className="w-4 h-4"
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
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-green-600">
                          {item.filledStock}
                        </span>
                        <button
                          onClick={() =>
                            handleFilledStockEditStart(
                              item.id,
                              item.filledStock
                            )
                          }
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title="Edit filled stock"
                          disabled={loading}
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                      </div>
                    )}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStockStatusColor(
                        item.filledStock
                      )}`}
                    >
                      {getStockStatusText(item.filledStock)}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                    {new Date(item.lastUpdated).toLocaleDateString()}
                  </td>

                  <td className="px-6 py-4 text-sm font-medium text-right whitespace-nowrap">
                    <div className="flex justify-end space-x-2">
                      {/* Restock Button (adds to empty stock) */}
                      {showRestock === item.id ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            value={restockQuantity}
                            onChange={(e) =>
                              setRestockQuantity(parseInt(e.target.value) || 0)
                            }
                            className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="Qty"
                            min="1"
                          />
                          <button
                            onClick={() => handleRestock(item.id)}
                            className="px-2 py-1 text-xs text-white bg-blue-600 rounded hover:bg-blue-700"
                            disabled={loading}
                          >
                            Add Empty
                          </button>
                          <button
                            onClick={() => setShowRestock(null)}
                            className="px-2 py-1 text-xs text-gray-600 bg-gray-200 rounded hover:bg-gray-300"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowRestock(item.id)}
                          className="px-3 py-1 text-xs text-white bg-blue-600 rounded hover:bg-blue-700"
                          disabled={loading}
                          title="Add empty bottles"
                        >
                          + Empty
                        </button>
                      )}

                      {/* Fill Button (converts empty to filled) */}
                      {showFill === item.id ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            value={fillQuantity}
                            onChange={(e) =>
                              setFillQuantity(parseInt(e.target.value) || 0)
                            }
                            className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="Qty"
                            min="1"
                            max={item.emptyStock}
                          />
                          <button
                            onClick={() => handleFill(item.id)}
                            className="px-2 py-1 text-xs text-white bg-green-600 rounded hover:bg-green-700"
                            disabled={loading || item.emptyStock === 0}
                          >
                            Fill
                          </button>
                          <button
                            onClick={() => setShowFill(null)}
                            className="px-2 py-1 text-xs text-gray-600 bg-gray-200 rounded hover:bg-gray-300"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowFill(item.id)}
                          className={`px-3 py-1 text-xs rounded ${
                            item.emptyStock > 0
                              ? "text-white bg-green-600 hover:bg-green-700"
                              : "text-gray-400 bg-gray-200 cursor-not-allowed"
                          }`}
                          disabled={loading || item.emptyStock === 0}
                          title={
                            item.emptyStock > 0
                              ? "Fill bottles from empty stock"
                              : "No empty bottles to fill"
                          }
                        >
                          Fill
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredStock.length === 0 && (
          <div className="p-4 text-center text-gray-500">
            {showLowStockOnly
              ? "No products with low filled stock levels"
              : "No stock items found. Try syncing with Products sheet."}
          </div>
        )}
      </div>
    </div>
  );
};

export default StockManager;
