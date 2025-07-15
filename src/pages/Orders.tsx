import React from "react";
import OrderCard from "../components/OrderCard";

const Orders = () => {
  const sampleOrders = [
    {
      name: "John Doe",
      addressLine1: "123 Main St, Colombo",
      addressLine2: "Sri Lanka",
      contact: "0761234567",
      products: [
        { name: "Oil", quantity: 2, price: 1200 },
        { name: "Shampoo", quantity: 1, price: 800 },
      ],
      status: "Preparing" as const,
      orderDate: "2023-05-15",
      paymentMethod: "COD" as const,
      tracking: "LK123456789",
    },
    {
      name: "Jane Smith",
      addressLine1: "456 Ocean Ave, Galle",
      addressLine3: "Southern Province",
      contact: "0779876543",
      products: [
        { name: "Conditioner", quantity: 3, price: 950 },
        { name: "Shampoo", quantity: 2, price: 800 },
      ],
      status: "Shipped" as const,
      orderDate: "2023-05-18",
      paymentMethod: "Bank Transfer" as const,
      tracking: "LK987654321",
    },
    {
      name: "David Johnson",
      addressLine1: "789 Hill St",
      addressLine2: "Kandy",
      addressLine3: "Central Province",
      contact: "0715551234",
      products: [
        { name: "Oil", quantity: 1, price: 1200 },
        { name: "Conditioner", quantity: 2, price: 950 },
      ],
      status: "Delivered" as const,
      orderDate: "2023-05-10",
      paymentMethod: "Bank Transfer" as const,
      tracking: "LK456123789",
    },
    {
      name: "Maria Garcia",
      addressLine1: "321 Beach Rd",
      addressLine2: "Negombo",
      contact: "0768884567",
      products: [
        { name: "Shampoo", quantity: 1, price: 800 },
        { name: "Conditioner", quantity: 1, price: 950 },
      ],
      status: "Returned" as const,
      orderDate: "2023-05-20",
      paymentMethod: "COD" as const,
      tracking: "LK789123456",
    },
    {
      name: "Raj Patel",
      addressLine1: "10 Temple Road",
      addressLine3: "Anuradhapura",
      contact: "0723334444",
      products: [{ name: "Oil", quantity: 1, price: 1200 }],
      status: "Damaged" as const,
      orderDate: "2023-06-01",
      paymentMethod: "COD" as const,
      tracking: "LK111222333",
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        Orders Dashboard
      </h1>

      <div className="space-y-4">
        {sampleOrders.map((order, index) => (
          <OrderCard key={`${order.tracking}-${index}`} order={order} />
        ))}
      </div>

      <div className="mt-8 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-700">
            Total Orders: {sampleOrders.length}
          </h2>
          <div className="flex space-x-2">
            <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
              Export Orders
            </button>
            <button className="px-4 py-2 border border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors">
              Filter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Orders;
