// App.tsx
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import AdminLoadingPage from "./pages/AdminLoadingPage";
import Orders from "./pages/Orders";
// import AnalyticsPage from "./pages/AnalyticsPage";

const App = () => {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-6">
          <Routes>
            <Route path="/" element={<AdminLoadingPage />} />
            <Route path="/admin/orders" element={<Orders />} />
            {/* <Route path="/analytics" element={<AnalyticsPage />} /> */}
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;
