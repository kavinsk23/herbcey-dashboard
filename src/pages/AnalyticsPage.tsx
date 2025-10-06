import React, { useState, useMemo, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
  Bar,
  ComposedChart,
} from "recharts";
import { getAllOrders } from "../assets/services/googleSheetsService";
import {
  getAllExpensesFromSheet,
  getExpenseSummary,
} from "../assets/services/expenseService";
import AnalyticsFilters from "../components/AnalyticsFilters";
import ExpenseManager from "../components/ExpenseManager";

interface Order {
  name: string;
  addressLine1: string;
  addressLine2?: string;
  addressLine3?: string;
  contact: string;
  products: {
    name: string;
    quantity: number;
    price: number;
  }[];
  status:
    | "Preparing"
    | "Shipped"
    | "Delivered"
    | "Return"
    | "Damaged"
    | "Transfer";
  orderDate: string;
  paymentMethod: "COD" | "Bank Transfer";
  paymentReceived?: boolean;
  tracking?: string;
  freeShipping?: boolean;
}

interface KPICard {
  id: string;
  title: string;
  value: string;
  textColor: string;
  bgColor: string;
  iconColor: string;
  subtitle?: string;
  icon: React.ReactNode;
}

interface ProductData {
  id: string;
  name: string;
  cost: number;
  price: number;
  lastUpdated: string;
}

interface ExpenseData {
  id: string;
  type: "Shampoo" | "Conditioner" | "Oil" | "Marketing" | "Other";
  amount: number;
  note: string;
  date: string;
  timestamp: string;
}

