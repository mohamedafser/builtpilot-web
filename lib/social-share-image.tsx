import { ImageResponse } from "next/og";

export const alt = "BuildPilot — Construction Project Management, Simplified";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function buildSocialShareImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background:
            "linear-gradient(135deg, #fff8f3 0%, #fff1e6 42%, #f5f5f4 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              background: "#FF7A45",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: -1,
            }}
          >
            BP
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                fontSize: 40,
                fontWeight: 800,
                color: "#1c1917",
                letterSpacing: -1,
              }}
            >
              BuildPilot
            </div>
            <div style={{ fontSize: 20, color: "#78716c", marginTop: 4 }}>
              Construction Project Management Platform
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              fontSize: 54,
              fontWeight: 800,
              color: "#1c1917",
              lineHeight: 1.15,
              letterSpacing: -1.5,
              maxWidth: 900,
            }}
          >
            Manage projects, BOQs, materials, and progress in one place.
          </div>
          <div
            style={{
              fontSize: 26,
              color: "#57534e",
              lineHeight: 1.4,
              maxWidth: 820,
            }}
          >
            Built for construction professionals who need clarity across
            quotations, tasks, costs, and site progress.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 20px",
              borderRadius: 999,
              background: "#FF7A45",
              color: "#ffffff",
              fontSize: 22,
              fontWeight: 700,
            }}
          >
            Construction Project Management, Simplified.
          </div>
          <div style={{ fontSize: 20, color: "#a8a29e" }}>
            builtpilot-web.vercel.app
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
