import React, { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  ComposedChart,
  Legend,
} from "recharts";

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

// Enhanced mock data with more entries for better analytics
const mockOrders: Order[] = [
  {
    name: "John Doe",
    addressLine1: "123 Main St, Colombo",
    addressLine2: "Sri Lanka",
    addressLine3: "",
    contact: "0761234567",
    products: [
      { name: "Oil", quantity: 2, price: 950 },
      { name: "Shampoo", quantity: 1, price: 1750 },
    ],
    status: "Delivered",
    orderDate: "2024-01-15",
    paymentMethod: "COD",
    paymentReceived: true,
    tracking: "LK123456789",
    freeShipping: false,
  },
  {
    name: "Jane Smith",
    addressLine1: "456 Ocean Ave, Galle",
    addressLine2: "",
    addressLine3: "Southern Province",
    contact: "0779876543",
    products: [
      { name: "Conditioner", quantity: 3, price: 1850 },
      { name: "Shampoo", quantity: 2, price: 1750 },
    ],
    status: "Delivered",
    orderDate: "2024-01-18",
    paymentMethod: "Bank Transfer",
    paymentReceived: true,
    tracking: "LK987654321",
    freeShipping: true,
  },
  {
    name: "David Johnson",
    addressLine1: "789 Hill St",
    addressLine2: "Kandy",
    addressLine3: "Central Province",
    contact: "0715551234",
    products: [
      { name: "Oil", quantity: 1, price: 950 },
      { name: "Conditioner", quantity: 2, price: 1850 },
    ],
    status: "Delivered",
    orderDate: "2024-02-10",
    paymentMethod: "Bank Transfer",
    paymentReceived: true,
    tracking: "LK456123789",
    freeShipping: false,
  },
  {
    name: "Maria Garcia",
    addressLine1: "321 Beach Rd",
    addressLine2: "Negombo",
    addressLine3: "",
    contact: "0768884567",
    products: [
      { name: "Shampoo", quantity: 1, price: 1750 },
      { name: "Conditioner", quantity: 1, price: 1850 },
    ],
    status: "Delivered",
    orderDate: "2024-02-20",
    paymentMethod: "COD",
    paymentReceived: true,
    tracking: "LK789123456",
    freeShipping: true,
  },
  {
    name: "Raj Patel",
    addressLine1: "10 Temple Road",
    addressLine2: "",
    addressLine3: "Anuradhapura",
    contact: "0723334444",
    products: [{ name: "Oil", quantity: 1, price: 950 }],
    status: "Delivered",
    orderDate: "2024-03-01",
    paymentMethod: "COD",
    paymentReceived: true,
    tracking: "LK111222333",
    freeShipping: false,
  },
  {
    name: "Sarah Wilson",
    addressLine1: "555 Park Ave",
    addressLine2: "Colombo 03",
    addressLine3: "",
    contact: "0771111222",
    products: [
      { name: "Oil", quantity: 2, price: 950 },
      { name: "Shampoo", quantity: 1, price: 1750 },
      { name: "Conditioner", quantity: 1, price: 1850 },
    ],
    status: "Delivered",
    orderDate: "2024-03-15",
    paymentMethod: "Bank Transfer",
    paymentReceived: true,
    tracking: "LK222333444",
    freeShipping: false,
  },
  {
    name: "Michael Brown",
    addressLine1: "777 Lake Road",
    addressLine2: "Kandy",
    addressLine3: "",
    contact: "0762223333",
    products: [{ name: "Shampoo", quantity: 2, price: 1750 }],
    status: "Delivered",
    orderDate: "2024-03-20",
    paymentMethod: "COD",
    paymentReceived: true,
    tracking: "LK333444555",
    freeShipping: true,
  },
  {
    name: "Emily Davis",
    addressLine1: "999 Garden St",
    addressLine2: "Galle",
    addressLine3: "",
    contact: "0753334444",
    products: [
      { name: "Oil", quantity: 3, price: 950 },
      { name: "Conditioner", quantity: 2, price: 1850 },
    ],
    status: "Delivered",
    orderDate: "2024-04-05",
    paymentMethod: "Bank Transfer",
    paymentReceived: true,
    tracking: "LK444555666",
    freeShipping: false,
  },
  {
    name: "Alex Johnson",
    addressLine1: "111 River Road",
    addressLine2: "Matara",
    addressLine3: "",
    contact: "0744445555",
    products: [
      { name: "Shampoo", quantity: 1, price: 1750 },
      { name: "Oil", quantity: 1, price: 950 },
    ],
    status: "Delivered",
    orderDate: "2024-04-12",
    paymentMethod: "COD",
    paymentReceived: true,
    tracking: "LK555666777",
    freeShipping: true,
  },
  {
    name: "Lisa Wong",
    addressLine1: "222 Mountain View",
    addressLine2: "Nuwara Eliya",
    addressLine3: "",
    contact: "0735556666",
    products: [{ name: "Conditioner", quantity: 4, price: 1850 }],
    status: "Delivered",
    orderDate: "2024-04-25",
    paymentMethod: "Bank Transfer",
    paymentReceived: true,
    tracking: "LK666777888",
    freeShipping: false,
  },
  {
    name: "Robert Taylor",
    addressLine1: "333 Sunset Blvd",
    addressLine2: "Colombo 07",
    addressLine3: "",
    contact: "0726667777",
    products: [
      { name: "Oil", quantity: 1, price: 950 },
      { name: "Shampoo", quantity: 2, price: 1750 },
      { name: "Conditioner", quantity: 1, price: 1850 },
    ],
    status: "Delivered",
    orderDate: "2024-05-03",
    paymentMethod: "COD",
    paymentReceived: true,
    tracking: "LK777888999",
    freeShipping: true,
  },
  {
    name: "Jennifer Lee",
    addressLine1: "444 Palm Street",
    addressLine2: "Panadura",
    addressLine3: "",
    contact: "0717778888",
    products: [
      { name: "Shampoo", quantity: 3, price: 1750 },
      { name: "Oil", quantity: 2, price: 950 },
    ],
    status: "Delivered",
    orderDate: "2024-05-15",
    paymentMethod: "Bank Transfer",
    paymentReceived: true,
    tracking: "LK888999000",
    freeShipping: false,
  },
];

