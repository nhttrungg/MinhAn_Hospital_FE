"use client";

/** Last-resort boundary for failures in the root layout itself; must render its own html/body. */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="vi">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f3f7f5" }}>
        <main
          style={{
            minHeight: "100dvh",
            display: "grid",
            placeItems: "center",
            padding: 24,
            textAlign: "center",
            color: "#16302b",
          }}
        >
          <div style={{ maxWidth: 440 }}>
            <h1 style={{ fontSize: 24 }}>Hệ thống tạm thời gặp sự cố</h1>
            <p style={{ color: "#60756f", lineHeight: 1.8 }}>
              Vui lòng tải lại trang. Nếu lỗi còn lặp lại, hãy liên hệ quản trị hệ thống.
            </p>
            <button
              type="button"
              onClick={reset}
              style={{
                marginTop: 16,
                padding: "10px 20px",
                borderRadius: 8,
                border: 0,
                background: "#0f6e62",
                color: "#fff",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Tải lại
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
