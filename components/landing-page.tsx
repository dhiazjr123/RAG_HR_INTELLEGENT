"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Upload, Cpu, BarChart3, Moon, Sun, ArrowRight } from "lucide-react";

export default function LandingPage() {
  const [darkMode, setDarkMode] = useState(false);

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-300 ${darkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"}`}>
      {/* NAVBAR */}
      <header className={`sticky top-0 z-50 border-b transition-colors duration-300 ${darkMode ? "border-slate-900 bg-slate-950/80 backdrop-blur-md" : "border-slate-200 bg-white/80 backdrop-blur-md"}`}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center focus:outline-none">
            <Image
              src="/ISRE Black.png"
              alt="ISRE Logo"
              width={80}
              height={40}
              priority
              className={`object-contain transition-all duration-300 ${darkMode ? "invert" : ""}`}
            />
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <a href="#" className={`transition-colors ${darkMode ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"}`}>Home</a>
            <a href="#features" className={`transition-colors ${darkMode ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"}`}>Features</a>
            <Link href="/login" className={`transition-colors ${darkMode ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"}`}>Portal HR</Link>
          </nav>

          {/* Action & Toggle */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-lg transition-colors ${darkMode ? "hover:bg-slate-900 text-slate-400 hover:text-white" : "hover:bg-slate-100 text-slate-600 hover:text-slate-900"}`}
              aria-label="Toggle Dark Mode"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            
            <Link
              href="/login"
              className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold text-sky-500 hover:text-sky-600 transition-colors"
            >
              Masuk <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <main className="flex-1">
        <section className="relative max-w-6xl mx-auto px-6 py-20 md:py-32 flex flex-col items-center justify-center text-center">
          {/* Subtle accent sphere */}
          <div className="absolute top-10 left-1/2 -translate-x-1/2 w-72 h-72 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-4xl mx-auto space-y-8">
            {/* Title matching screenshot styling */}
            <h1 className={`text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight ${darkMode ? "text-white" : "text-slate-950"}`}>
              <span className="bg-gradient-to-r from-[#10d4be] via-[#0ea5e9] to-[#0d9488] bg-clip-text text-transparent">Intelligent Screening</span> <br className="hidden md:inline" />
              Recruitment Engine.
            </h1>

            {/* Subtitle */}
            <p className={`text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed ${darkMode ? "text-slate-400" : "text-slate-600"}`}>
              Platform rekrutmen berbasis AI (RAG) untuk kemudahan analisis berkas lamaran dan pencocokan kriteria secara otomatis.
            </p>

            {/* Call to Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <Link
                href="/register"
                className="w-full sm:w-auto px-8 py-3.5 rounded-lg btn-figma font-semibold text-sm transition-all text-center border-0"
              >
                Lamar Sekarang
              </Link>
              <Link
                href="/login"
                className={`w-full sm:w-auto px-8 py-3.5 rounded-lg font-semibold text-sm transition-all border text-center ${darkMode ? "border-slate-800 bg-slate-900/50 text-slate-300 hover:bg-slate-900 hover:text-white" : "border-slate-200 bg-white text-sky-500 hover:bg-slate-50 hover:border-slate-300"}`}
              >
                Masuk Akun
              </Link>
            </div>
          </div>
        </section>

        {/* FEATURES SECTION */}
        <section id="features" className={`py-20 border-t transition-colors duration-300 ${darkMode ? "border-slate-900 bg-slate-950/20" : "border-slate-200 bg-slate-50"}`}>
          <div className="max-w-6xl mx-auto px-6 space-y-12">
            {/* Centered Heading */}
            <div className="text-center space-y-3">
              <h2 className={`text-3xl font-bold tracking-tight ${darkMode ? "text-white" : "text-slate-900"}`}>
                Fitur Utama
              </h2>
              <div className="w-12 h-1 bg-sky-500 mx-auto rounded-full" />
            </div>

            {/* 3 Grid Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
              {/* Card 1: Upload CV */}
              <div className={`group rounded-2xl border p-8 transition-all duration-300 text-left ${darkMode ? "border-slate-900 bg-slate-900/30 hover:bg-slate-900/60" : "border-slate-200/60 bg-white shadow-sm hover:shadow-md hover:border-slate-200"}`}>
                <div className="w-12 h-12 rounded-xl bg-sky-50 dark:bg-slate-900 border border-sky-100 dark:border-slate-850 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-300">
                  <Upload className="w-6 h-6 text-sky-500" />
                </div>
                <h3 className={`text-lg font-bold mb-3 ${darkMode ? "text-white" : "text-slate-900"}`}>
                  Upload CV Mudah
                </h3>
                <p className={`text-sm leading-relaxed ${darkMode ? "text-slate-400" : "text-slate-600"}`}>
                  Proses unggah berkas resume/CV Anda secara praktis dan langsung terindeks dengan cepat untuk analisis kecocokan.
                </p>
              </div>

              {/* Card 2: AI Matching */}
              <div className={`group rounded-2xl border p-8 transition-all duration-300 text-left ${darkMode ? "border-slate-900 bg-slate-900/30 hover:bg-slate-900/60" : "border-slate-200/60 bg-white shadow-sm hover:shadow-md hover:border-slate-200"}`}>
                <div className="w-12 h-12 rounded-xl bg-sky-50 dark:bg-slate-900 border border-sky-100 dark:border-slate-850 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-300">
                  <Cpu className="w-6 h-6 text-sky-500" />
                </div>
                <h3 className={`text-lg font-bold mb-3 ${darkMode ? "text-white" : "text-slate-900"}`}>
                  Kecocokan AI (RAG)
                </h3>
                <p className={`text-sm leading-relaxed ${darkMode ? "text-slate-400" : "text-slate-600"}`}>
                  Algoritma AI cerdas menganalisis dan mencocokkan kualifikasi CV Anda terhadap kriteria pekerjaan secara otomatis.
                </p>
              </div>

              {/* Card 3: Tracking Status */}
              <div className={`group rounded-2xl border p-8 transition-all duration-300 text-left ${darkMode ? "border-slate-900 bg-slate-900/30 hover:bg-slate-900/60" : "border-slate-200/60 bg-white shadow-sm hover:shadow-md hover:border-slate-200"}`}>
                <div className="w-12 h-12 rounded-xl bg-sky-50 dark:bg-slate-900 border border-sky-100 dark:border-slate-850 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-300">
                  <BarChart3 className="w-6 h-6 text-sky-500" />
                </div>
                <h3 className={`text-lg font-bold mb-3 ${darkMode ? "text-white" : "text-slate-900"}`}>
                  Tracking Real-time
                </h3>
                <p className={`text-sm leading-relaxed ${darkMode ? "text-slate-400" : "text-slate-600"}`}>
                  Pantau perkembangan status lamaran Anda secara langsung melalui dashboard interaktif kapan pun dan di mana pun.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className={`border-t py-8 transition-colors duration-300 ${darkMode ? "border-slate-900 bg-slate-950 text-slate-500" : "border-slate-200 bg-white text-slate-400"}`}>
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
          <p>© {new Date().getFullYear()} ISRE. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span className="hover:text-indigo-600 transition-colors duration-200 cursor-pointer">Terms & Conditions</span>
            <span className="hover:text-indigo-600 transition-colors duration-200 cursor-pointer">Privacy Policy</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