const AnalyticsPage: React.FC = () => {
  const [timePeriod, setTimePeriod] = useState<"daily" | "monthly" | "yearly">(
    "monthly"
  );
  const [selectedProduct, setSelectedProduct] = useState<
    "all" | "Oil" | "Shampoo" | "Conditioner"
  >("all");
  const [dateRange, setDateRange] = useState({
    startDate: "2024-01-01",
    endDate: "2024-12-31",
  });
  const [selectedMetric, setSelectedMetric] = useState<
    "revenue" | "orders" | "both"
  >("both");

  const SHIPPING_COST = 350;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const calculateOrderTotal = (order: Order) => {
    const productTotal = order.products.reduce(
      (sum, product) => sum + product.price * product.quantity,
      0
    );
    const shippingCost = order.freeShipping ? 0 : SHIPPING_COST;
    return productTotal + shippingCost;
  };

  const filteredOrders = useMemo(() => {
    return mockOrders.filter((order) => {
      const orderDate = new Date(order.orderDate);
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);

      const dateMatch = orderDate >= startDate && orderDate <= endDate;
      const statusMatch = order.status === "Delivered";
      const productMatch =
        selectedProduct === "all" ||
        order.products.some((p) => p.name === selectedProduct);

      return dateMatch && statusMatch && productMatch;
    });
  }, [dateRange, selectedProduct]);

  const analyticsData = useMemo(() => {
    const totalRevenue = filteredOrders.reduce(
      (sum, order) => sum + calculateOrderTotal(order),
      0
    );
    const totalOrders = filteredOrders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Product sales breakdown
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

    // Time-based data
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
          productRevenue: 0,
          shippingRevenue: 0,
          avgOrderValue: 0,
        };
      }

      const orderTotal = calculateOrderTotal(order);
      const productTotal = order.products.reduce(
        (sum, product) => sum + product.price * product.quantity,
        0
      );
      const shippingCost = order.freeShipping ? 0 : SHIPPING_COST;

      acc[key].revenue += orderTotal;
      acc[key].orders += 1;
      acc[key].productRevenue += productTotal;
      acc[key].shippingRevenue += shippingCost;
      acc[key].avgOrderValue = acc[key].revenue / acc[key].orders;

      return acc;
    }, {} as Record<string, { date: string; revenue: number; orders: number; productRevenue: number; shippingRevenue: number; avgOrderValue: number }>);

    // Payment method breakdown
    const paymentMethods = filteredOrders.reduce((acc, order) => {
      if (!acc[order.paymentMethod]) {
        acc[order.paymentMethod] = { count: 0, revenue: 0 };
      }
      acc[order.paymentMethod].count += 1;
      acc[order.paymentMethod].revenue += calculateOrderTotal(order);
      return acc;
    }, {} as Record<string, { count: number; revenue: number }>);

    // Status breakdown (for all orders, not just delivered)
    const statusBreakdown = mockOrders.reduce((acc, order) => {
      if (!acc[order.status]) {
        acc[order.status] = { count: 0, revenue: 0 };
      }
      acc[order.status].count += 1;
      if (order.status === "Delivered") {
        acc[order.status].revenue += calculateOrderTotal(order);
      }
      return acc;
    }, {} as Record<string, { count: number; revenue: number }>);

    // Free shipping analysis
    const freeShippingCount = filteredOrders.filter(
      (order) => order.freeShipping
    ).length;
    const paidShippingCount = filteredOrders.filter(
      (order) => !order.freeShipping
    ).length;
    const shippingRevenue = paidShippingCount * SHIPPING_COST;

    // Growth rate calculation
    const sortedTimeData = Object.values(timeData).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
    const growthRate =
      sortedTimeData.length > 1
        ? ((sortedTimeData[sortedTimeData.length - 1].revenue -
            sortedTimeData[0].revenue) /
            sortedTimeData[0].revenue) *
          100
        : 0;

    return {
      totalRevenue,
      totalOrders,
      avgOrderValue,
      productSales,
      timeData: sortedTimeData,
      paymentMethods,
      statusBreakdown,
      freeShippingCount,
      paidShippingCount,
      shippingRevenue,
      growthRate,
    };
  }, [filteredOrders, timePeriod]);

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

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Sales Analytics Dashboard
          </h1>
          <p className="text-gray-600">
            Comprehensive business performance analysis
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">
            Last updated: {new Date().toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Analytics Filters
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Time Period
            </label>
            <select
              value={timePeriod}
              onChange={(e) =>
                setTimePeriod(e.target.value as "daily" | "monthly" | "yearly")
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="daily">Daily</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, startDate: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
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

      {/* Enhanced KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-primary">
                {formatCurrency(analyticsData.totalRevenue)}
              </p>
              <p className="text-xs text-green-600">
                +{analyticsData.growthRate.toFixed(1)}% growth
              </p>
            </div>
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-primary"
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
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-blue-600">
                {analyticsData.totalOrders}
              </p>
              <p className="text-xs text-gray-500">Delivered orders</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-blue-600"
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
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Order Value</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(analyticsData.avgOrderValue)}
              </p>
              <p className="text-xs text-gray-500">Per order</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-green-600"
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
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Shipping Revenue</p>
              <p className="text-2xl font-bold text-purple-600">
                {formatCurrency(analyticsData.shippingRevenue)}
              </p>
              <p className="text-xs text-gray-500">
                {analyticsData.paidShippingCount} paid shipments
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Free Shipping</p>
              <p className="text-2xl font-bold text-orange-600">
                {analyticsData.freeShippingCount}
              </p>
              <p className="text-xs text-gray-500">Orders with free shipping</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-orange-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v13m0-13V6a2 2 0 112 0v1m-2 0V6a2 2 0 00-2 0v1m2 0V9.5m0 0v-2A2 2 0 108 7.5v2m4 0h-4"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts Row 1 - Revenue & Orders Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend - Line Chart */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
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
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
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

      {/* Main Charts Row 2 - Product Sales & Revenue Composition */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Product Sales - Pie Chart */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
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

        {/* Revenue Composition - Stacked Bar Chart */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Revenue Composition
          </h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={analyticsData.timeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis tickFormatter={(value: number) => formatCurrency(value)} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar
                dataKey="productRevenue"
                stackId="a"
                fill={chartColors.primary}
                name="Product Revenue"
              />
              <Bar
                dataKey="shippingRevenue"
                stackId="a"
                fill={chartColors.warning}
                name="Shipping Revenue"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Main Charts Row 3 - Combined Metrics & Payment Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Combined Revenue & Orders - Composed Chart */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Revenue vs Orders Correlation
          </h3>
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={analyticsData.timeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis
                yAxisId="left"
                tickFormatter={(value: number) => formatCurrency(value)}
              />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar
                yAxisId="left"
                dataKey="revenue"
                fill={chartColors.primary}
                name="Revenue"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="orders"
                stroke={chartColors.error}
                strokeWidth={3}
                name="Orders"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Payment Methods - Donut Chart */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
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
                        method === "COD"
                          ? chartColors.warning
                          : chartColors.info
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
                labelFormatter={(label) => `Payment Method: ${label}`}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Order Status Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Status - Bar Chart */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Order Status Distribution
          </h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart
              data={Object.entries(analyticsData.statusBreakdown).map(
                ([status, data]) => ({
                  status,
                  count: data.count,
                  revenue: data.revenue,
                })
              )}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="status" />
              <YAxis />
              <Tooltip />
              <Bar
                dataKey="count"
                fill={chartColors.secondary}
                name="Order Count"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Average Order Value Trend - Line Chart */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Average Order Value Trend
          </h3>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={analyticsData.timeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis tickFormatter={(value: number) => formatCurrency(value)} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="avgOrderValue"
                stroke={chartColors.success}
                strokeWidth={3}
                dot={{ fill: chartColors.success, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Analytics Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Product Performance Table */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Product Performance Analysis
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Units Sold
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Market Share
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Unit Price
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {data.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(data.revenue)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <span>
                            {(
                              (data.revenue /
                                (analyticsData.totalRevenue -
                                  analyticsData.shippingRevenue)) *
                              100
                            ).toFixed(1)}
                            %
                          </span>
                          <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
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
                                  (data.revenue /
                                    (analyticsData.totalRevenue -
                                      analyticsData.shippingRevenue)) *
                                  100
                                }%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(data.revenue / data.quantity)}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Time Period Performance */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Time Period Performance
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Orders
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Order Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Growth
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analyticsData.timeData.map((period, index) => {
                  const prevPeriod = analyticsData.timeData[index - 1];
                  const growth = prevPeriod
                    ? ((period.revenue - prevPeriod.revenue) /
                        prevPeriod.revenue) *
                      100
                    : 0;

                  return (
                    <tr key={period.date}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {period.date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {period.orders}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(period.revenue)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(period.avgOrderValue)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span
                          className={`${
                            growth >= 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {growth >= 0 ? "+" : ""}
                          {growth.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Shipping Analysis Dashboard */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Shipping Analysis
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">
              {analyticsData.freeShippingCount}
            </div>
            <div className="text-sm text-gray-600">Free Shipping Orders</div>
            <div className="text-xs text-gray-500">
              {(
                (analyticsData.freeShippingCount / analyticsData.totalOrders) *
                100
              ).toFixed(1)}
              % of total
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {analyticsData.paidShippingCount}
            </div>
            <div className="text-sm text-gray-600">Paid Shipping Orders</div>
            <div className="text-xs text-gray-500">
              {(
                (analyticsData.paidShippingCount / analyticsData.totalOrders) *
                100
              ).toFixed(1)}
              % of total
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary mb-2">
              {formatCurrency(analyticsData.shippingRevenue)}
            </div>
            <div className="text-sm text-gray-600">Total Shipping Revenue</div>
            <div className="text-xs text-gray-500">
              {(
                (analyticsData.shippingRevenue / analyticsData.totalRevenue) *
                100
              ).toFixed(1)}
              % of total revenue
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">
              {formatCurrency(SHIPPING_COST)}
            </div>
            <div className="text-sm text-gray-600">Shipping Cost Per Order</div>
            <div className="text-xs text-gray-500">Standard rate</div>
          </div>
        </div>
      </div>

      {/* Business Insights Summary */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Business Insights & Recommendations
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">
              Performance Highlights
            </h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>
                • Total revenue: {formatCurrency(analyticsData.totalRevenue)}
              </li>
              <li>
                • Average order value:{" "}
                {formatCurrency(analyticsData.avgOrderValue)}
              </li>
              <li>• Growth rate: {analyticsData.growthRate.toFixed(1)}%</li>
              <li>
                • Best performing product:{" "}
                {
                  Object.entries(analyticsData.productSales).reduce((a, b) =>
                    a[1].revenue > b[1].revenue ? a : b
                  )[0]
                }
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Recommendations</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Focus on promoting high-revenue products</li>
              <li>• Consider shipping strategy optimization</li>
              <li>• Analyze seasonal trends for inventory planning</li>
              <li>• Monitor customer payment preferences</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
