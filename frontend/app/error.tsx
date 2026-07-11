"use client";

import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      dir="rtl"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #09090b 0%, #1a1025 50%, #09090b 100%)",
        fontFamily: "Vazirmatn, sans-serif",
        color: "#fafafa",
        padding: "1rem",
      }}
    >
      <div
        style={{
          textAlign: "center",
          background: "rgba(255,255,255,0.03)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(139,92,246,0.15)",
          borderRadius: "24px",
          padding: "3rem 2.5rem",
          maxWidth: "480px",
          width: "100%",
        }}
      >
        <div
          style={{
            fontSize: "5rem",
            marginBottom: "1rem",
            animation: "shake 0.6s ease-in-out infinite",
          }}
        >
          ⚠️
        </div>

        <h1
          style={{
            fontSize: "1.75rem",
            fontWeight: 700,
            marginBottom: "0.75rem",
            background: "linear-gradient(135deg, #ef4444, #f97316)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          خطایی رخ داده است
        </h1>

        <p
          style={{
            fontSize: "0.875rem",
            color: "rgba(250,250,250,0.5)",
            marginBottom: "2rem",
            lineHeight: 1.8,
            direction: "ltr",
            wordBreak: "break-word",
          }}
        >
          {error.message || "An unexpected error occurred"}
        </p>

        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => reset()}
            style={{
              background: "linear-gradient(135deg, #8b5cf6, #7c3aed)",
              color: "#fafafa",
              padding: "0.75rem 2rem",
              borderRadius: "12px",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "1rem",
              fontFamily: "Vazirmatn, sans-serif",
            }}
          >
            تلاش مجدد
          </button>

          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(139,92,246,0.2)",
              color: "#fafafa",
              padding: "0.75rem 2rem",
              borderRadius: "12px",
              textDecoration: "none",
              fontWeight: 600,
              fontSize: "1rem",
            }}
          >
            صفحه اصلی
          </Link>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-5deg); }
          75% { transform: rotate(5deg); }
        }
      `}</style>
    </div>
  );
}
