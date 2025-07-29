import React, { useState, useEffect } from "react";
import {
  getAllProductsFromSheet,
  syncAllProductsToSheet,
} from "../assets/services/productService";

interface ProductCost {
  id: string;
  name: string;
  cost: number;
  price: number;
  lastUpdated: string;
}

interface ProductManagerProps {
  onCostsUpdate?: (costs: Record<string, number>) => void;
}

const ProductManager: React.FC<ProductManagerProps> = ({ onCostsUpdate }) => {
  const [products, setProducts] = useState<ProductCost[]>([
    {
      id: "oil",
      name: "Oil",
      cost: 350, // Default cost
      price: 950, // Selling price
      lastUpdated: new Date().toISOString(),
    },
    {
      id: "shampoo",
      name: "Shampoo",
      cost: 800, // Default cost
      price: 1350, // Selling price
      lastUpdated: new Date().toISOString(),
    },
    {
      id: "conditioner",
      name: "Conditioner",
      cost: 850, // Default cost
      price: 1350, // Selling price
      lastUpdated: new Date().toISOString(),
    },
  ]);

  const [isEditingCost, setIsEditingCost] = useState<string | null>(null);
  const [isEditingPrice, setIsEditingPrice] = useState<string | null>(null);
  const [tempCost, setTempCost] = useState<number>(0);
  const [tempPrice, setTempPrice] = useState<number>(0);
  const [showAddProduct, setShowAddProduct] = useState<boolean>(false);
  const [newProduct, setNewProduct] = useState({
    name: "",
    cost: 0,
    price: 0,
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<string>("Auto-saved");

  // Load products from Google Sheets on component mount
  useEffect(() => {
    loadProductsFromSheet();
  }, []);

  // Load products from Google Sheets
  const loadProductsFromSheet = async () => {
    setLoading(true);
    try {
      const result = await getAllProductsFromSheet();
      if (result.success && result.data && result.data.length > 0) {
        setProducts(result.data);
        setSyncStatus("Synced");
      } else {
        // Fallback to localStorage if sheet is empty
        const savedProducts = localStorage.getItem("all_products");
        if (savedProducts) {
          const parsedProducts = JSON.parse(savedProducts);
          setProducts(parsedProducts);
          // Sync to sheet
          await syncAllProductsToSheet(parsedProducts);
        }
      }
    } catch (error) {
      console.error("Failed to load from sheet, using localStorage:", error);
      // Fallback to localStorage
      const savedProducts = localStorage.getItem("all_products");
      if (savedProducts) {
        const parsedProducts = JSON.parse(savedProducts);
        setProducts(parsedProducts);
      }
      setSyncStatus("Offline");
    }
    setLoading(false);
  };

  // Save to both localStorage and Google Sheets
  const saveProducts = async (updatedProducts: ProductCost[]) => {
    // Save to localStorage immediately
    localStorage.setItem("all_products", JSON.stringify(updatedProducts));

    // Update parent component
    const costMap = updatedProducts.reduce((acc, product) => {
      acc[product.name] = product.cost;
      return acc;
    }, {} as Record<string, number>);
    onCostsUpdate?.(costMap);

    // Sync to Google Sheets
    try {
      setSyncStatus("Syncing...");
      await syncAllProductsToSheet(updatedProducts);
      setSyncStatus("Synced");
    } catch (error) {
      console.error("Failed to sync to sheet:", error);
      setSyncStatus("Sync failed");
    }
  };

  // Update save products to localStorage whenever products change
  useEffect(() => {
    if (products.length > 0) {
      saveProducts(products);
    }
  }, [products, onCostsUpdate]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const calculateMargin = (cost: number, price: number) => {
    if (price === 0) return 0;
    return ((price - cost) / price) * 100;
  };

  const getProductColor = (name: string, index: number) => {
    const colors = [
      "bg-emerald-600",
      "bg-cyan-600",
      "bg-pink-600",
      "bg-purple-600",
      "bg-orange-600",
      "bg-blue-600",
      "bg-indigo-600",
      "bg-red-600",
    ];

    if (name === "Oil") return "bg-emerald-600";
    if (name === "Shampoo") return "bg-cyan-600";
    if (name === "Conditioner") return "bg-pink-600";

    return colors[index % colors.length];
  };

  // Cost editing functions
  const handleCostEditStart = (productId: string, currentCost: number) => {
    setIsEditingCost(productId);
    setTempCost(currentCost);
  };

  const handleCostEditCancel = () => {
    setIsEditingCost(null);
    setTempCost(0);
  };

  const handleCostEditSave = (productId: string) => {
    if (tempCost < 0) {
      alert("Cost cannot be negative");
      return;
    }

    setProducts((prevProducts) =>
      prevProducts.map((product) =>
        product.id === productId
          ? {
              ...product,
              cost: tempCost,
              lastUpdated: new Date().toISOString(),
            }
          : product
      )
    );

    setIsEditingCost(null);
    setTempCost(0);
  };

  // Price editing functions
  const handlePriceEditStart = (productId: string, currentPrice: number) => {
    setIsEditingPrice(productId);
    setTempPrice(currentPrice);
  };

  const handlePriceEditCancel = () => {
    setIsEditingPrice(null);
    setTempPrice(0);
  };

  const handlePriceEditSave = (productId: string) => {
    if (tempPrice < 0) {
      alert("Price cannot be negative");
      return;
    }

    setProducts((prevProducts) =>
      prevProducts.map((product) =>
        product.id === productId
          ? {
              ...product,
              price: tempPrice,
              lastUpdated: new Date().toISOString(),
            }
          : product
      )
    );

    setIsEditingPrice(null);
    setTempPrice(0);
  };

  // Add new product functions
  const handleAddProduct = async () => {
    if (!newProduct.name.trim()) {
      alert("Product name is required");
      return;
    }

    if (newProduct.cost < 0 || newProduct.price < 0) {
      alert("Cost and price cannot be negative");
      return;
    }

    if (
      products.some(
        (p) => p.name.toLowerCase() === newProduct.name.toLowerCase()
      )
    ) {
      alert("Product with this name already exists");
      return;
    }

    const productToAdd: ProductCost = {
      id: `product_${Date.now()}`,
      name: newProduct.name,
      cost: newProduct.cost,
      price: newProduct.price,
      lastUpdated: new Date().toISOString(),
    };

    setProducts((prev) => [...prev, productToAdd]);
    setNewProduct({ name: "", cost: 0, price: 0 });
    setShowAddProduct(false);
  };

  const handleDeleteProduct = async (productId: string) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      setProducts((prev) => prev.filter((p) => p.id !== productId));
    }
  };

  const getColorByMargin = (margin: number) => {
    if (margin >= 50) return "text-green-600 bg-green-50";
    if (margin >= 30) return "text-yellow-600 bg-yellow-50";
    if (margin >= 10) return "text-orange-600 bg-orange-50";
    return "text-red-600 bg-red-50";
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Product Cost Management
            </h3>
            <p className="text-sm text-gray-500">
              Update product costs and prices to calculate accurate profit
              margins
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowAddProduct(!showAddProduct)}
              className="px-4 py-2 text-sm font-medium text-white transition-colors rounded-lg bg-primary hover:bg-primary/90"
            >
              {showAddProduct ? "Cancel" : "Add Product"}
            </button>
            <div className="px-3 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full">
              {loading ? "Loading..." : syncStatus}
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Add New Product Form */}
        {showAddProduct && (
          <div className="p-4 mb-6 border border-gray-200 rounded-lg bg-gray-50">
            <h4 className="mb-4 font-semibold text-gray-900 text-md">
              Add New Product
            </h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Product Name
                </label>
                <input
                  type="text"
                  value={newProduct.name}
                  onChange={(e) =>
                    setNewProduct((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Enter product name"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Cost (LKR)
                </label>
                <input
                  type="number"
                  value={newProduct.cost}
                  onChange={(e) =>
                    setNewProduct((prev) => ({
                      ...prev,
                      cost: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Selling Price (LKR)
                </label>
                <input
                  type="number"
                  value={newProduct.price}
                  onChange={(e) =>
                    setNewProduct((prev) => ({
                      ...prev,
                      price: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="0"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleAddProduct}
                  className="w-full px-4 py-2 text-sm font-medium text-white transition-colors bg-green-600 rounded-md hover:bg-green-700"
                >
                  Add Product
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Products Grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {products.map((product, index) => {
            const margin = calculateMargin(product.cost, product.price);
            const profit = product.price - product.cost;

            return (
              <div
                key={product.id}
                className="p-4 transition-shadow border border-gray-200 rounded-lg hover:shadow-md"
              >
                {/* Product Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-3 h-3 rounded-full ${getProductColor(
                        product.name,
                        index
                      )}`}
                    ></div>
                    <h4 className="font-semibold text-gray-900">
                      {product.name}
                    </h4>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${getColorByMargin(
                        margin
                      )}`}
                    >
                      {margin.toFixed(1)}% margin
                    </span>
                    {products.length > 3 && (
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="p-1 text-red-400 hover:text-red-600"
                        title="Delete product"
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
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                {/* Pricing Information */}
                <div className="mb-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      Selling Price:
                    </span>
                    {isEditingPrice === product.id ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          value={tempPrice}
                          onChange={(e) =>
                            setTempPrice(parseFloat(e.target.value) || 0)
                          }
                          className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary"
                          autoFocus
                        />
                        <button
                          onClick={() => handlePriceEditSave(product.id)}
                          className="p-1 text-green-600 hover:text-green-800"
                          title="Save"
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
                          onClick={handlePriceEditCancel}
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
                        <button
                          onClick={() =>
                            handlePriceEditStart(product.id, product.price)
                          }
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title="Edit price"
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
                        <span className="font-medium text-gray-900">
                          {formatCurrency(product.price)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Cost:</span>
                    {isEditingCost === product.id ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          value={tempCost}
                          onChange={(e) =>
                            setTempCost(parseFloat(e.target.value) || 0)
                          }
                          className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary"
                          autoFocus
                        />
                        <button
                          onClick={() => handleCostEditSave(product.id)}
                          className="p-1 text-green-600 hover:text-green-800"
                          title="Save"
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
                          onClick={handleCostEditCancel}
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
                        <button
                          onClick={() =>
                            handleCostEditStart(product.id, product.cost)
                          }
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title="Edit cost"
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
                        <span className="font-medium text-gray-900">
                          {formatCurrency(product.cost)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <span className="text-sm font-medium text-gray-700">
                      Profit per unit:
                    </span>
                    <span
                      className={`font-bold ${
                        profit > 0
                          ? "text-green-600"
                          : profit < 0
                          ? "text-red-600"
                          : "text-gray-600"
                      }`}
                    >
                      {formatCurrency(profit)}
                    </span>
                  </div>
                </div>

                {/* Last Updated */}
                <div className="text-xs text-gray-500">
                  Updated: {new Date(product.lastUpdated).toLocaleDateString()}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ProductManager;
