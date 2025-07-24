"use client";

import React, { useState } from "react";
import { useAuth } from "@/components/auth";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface Rule {
  if_condition: string;
  then_action: string;
  else_action: string;
}

interface BacktestRequest {
  ticker: string;
  start_date: string;
  end_date: string;
  sma_period: number;
  rule: Rule;
}

interface BacktestResult {
  total_return: number;
  win_rate: number;
  number_of_trades: number;
  equity_curve: Array<{
    date: string;
    portfolio_value: number;
    price: number;
    sma: number;
  }>;
  final_portfolio_value: number;
  sharpe_ratio: number;
}

export default function BacktesterPage() {
  const { user, token, logout, isLoading: authLoading } = useAuth();
  const [formData, setFormData] = useState<BacktestRequest>({
    ticker: "TSLA",
    start_date: "2025-01-01",
    end_date: "2025-12-31",
    sma_period: 10,
    rule: {
      if_condition: "price > sma",
      then_action: "buy",
      else_action: "hold",
    },
  });

  const [results, setResults] = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (field: string, value: string | number) => {
    if (field.startsWith("rule.")) {
      const ruleField = field.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        rule: {
          ...prev.rule,
          [ruleField]: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const runBacktest = async () => {
    if (!token) {
      setError("Please log in to run backtests");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("http://localhost:8000/backtest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Backtest failed");
      }

      const data = await response.json();
      setResults(data);

      // Log analytics event (PostHog placeholder)
      if (typeof window !== "undefined" && (window as any).posthog) {
        (window as any).posthog.capture("backtest_run", {
          ticker: formData.ticker,
          total_return: data.total_return,
          number_of_trades: data.number_of_trades,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const chartData = results
    ? {
        labels: results.equity_curve.map((point) => point.date),
        datasets: [
          {
            label: "Portfolio Value",
            data: results.equity_curve.map((point) => point.portfolio_value),
            borderColor: "#0ea5e9",
            backgroundColor: "rgba(14, 165, 233, 0.1)",
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: "#0ea5e9",
            pointBorderColor: "white",
            pointBorderWidth: 2,
            pointRadius: 4,
          },
        ],
      }
    : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          color: "#334155",
          font: {
            size: 14,
            family: "Inter",
          },
        },
      },
      title: {
        display: true,
        text: "Portfolio Performance Over Time",
        color: "#1e293b",
        padding: 20,
        font: {
          size: 18,
          family: "Inter",
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: "rgba(148, 163, 184, 0.2)",
        },
        ticks: {
          color: "#64748b",
          font: {
            size: 12,
            family: "Inter",
          },
        },
      },
      y: {
        beginAtZero: false,
        grid: {
          color: "rgba(148, 163, 184, 0.2)",
        },
        ticks: {
          color: "#64748b",
          font: {
            size: 12,
            family: "Inter",
          },
          callback: function (value: any) {
            return "$" + value.toLocaleString();
          },
        },
      },
    },
  };

  // Show loading while auth is being checked
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="relative mb-8">
            <div className="loading-spinner h-16 w-16 mx-auto"></div>
          </div>
          <h2 className="text-2xl font-bold text-gradient mb-2">
            Loading Dashboard
          </h2>
          <p className="text-slate-600 font-medium">
            Preparing your trading workspace...
          </p>
        </div>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full animate-fade-in">
          <div className="glass-card p-8 rounded-3xl text-center transform hover:scale-105 transition-all duration-300">
            <div className="mb-8">
              <div className="w-20 h-20 bg-gradient-to-r from-primary-600 to-secondary-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-glow animate-float">
                <svg
                  className="w-10 h-10 text-white"
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
              <h1 className="text-4xl font-bold text-gradient mb-4">
                Stock Strategy Backtester
              </h1>
              <p className="text-xl text-slate-600">
                Unlock the power of data-driven trading
              </p>
            </div>

            <div className="bg-gradient-to-r from-primary-50 to-secondary-50 p-6 rounded-2xl mb-8 border border-primary-100">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center justify-center">
                <span className="w-6 h-6 bg-gradient-to-r from-accent-500 to-primary-500 rounded-full mr-3 flex items-center justify-center">
                  <span className="text-white text-sm">✨</span>
                </span>
                Professional Trading Analytics
              </h3>
              <div className="grid grid-cols-1 gap-3 text-sm text-slate-700">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-primary-400 rounded-full mr-3 animate-pulse"></div>
                  Advanced backtesting algorithms
                </div>
                <div className="flex items-center">
                  <div
                    className="w-2 h-2 bg-secondary-400 rounded-full mr-3 animate-pulse"
                    style={{ animationDelay: "0.5s" }}
                  ></div>
                  Real-time market data analysis
                </div>
                <div className="flex items-center">
                  <div
                    className="w-2 h-2 bg-accent-400 rounded-full mr-3 animate-pulse"
                    style={{ animationDelay: "1s" }}
                  ></div>
                  Professional-grade insights
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <a href="/login" className="btn-primary w-full inline-block">
                <span className="relative z-10 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                    />
                  </svg>
                  Sign In to Your Account
                </span>
              </a>
              <a href="/register" className="btn-secondary w-full inline-block">
                <span className="flex items-center justify-center">
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                    />
                  </svg>
                  Create Free Account
                </span>
              </a>
            </div>

            <p className="text-sm text-slate-500 mt-8 flex items-center justify-center">
              <svg
                className="w-4 h-4 mr-2"
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
              Join thousands of traders using our platform
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Top Navigation */}
      <nav className="glass-card border-b border-white/30 sticky top-0 z-50 animate-slide-down">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-primary-600 to-secondary-600 rounded-xl flex items-center justify-center shadow-glow">
                <svg
                  className="w-7 h-7 text-white"
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
              <div>
                <h1 className="text-xl font-bold text-gradient">
                  Strategy Backtester
                </h1>
                <p className="text-xs text-slate-500">
                  Professional Trading Analytics
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-3 bg-gradient-to-r from-primary-50 to-secondary-50 px-4 py-2 rounded-full border border-primary-100">
                <div className="w-2 h-2 bg-accent-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-slate-700 font-medium">
                  {user.email}
                </span>
                {user.is_premium && (
                  <span className="text-xs bg-gradient-to-r from-amber-400 to-orange-400 text-white px-2 py-1 rounded-full font-semibold shadow-sm">
                    PRO
                  </span>
                )}
              </div>

              <div className="flex space-x-2">
                {!user.is_premium && (
                  <a
                    href="/payments"
                    className="text-sm bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
                  >
                    ⚡ Upgrade
                  </a>
                )}
                <button
                  onClick={logout}
                  className="text-sm bg-white/80 backdrop-blur-sm text-slate-700 px-4 py-2 rounded-lg font-medium hover:bg-white hover:shadow-md transition-all duration-200"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Strategy Configuration Panel */}
          <div className="xl:col-span-1">
            <div className="glass-card rounded-3xl p-6 sticky top-24 animate-slide-up">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-xl flex items-center justify-center shadow-glow-purple">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-800">
                  Strategy Builder
                </h2>
              </div>

              {/* Form Inputs */}
              <div className="space-y-6">
                <div className="group">
                  <label className="block text-sm font-semibold text-slate-700 mb-2 group-focus-within:text-primary-600 transition-colors">
                    📈 Stock Ticker
                  </label>

                  <div className="relative">
                    <select
                      value={formData.ticker}
                      onChange={(e) =>
                        handleInputChange("ticker", e.target.value)
                      }
                      className="appearance-none w-full px-4 py-4 pr-10 bg-white border border-slate-300 rounded-xl shadow-sm text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition duration-200"
                    >
                      <option value="AAPL">AAPL</option>
                      <option value="TSLA">TSLA</option>
                      <option value="MSFT">MSFT</option>
                    </select>

                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                      <svg
                        className="w-5 h-5 text-slate-400 group-focus-within:text-primary-500 transition duration-150"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="group">
                    <label className="block text-sm font-semibold text-slate-700 mb-3 group-focus-within:text-primary-600 transition-colors">
                      📅 Start Date
                    </label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) =>
                        handleInputChange("start_date", e.target.value)
                      }
                      className="input-field"
                    />
                  </div>

                  <div className="group">
                    <label className="block text-sm font-semibold text-slate-700 mb-3 group-focus-within:text-primary-600 transition-colors">
                      📅 End Date
                    </label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) =>
                        handleInputChange("end_date", e.target.value)
                      }
                      className="input-field"
                    />
                  </div>
                </div>

                <div className="group">
                  <label className="block text-sm font-semibold text-slate-700 mb-3 group-focus-within:text-primary-600 transition-colors">
                    ⚙️ SMA Period (Days)
                  </label>
                  <input
                    type="number"
                    value={formData.sma_period}
                    onChange={(e) =>
                      handleInputChange("sma_period", parseInt(e.target.value))
                    }
                    className="input-field"
                    min="1"
                    max="200"
                  />
                </div>

                {/* Trading Rules Section */}
                <div className="bg-gradient-to-r from-primary-50 to-secondary-50 p-5 rounded-2xl border border-primary-100">
                  <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center">
                    <span className="w-3 h-3 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full mr-3 animate-pulse"></span>
                    Trading Rules
                  </h3>

                  <div className="space-y-4">
                    <div className="group">
                      <label className="block text-xs font-medium text-slate-600 mb-2">
                        IF Condition
                      </label>
                      <select
                        value={formData.rule.if_condition}
                        onChange={(e) =>
                          handleInputChange("rule.if_condition", e.target.value)
                        }
                        className="w-full px-3 py-2 bg-white/90 border border-primary-200 rounded-lg focus:outline-none focus:border-primary-400 text-sm font-medium text-slate-700 transition-all duration-200"
                      >
                        <option value="price > sma">Price &gt; SMA</option>
                        <option value="price < sma">Price &lt; SMA</option>
                        <option value="price >= sma">Price ≥ SMA</option>
                        <option value="price <= sma">Price ≤ SMA</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="group">
                        <label className="block text-xs font-medium text-slate-600 mb-2">
                          THEN Action
                        </label>
                        <select
                          value={formData.rule.then_action}
                          onChange={(e) =>
                            handleInputChange(
                              "rule.then_action",
                              e.target.value
                            )
                          }
                          className="w-full px-3 py-2 bg-white/90 border border-primary-200 rounded-lg focus:outline-none focus:border-primary-400 text-sm font-medium text-slate-700 transition-all duration-200"
                        >
                          <option value="buy">📈 Buy</option>
                          <option value="sell">📉 Sell</option>
                          <option value="hold">⏸️ Hold</option>
                        </select>
                      </div>

                      <div className="group">
                        <label className="block text-xs font-medium text-slate-600 mb-2">
                          ELSE Action
                        </label>
                        <select
                          value={formData.rule.else_action}
                          onChange={(e) =>
                            handleInputChange(
                              "rule.else_action",
                              e.target.value
                            )
                          }
                          className="w-full px-3 py-2 bg-white/90 border border-primary-200 rounded-lg focus:outline-none focus:border-primary-400 text-sm font-medium text-slate-700 transition-all duration-200"
                        >
                          <option value="buy">📈 Buy</option>
                          <option value="sell">📉 Sell</option>
                          <option value="hold">⏸️ Hold</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Run Backtest Button */}
                <button
                  onClick={runBacktest}
                  disabled={loading}
                  className="btn-primary w-full text-lg py-4 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  <span className="relative z-10 flex items-center justify-center">
                    {loading ? (
                      <>
                        <div className="loading-spinner h-5 w-5 mr-3"></div>
                        Running Analysis...
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-5 h-5 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 10V3L4 14h7v7l9-11h-7z"
                          />
                        </svg>
                        Run Backtest Analysis
                      </>
                    )}
                  </span>
                </button>

                {error && (
                  <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-xl animate-slide-up">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg
                          className="h-5 w-5 text-red-400"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-red-700 font-medium">
                          {error}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Results Panel */}
          <div className="xl:col-span-2">
            {!results ? (
              <div className="glass-card rounded-3xl p-12 text-center h-full flex items-center justify-center animate-scale-in">
                <div className="max-w-lg">
                  <div className="w-24 h-24 bg-gradient-to-r from-slate-200 to-slate-300 rounded-2xl flex items-center justify-center mx-auto mb-8 animate-float">
                    <svg
                      className="w-12 h-12 text-slate-400"
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
                  <h3 className="text-3xl font-bold text-slate-800 mb-4">
                    Ready to Analyze
                  </h3>
                  <p className="text-slate-600 text-lg mb-8">
                    Configure your strategy parameters and click "Run Backtest
                    Analysis" to see detailed results and performance metrics.
                  </p>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="metric-card from-primary-50 to-primary-100 border-primary-200">
                      <div className="text-3xl font-bold text-primary-600 mb-2">
                        📊
                      </div>
                      <div className="text-sm text-slate-600 font-medium">
                        Performance
                      </div>
                    </div>
                    <div className="metric-card from-secondary-50 to-secondary-100 border-secondary-200">
                      <div className="text-3xl font-bold text-secondary-600 mb-2">
                        💹
                      </div>
                      <div className="text-sm text-slate-600 font-medium">
                        Analytics
                      </div>
                    </div>
                    <div className="metric-card from-accent-50 to-accent-100 border-accent-200">
                      <div className="text-3xl font-bold text-accent-600 mb-2">
                        🎯
                      </div>
                      <div className="text-sm text-slate-600 font-medium">
                        Insights
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-8 animate-fade-in">
                {/* Performance Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="metric-card from-accent-50 to-emerald-100 border-accent-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-accent-600">
                        <svg
                          className="w-7 h-7"
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
                      <span className="text-xs font-bold text-accent-600 bg-accent-200 px-2 py-1 rounded-full">
                        RETURN
                      </span>
                    </div>
                    <div className="text-3xl font-bold text-slate-800 mb-1">
                      {results.total_return}%
                    </div>
                    <div className="text-sm text-slate-600">Total Return</div>
                  </div>

                  <div className="metric-card from-primary-50 to-blue-100 border-primary-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-primary-600">
                        <svg
                          className="w-7 h-7"
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
                      <span className="text-xs font-bold text-primary-600 bg-primary-200 px-2 py-1 rounded-full">
                        WIN RATE
                      </span>
                    </div>
                    <div className="text-3xl font-bold text-slate-800 mb-1">
                      {results.win_rate}%
                    </div>
                    <div className="text-sm text-slate-600">Success Rate</div>
                  </div>

                  <div className="metric-card from-secondary-50 to-violet-100 border-secondary-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-secondary-600">
                        <svg
                          className="w-7 h-7"
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
                      <span className="text-xs font-bold text-secondary-600 bg-secondary-200 px-2 py-1 rounded-full">
                        TRADES
                      </span>
                    </div>
                    <div className="text-3xl font-bold text-slate-800 mb-1">
                      {results.number_of_trades}
                    </div>
                    <div className="text-sm text-slate-600">Total Trades</div>
                  </div>

                  <div className="metric-card from-orange-50 to-amber-100 border-orange-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-orange-600">
                        <svg
                          className="w-7 h-7"
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
                      <span className="text-xs font-bold text-orange-600 bg-orange-200 px-2 py-1 rounded-full">
                        VALUE
                      </span>
                    </div>
                    <div className="text-3xl font-bold text-slate-800 mb-1">
                      ${results.final_portfolio_value.toLocaleString()}
                    </div>
                    <div className="text-sm text-slate-600">Final Value</div>
                  </div>
                </div>

                {/* Chart */}
                <div className="chart-container">
                  <div className="h-96">
                    {chartData && (
                      <Line data={chartData} options={chartOptions} />
                    )}
                  </div>
                </div>

                {/* Additional Metrics */}
                <div className="glass-card rounded-3xl p-8">
                  <h3 className="text-2xl font-bold text-slate-800 mb-6 flex items-center">
                    <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-xl mr-4 flex items-center justify-center shadow-glow">
                      <svg
                        className="w-5 h-5 text-white"
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
                    Advanced Analytics
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-6 rounded-2xl border border-slate-200">
                      <div className="text-sm font-semibold text-slate-600 mb-2">
                        Sharpe Ratio
                      </div>
                      <div className="text-3xl font-bold text-slate-800 mb-1">
                        {results.sharpe_ratio}
                      </div>
                      <div className="text-xs text-slate-500">
                        Risk-adjusted return measure
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-6 rounded-2xl border border-slate-200">
                      <div className="text-sm font-semibold text-slate-600 mb-2">
                        Strategy Performance
                      </div>
                      <div className="text-2xl font-bold text-slate-800 mb-1">
                        {results.total_return > 0
                          ? "🚀 Profitable"
                          : "⚠️ Loss Making"}
                      </div>
                      <div className="text-xs text-slate-500">
                        Overall strategy assessment
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
