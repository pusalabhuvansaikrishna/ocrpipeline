"use client";

import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Add your login logic here (API call, authentication, etc.)
    console.log("Login attempt:", { email, password });
    // → redirect or show error/success
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black font-league-spartan flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md relative">
        <div className="bg-gray-900/70 backdrop-blur-md border border-gray-800 rounded-2xl p-8 md:p-10 shadow-2xl shadow-black/60">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-black tracking-tight">
              <span className="text-orange-500">Log</span>
              <span className="text-orange-600">in</span>
            </h1>
            <p className="text-gray-400 mt-3 text-lg">
              Welcome back to FASTOCR
            </p>
          </div>

          {/* Social / SSO buttons */}
          <div className="space-y-4 mb-8">
            <button className="w-full flex items-center justify-center gap-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg py-3 px-4 text-gray-200 transition">
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
              Continue with Google
            </button>

            <button className="w-full flex items-center justify-center gap-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg py-3 px-4 text-gray-200 transition">
              <img src="https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg" alt="Microsoft" className="w-5 h-5" />
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

          {/* Form */}
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
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-gray-200 focus:outline-none focus:border-orange-600 focus:ring-1 focus:ring-orange-600 transition"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              className="w-full mt-6 py-4 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 rounded-xl text-lg font-semibold shadow-xl shadow-orange-900/40 transition-all hover:scale-[1.02] active:scale-95"
            >
              Login
            </button>
          </form>

          <p className="text-center text-gray-400 mt-8 text-sm">
            Don't have an account?{" "}
            <Link href="/signup" className="text-orange-500 hover:text-orange-400 font-medium">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}