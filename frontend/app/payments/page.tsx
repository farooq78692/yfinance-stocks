"use client";

import { useAuth } from "@/components/auth";
import { useState } from "react";

export default function PaymentForm() {
  const amount = 2999; // $29.99 in cents
  const [isLoading, setIsLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<
    "idle" | "processing" | "success" | "error"
  >("idle");
  const { user, token } = useAuth();

  const handlePayment = async () => {
    if (!token) return;

    setIsLoading(true);
    setPaymentStatus("processing");

    try {
      // Create payment intent
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/payment/create-intent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            amount: amount,
            currency: "usd",
          }),
        }
      );

      if (response.ok) {
        const paymentData = await response.json();

        // Simulate payment processing
        setTimeout(() => {
          setPaymentStatus("success");
          setIsLoading(false);

          // Log analytics event
          if (typeof window !== "undefined" && (window as any).posthog) {
            (window as any).posthog.capture("payment_completed", {
              amount: amount,
              currency: "usd",
              user_id: user?.id,
            });
          }
        }, 2000);

        setTimeout(() => {
          window.location.href = "/";
        }, 3000);
      } else {
        setPaymentStatus("error");
        setIsLoading(false);
      }
    } catch (error) {
      setPaymentStatus("error");
      setIsLoading(false);
    }
  };

  if (paymentStatus === "success") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center h-[calc(100vh-66px)]">
        <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md text-center">
          <div className="text-green-600 text-6xl mb-4">✓</div>
          <h2 className="text-2xl font-bold mb-4 text-gray-800">
            Payment Successful!
          </h2>
          <p className="text-gray-600">
            You now have access to premium features.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center h-[calc(100vh-66px)]">
      <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">
          Upgrade to Premium
        </h2>

        <div className="mb-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-lg">Premium Features</h3>
            <ul className="mt-2 space-y-1 text-sm text-gray-600">
              <li>• Unlimited backtests</li>
              <li>• Advanced indicators (RSI, MACD)</li>
              <li>• Portfolio backtesting</li>
              <li>• Export to PDF/CSV</li>
              <li>• Priority support</li>
            </ul>
          </div>
        </div>

        <div className="mb-6">
          <div className="text-3xl font-bold text-gray-800">
            ${(amount / 100).toFixed(2)}
            <span className="text-lg font-normal text-gray-600">/month</span>
          </div>
        </div>

        {paymentStatus === "error" && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800 text-sm">
              Payment failed. Please try again.
            </p>
          </div>
        )}

        <button
          onClick={handlePayment}
          disabled={isLoading || !user}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 font-medium"
        >
          {isLoading ? "Processing..." : `Pay $${(amount / 100).toFixed(2)}`}
        </button>

        <p className="mt-4 text-xs text-gray-500 text-center">
          This is a demo payment form. No actual charges will be made.
        </p>
      </div>
    </div>
  );
}
