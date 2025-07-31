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
} from "recharts";
import { getAllOrders } from "../assets/services/googleSheetsService";
import { getExpenseSummary } from "../assets/services/expenseService";
import { getAllProductsFromSheet } from "../assets/services/productService";
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
  status: "Preparing" | "Shipped" | "Delivered" | "Returned" | "Damaged";
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

const AnalyticsPage: React.FC = () => {
  const [timePeriod, setTimePeriod] = useState<"daily" | "monthly" | "yearly">(
    "monthly"
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
  const [expenseSummary, setExpenseSummary] = useState<{
    totalExpenses: number;
    expensesByType: Record<string, number>;
    monthlyExpenses: Record<string, number>;
  } | null>(null);

  // Real data from Google Sheets
  const [realOrders, setRealOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Product data
  const [products, setProducts] = useState<ProductData[]>([]);
  const [availableProducts, setAvailableProducts] = useState<string[]>(["all"]);
  const [productPrices, setProductPrices] = useState<Record<string, number>>(
    {}
  );
  const [productColors, setProductColors] = useState<Record<string, string>>(
    {}
  );

  const SHIPPING_COST = 350;

  // Load products from ProductManager
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const result = await getAllProductsFromSheet();

        if (result.success && result.data && result.data.length > 0) {
          setProducts(result.data);

          const productNames = result.data.map((p) => p.name);
          setAvailableProducts(["all", ...productNames]);

          const prices: Record<string, number> = {};
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
            colors[product.name] = colorOptions[index % colorOptions.length];
          });

          setProductPrices(prices);
          setProductColors(colors);
        } else {
          // Fallback to localStorage
          const savedProducts = localStorage.getItem("all_products");
          if (savedProducts) {
            const parsedProducts = JSON.parse(savedProducts);
            setProducts(parsedProducts);

            const productNames = parsedProducts.map((p: any) => p.name);
            setAvailableProducts(["all", ...productNames]);

            const prices: Record<string, number> = {};
            const colors: Record<string, string> = {};
            const colorOptions = [
              "#10b981",
              "#06b6d4",
              "#ec4899",
              "#8b5cf6",
              "#f97316",
              "#3b82f6",
              "#6366f1",
              "#ef4444",
            ];

            parsedProducts.forEach((product: any, index: number) => {
              prices[product.name] = product.price;
              colors[product.name] = colorOptions[index % colorOptions.length];
            });

            setProductPrices(prices);
            setProductColors(colors);
          }
        }
      } catch (error) {
        console.error("Failed to load products:", error);
        // Keep defaults
        setAvailableProducts(["all", "Oil", "Shampoo", "Conditioner"]);
        setProductPrices({ Oil: 950, Shampoo: 1750, Conditioner: 1850 });
        setProductColors({
          Oil: "#10b981",
          Shampoo: "#06b6d4",
          Conditioner: "#ec4899",
        });
      }
    };

    loadProducts();
  }, []);

  // Load real orders from Google Sheets
  useEffect(() => {
    const loadRealOrders = async () => {
      try {
        setLoading(true);
        setError(null);

        const result = await getAllOrders();

        if (result.success && result.data) {
          // Convert sheet data back to Order format using dynamic product data
          const convertedOrders: Order[] = result.data.map((sheetOrder) => {
            // Parse customer info back to separate fields
            const customerLines = sheetOrder.customerInfo.split("\n");
            const name = customerLines[0] || "";
            const address = customerLines.slice(1, -1).join(", ") || "";
            const contact = customerLines[customerLines.length - 1] || "";

            // Reconstruct products array dynamically
            const products = [];

            // Handle legacy column-based products
            if (sheetOrder.oilQty > 0) {
              products.push({
                name: "Oil",
                quantity: sheetOrder.oilQty,
                price: productPrices["Oil"] || 950,
              });
            }
            if (sheetOrder.shampooQty > 0) {
              products.push({
                name: "Shampoo",
                quantity: sheetOrder.shampooQty,
                price: productPrices["Shampoo"] || 1750,
              });
            }
            if (sheetOrder.conditionerQty > 0) {
              products.push({
                name: "Conditioner",
                quantity: sheetOrder.conditionerQty,
                price: productPrices["Conditioner"] || 1850,
              });
            }

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
          setError(result.error || "Failed to load orders");
        }
      } catch (err) {
        console.error("Error loading orders for analytics:", err);
        setError("An unexpected error occurred while loading orders");
      } finally {
        setLoading(false);
      }
    };

    // Only load orders after products are loaded
    if (Object.keys(productPrices).length > 0 || availableProducts.length > 1) {
      loadRealOrders();
    }
  }, [productPrices, availableProducts]);

  // Load expense summary
  useEffect(() => {
    const loadExpenseSummary = async () => {
      try {
        const summaryResult = await getExpenseSummary(
          dateRange.startDate,
          dateRange.endDate
        );
        if (summaryResult.success && summaryResult.data) {
          setExpenseSummary(summaryResult.data);
        }
      } catch (err) {
        console.error("Error loading expense summary:", err);
      }
    };

    loadExpenseSummary();
  }, [dateRange.startDate, dateRange.endDate]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

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
      const statusMatch = !["Damaged", "Returned"].includes(order.status);
      const productMatch =
        selectedProduct === "all" ||
        order.products.some((p) => p.name === selectedProduct);

      return dateMatch && statusMatch && productMatch;
    });
  }, [realOrders, dateRange, selectedProduct]);

  const analyticsData = useMemo(() => {
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

    const productSales = filteredOrders.reduce((acc, order) => {
      order.products.forEach((product) => {
        if (!acc[product.name]) {
          acc[product.name] = { quantity: 0, revenue: 0 };
        }
        acc[product.name].quantity += product.quantity;
        acc[product.name].revenue += product.price * product.quantity;
      });
      return acc;
    }, {} as Record<string, { quantity: number; revenue: number }>);

    const timeData = filteredOrders.reduce((acc, order) => {
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
        };
      }

      const orderRevenue = calculateOrderRevenue(order);

      acc[key].revenue += orderRevenue;
      acc[key].orders += 1;

      return acc;
    }, {} as Record<string, { date: string; revenue: number; orders: number }>);

    const paymentMethods = filteredOrders.reduce((acc, order) => {
      if (!acc[order.paymentMethod]) {
        acc[order.paymentMethod] = { count: 0, revenue: 0 };
      }
      acc[order.paymentMethod].count += 1;
      acc[order.paymentMethod].revenue += calculateOrderRevenue(order);
      return acc;
    }, {} as Record<string, { count: number; revenue: number }>);

    return {
      totalRevenue,
      totalReceivedFunds,
      totalUnitsSold,
      totalOrders,
      productSales,
      timeData: Object.values(timeData).sort((a, b) =>
        a.date.localeCompare(b.date)
      ),
      paymentMethods,
    };
  }, [filteredOrders, timePeriod, calculateOrderRevenue]);

  // Dynamic KPI Cards Configuration
  const kpiCards = useMemo((): KPICard[] => {
    const totalExpenses = expenseSummary?.totalExpenses || 0;

    return [
      {
        id: "total-revenue",
        title: "Total Revenue",
        value: formatCurrency(analyticsData.totalRevenue),
        textColor: "text-primary",
        bgColor: "bg-primary/10",
        iconColor: "text-primary",
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
        id: "received-funds",
        title: "Received Funds",
        value: formatCurrency(analyticsData.totalReceivedFunds),
        textColor: "text-green-600",
        bgColor: "bg-green-100",
        iconColor: "text-green-600",
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
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ),
      },
      {
        id: "total-expenses",
        title: "Total Expenses",
        value: formatCurrency(totalExpenses),
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
  }, [analyticsData, formatCurrency, expenseSummary]);

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
    conditioner: "#ec4899",
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
                entry.dataKey.includes("Revenue")
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
          <p className="mt-4 text-gray-600">Loading analytics data...</p>
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
          <h1 className="text-3xl font-bold text-gray-900">
            Sales Analytics Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Track your revenue, expenses, and profitability in real-time
          </p>
        </div>
        <div className="flex items-center space-x-2">
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

      {/* Enhanced KPI Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {kpiCards.map((card) => (
          <div
            key={card.id}
            className="p-6 transition-shadow bg-white border border-gray-200 rounded-lg hover:shadow-md"
          >
            <div className="flex items-center justify-between h-full">
              <div>
                <p className="text-sm text-gray-600">{card.title}</p>
                <p className={`text-2xl font-bold ${card.textColor}`}>
                  {card.value}
                </p>
                {card.subtitle && (
                  <p className="mt-1 text-sm font-semibold text-blue-500">
                    {card.subtitle}
                  </p>
                )}
              </div>
              <div
                className={`flex items-center justify-center w-12 h-12 rounded-full ${card.bgColor}`}
              >
                <div className={card.iconColor}>{card.icon}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Charts Row 1 - Revenue & Orders Trends */}
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

      {/* Main Charts Row 2 - Product Sales */}
      <div className="grid grid-cols-1 gap-6">
        {/* Product Sales - Pie Chart */}
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
                formatter={(value: number) => [
                  formatCurrency(value),
                  "Revenue",
                ]}
                labelFormatter={(label) => `Product: ${label}`}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
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

      {/* Product Performance Table */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Product Performance Analysis
          </h3>
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
                  Market Share
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(analyticsData.productSales).map(
                ([product, data]) => (
                  <tr key={product}>
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
                      {data.quantity}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                      {formatCurrency(data.revenue)}
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
            </tbody>
          </table>
        </div>
      </div>

      {/* Expense Manager */}
      <ExpenseManager
        dateRange={dateRange}
        onExpensesUpdate={setExpenseSummary}
      />
    </div>
  );
};

export default AnalyticsPage;
