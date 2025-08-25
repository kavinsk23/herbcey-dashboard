import React, { useState, useEffect } from "react";
import {
  getAllStockFromSheet,
  syncAllStockToSheet,
  updateStockInSheet,
  addStockToSheet,
} from "../assets/services/stockService";

interface StockItem {
  id: string;
  productName: string;
  currentStock: number;
  minimumStock: number;
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
  products: Product[];
  onStockUpdate?: (stock: Record<string, number>) => void;
}

const StockManager: React.FC<StockManagerProps> = ({
  products,
  onStockUpdate,
}) => {
  const [stock, setStock] = useState<StockItem[]>([]);
  const [isEditingStock, setIsEditingStock] = useState<string | null>(null);
  const [isEditingMinStock, setIsEditingMinStock] = useState<string | null>(
    null
  );
  const [tempStock, setTempStock] = useState<number>(0);
  const [tempMinStock, setTempMinStock] = useState<number>(0);
  const [showRestock, setShowRestock] = useState<string | null>(null);
  const [restockQuantity, setRestockQuantity] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<string>("Loading...");
  const [showLowStockOnly, setShowLowStockOnly] = useState<boolean>(false);

  // Default stock levels to initialize if sheet is empty
  const getDefaultStock = (): StockItem[] => {
    return products.map((product) => ({
      id: `stock_${product.name.toLowerCase()}`,
      productName: product.name,
      currentStock: product.name === "Oil" ? 100 : 50,
      minimumStock: product.name === "Oil" ? 20 : 10,
      lastUpdated: new Date().toISOString(),
    }));
  };

  // Load stock from Google Sheets on component mount
  useEffect(() => {
    loadStockFromSheet();
  }, []);

  // Update parent component when stock changes
  useEffect(() => {
    if (stock.length > 0) {
      const stockMap = stock.reduce((acc, item) => {
        acc[item.productName] = item.currentStock;
        return acc;
      }, {} as Record<string, number>);
      onStockUpdate?.(stockMap);
    }
  }, [stock, onStockUpdate]);

  // Load stock from Google Sheets
  const loadStockFromSheet = async () => {
    setLoading(true);
    setSyncStatus("Loading...");

    try {
      const result = await getAllStockFromSheet();

      if (result.success && result.data && result.data.length > 0) {
        // Use data from Google Sheets
        setStock(result.data);
        setSyncStatus("Synced");
      } else {
        // Initialize with default stock if sheet is empty
        const defaultStock = getDefaultStock();
        setStock(defaultStock);
        // Sync default stock to sheet
        await syncAllStockToSheet(defaultStock);
        setSyncStatus("Initialized");
      }
    } catch (error) {
      console.error("Failed to load stock from sheet:", error);
      // Use default stock as fallback
      setStock(getDefaultStock());
      setSyncStatus("Offline");
    }

    setLoading(false);
  };

  // Update stock in Google Sheets
  const updateStockInSheets = async (updatedStock: StockItem) => {
    try {
      setSyncStatus("Syncing...");
      const result = await updateStockInSheet(updatedStock.id, updatedStock);

      if (result.success) {
        setSyncStatus("Synced");
        return true;
      } else {
        setSyncStatus("Sync failed");
        return false;
      }
    } catch (error) {
      console.error("Failed to update stock in sheet:", error);
      setSyncStatus("Sync failed");
      return false;
    }
  };

  // Add new stock item to Google Sheets
  const addStockToSheets = async (newStock: StockItem) => {
    try {
      setSyncStatus("Adding stock...");
      const result = await addStockToSheet(newStock);

      if (result.success) {
        setSyncStatus("Synced");
        return true;
      } else {
        setSyncStatus("Sync failed");
        return false;
      }
    } catch (error) {
      console.error("Failed to add stock to sheet:", error);
      setSyncStatus("Sync failed");
      return false;
    }
  };

  // Reduce stock for products in an order
  const reduceStockForOrder = async (
    orderProducts: { name: string; quantity: number }[]
  ) => {
    try {
      setSyncStatus("Updating stock for order...");

      const updatedStock = [...stock];
      let needsUpdate = false;

      for (const orderProduct of orderProducts) {
        const stockItemIndex = updatedStock.findIndex(
          (item) => item.productName === orderProduct.name
        );

        if (stockItemIndex !== -1) {
          updatedStock[stockItemIndex] = {
            ...updatedStock[stockItemIndex],
            currentStock: Math.max(
              0,
              updatedStock[stockItemIndex].currentStock - orderProduct.quantity
            ),
            lastUpdated: new Date().toISOString(),
          };
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        const success = await syncAllStockToSheet(updatedStock);
        if (success) {
          setStock(updatedStock);
          setSyncStatus("Stock updated for order");
          return true;
        } else {
          setSyncStatus("Failed to update stock for order");
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error("Error reducing stock for order:", error);
      setSyncStatus("Error updating stock");
      return false;
    }
  };

  // Stock editing functions
  const handleStockEditStart = (stockId: string, currentStock: number) => {
    setIsEditingStock(stockId);
    setTempStock(currentStock);
  };

  const handleStockEditCancel = () => {
    setIsEditingStock(null);
    setTempStock(0);
  };

  const handleStockEditSave = async (stockId: string) => {
    if (tempStock < 0) {
      alert("Stock cannot be negative");
      return;
    }

    const updatedStockItem = stock.find((item) => item.id === stockId);
    if (!updatedStockItem) return;

    const newStockItem = {
      ...updatedStockItem,
      currentStock: tempStock,
      lastUpdated: new Date().toISOString(),
    };

    // Update in Google Sheets first
    const success = await updateStockInSheets(newStockItem);

    if (success) {
      // Update local state only if Google Sheets update was successful
      setStock((prevStock) =>
        prevStock.map((item) => (item.id === stockId ? newStockItem : item))
      );
    } else {
      alert("Failed to update stock in Google Sheets");
    }

    setIsEditingStock(null);
    setTempStock(0);
  };

  // Minimum stock editing functions
  const handleMinStockEditStart = (
    stockId: string,
    currentMinStock: number
  ) => {
    setIsEditingMinStock(stockId);
    setTempMinStock(currentMinStock);
  };

  const handleMinStockEditCancel = () => {
    setIsEditingMinStock(null);
    setTempMinStock(0);
  };

  const handleMinStockEditSave = async (stockId: string) => {
    if (tempMinStock < 0) {
      alert("Minimum stock cannot be negative");
      return;
    }

    const updatedStockItem = stock.find((item) => item.id === stockId);
    if (!updatedStockItem) return;

    const newStockItem = {
      ...updatedStockItem,
      minimumStock: tempMinStock,
      lastUpdated: new Date().toISOString(),
    };

    // Update in Google Sheets first
    const success = await updateStockInSheets(newStockItem);

    if (success) {
      // Update local state only if Google Sheets update was successful
      setStock((prevStock) =>
        prevStock.map((item) => (item.id === stockId ? newStockItem : item))
      );
    } else {
      alert("Failed to update minimum stock in Google Sheets");
    }

    setIsEditingMinStock(null);
    setTempMinStock(0);
  };

  // Restock functions
  const handleRestock = async (stockId: string) => {
    if (restockQuantity <= 0) {
      alert("Restock quantity must be greater than 0");
      return;
    }

    const updatedStockItem = stock.find((item) => item.id === stockId);
    if (!updatedStockItem) return;

    const newStockItem = {
      ...updatedStockItem,
      currentStock: updatedStockItem.currentStock + restockQuantity,
      lastUpdated: new Date().toISOString(),
      lastRestocked: new Date().toISOString(),
      restockQuantity: restockQuantity,
    };

    // Update in Google Sheets first
    const success = await updateStockInSheets(newStockItem);

    if (success) {
      // Update local state only if Google Sheets update was successful
      setStock((prevStock) =>
        prevStock.map((item) => (item.id === stockId ? newStockItem : item))
      );
      setShowRestock(null);
      setRestockQuantity(0);
    } else {
      alert("Failed to restock in Google Sheets");
    }
  };

  const getStockStatusColor = (currentStock: number, minimumStock: number) => {
    if (currentStock === 0) return "bg-red-100 text-red-800";
    if (currentStock <= minimumStock) return "bg-yellow-100 text-yellow-800";
    return "bg-green-100 text-green-800";
  };

  const getStockStatusText = (currentStock: number, minimumStock: number) => {
    if (currentStock === 0) return "Out of Stock";
    if (currentStock <= minimumStock) return "Low Stock";
    return "In Stock";
  };

  const filteredStock = showLowStockOnly
    ? stock.filter((item) => item.currentStock <= item.minimumStock)
    : stock;

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Stock Management
            </h3>
            <p className="text-sm text-gray-500">
              Manage inventory levels and set restock alerts
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
              <span className="text-sm text-gray-700">Show low stock only</span>
            </label>

            <div
              className={`px-3 py-1 text-xs font-medium rounded-full ${
                syncStatus === "Synced"
                  ? "text-green-700 bg-green-100"
                  : syncStatus === "Syncing..." ||
                    syncStatus.includes("Updating")
                  ? "text-blue-700 bg-blue-100"
                  : syncStatus === "Sync failed" ||
                    syncStatus.includes("failed")
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
        {/* Stock Table */}
        <div className="overflow-hidden border border-gray-200 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase"
                >
                  Product
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase"
                >
                  Current Stock
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase"
                >
                  Minimum Stock
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase"
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase"
                >
                  Last Updated
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-xs font-medium tracking-wider text-right text-gray-500 uppercase"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStock.map((item) => (
                <tr
                  key={item.id}
                  className={
                    item.currentStock <= item.minimumStock ? "bg-yellow-50" : ""
                  }
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {item.productName}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {isEditingStock === item.id ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          value={tempStock}
                          onChange={(e) =>
                            setTempStock(parseInt(e.target.value) || 0)
                          }
                          className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary"
                          autoFocus
                          min="0"
                        />
                        <button
                          onClick={() => handleStockEditSave(item.id)}
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
                          onClick={handleStockEditCancel}
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
                        <span className="text-sm text-gray-900">
                          {item.currentStock}
                        </span>
                        <button
                          onClick={() =>
                            handleStockEditStart(item.id, item.currentStock)
                          }
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title="Edit stock"
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
                    {isEditingMinStock === item.id ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          value={tempMinStock}
                          onChange={(e) =>
                            setTempMinStock(parseInt(e.target.value) || 0)
                          }
                          className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary"
                          autoFocus
                          min="0"
                        />
                        <button
                          onClick={() => handleMinStockEditSave(item.id)}
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
                          onClick={handleMinStockEditCancel}
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
                        <span className="text-sm text-gray-900">
                          {item.minimumStock}
                        </span>
                        <button
                          onClick={() =>
                            handleMinStockEditStart(item.id, item.minimumStock)
                          }
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title="Edit minimum stock"
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
                        item.currentStock,
                        item.minimumStock
                      )}`}
                    >
                      {getStockStatusText(item.currentStock, item.minimumStock)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                    {new Date(item.lastUpdated).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-right whitespace-nowrap">
                    {showRestock === item.id ? (
                      <div className="flex items-center justify-end space-x-2">
                        <input
                          type="number"
                          value={restockQuantity}
                          onChange={(e) =>
                            setRestockQuantity(parseInt(e.target.value) || 0)
                          }
                          className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="Qty"
                          min="1"
                        />
                        <button
                          onClick={() => handleRestock(item.id)}
                          className="px-2 py-1 text-xs text-white bg-green-600 rounded hover:bg-green-700"
                          disabled={loading}
                        >
                          Confirm
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
                      >
                        Restock
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredStock.length === 0 && (
          <div className="p-4 text-center text-gray-500">
            {showLowStockOnly
              ? "No products with low stock levels"
              : "No stock items found"}
          </div>
        )}
      </div>
    </div>
  );
};

export default StockManager;
