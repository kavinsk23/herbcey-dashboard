import React, { useState, useEffect } from "react";

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

  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [tempCost, setTempCost] = useState<number>(0);

  // Load costs from localStorage on component mount
  useEffect(() => {
    const savedCosts = localStorage.getItem("product_costs");
    if (savedCosts) {
      try {
        const parsedCosts = JSON.parse(savedCosts);
        setProducts((prevProducts) =>
          prevProducts.map((product) => ({
            ...product,
            cost: parsedCosts[product.id] || product.cost,
            lastUpdated:
              parsedCosts[`${product.id}_updated`] || product.lastUpdated,
          }))
        );
      } catch (error) {
        console.error("Error loading saved costs:", error);
      }
    }
  }, []);

  // Save costs to localStorage whenever products change
  useEffect(() => {
    const costsToSave = products.reduce((acc, product) => {
      acc[product.id] = product.cost;
      acc[`${product.id}_updated`] = product.lastUpdated;
      return acc;
    }, {} as Record<string, any>);

    localStorage.setItem("product_costs", JSON.stringify(costsToSave));

    // Notify parent component about cost updates
    const costMap = products.reduce((acc, product) => {
      acc[product.name] = product.cost;
      return acc;
    }, {} as Record<string, number>);

    onCostsUpdate?.(costMap);
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

  const handleEditStart = (productId: string, currentCost: number) => {
    setIsEditing(productId);
    setTempCost(currentCost);
  };

  const handleEditCancel = () => {
    setIsEditing(null);
    setTempCost(0);
  };

  const handleEditSave = (productId: string) => {
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

    setIsEditing(null);
    setTempCost(0);
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
              Update product costs to calculate accurate profit margins
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="px-3 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full">
              Auto-saved
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {products.map((product) => {
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
                      className={`w-3 h-3 rounded-full ${
                        product.name === "Oil"
                          ? "bg-emerald-600"
                          : product.name === "Shampoo"
                          ? "bg-cyan-600"
                          : "bg-pink-600"
                      }`}
                    ></div>
                    <h4 className="font-semibold text-gray-900">
                      {product.name}
                    </h4>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${getColorByMargin(
                      margin
                    )}`}
                  >
                    {margin.toFixed(1)}% margin
                  </span>
                </div>

                {/* Pricing Information */}
                <div className="mb-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      Selling Price:
                    </span>
                    <span className="font-medium text-gray-900">
                      {formatCurrency(product.price)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Cost:</span>
                    {isEditing === product.id ? (
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
                          onClick={() => handleEditSave(product.id)}
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
                          onClick={handleEditCancel}
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
                            handleEditStart(product.id, product.cost)
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