// Google Sheets Products Service
const getAllProductsFromSheet = async (): Promise<{
  success: boolean;
  data?: ProductData[];
  error?: string;
}> => {
  try {
    const accessToken = localStorage.getItem("google_access_token");
    const GOOGLE_API_KEY =
      process.env.REACT_APP_GOOGLE_API_KEY || "YOUR_GOOGLE_API_KEY";
    const SPREADSHEET_ID =
      process.env.REACT_APP_GOOGLE_SHEET_ID || "YOUR_GOOGLE_SHEET_ID";
    const PRODUCTS_SHEET_NAME = "Products";

    let response;
    if (accessToken) {
      response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${PRODUCTS_SHEET_NAME}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
    } else {
      response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${PRODUCTS_SHEET_NAME}?key=${GOOGLE_API_KEY}`
      );
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const rows = data.values || [];

    // Skip header row and convert to ProductData format
    const products: ProductData[] = rows.slice(1).map((row: any[]) => ({
      id: row[0] || "",
      name: row[1] || "",
      cost: parseFloat(row[2]) || 0,
      price: parseFloat(row[3]) || 0,
      lastUpdated: row[4] || "",
    }));

    console.log("Products fetched successfully from Google Sheets");
    return { success: true, data: products };
  } catch (error) {
    console.error("Error fetching products from Google Sheets:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

const AnalyticsPage: React.FC = () => {
  const [timePeriod, setTimePeriod] = useState<"daily" | "monthly" | "yearly">(
    "daily"
  );
  const [selectedProduct, setSelectedProduct] = useState<string>("all");
  const [dateRange, setDateRange] = useState(() => {
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
  const [selectedMetric, setSelectedMetric] = useState<
    "revenue" | "orders" | "both"
  >("both");
  const [, setExpenseSummary] = useState<{
    totalExpenses: number;
    expensesByType: Record<string, number>;
    monthlyExpenses: Record<string, number>;
  } | null>(null);

  // Real data from Google Sheets
  const [realOrders, setRealOrders] = useState<Order[]>([]);
  const [expenses, setExpenses] = useState<ExpenseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Product data from Google Sheets
  const [, setProducts] = useState<ProductData[]>([]);
  const [availableProducts, setAvailableProducts] = useState<string[]>(["all"]);
  const [productPrices, setProductPrices] = useState<Record<string, number>>(
    {}
  );
  const [productCosts, setProductCosts] = useState<Record<string, number>>({});
  const [productColors, setProductColors] = useState<Record<string, string>>(
    {}
  );

  const SHIPPING_COST = 350;

  // Auto-refresh interval (every 30 seconds)
  const REFRESH_INTERVAL = 30000;

  // Load products from Google Sheets Products sheet
  useEffect(() => {
    const loadProducts = async () => {
      try {
        console.log("🔄 Loading products from Google Sheets...");
        const result = await getAllProductsFromSheet();

        if (result.success && result.data && result.data.length > 0) {
          console.log("✅ Products loaded:", result.data);
          setProducts(result.data);

          const productNames = result.data.map((p) => p.name);
          setAvailableProducts(["all", ...productNames]);

          const prices: Record<string, number> = {};
          const costs: Record<string, number> = {};
          const colors: Record<string, string> = {};
          const colorOptions = [
            "#10b981", // emerald-600 (Oil)
            "#06b6d4", // cyan-600 (Shampoo)
            "#ec4899", // pink-600 (Conditioner)
            "#8b5cf6", // purple-600
            "#f97316", // orange-600
            "#3b82f6", // blue-600
            "#6366f1", // indigo-600
            "#ef4444", // red-600
          ];

          result.data.forEach((product, index) => {
            prices[product.name] = product.price;
            costs[product.name] = product.cost;
            colors[product.name] = colorOptions[index % colorOptions.length];
          });

          setProductPrices(prices);
          setProductCosts(costs);
          setProductColors(colors);
        } else {
          console.warn("⚠️ No products found, using defaults");
          // Fallback defaults
          setAvailableProducts([
            "all",
            "Oil",
            "Shampoo",
            "Conditioner",
            "Spray",
            "Serum",
          ]);
          setProductPrices({
            Oil: 950,
            Shampoo: 1350,
            Conditioner: 1350,
            Spray: 980,
            Serum: 1600,
          });
          setProductCosts({
            Oil: 300,
            Shampoo: 350,
            Conditioner: 400,
            Spray: 100,
            Serum: 250,
          });
          setProductColors({
            Oil: "#10b981",
            Shampoo: "#06b6d4",
            Conditioner: "#ec4899",
            Spray: "#f97316",
            Serum: "#a78bfa",
          });
        }
      } catch (error) {
        console.error("❌ Failed to load products:", error);
        // Keep defaults
        setAvailableProducts([
          "all",
          "Oil",
          "Shampoo",
          "Conditioner",
          "Spray",
          "Serum",
        ]);
        setProductPrices({
          Oil: 950,
          Shampoo: 1350,
          Conditioner: 1350,
          Spray: 980,
          Serum: 1600,
        });
        setProductCosts({
          Oil: 300,
          Shampoo: 350,
          Conditioner: 400,
          Spray: 100,
          Serum: 250,
        });
        setProductColors({
          Oil: "#10b981",
          Shampoo: "#06b6d4",
          Conditioner: "#ec4899",
          Spray: "#f97316",
          Serum: "#a78bfa",
        });
      }
    };

    loadProducts();
  }, []);

  // Load real orders from Google Sheets Orders sheet
  useEffect(() => {
    const loadRealOrders = async () => {
      try {
        console.log("🔄 Loading orders from Google Sheets...");
        setLoading(true);
        setError(null);

        const result = await getAllOrders();

        if (result.success && result.data) {
          console.log("✅ Orders loaded:", result.data.length, "orders");

          // Convert sheet data back to Order format using real product data
          const convertedOrders: Order[] = result.data.map((sheetOrder) => {
            // Parse customer info back to separate fields
            const customerLines = sheetOrder.customerInfo.split("\n");
            const name = customerLines[0] || "";
            const address = customerLines.slice(1, -1).join(", ") || "";
            const contact = customerLines[customerLines.length - 1] || "";

            // Reconstruct products array using real product prices
            const products: Array<{
              name: string;
              quantity: number;
              price: number;
            }> = [];
            // Handle legacy column-based products
            availableProducts.forEach((productName) => {
              if (productName === "all") return; // Skip the "all" filter option

              // Check for quantity in various possible formats
              const qtyKey = `${productName.toLowerCase()}Qty`;
              const quantity = sheetOrder[qtyKey] || 0;

              if (quantity > 0) {
                products.push({
                  name: productName,
                  quantity: quantity,
                  price: productPrices[productName] || 0,
                });
              }
            });

            return {
              name,
              addressLine1: address,
              addressLine2: "",
              addressLine3: "",
              contact,
              products,
              status: sheetOrder.orderStatus as Order["status"],
              orderDate: sheetOrder.orderDate,
              paymentMethod: sheetOrder.paymentMethod as Order["paymentMethod"],
              paymentReceived: sheetOrder.paymentReceived,
              tracking: sheetOrder.trackingId,
              freeShipping: sheetOrder.freeShipping,
            };
          });

          setRealOrders(convertedOrders);
        } else {
          console.error("❌ Failed to load orders:", result.error);
          setError(result.error || "Failed to load orders");
        }
      } catch (err) {
        console.error("❌ Error loading orders for analytics:", err);
        setError("An unexpected error occurred while loading orders");
      } finally {
        setLoading(false);
      }
    };

    // Only load orders after products are loaded
    if (Object.keys(productPrices).length > 0) {
      loadRealOrders();
    }
  }, [productPrices]);

  // Load expenses from Google Sheets Expenses sheet
  useEffect(() => {
    const loadExpenses = async () => {
      try {
        console.log("🔄 Loading expenses from Google Sheets...");
        const result = await getAllExpensesFromSheet();

        if (result.success && result.data) {
          console.log("✅ Expenses loaded:", result.data.length, "expenses");
          const convertedExpenses: ExpenseData[] = result.data.map(
            (sheetExpense) => ({
              id: sheetExpense.id,
              type: sheetExpense.type as
                | "Shampoo"
                | "Conditioner"
                | "Oil"
                | "Marketing"
                | "Other",
              amount: sheetExpense.amount,
              note: sheetExpense.note,
              date: sheetExpense.date,
              timestamp: sheetExpense.timestamp,
            })
          );
          setExpenses(convertedExpenses);
        } else {
          console.warn("⚠️ No expenses found");
          setExpenses([]);
        }
      } catch (err) {
        console.error("❌ Error loading expenses:", err);
        setExpenses([]);
      }
    };

    loadExpenses();
  }, []);

  // Handle expense updates from ExpenseManager
  const handleExpensesUpdate = (summary: {
    totalExpenses: number;
    expensesByType: Record<string, number>;
    monthlyExpenses: Record<string, number>;
  }) => {
    setExpenseSummary(summary);
    // Reload expenses to sync with charts
    loadExpensesForCharts();
  };

  // Separate function to reload expenses for charts
  const loadExpensesForCharts = async () => {
    try {
      const result = await getAllExpensesFromSheet();
      if (result.success && result.data) {
        const convertedExpenses: ExpenseData[] = result.data.map(
          (sheetExpense) => ({
            id: sheetExpense.id,
            type: sheetExpense.type as
              | "Shampoo"
              | "Conditioner"
              | "Oil"
              | "Marketing"
              | "Other",
            amount: sheetExpense.amount,
            note: sheetExpense.note,
            date: sheetExpense.date,
            timestamp: sheetExpense.timestamp,
          })
        );
        setExpenses(convertedExpenses);
      }
    } catch (err) {
      console.error("❌ Error reloading expenses for charts:", err);
    }
  };

  // Load expense summary
  useEffect(() => {
    const loadExpenseSummary = async () => {
      try {
        console.log("🔄 Loading expense summary...");
        const summaryResult = await getExpenseSummary(
          dateRange.startDate,
          dateRange.endDate
        );
        if (summaryResult.success && summaryResult.data) {
          console.log("✅ Expense summary loaded");
          setExpenseSummary(summaryResult.data);
        }
      } catch (err) {
        console.error("❌ Error loading expense summary:", err);
      }
    };

    loadExpenseSummary();
  }, [dateRange.startDate, dateRange.endDate]);

  // Auto-refresh data every 30 seconds
  useEffect(() => {
    const intervalId = setInterval(() => {
      console.log("🔄 Auto-refreshing data...");

      // Reload all data
      if (Object.keys(productPrices).length > 0) {
        // Reload orders
        getAllOrders().then((result) => {
          if (result.success && result.data) {
            const convertedOrders: Order[] = result.data.map((sheetOrder) => {
              const customerLines = sheetOrder.customerInfo.split("\n");
              const name = customerLines[0] || "";
              const address = customerLines.slice(1, -1).join(", ") || "";
              const contact = customerLines[customerLines.length - 1] || "";

              const products: Array<{
                name: string;
                quantity: number;
                price: number;
              }> = [];

              availableProducts.forEach((productName) => {
                if (productName === "all") return;

                const qtyKey = `${productName.toLowerCase()}Qty`;
                const quantity = sheetOrder[qtyKey] || 0;

                if (quantity > 0) {
                  products.push({
                    name: productName,
                    quantity: quantity,
                    price: productPrices[productName] || 0,
                  });
                }
              });

              return {
                name,
                addressLine1: address,
                addressLine2: "",
                addressLine3: "",
                contact,
                products,
                status: sheetOrder.orderStatus as Order["status"],
                orderDate: sheetOrder.orderDate,
                paymentMethod:
                  sheetOrder.paymentMethod as Order["paymentMethod"],
                paymentReceived: sheetOrder.paymentReceived,
                tracking: sheetOrder.trackingId,
                freeShipping: sheetOrder.freeShipping,
              };
            });
            setRealOrders(convertedOrders);
          }
        });

        // Reload expenses
        getAllExpensesFromSheet().then((result) => {
          if (result.success && result.data) {
            const convertedExpenses: ExpenseData[] = result.data.map(
              (sheetExpense) => ({
                id: sheetExpense.id,
                type: sheetExpense.type as
                  | "Shampoo"
                  | "Conditioner"
                  | "Oil"
                  | "Marketing"
                  | "Other",
                amount: sheetExpense.amount,
                note: sheetExpense.note,
                date: sheetExpense.date,
                timestamp: sheetExpense.timestamp,
              })
            );
            setExpenses(convertedExpenses);
          }
        });

        // Reload expense summary
        getExpenseSummary(dateRange.startDate, dateRange.endDate).then(
          (summaryResult) => {
            if (summaryResult.success && summaryResult.data) {
              setExpenseSummary(summaryResult.data);
            }
          }
        );
      }
    }, REFRESH_INTERVAL);

    return () => clearInterval(intervalId);
  }, [dateRange.startDate, dateRange.endDate, productPrices]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const calculateOrderRevenue = (order: Order) => {
    const productTotal = order.products.reduce(
      (sum, product) => sum + product.price * product.quantity,
      0
    );

    if (order.freeShipping) {
      return productTotal - SHIPPING_COST;
    } else {
      return productTotal;
    }
  };

  const filteredOrders = useMemo(() => {
    return realOrders.filter((order) => {
      const orderDate = new Date(order.orderDate);
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);

      const dateMatch = orderDate >= startDate && orderDate <= endDate;
      const statusMatch = !["Damaged", "Return"].includes(order.status);
      const productMatch =
        selectedProduct === "all" ||
        order.products.some((p) => p.name === selectedProduct);

      return dateMatch && statusMatch && productMatch;
    });
  }, [realOrders, dateRange, selectedProduct]);

  // Filter expenses based on date range
  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      const expenseDate = new Date(expense.date);
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      return expenseDate >= startDate && expenseDate <= endDate;
    });
  }, [expenses, dateRange]);

  // ENHANCED ANALYTICS DATA WITH COMPREHENSIVE PROFIT CALCULATIONS
  const analyticsData = useMemo(() => {
    // Basic revenue calculations
    const totalRevenue = filteredOrders.reduce(
      (sum, order) => sum + calculateOrderRevenue(order),
      0
    );

    const codReceivedAmount = filteredOrders
      .filter((order) => order.paymentMethod === "COD" && order.paymentReceived)
      .reduce((sum, order) => sum + calculateOrderRevenue(order), 0);

    const bankTransferAmount = filteredOrders
      .filter(
        (order) =>
          order.paymentMethod === "Bank Transfer" && order.paymentReceived
      )
      .reduce((sum, order) => sum + calculateOrderRevenue(order), 0);

    const totalReceivedFunds = codReceivedAmount + bankTransferAmount;

    const totalUnitsSold = filteredOrders.reduce((sum, order) => {
      return (
        sum +
        order.products.reduce((productSum, product) => {
          return productSum + product.quantity;
        }, 0)
      );
    }, 0);

    const totalOrders = filteredOrders.length;

    // Calculate returns data
    const returnedOrders = realOrders.filter((order) => {
      const orderDate = new Date(order.orderDate);
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      const dateMatch = orderDate >= startDate && orderDate <= endDate;
      return dateMatch && order.status === "Return";
    });

    const totalReturns = returnedOrders.length;
    const returnDeliveryLoss = totalReturns * SHIPPING_COST;

    // ENHANCED PRODUCT SALES WITH PROFIT CALCULATIONS
    const productSales = filteredOrders.reduce(
      (acc, order) => {
        order.products.forEach((product) => {
          if (!acc[product.name]) {
            acc[product.name] = {
              quantity: 0,
              revenue: 0,
              cost: 0,
              profit: 0,
              profitMargin: 0,
            };
          }

          const productCost = productCosts[product.name] || 0;
          const productRevenue = product.price * product.quantity;
          const productTotalCost = productCost * product.quantity;
          const productProfit = productRevenue - productTotalCost;

          acc[product.name].quantity += product.quantity;
          acc[product.name].revenue += productRevenue;
          acc[product.name].cost += productTotalCost;
          acc[product.name].profit += productProfit;

          // Calculate profit margin as percentage
          if (acc[product.name].revenue > 0) {
            acc[product.name].profitMargin =
              (acc[product.name].profit / acc[product.name].revenue) * 100;
          }
        });
        return acc;
      },
      {} as Record<
        string,
        {
          quantity: number;
          revenue: number;
          cost: number;
          profit: number;
          profitMargin: number;
        }
      >
    );

    // Calculate total product costs
    const totalProductCosts = Object.values(productSales).reduce(
      (sum, product) => sum + product.cost,
      0
    );

    // Calculate total gross profit (revenue - product costs only)
    const totalGrossProfit = totalRevenue - totalProductCosts;

    // MARKETING AND OPERATIONAL EXPENSES SEPARATION
    const marketingExpenses = filteredExpenses
      .filter(
        (expense) =>
          expense.type === "Marketing" ||
          (expense.type === "Other" &&
            expense.note.toLowerCase().includes("marketing"))
      )
      .reduce((sum, expense) => sum + expense.amount, 0);

    const operationalExpenses = filteredExpenses
      .filter(
        (expense) =>
          expense.type !== "Marketing" &&
          !(
            expense.type === "Other" &&
            expense.note.toLowerCase().includes("marketing")
          )
      )
      .reduce((sum, expense) => sum + expense.amount, 0);

    // TOTAL EXPENSES AND NET PROFIT CALCULATIONS
    const totalExpenses = operationalExpenses + marketingExpenses;
    const netProfit = totalGrossProfit - marketingExpenses - returnDeliveryLoss;

    // Calculate profit margins
    const grossProfitMargin =
      totalRevenue > 0 ? (totalGrossProfit / totalRevenue) * 100 : 0;
    const netProfitMargin =
      totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // MARKETING ANALYTICS
    const marketingROI =
      marketingExpenses > 0
        ? ((totalRevenue - marketingExpenses) / marketingExpenses) * 100
        : 0;

    const customerAcquisitionCost =
      totalOrders > 0 ? marketingExpenses / totalOrders : 0;

    // TIME-BASED PROFIT DATA
    const timeData = filteredOrders.reduce(
      (acc, order) => {
        const date = new Date(order.orderDate);
        let key = "";

        if (timePeriod === "daily") {
          key = date.toISOString().split("T")[0];
        } else if (timePeriod === "monthly") {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
            2,
            "0"
          )}`;
        } else {
          key = date.getFullYear().toString();
        }

        if (!acc[key]) {
          acc[key] = {
            date: key,
            revenue: 0,
            orders: 0,
            costs: 0,
            grossProfit: 0,
            netProfit: 0,
          };
        }

        const orderRevenue = calculateOrderRevenue(order);
        const orderCosts = order.products.reduce((sum, product) => {
          return sum + (productCosts[product.name] || 0) * product.quantity;
        }, 0);

        acc[key].revenue += orderRevenue;
        acc[key].orders += 1;
        acc[key].costs += orderCosts;
        acc[key].grossProfit += orderRevenue - orderCosts;

        return acc;
      },
      {} as Record<
        string,
        {
          date: string;
          revenue: number;
          orders: number;
          costs: number;
          grossProfit: number;
          netProfit: number;
        }
      >
    );

    // Calculate net profit for each time period
    const timeDataArray = Object.values(timeData);
    const totalTimeRevenue = timeDataArray.reduce(
      (sum, item) => sum + item.revenue,
      0
    );

    timeDataArray.forEach((item) => {
      if (totalTimeRevenue > 0) {
        const revenueRatio = item.revenue / totalTimeRevenue;
        const periodMarketingExpense = marketingExpenses * revenueRatio;
        const periodReturnLoss = returnDeliveryLoss * revenueRatio;
        item.netProfit =
          item.grossProfit - periodMarketingExpense - periodReturnLoss;
      }
    });

    const paymentMethods = filteredOrders.reduce((acc, order) => {
      if (!acc[order.paymentMethod]) {
        acc[order.paymentMethod] = { count: 0, revenue: 0 };
      }
      acc[order.paymentMethod].count += 1;
      acc[order.paymentMethod].revenue += calculateOrderRevenue(order);
      return acc;
    }, {} as Record<string, { count: number; revenue: number }>);

    return {
      // Existing metrics
      totalRevenue,
      totalReceivedFunds,
      totalUnitsSold,
      totalOrders,
      totalReturns,
      returnDeliveryLoss,

      // NEW PROFIT METRICS
      totalProductCosts,
      totalGrossProfit,
      grossProfitMargin,
      marketingExpenses,
      operationalExpenses,
      totalExpenses,
      netProfit,
      netProfitMargin,
      marketingROI,
      customerAcquisitionCost,

      // Enhanced data
      productSales,
      timeData: timeDataArray.sort((a, b) => a.date.localeCompare(b.date)),
      paymentMethods,
    };
  }, [
    filteredOrders,
    timePeriod,
    calculateOrderRevenue,
    realOrders,
    dateRange,
    productCosts,
    filteredExpenses,
  ]);

  // Process expense data for charts
  const expenseAnalytics = useMemo(() => {
    // Expense trend over time
    const expenseTimeData = filteredExpenses.reduce(
      (acc, expense) => {
        const date = new Date(expense.date);
        let key = "";

        if (timePeriod === "daily") {
          key = date.toISOString().split("T")[0];
        } else if (timePeriod === "monthly") {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
            2,
            "0"
          )}`;
        } else {
          key = date.getFullYear().toString();
        }

        if (!acc[key]) {
          acc[key] = {
            date: key,
            expenses: 0,
            marketingExpenses: 0,
            productionExpenses: 0,
            otherExpenses: 0,
          };
        }

        if (expense.type === "Marketing") {
          acc[key].marketingExpenses += expense.amount;
        } else if (
          ["Shampoo", "Conditioner", "Oil", "Spray", "Serum"].includes(
            expense.type
          )
        ) {
          acc[key].productionExpenses += expense.amount;
        } else {
          acc[key].otherExpenses += expense.amount;
        }

        acc[key].expenses += expense.amount;

        return acc;
      },
      {} as Record<
        string,
        {
          date: string;
          expenses: number;
          marketingExpenses: number;
          productionExpenses: number;
          otherExpenses: number;
        }
      >
    );

    // Expense by type
    const expensesByType = filteredExpenses.reduce((acc, expense) => {
      if (!acc[expense.type]) {
        acc[expense.type] = 0;
      }
      acc[expense.type] += expense.amount;
      return acc;
    }, {} as Record<string, number>);

    return {
      timeData: Object.values(expenseTimeData).sort((a, b) =>
        a.date.localeCompare(b.date)
      ),
      byType: expensesByType,
    };
  }, [filteredExpenses, timePeriod]);

  // Combine revenue and expense data for comparison
  const revenueVsExpenseData = useMemo(() => {
    // Create a unified time series combining revenue and expenses
    const combinedData = new Map<
      string,
      { date: string; revenue: number; expenses: number; profit: number }
    >();

    // Add revenue data
    analyticsData.timeData.forEach((item) => {
      combinedData.set(item.date, {
        date: item.date,
        revenue: item.revenue,
        expenses: 0,
        profit: 0,
      });
    });

    // Add expense data
    expenseAnalytics.timeData.forEach((item) => {
      const existing = combinedData.get(item.date);
      if (existing) {
        existing.expenses = item.expenses;
        existing.profit = existing.revenue - existing.expenses;
      } else {
        combinedData.set(item.date, {
          date: item.date,
          revenue: 0,
          expenses: item.expenses,
          profit: -item.expenses,
        });
      }
    });

    return Array.from(combinedData.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
  }, [analyticsData.timeData, expenseAnalytics.timeData]);

  // ENHANCED KPI CARDS WITH PROFIT METRICS
  const kpiCards = useMemo((): KPICard[] => {
    return [
      {
        id: "total-revenue",
        title: "Total Revenue",
        value: formatCurrency(analyticsData.totalRevenue),
        textColor: "text-primary",
        bgColor: "bg-primary/10",
        iconColor: "text-primary",
        subtitle: `${formatCurrency(
          analyticsData.totalReceivedFunds
        )} Received`,
        icon: (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
            />
          </svg>
        ),
      },

      {
        id: "net-profit",
        title: "Net Profit",
        value: formatCurrency(analyticsData.netProfit),
        textColor:
          analyticsData.netProfit >= 0 ? "text-green-600" : "text-red-600",
        bgColor: analyticsData.netProfit >= 0 ? "bg-green-100" : "bg-red-100",
        iconColor:
          analyticsData.netProfit >= 0 ? "text-green-600" : "text-red-600",
        subtitle: `${analyticsData.netProfitMargin.toFixed(1)}% margin`,
        icon: (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        ),
      },
      {
        id: "total-expenses",
        title: "Total Expenses",
        value: formatCurrency(analyticsData.totalExpenses),
        textColor: "text-red-600",
        bgColor: "bg-red-100",
        iconColor: "text-red-600",

        icon: (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        ),
      },

      {
        id: "return-loss",
        title: "Return Delivery Loss",
        value: formatCurrency(analyticsData.returnDeliveryLoss),
        textColor: "text-orange-600",
        bgColor: "bg-orange-100",
        iconColor: "text-orange-600",
        subtitle: `${analyticsData.totalReturns} Returned Parcels`,
        icon: (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z"
            />
          </svg>
        ),
      },
      {
        id: "total-orders",
        title: "Total Orders",
        value: analyticsData.totalOrders.toString(),
        textColor: "text-blue-600",
        bgColor: "bg-blue-100",
        iconColor: "text-blue-600",
        subtitle: `${analyticsData.totalUnitsSold} Units sold`,
        icon: (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
            />
          </svg>
        ),
      },
    ];
  }, [analyticsData, formatCurrency]);

  const chartColors = {
    primary: "#7cb342",
    secondary: "#4a7c59",
    accent: "#a8e063",
    success: "#388e3c",
    info: "#66bb6a",
    warning: "#ffa726",
    error: "#ef5350",
    oil: "#10b981",
    shampoo: "#06b6d4",
    Spray: "#f97316",
    Serum: "#a78bfa",
    expense: "#ef4444",
    profit: "#10b981",
  };

  const expenseTypeColors = {
    Shampoo: "#06b6d4",
    Conditioner: "#ec4899",
    Oil: "#10b981",
    Marketing: "#8b5cf6",
    Other: "#6b7280",
  };

  const getProductDisplayColor = (productName: string) => {
    // For chart display, convert hex to Tailwind classes
    const colorMap: Record<string, string> = {
      "#10b981": "bg-emerald-600",
      "#06b6d4": "bg-cyan-600",
      "#ec4899": "bg-pink-600",
      "#8b5cf6": "bg-purple-600",
      "#f97316": "bg-orange-600",
      "#3b82f6": "bg-blue-600",
      "#6366f1": "bg-indigo-600",
      "#ef4444": "bg-red-600",
      "#6b7280": "bg-gray-600",
    };

    const hexColor = productColors[productName];
    return colorMap[hexColor] || "bg-gray-600";
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-3 bg-white border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium">{`${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {`${entry.dataKey}: ${
                entry.dataKey.includes("revenue") ||
                entry.dataKey.includes("Revenue") ||
                entry.dataKey.includes("expenses") ||
                entry.dataKey.includes("profit") ||
                entry.dataKey.includes("Profit") ||
                entry.dataKey.includes("costs") ||
                entry.dataKey.includes("grossProfit") ||
                entry.dataKey.includes("netProfit")
                  ? formatCurrency(entry.value)
                  : entry.value
              }`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto border-b-2 rounded-full animate-spin border-primary"></div>
          <p className="mt-4 text-gray-600">
            Loading analytics data from Google Sheets...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="mb-4 text-xl text-red-500">⚠️</div>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">
            Error Loading Analytics Data
          </h2>
          <p className="mb-4 text-gray-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 text-white transition-colors rounded-lg bg-primary hover:bg-primary/90"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (realOrders.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="mb-4 text-6xl text-gray-400">📊</div>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">
            No Data Available
          </h2>
          <p className="mb-6 text-gray-600">
            No orders found in your Google Sheet. Add some orders to see
            analytics.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Sales Analytics Dashboard
          </h1>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 text-sm text-gray-500">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Live sync enabled</span>
          </div>
          <span className="text-sm text-gray-500">
            Last updated: {new Date().toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Analytics Filters */}
      <AnalyticsFilters
        timePeriod={timePeriod}
        selectedProduct={selectedProduct}
        selectedMetric={selectedMetric}
        dateRange={dateRange}
        availableProducts={availableProducts}
        onTimePeriodChange={setTimePeriod}
        onProductChange={setSelectedProduct}
        onMetricChange={setSelectedMetric}
        onDateRangeChange={setDateRange}
      />

      {/* Enhanced KPI Cards with Profit Metrics */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        {kpiCards.map((card) => (
          <div
            key={card.id}
            className="p-6 transition-shadow bg-white border border-gray-200 rounded-lg hover:shadow-md"
          >
            <div className="flex items-center justify-between h-full">
              <div>
                <p className="text-sm text-gray-600">{card.title}</p>
                <p className={`text-xl font-bold ${card.textColor}`}>
                  {card.value}
                </p>
                {card.subtitle && (
                  <p className="mt-1 text-sm font-semibold text-blue-500">
                    {card.subtitle}
                  </p>
                )}
              </div>
              <div
                className={`flex items-center justify-center p-1 w-8 h-8 rounded-full ${card.bgColor}`}
              >
                <div className={card.iconColor}>{card.icon}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Profit Analysis Over Time - NEW COMPREHENSIVE CHART */}
      <div className="p-6 bg-white border border-gray-200 rounded-lg">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Comprehensive Profit Analysis Over Time
        </h3>
        <p className="mb-4 text-sm text-gray-500">
          Revenue, costs, gross profit, and net profit trends with marketing
          impact
        </p>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={analyticsData.timeData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis tickFormatter={(value: number) => formatCurrency(value)} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="revenue" fill={chartColors.primary} name="Revenue" />
            <Bar
              dataKey="costs"
              fill={chartColors.expense}
              name="Product Costs"
            />
            <Line
              type="monotone"
              dataKey="grossProfit"
              stroke={chartColors.success}
              strokeWidth={3}
              name="Gross Profit"
              dot={{ fill: chartColors.success, strokeWidth: 2, r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="netProfit"
              stroke={chartColors.info}
              strokeWidth={3}
              name="Net Profit"
              dot={{ fill: chartColors.info, strokeWidth: 2, r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Expense Breakdown Summary - NEW COMPREHENSIVE BREAKDOWN */}
      <div className="p-6 bg-white border border-gray-200 rounded-lg">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Complete Expense Breakdown & Impact Analysis
        </h3>
        <p className="mb-6 text-sm text-gray-500">
          Detailed breakdown of all costs affecting your profitability
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="p-4 text-center border-l-4 border-gray-400 rounded-lg bg-gray-50">
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(analyticsData.totalProductCosts)}
            </div>
            <div className="text-sm font-medium text-gray-700">
              Product Costs
            </div>
            <div className="mt-1 text-xs text-gray-500">
              {analyticsData.totalRevenue > 0
                ? (
                    (analyticsData.totalProductCosts /
                      analyticsData.totalRevenue) *
                    100
                  ).toFixed(1)
                : 0}
              % of revenue
            </div>
            <div className="mt-1 text-xs text-gray-400">
              Direct manufacturing costs
            </div>
          </div>

          <div className="p-4 text-center border-l-4 border-purple-500 rounded-lg bg-purple-50">
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(analyticsData.marketingExpenses)}
            </div>
            <div className="text-sm font-medium text-gray-700">
              Marketing Expenses
            </div>
            <div className="mt-1 text-xs text-gray-500">
              {analyticsData.totalRevenue > 0
                ? (
                    (analyticsData.marketingExpenses /
                      analyticsData.totalRevenue) *
                    100
                  ).toFixed(1)
                : 0}
              % of revenue
            </div>
            <div className="mt-1 text-xs text-gray-400">
              ROI: {analyticsData.marketingROI.toFixed(1)}%
            </div>
          </div>

          <div className="p-4 text-center border-l-4 border-orange-500 rounded-lg bg-orange-50">
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(analyticsData.returnDeliveryLoss)}
            </div>
            <div className="text-sm font-medium text-gray-700">
              Return Delivery Loss
            </div>
            <div className="mt-1 text-xs text-gray-500">
              {analyticsData.totalReturns} returns ×{" "}
              {formatCurrency(SHIPPING_COST)}
            </div>
            <div className="mt-1 text-xs text-gray-400">
              {analyticsData.totalOrders > 0
                ? (
                    (analyticsData.totalReturns / analyticsData.totalOrders) *
                    100
                  ).toFixed(1)
                : 0}
              % return rate
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts Row - Revenue & Orders Trends */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Revenue Trend - Line Chart */}
        <div className="p-6 bg-white border border-gray-200 rounded-lg">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            Revenue Trend Over Time
          </h3>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={analyticsData.timeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis tickFormatter={(value: number) => formatCurrency(value)} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke={chartColors.primary}
                strokeWidth={3}
                dot={{ fill: chartColors.primary, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Orders Count - Area Chart */}
        <div className="p-6 bg-white border border-gray-200 rounded-lg">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            Orders Volume Trend
          </h3>
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={analyticsData.timeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="orders"
                stroke={chartColors.info}
                fill={chartColors.info}
                fillOpacity={0.6}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Expense Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Enhanced Expense Distribution by Type */}
        <div className="p-6 bg-white border border-gray-200 rounded-lg">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            Expense Distribution by Type
          </h3>
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={Object.entries(expenseAnalytics.byType).map(
                  ([type, amount]) => ({
                    name: type,
                    value: amount,
                  })
                )}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }: any) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {Object.entries(expenseAnalytics.byType).map(
                  ([type], index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        expenseTypeColors[
                          type as keyof typeof expenseTypeColors
                        ] || chartColors.error
                      }
                    />
                  )
                )}
              </Pie>
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), "Amount"]}
                labelFormatter={(label) => `Expense Type: ${label}`}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Marketing Performance Metrics */}
        <div className="p-6 bg-white border border-gray-200 rounded-lg">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            Marketing Performance Metrics
          </h3>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-purple-50">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-700">
                    Marketing ROI
                  </h4>
                  <p className="text-2xl font-bold text-purple-600">
                    {analyticsData.marketingROI.toFixed(1)}%
                  </p>
                </div>
                <div className="text-purple-500">
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                    />
                  </svg>
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Return on marketing investment
              </p>
            </div>

            <div className="p-4 rounded-lg bg-blue-50">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-700">
                    Customer Acquisition Cost
                  </h4>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(analyticsData.customerAcquisitionCost)}
                  </p>
                </div>
                <div className="text-blue-500">
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Marketing spend per order
              </p>
            </div>

            <div className="p-4 rounded-lg bg-green-50">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-700">
                    Marketing Efficiency
                  </h4>
                  <p className="text-2xl font-bold text-green-600">
                    {analyticsData.marketingExpenses > 0
                      ? (
                          analyticsData.totalRevenue /
                          analyticsData.marketingExpenses
                        ).toFixed(1)
                      : "∞"}
                    x
                  </p>
                </div>
                <div className="text-green-500">
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Revenue generated per marketing dollar
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue vs Expenses Comparison Chart */}
      <div className="p-6 bg-white border border-gray-200 rounded-lg">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Revenue vs Expenses Comparison
        </h3>
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={revenueVsExpenseData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis tickFormatter={(value: number) => formatCurrency(value)} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="revenue" fill={chartColors.primary} name="Revenue" />
            <Bar
              dataKey="expenses"
              fill={chartColors.expense}
              name="Expenses"
            />
            <Line
              type="monotone"
              dataKey="profit"
              stroke={chartColors.profit}
              strokeWidth={3}
              name="Profit"
              dot={{ fill: chartColors.profit, strokeWidth: 2, r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Enhanced Product Performance Table with Profit Analysis */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Product Performance & Profitability Analysis
          </h3>
          <p className="text-sm text-gray-500">
            Detailed profit analysis for each product including costs, margins,
            and market share
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Product
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Units Sold
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Revenue
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Total Cost
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Gross Profit
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Profit Margin
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Market Share
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(analyticsData.productSales).map(
                ([product, data]) => (
                  <tr key={product} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div
                          className={`w-3 h-3 rounded-full mr-3 ${getProductDisplayColor(
                            product
                          )}`}
                        ></div>
                        <span className="text-sm font-medium text-gray-900">
                          {product}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                      {data.quantity.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                      {formatCurrency(data.revenue)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                      {formatCurrency(data.cost)}
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap">
                      <span
                        className={`font-medium ${
                          data.profit >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {formatCurrency(data.profit)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap">
                      <div className="flex items-center">
                        <span
                          className={`font-medium px-2 py-1 rounded-full text-xs ${
                            data.profitMargin >= 50
                              ? "bg-green-100 text-green-800"
                              : data.profitMargin >= 30
                              ? "bg-yellow-100 text-yellow-800"
                              : data.profitMargin >= 10
                              ? "bg-orange-100 text-orange-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {data.profitMargin.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                      <div className="flex items-center">
                        <span>
                          {analyticsData.totalRevenue > 0
                            ? (
                                (data.revenue / analyticsData.totalRevenue) *
                                100
                              ).toFixed(1)
                            : 0}
                          %
                        </span>
                        <div className="w-16 h-2 ml-2 bg-gray-200 rounded-full">
                          <div
                            className={`h-2 rounded-full ${getProductDisplayColor(
                              product
                            )}`}
                            style={{
                              width: `${
                                analyticsData.totalRevenue > 0
                                  ? (data.revenue /
                                      analyticsData.totalRevenue) *
                                    100
                                  : 0
                              }%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )
              )}
              {/* Totals Row */}
              <tr className="font-semibold border-t-2 border-gray-300 bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                  TOTAL
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                  {analyticsData.totalUnitsSold.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                  {formatCurrency(analyticsData.totalRevenue)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                  {formatCurrency(analyticsData.totalProductCosts)}
                </td>
                <td className="px-6 py-4 text-sm whitespace-nowrap">
                  <span
                    className={`font-bold ${
                      analyticsData.totalGrossProfit >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {formatCurrency(analyticsData.totalGrossProfit)}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm whitespace-nowrap">
                  <span
                    className={`font-bold px-2 py-1 rounded-full text-xs ${
                      analyticsData.grossProfitMargin >= 50
                        ? "bg-green-100 text-green-800"
                        : analyticsData.grossProfitMargin >= 30
                        ? "bg-yellow-100 text-yellow-800"
                        : analyticsData.grossProfitMargin >= 10
                        ? "bg-orange-100 text-orange-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {analyticsData.grossProfitMargin.toFixed(1)}%
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                  100%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Sales Distribution - Pie Chart */}
      <div className="p-6 bg-white border border-gray-200 rounded-lg">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Product Sales Distribution
        </h3>
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <Pie
              data={Object.entries(analyticsData.productSales).map(
                ([name, data]) => ({
                  name,
                  value: data.revenue,
                  quantity: data.quantity,
                })
              )}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }: any) =>
                `${name} ${(percent * 100).toFixed(0)}%`
              }
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {Object.entries(analyticsData.productSales).map(
                ([name], index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={productColors[name] || chartColors.oil}
                  />
                )
              )}
            </Pie>
            <Tooltip
              formatter={(value: number) => [formatCurrency(value), "Revenue"]}
              labelFormatter={(label) => `Product: ${label}`}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Payment Methods - Donut Chart */}
      <div className="p-6 bg-white border border-gray-200 rounded-lg">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Payment Methods Distribution
        </h3>
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <Pie
              data={Object.entries(analyticsData.paymentMethods).map(
                ([method, data]) => ({
                  method,
                  value: data.revenue,
                  count: data.count,
                })
              )}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ method, percent }: any) =>
                `${method} ${(percent * 100).toFixed(0)}%`
              }
              outerRadius={100}
              innerRadius={60}
              fill="#8884d8"
              dataKey="value"
            >
              {Object.entries(analyticsData.paymentMethods).map(
                ([method], index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      method === "COD" ? chartColors.warning : chartColors.info
                    }
                  />
                )
              )}
            </Pie>
            <Tooltip
              formatter={(value: number) => [formatCurrency(value), "Revenue"]}
              labelFormatter={(label) => `Payment Method: ${label}`}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Expense Manager */}
      <ExpenseManager
        dateRange={dateRange}
        onExpensesUpdate={handleExpensesUpdate}
      />
    </div>
  );
};

export default AnalyticsPage;
