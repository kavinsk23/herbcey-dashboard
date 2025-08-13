import React from "react";
import {
  createOrderTimestamp,
  extractDateFromDateTime,
  formatToISODate,
} from "../utils/dateUtils";

interface Expense {
  id: string;
  type: "Shampoo" | "Conditioner" | "Marketing" | "Oil" | "Other";
  amount: number;
  note: string;
  date: string; // Now in YYYY-MM-DD HH:mm:ss format
}

interface ExpenseFormProps {
  initialExpense: Omit<Expense, "id">;
  onSave: (expense: Omit<Expense, "id">) => void;
  onClose: () => void;
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({
  initialExpense,
  onSave,
  onClose,
}) => {
  // Initialize with datetime, but extract date for the input
  const [expense, setExpense] = React.useState(() => {
    return {
      ...initialExpense,
      // Ensure we have a proper datetime format
      date: initialExpense.date || createOrderTimestamp(),
    };
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (expense.amount <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    // Ensure the expense has proper datetime format before saving
    const expenseWithDateTime = {
      ...expense,
      date: expense.date.includes(" ")
        ? expense.date
        : `${expense.date} ${new Date().toTimeString().slice(0, 8)}`, // Add current time to date-only
    };

    onSave(expenseWithDateTime);
  };

  const handleDateChange = (dateValue: string) => {
    // Convert date input to datetime by adding current time
    const currentTime = new Date().toTimeString().slice(0, 8);
    const newDateTime = `${dateValue} ${currentTime}`;
    setExpense({ ...expense, date: newDateTime });
  };

  // Extract just the date part for the HTML date input
  const dateInputValue = expense.date
    ? extractDateFromDateTime(expense.date)
    : formatToISODate(new Date());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="w-full max-w-md p-6 bg-white rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Add New Expense</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 text-sm font-medium">
              Expense Type
            </label>
            <select
              value={expense.type}
              onChange={(e) =>
                setExpense({ ...expense, type: e.target.value as any })
              }
              className="w-full p-2 border rounded"
              required
            >
              <option value="Shampoo">Shampoo</option>
              <option value="Conditioner">Conditioner</option>
              <option value="Marketing">Marketing</option>
              <option value="Oil">Oil</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">
              Amount (LKR)
            </label>
            <input
              type="number"
              value={expense.amount}
              onChange={(e) =>
                setExpense({
                  ...expense,
                  amount: parseFloat(e.target.value) || 0,
                })
              }
              className="w-full p-2 border rounded"
              min="0.01"
              step="0.01"
              required
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">Note</label>
            <textarea
              value={expense.note}
              onChange={(e) => setExpense({ ...expense, note: e.target.value })}
              className="w-full p-2 border rounded"
              rows={3}
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">Date</label>
            <input
              type="date"
              value={dateInputValue}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-full p-2 border rounded"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full p-2 text-white rounded bg-primary hover:bg-primary-dark"
          >
            Add Expense
          </button>
        </form>
      </div>
    </div>
  );
};

export default ExpenseForm;
