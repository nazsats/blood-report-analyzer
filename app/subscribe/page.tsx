// app/subscribe/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebaseClient";
import confetti from "canvas-confetti";
import { Loader2 } from "lucide-react";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function SubscribePage() {
  const [loading, setLoading] = useState(false);
  const [checkingSub, setCheckingSub] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const router = useRouter();

  // Load Razorpay script once
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => console.log("Razorpay SDK loaded");
    script.onerror = () => console.error("Failed to load Razorpay SDK");
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Check if user is already Pro
  useEffect(() => {
    const checkSubscription = async () => {
      if (!auth.currentUser) {
        setCheckingSub(false);
        return;
      }

      try {
        const token = await auth.currentUser.getIdToken();
        const res = await fetch('/api/check-subscription', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ uid: auth.currentUser.uid }),
        });

        const data = await res.json();
        if (data.active) {
          setIsSubscribed(true);
        }
      } catch (err) {
        console.error("Error checking subscription:", err);
      } finally {
        setCheckingSub(false);
      }
    };

    checkSubscription();
  }, []);

  const handleSubscribe = async (planId: string, planName: string) => {
    if (!auth.currentUser) {
      alert("Please sign in first");
      router.push("/auth");
      return;
    }

    if (isSubscribed) {
      alert("You're already a Pro member! 🎉");
      router.push("/upload");
      return;
    }

    if (!window.Razorpay) {
      alert("Payment system is loading... Please try again in a few seconds.");
      return;
    }

    setLoading(true);

    try {
      const token = await auth.currentUser.getIdToken();
      const uid = auth.currentUser.uid;

      // Create subscription on server
      const createRes = await fetch('/api/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ planId, uid, planName }),
      });

      const createData = await createRes.json();
      if (!createData.subscriptionId) {
        throw new Error(createData.error || "Failed to create subscription");
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
        subscription_id: createData.subscriptionId,
        name: "Blood Report AI",
        description: `Pro Plan - ${planName}`,
        image: "/logo.png",
        handler: async (response: any) => {
          try {
            // Verify payment on your server
            const verifyRes = await fetch('/api/activate-subscription', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                subscriptionId: response.razorpay_subscription_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              }),
            });

            if (verifyRes.ok) {
              // REAL SUCCESS – Celebrate! 🎊
              confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b'],
                ticks: 200,
                gravity: 0.8,
                scalar: 1.2,
              });

              alert("🎉 Payment Successful! Welcome to Pro! Unlimited uploads unlocked.");
              router.push("/upload");
            } else {
              const err = await verifyRes.json();
              alert(`Payment failed: ${err.error || "Verification failed. Please contact support."}`);
            }
          } catch (err) {
            console.error("Verification error:", err);
            alert("Network error during verification. Please contact support.");
          }
        },
        prefill: {
          email: auth.currentUser.email || "",
          contact: auth.currentUser.phoneNumber || "",
        },
        theme: {
          color: "#6366f1",
        },
        modal: {
          ondismiss: () => {
            alert("Payment cancelled or closed.");
            setLoading(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response: any) => {
        alert(`Payment failed: ${response.error.description || 'Unknown error'}`);
        setLoading(false);
      });

      rzp.open();
    } catch (err: any) {
      console.error("Subscription error:", err);
      alert("Error: " + (err.message || "Something went wrong"));
      setLoading(false);
    }
  };

  // Loading state
  if (checkingSub) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-lg text-gray-600 dark:text-gray-300">Checking your subscription...</p>
        </div>
      </div>
    );
  }

  // Already subscribed view
  if (isSubscribed) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center">
        <div className="mb-8">
          <div className="text-8xl mb-4">🎉</div>
          <h1 className="text-5xl font-extrabold mb-4 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            You're Already Pro!
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Enjoy unlimited reports, full history, and all premium features.
          </p>
        </div>
        <button
          onClick={() => router.push("/upload")}
          className="px-10 py-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-lg font-bold rounded-2xl hover:shadow-2xl transition-all"
        >
          Start Uploading Reports →
        </button>
      </div>
    );
  }

  // Main subscribe view
  return (
    <div className="max-w-5xl mx-auto py-16 px-4">
      <div className="text-center mb-16">
        <h1 className="text-5xl sm:text-6xl font-extrabold mb-6 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          Upgrade to Pro
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
          Unlock unlimited blood report analysis, full history, AI chat, and priority support.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-10 max-w-4xl mx-auto">
        {/* Monthly Plan */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-10 border-2 border-indigo-200 dark:border-indigo-900 hover:shadow-2xl transition-all">
          <h2 className="text-3xl font-bold mb-4 text-gray-800 dark:text-gray-100">Pro Health</h2>
          <div className="mb-6">
            <span className="text-5xl font-black text-indigo-600 dark:text-indigo-400">$3.99</span>
            <span className="text-xl text-gray-600 dark:text-gray-400">/month</span>
          </div>
          <ul className="space-y-3 mb-8 text-gray-700 dark:text-gray-300">
            <li className="flex items-center gap-3">✅ Unlimited report uploads</li>
            <li className="flex items-center gap-3">✅ Full history access</li>
            <li className="flex items-center gap-3">✅ AI-powered explanations</li>
            <li className="flex items-center gap-3">✅ Priority support</li>
          </ul>
          <button
            onClick={() => handleSubscribe('plan_SFmGHeN34MjdIc', 'Monthly')}
            disabled={loading}
            className="w-full py-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-lg font-bold rounded-2xl hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3"
          >
            {loading ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin" />
                Processing...
              </>
            ) : (
              "Subscribe Now"
            )}
          </button>
        </div>

        {/* Family Plan - Best Value */}
        <div className="bg-gradient-to-br from-purple-700 via-indigo-600 to-purple-800 text-white rounded-3xl shadow-2xl p-10 relative overflow-hidden border-4 border-yellow-400 transform hover:scale-105 transition-all">
          <div className="absolute -top-4 -right-4 bg-yellow-400 text-black px-6 py-2 rounded-full font-bold text-sm rotate-12 shadow-lg">
            BEST VALUE
          </div>
          <h2 className="text-3xl font-bold mb-4">Family</h2>
          <div className="mb-6">
            <span className="text-5xl font-black">$9.99</span>
            <span className="text-xl opacity-90">/month</span>
          </div>
          <p className="mb-8 text-lg opacity-90">Complete health tracking for up to 5 members!</p>
          <ul className="space-y-3 mb-8">
            <li className="flex items-center gap-3">✅ Everything in Pro</li>
            <li className="flex items-center gap-3">✅ Up to 5 Family Members</li>
            <li className="flex items-center gap-3">✅ Combined Reports</li>
            <li className="flex items-center gap-3">✅ Genetic Risk Assessment</li>
          </ul>
          <button
            onClick={() => handleSubscribe('plan_SFmGI5v0hq1BJ3', 'Family')}
            disabled={loading}
            className="w-full py-5 bg-white text-purple-700 text-lg font-bold rounded-2xl hover:shadow-2xl disabled:opacity-70 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3"
          >
            {loading ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin" />
                Processing...
              </>
            ) : (
              "Subscribe Family"
            )}
          </button>
        </div>
      </div>

      <div className="text-center mt-16">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          🔒 Secure payments via Razorpay • Cancel anytime • No hidden fees
        </p>
        <a href="/upload" className="mt-6 inline-block text-indigo-600 dark:text-indigo-400 underline hover:no-underline">
          ← Back to upload
        </a>
      </div>
    </div>
  );
}