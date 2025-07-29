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
import ExpenseForm from "../components/ExpenseForm";

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

interface Expense {
  id: string;
  type: "Shampoo" | "Conditioner" | "Oil" | "Other";
  amount: number;
  note: string;
  date: string;
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

const AnalyticsPage: React.FC = () => {
  const [timePeriod, setTimePeriod] = useState<"daily" | "monthly" | "yearly">(
    "monthly"
  );
  const [selectedProduct, setSelectedProduct] = useState<
    "all" | "Oil" | "Shampoo" | "Conditioner"
  >("all");
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
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // Real data from Google Sheets
  const [realOrders, setRealOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const SHIPPING_COST = 350;

  // Load real orders from Google Sheets
  useEffect(() => {
    const loadRealOrders = async () => {
      try {
        setLoading(true);
        setError(null);

        const result = await getAllOrders();

        if (result.success && result.data) {
          // Convert sheet data back to Order format
          const convertedOrders: Order[] = result.data.map((sheetOrder) => {
            // Parse customer info back to separate fields
            const customerLines = sheetOrder.customerInfo.split("\n");
            const name = customerLines[0] || "";
            const address = customerLines.slice(1, -1).join(", ") || "";
            const contact = customerLines[customerLines.length - 1] || "";

            // Reconstruct products array
            const products = [];
            if (sheetOrder.oilQty > 0) {
              products.push({
                name: "Oil",
                quantity: sheetOrder.oilQty,
                price: 950,
              });
            }
            if (sheetOrder.shampooQty > 0) {
              products.push({
                name: "Shampoo",
                quantity: sheetOrder.shampooQty,
                price: 1750,
              });
            }
            if (sheetOrder.conditionerQty > 0) {
              products.push({
                name: "Conditioner",
                quantity: sheetOrder.conditionerQty,
                price: 1850,
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

    loadRealOrders();
  }, []);

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
    const receivedFundsPercentage =
      analyticsData.totalRevenue > 0
        ? (
            (analyticsData.totalReceivedFunds / analyticsData.totalRevenue) *
            100
          ).toFixed(1)
        : "0";

    return [
      {
        id: "total-revenue",
        title: "Total Revenue",
        value: formatCurrency(analyticsData.totalRevenue),
        textColor: "text-primary",
        bgColor: "bg-primary/10",
        iconColor: "text-primary",
        icon: "රු",
      },
      {
        id: "received-funds",
        title: "Received Funds",
        value: formatCurrency(analyticsData.totalReceivedFunds),
        textColor: "text-green-600",
        bgColor: "bg-green-100",
        iconColor: "text-green-600",
        subtitle: `${receivedFundsPercentage}% of total`,
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
        id: "total-units",
        title: "Total Units Sold",
        value: analyticsData.totalUnitsSold.toString(),
        textColor: "text-orange-600",
        bgColor: "bg-orange-100",
        iconColor: "text-orange-600",
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
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
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
    conditioner: "#ec4899",
  };

  const handleAddExpense = (expense: Omit<Expense, "id">) => {
    const expenseToAdd = {
      ...expense,
      id: Date.now().toString(),
    };
    setExpenses([...expenses, expenseToAdd]);
    setShowExpenseForm(false);
  };

  const ExpenseSection = () => (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Expenses</h3>
        <button
          onClick={() => setShowExpenseForm(true)}
          className="px-4 py-2 text-white rounded bg-primary hover:bg-primary-dark"
        >
          Add Expense
        </button>
      </div>

      {expenses.length === 0 ? (
        <div className="px-6 py-8 text-center">
          <p className="text-gray-500">No expenses recorded yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="overflow-y-auto max-h-96">
            <table className="w-full">
              <thead className="sticky top-0 z-10 bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Date
                  </th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Type
                  </th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Note
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {expenses.map((expense) => (
                  <tr key={expense.id}>
                    <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                      {new Date(expense.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-900">
                          {expense.type}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                      {formatCurrency(expense.amount)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                      {expense.note || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

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
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">
            Last updated: {new Date().toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Analytics Filters
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                Time Period
              </label>
              <select
                value={timePeriod}
                onChange={(e) =>
                  setTimePeriod(
                    e.target.value as "daily" | "monthly" | "yearly"
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="daily">Daily</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                Product Filter
              </label>
              <select
                value={selectedProduct}
                onChange={(e) =>
                  setSelectedProduct(
                    e.target.value as "all" | "Oil" | "Shampoo" | "Conditioner"
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Products</option>
                <option value="Oil">Oil</option>
                <option value="Shampoo">Shampoo</option>
                <option value="Conditioner">Conditioner</option>
              </select>
            </div>

            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                Metric View
              </label>
              <select
                value={selectedMetric}
                onChange={(e) =>
                  setSelectedMetric(
                    e.target.value as "revenue" | "orders" | "both"
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="both">Revenue & Orders</option>
                <option value="revenue">Revenue Only</option>
                <option value="orders">Orders Only</option>
              </select>
            </div>

            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                Start Date
              </label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) =>
                  setDateRange((prev) => ({
                    ...prev,
                    startDate: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                End Date
              </label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) =>
                  setDateRange((prev) => ({ ...prev, endDate: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic KPI Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {kpiCards.map((card) => (
          <div
            key={card.id}
            className="p-6 bg-white border border-gray-200 rounded-lg"
          >
            <div className="flex items-center justify-between h-full">
              <div>
                <p className="text-sm text-gray-600">{card.title}</p>
                <p className={`text-2xl font-bold ${card.textColor}`}>
                  {card.value}
                </p>
                {card.subtitle && (
                  <p className="mt-1 text-xs text-gray-500">{card.subtitle}</p>
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
                      fill={
                        name === "Oil"
                          ? chartColors.oil
                          : name === "Shampoo"
                          ? chartColors.shampoo
                          : chartColors.conditioner
                      }
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
                          className={`w-3 h-3 rounded-full mr-3 ${
                            product === "Oil"
                              ? "bg-emerald-600"
                              : product === "Shampoo"
                              ? "bg-cyan-600"
                              : "bg-pink-600"
                          }`}
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
                            className={`h-2 rounded-full ${
                              product === "Oil"
                                ? "bg-emerald-600"
                                : product === "Shampoo"
                                ? "bg-cyan-600"
                                : "bg-pink-600"
                            }`}
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

      {/* Expense Section */}
      <ExpenseSection />

      {/* Expense Form Modal */}
      {showExpenseForm && (
        <ExpenseForm
          initialExpense={{
            type: "Shampoo",
            amount: 0,
            note: "",
            date: new Date().toISOString().split("T")[0],
          }}
          onSave={handleAddExpense}
          onClose={() => setShowExpenseForm(false)}
        />
      )}
    </div>
  );
};

export default AnalyticsPage;
