import Link from "next/link";

export default function NotFound() {
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
            animation: "bounce 2s ease-in-out infinite",
          }}
        >
          🔍
        </div>

        <h1
          style={{
            fontSize: "1.75rem",
            fontWeight: 700,
            marginBottom: "0.75rem",
            background: "linear-gradient(135deg, #8b5cf6, #a78bfa)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          صفحه مورد نظر یافت نشد
        </h1>

        <p
          style={{
            fontSize: "1rem",
            color: "rgba(250,250,250,0.6)",
            marginBottom: "2rem",
            lineHeight: 1.8,
          }}
        >
          ممکن است آدرس اشتباه باشد یا صفحه حذف شده باشد
        </p>

        <Link
          href="/"
          style={{
            display: "inline-block",
            background: "linear-gradient(135deg, #8b5cf6, #7c3aed)",
            color: "#fafafa",
            padding: "0.75rem 2rem",
            borderRadius: "12px",
            textDecoration: "none",
            fontWeight: 600,
            fontSize: "1rem",
            transition: "opacity 0.2s",
          }}
        >
          بازگشت به صفحه اصلی
        </Link>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
      `}</style>
    </div>
  );
}
