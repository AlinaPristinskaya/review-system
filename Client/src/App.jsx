import React from "react";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { TablePage } from "./pages/TablePage";
import { ReviewPlanPage } from "./pages/ReviewPlanPage";

export function App() {
  const location = useLocation();
  const pageClassName = location.pathname === "/table"
    ? "page page-table"
    : location.pathname === "/review-plan"
      ? "page page-review-plan"
      : "page";

  return (
    <main className={pageClassName}>
      <header className="topbar">
        <Link className="brand-link" to="/">Review System</Link>
        <nav className="topnav">
          <Link to="/">Home</Link>
          <Link to="/review-plan">Review Plan</Link>
          <Link to="/table">Table</Link>
        </nav>
      </header>

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/review-plan" element={<ReviewPlanPage />} />
        <Route path="/table" element={<TablePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </main>
  );
}
