"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

type PolicyType = "terms" | "privacy" | null;

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [receiveUpdates, setReceiveUpdates] = useState(false);

  // Modal / policy state
  const [showPolicy, setShowPolicy] = useState<PolicyType>(null);
  const [policyContent, setPolicyContent] = useState<string>("");
  const [loadingPolicy, setLoadingPolicy] = useState(false);

  // Form submission state
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Google login state
  const [googleLoading, setGoogleLoading] = useState(false);

  const router = useRouter();

  const passwordsMatch = password === confirmPassword;
  const showMismatchMessage = confirmPassword.length > 0 && !passwordsMatch;

  useEffect(() => {
    if (!showPolicy) {
      setPolicyContent("");
      return;
    }

    const fetchPolicy = async () => {
      setLoadingPolicy(true);
      try {
        const filePath = showPolicy === "terms" ? "/terms.txt" : "/privacy.txt";
        const response = await fetch(filePath);

        if (!response.ok) {
          throw new Error(`Failed to load ${showPolicy} policy`);
        }

        const text = await response.text();
        setPolicyContent(text);
      } catch (err) {
        console.error(err);
        setPolicyContent(
          "Sorry, we couldn't load the document right now.\nPlease try again later."
        );
      } finally {
        setLoadingPolicy(false);
      }
    };

    fetchPolicy();
  }, [showPolicy]);

  // ✅ Google Login – Direct redirect to backend
  const handleGoogleLogin = () => {
    setGoogleLoading(true);
    setFormError(null);

    const API_BASE =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    window.location.href = `${API_BASE}/auth/google/login`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!passwordsMatch) {
      setFormError("Passwords do not match");
      return;
    }

    if (!agreedToTerms) {
      setFormError("You must agree to the Terms of Service");
      return;
    }

    setFormLoading(true);

    try {
      const payload = {
        email,
        password,
        receive_updates: receiveUpdates,
      };

      const API_BASE =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      const response = await fetch(`${API_BASE}/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || data.message || data.error || "Registration failed."
        );
      }

      router.push("/dashboard");
    } catch (err: any) {
      console.error("Signup error:", err);
      setFormError(err.message || "Something went wrong. Please try again.");
    } finally {
      setFormLoading(false);
    }
  };

  const closeModal = () => setShowPolicy(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black font-league-spartan flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md relative">
        <div className="bg-gray-900/70 backdrop-blur-md border border-gray-800 rounded-2xl p-8 md:p-10 shadow-2xl shadow-black/60">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-black tracking-tight">
              <span className="text-orange-500">Sign</span>
              <span className="text-orange-600"> Up</span>
            </h1>
            <p className="text-gray-400 mt-3 text-lg">
              Create your FASTOCR account
            </p>
          </div>

          {/* Social login buttons */}
          <div className="space-y-4 mb-8">
            <button
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              className={`w-full flex items-center justify-center gap-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg py-3 px-4 text-gray-200 transition ${
                googleLoading ? "opacity-70 cursor-not-allowed" : ""
              }`}
            >
              <img
                src="https://www.google.com/favicon.ico"
                alt="Google"
                className="w-5 h-5"
              />
              {googleLoading ? "Redirecting..." : "Continue with Google"}
            </button>

            <button className="w-full flex items-center justify-center gap-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg py-3 px-4 text-gray-200 transition">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg"
                alt="Microsoft"
                className="w-5 h-5"
              />
              Continue with Microsoft
            </button>

            <button className="w-full flex items-center justify-center gap-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg py-3 px-4 text-gray-200 transition">
              <img src="/IIITH_logo.png" alt="IIITH" className="h-5 w-auto" />
              Continue with IIITH
            </button>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-gray-900 text-gray-500">or</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm text-gray-300 mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-gray-200 focus:outline-none focus:border-orange-600 focus:ring-1 focus:ring-orange-600 transition"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm text-gray-300 mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-gray-200 focus:outline-none focus:border-orange-600 focus:ring-1 focus:ring-orange-600 transition"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="block text-sm text-gray-300 mb-1.5"
              >
                Confirm Password
              </label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-gray-200 focus:outline-none focus:border-orange-600 focus:ring-1 focus:ring-orange-600 transition"
                placeholder="••••••••"
              />

              {showMismatchMessage && (
                <p className="mt-1.5 text-sm text-red-400">
                  Passwords do not match
                </p>
              )}

              {confirmPassword.length > 0 &&
                passwordsMatch &&
                password.length > 0 && (
                  <p className="mt-1.5 text-sm text-green-400">
                    Passwords match ✓
                  </p>
                )}
            </div>

            {formError && (
              <div className="bg-red-950/60 border border-red-700 text-red-200 px-4 py-3 rounded-lg text-sm">
                {formError}
              </div>
            )}

            <div className="space-y-3 pt-2">
              <label className="flex items-start gap-3 text-sm text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-1 w-4 h-4 accent-orange-600 bg-gray-700 border-gray-600 rounded"
                />
                <span>
                  I Agree to the{" "}
                  <button
                    type="button"
                    onClick={() => setShowPolicy("terms")}
                    className="text-orange-500 hover:text-orange-400 underline font-medium bg-transparent border-0 p-0 cursor-pointer"
                  >
                    Terms of Service, General Terms and Conditions
                  </button>{" "}
                  and{" "}
                  <button
                    type="button"
                    onClick={() => setShowPolicy("privacy")}
                    className="text-orange-500 hover:text-orange-400 underline font-medium bg-transparent border-0 p-0 cursor-pointer"
                  >
                    Privacy Policy
                  </button>
                </span>
              </label>

              <label className="flex items-start gap-3 text-sm text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={receiveUpdates}
                  onChange={(e) => setReceiveUpdates(e.target.checked)}
                  className="mt-1 w-4 h-4 accent-orange-600 bg-gray-700 border-gray-600 rounded"
                />
                <span>
                  Send me updates about services, workflows. You can unsubscribe at any time.
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={formLoading}
              className={`w-full mt-6 py-4 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 rounded-xl text-lg font-semibold shadow-xl shadow-orange-900/40 transition-all hover:scale-[1.02] active:scale-95 ${
                formLoading ? "opacity-70 cursor-not-allowed" : ""
              }`}
            >
              {formLoading ? "Creating account..." : "Sign Up"}
            </button>
          </form>

          <p className="text-center text-gray-400 mt-8 text-sm">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-orange-500 hover:text-orange-400 font-medium"
            >
              Login
            </Link>
          </p>
        </div>
      </div>

      {showPolicy && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          onClick={closeModal}
        >
          <div
            className="bg-gray-900 border border-gray-700 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl shadow-black/60"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <h2 className="text-2xl font-bold text-orange-400">
                {showPolicy === "terms"
                  ? "Terms of Service & General Conditions"
                  : "Privacy Policy"}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-orange-400 transition"
                aria-label="Close"
              >
                <X className="w-7 h-7" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 prose prose-invert prose-orange max-w-none text-gray-300">
              {loadingPolicy ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500"></div>
                </div>
              ) : (
                <pre className="whitespace-pre-wrap font-sans text-base leading-relaxed break-words">
                  {policyContent || "Loading document..."}
                </pre>
              )}
            </div>

            <div className="p-6 border-t border-gray-800 flex justify-end">
              <button
                onClick={closeModal}
                className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}