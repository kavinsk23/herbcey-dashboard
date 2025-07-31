import React, { useState, useEffect } from "react";
import {
  addExpenseToSheet,
  getAllExpensesFromSheet,
  deleteExpenseFromSheet,
  updateExpenseInSheet,
  getExpenseSummary,
} from "../assets/services/expenseService";
import ExpenseForm from "./ExpenseForm";

interface Expense {
  id: string;
  type: "Shampoo" | "Conditioner" | "Oil" | "Other";
  amount: number;
  note: string;
  date: string;
}

interface ExpenseManagerProps {
  dateRange: {
    startDate: string;
    endDate: string;
  };
  onExpensesUpdate?: (summary: {
    totalExpenses: number;
    expensesByType: Record<string, number>;
    monthlyExpenses: Record<string, number>;
  }) => void;
}

const ExpenseManager: React.FC<ExpenseManagerProps> = ({
  dateRange,
  onExpensesUpdate,
}) => {
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expenseSummary, setExpenseSummary] = useState<{
    totalExpenses: number;
    expensesByType: Record<string, number>;
    monthlyExpenses: Record<string, number>;
  } | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Load expenses from Google Sheets
  const loadExpenses = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await getAllExpensesFromSheet();

      if (result.success && result.data) {
        // Convert SheetExpense to Expense format
        const convertedExpenses: Expense[] = result.data.map(
          (sheetExpense) => ({
            id: sheetExpense.id,
            type: sheetExpense.type as
              | "Shampoo"
              | "Conditioner"
              | "Oil"
              | "Other",
            amount: sheetExpense.amount,
            note: sheetExpense.note,
            date: sheetExpense.date,
          })
        );

        setExpenses(convertedExpenses);

        // Also load expense summary
        const summaryResult = await getExpenseSummary(
          dateRange.startDate,
          dateRange.endDate
        );
        if (summaryResult.success && summaryResult.data) {
          setExpenseSummary(summaryResult.data);
          onExpensesUpdate?.(summaryResult.data);
        }
      } else {
        setError(result.error || "Failed to load expenses");
      }
    } catch (err) {
      console.error("Error loading expenses:", err);
      setError("An unexpected error occurred while loading expenses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, [dateRange.startDate, dateRange.endDate]);

  const handleAddExpense = async (expense: Omit<Expense, "id">) => {
    try {
      const expenseToAdd = {
        ...expense,
        id: Date.now().toString(),
      };

      // Save to Google Sheets
      const result = await addExpenseToSheet(expenseToAdd);

      if (result.success) {
        // Update local state
        setExpenses([...expenses, expenseToAdd]);
        setShowExpenseForm(false);

        // Refresh expense summary
        const summaryResult = await getExpenseSummary(
          dateRange.startDate,
          dateRange.endDate
        );
        if (summaryResult.success && summaryResult.data) {
          setExpenseSummary(summaryResult.data);
          onExpensesUpdate?.(summaryResult.data);
        }

        console.log("Expense saved successfully!");
      } else {
        console.error("Failed to save expense:", result.error);
        alert(`Failed to save expense: ${result.error}`);
      }
    } catch (error) {
      console.error("Error saving expense:", error);
      alert("An unexpected error occurred while saving the expense");
    }
  };

  const handleEditExpense = async (expense: Omit<Expense, "id">) => {
    if (!editingExpense) return;

    try {
      const updatedExpense = {
        ...expense,
        id: editingExpense.id,
      };

      // Update in Google Sheets
      const result = await updateExpenseInSheet(
        editingExpense.id,
        updatedExpense
      );

      if (result.success) {
        // Update local state
        setExpenses(
          expenses.map((exp) =>
            exp.id === editingExpense.id ? updatedExpense : exp
          )
        );
        setShowExpenseForm(false);
        setEditingExpense(null);

        // Refresh expense summary
        const summaryResult = await getExpenseSummary(
          dateRange.startDate,
          dateRange.endDate
        );
        if (summaryResult.success && summaryResult.data) {
          setExpenseSummary(summaryResult.data);
          onExpensesUpdate?.(summaryResult.data);
        }

        console.log("Expense updated successfully!");
      } else {
        console.error("Failed to update expense:", result.error);
        alert(`Failed to update expense: ${result.error}`);
      }
    } catch (error) {
      console.error("Error updating expense:", error);
      alert("An unexpected error occurred while updating the expense");
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!window.confirm("Are you sure you want to delete this expense?")) {
      return;
    }

    try {
      const result = await deleteExpenseFromSheet(expenseId);

      if (result.success) {
        // Update local state
        setExpenses(expenses.filter((expense) => expense.id !== expenseId));

        // Refresh expense summary
        const summaryResult = await getExpenseSummary(
          dateRange.startDate,
          dateRange.endDate
        );
        if (summaryResult.success && summaryResult.data) {
          setExpenseSummary(summaryResult.data);
          onExpensesUpdate?.(summaryResult.data);
        }

        console.log("Expense deleted successfully!");
      } else {
        console.error("Failed to delete expense:", result.error);
        alert(`Failed to delete expense: ${result.error}`);
      }
    } catch (error) {
      console.error("Error deleting expense:", error);
      alert("An unexpected error occurred while deleting the expense");
    }
  };

  const openEditForm = (expense: Expense) => {
    setEditingExpense(expense);
    setShowExpenseForm(true);
  };

  const openAddForm = () => {
    setEditingExpense(null);
    setShowExpenseForm(true);
  };

  const closeForm = () => {
    setShowExpenseForm(false);
    setEditingExpense(null);
  };

  // Filter expenses by date range
  const filteredExpenses = expenses.filter((expense) => {
    const expenseDate = new Date(expense.date);
    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);

    // Set time to start/end of day for proper comparison
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    return expenseDate >= startDate && expenseDate <= endDate;
  });

  // Debug logging
  console.log("Expenses debug:", {
    totalExpenses: expenses.length,
    filteredExpenses: filteredExpenses.length,
    dateRange,
    sampleExpense: expenses[0],
  });

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Expenses Management
          </h3>
          <p className="text-sm text-gray-500">
            Track and manage your business expenses
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {expenseSummary && (
            <div className="text-sm text-gray-600">
              Total:{" "}
              <span className="font-semibold text-red-600">
                {formatCurrency(expenseSummary.totalExpenses)}
              </span>
            </div>
          )}
          <button
            onClick={openAddForm}
            className="px-4 py-2 text-sm font-medium text-white transition-colors rounded-lg bg-primary hover:bg-primary/90"
            disabled={loading}
          >
            Add Expense
          </button>
        </div>
      </div>

      {loading ? (
        <div className="px-6 py-8 text-center">
          <div className="w-8 h-8 mx-auto border-b-2 rounded-full animate-spin border-primary"></div>
          <p className="mt-2 text-gray-500">Loading expenses...</p>
        </div>
      ) : error ? (
        <div className="px-6 py-8 text-center">
          <div className="mb-4 text-xl text-red-500">⚠️</div>
          <h3 className="mb-2 text-lg font-medium text-gray-900">
            Error Loading Expenses
          </h3>
          <p className="mb-4 text-red-500">{error}</p>
          <button
            onClick={loadExpenses}
            className="px-4 py-2 text-white transition-colors rounded-lg bg-primary hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      ) : expenses.length === 0 ? (
        <div className="px-6 py-8 text-center">
          <div className="mb-4 text-4xl text-gray-400">💰</div>
          <h3 className="mb-2 text-lg font-medium text-gray-900">
            No expenses in database
          </h3>
          <p className="mb-4 text-gray-500">
            Start tracking your business expenses to get better insights into
            your profitability.
          </p>
          <button
            onClick={openAddForm}
            className="px-4 py-2 text-white transition-colors rounded-lg bg-primary hover:bg-primary/90"
          >
            Add Your First Expense
          </button>
        </div>
      ) : filteredExpenses.length === 0 ? (
        <div className="px-6 py-8 text-center">
          <div className="mb-4 text-4xl text-gray-400">📅</div>
          <h3 className="mb-2 text-lg font-medium text-gray-900">
            No expenses in selected date range
          </h3>
          <p className="mb-4 text-gray-500">
            Total expenses in database: {expenses.length}. Try adjusting your
            date range or add expenses for this period.
          </p>
          <button
            onClick={openAddForm}
            className="px-4 py-2 text-white transition-colors rounded-lg bg-primary hover:bg-primary/90"
          >
            Add Expense
          </button>
        </div>
      ) : (
        <>
          {/* Expense Summary Cards */}

          {/* Expense Table */}
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
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredExpenses
                    .sort(
                      (a, b) =>
                        new Date(b.date).getTime() - new Date(a.date).getTime()
                    )
                    .map((expense) => (
                      <tr key={expense.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                          {new Date(expense.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div
                              className={`w-3 h-3 rounded-full mr-3 ${
                                expense.type === "Oil"
                                  ? "bg-emerald-600"
                                  : expense.type === "Shampoo"
                                  ? "bg-cyan-600"
                                  : expense.type === "Conditioner"
                                  ? "bg-pink-600"
                                  : "bg-gray-600"
                              }`}
                            ></div>
                            <span className="text-sm font-medium text-gray-900">
                              {expense.type}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                          {formatCurrency(expense.amount)}
                        </td>
                        <td className="max-w-xs px-6 py-4 text-sm text-gray-500 truncate">
                          {expense.note || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => openEditForm(expense)}
                              className="text-blue-600 transition-colors hover:text-blue-800"
                              title="Edit expense"
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
                            <button
                              onClick={() => handleDeleteExpense(expense.id)}
                              className="text-red-600 transition-colors hover:text-red-800"
                              title="Delete expense"
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
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Expense Form Modal */}
      {showExpenseForm && (
        <ExpenseForm
          initialExpense={
            editingExpense || {
              type: "Shampoo",
              amount: 0,
              note: "",
              date: new Date().toISOString().split("T")[0],
            }
          }
          onSave={editingExpense ? handleEditExpense : handleAddExpense}
          onClose={closeForm}
        />
      )}
    </div>
  );
};

export default ExpenseManager;
