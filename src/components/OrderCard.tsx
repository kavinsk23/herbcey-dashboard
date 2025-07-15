import React from "react";

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
  tracking?: string;
}

const OrderCard: React.FC<{ order: Order }> = ({ order }) => {
  const formatPhone = (phone: string) => {
    return phone.replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3");
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
    }).format(amount);
  };

  const statusColors = {
    Preparing: "bg-blue-100 text-blue-800 border-blue-200",
    Shipped: "bg-purple-100 text-purple-800 border-purple-200",
    Delivered: "bg-green-100 text-green-800 border-green-200",
    Returned: "bg-amber-100 text-amber-800 border-amber-200",
    Damaged: "bg-red-100 text-red-800 border-red-200",
  };

  const paymentColors = {
    COD: "bg-neutral-800 text-neutral-100",
    "Bank Transfer": "bg-black-800 text-black-100",
  };

  const productColors = {
    Oil: "bg-emerald-700 text-white",
    Shampoo: "bg-cyan-700 text-white",
    Conditioner: "bg-pink-700 text-white",
  };

  const totalAmount = order.products.reduce(
    (sum, product) => sum + product.price * product.quantity,
    0
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
      {/* Header with status and payment */}
      <div className="flex justify-between items-center border-b">
        <div className={`${statusColors[order.status]} px-3 py-2 flex-1`}>
          <span className="font-medium text-sm">{order.status}</span>
        </div>
        <div
          className={`${
            paymentColors[order.paymentMethod]
          } px-3 py-2 flex-1 text-center flex items-center justify-center space-x-2`}
        >
          <span className="font-medium text-sm">{order.paymentMethod}</span>
          {order.paymentMethod === "COD" && (
            <>
              {/* Green tick for payment received */}
              <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                <svg
                  className="w-3 h-3 text-white"
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
              </div>
              {/* Red X for payment not received */}
              <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                <svg
                  className="w-3 h-3 text-white"
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
              </div>
            </>
          )}
        </div>
        <div className="bg-gray-100 px-3 py-2 flex-1 text-right flex justify-between">
          {" "}
          <span className="text-sm text-gray-500">{order.orderDate}</span>
          <span className="text-sm font-medium">
            #{order.tracking || "N/A"}
          </span>
        </div>
      </div>

      <div className="px-3 flex w-full justify-between">
        {/* Customer Info */}
        <div className="mb-3 min-w-60">
          <div className="flex justify-between items-start">
            <h3 className="font-semibold text-gray-900">{order.name}</h3>
          </div>

          <div className="mt-1 space-y-1">
            <p className="text-sm text-gray-700">{order.addressLine1}</p>
            {order.addressLine2 && (
              <p className="text-sm text-gray-700">{order.addressLine2}</p>
            )}
            {order.addressLine3 && (
              <p className="text-sm text-gray-700">{order.addressLine3}</p>
            )}
            <p className="text-sm font-medium text-indigo-600">
              {formatPhone(order.contact)}
            </p>
          </div>
        </div>

        {/* Products Table */}
        <div className="mb-3 w-full">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-2 py-1 text-left text-xs font-medium text-gray-500">
                    Product
                  </th>
                  <th className="px-2 py-1 text-right text-xs font-medium text-gray-500">
                    Qty
                  </th>
                  <th className="px-2 py-1 text-right text-xs font-medium text-gray-500">
                    Price
                  </th>
                  <th className="px-2 py-1 text-right text-xs font-medium text-gray-500">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {order.products.map((product) => (
                  <tr key={product.name}>
                    <td className="px-2 py-1 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full ${
                          productColors[
                            product.name as keyof typeof productColors
                          ] || "bg-gray-100"
                        }`}
                      >
                        {product.name}
                      </span>
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap text-right text-sm">
                      x{product.quantity}
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap text-right text-sm">
                      {formatCurrency(product.price)}
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap text-right text-sm font-medium">
                      {formatCurrency(product.price * product.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50">
                  <td
                    colSpan={3}
                    className="px-2 py-1 text-right text-sm font-medium"
                  >
                    Total:
                  </td>
                  <td className="px-2 py-1 text-right text-sm font-medium">
                    {formatCurrency(totalAmount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Action Buttons
        <div className="flex justify-between items-center">
          <button className="px-3 py-1 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors">
            Print
          </button>
          <button className="px-3 py-1 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors">
            Update
          </button>
        </div> */}
      </div>
    </div>
  );
};

export default OrderCard;
