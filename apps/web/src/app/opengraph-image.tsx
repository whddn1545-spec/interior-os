import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "InteriorOS - 인테리어 자영업 AI 업무 자동화";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(to bottom right, #fdfbfb, #ebedee)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px",
          position: "relative",
        }}
      >
        {/* 장식용 블러 배경 */}
        <div
          style={{
            position: "absolute",
            top: "-20%",
            left: "-10%",
            width: "60%",
            height: "80%",
            background: "linear-gradient(to right, #4facfe, #00f2fe)",
            filter: "blur(120px)",
            opacity: 0.15,
            borderRadius: "50%",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-20%",
            right: "-10%",
            width: "60%",
            height: "80%",
            background: "linear-gradient(to right, #ff0844, #ffb199)",
            filter: "blur(120px)",
            opacity: 0.1,
            borderRadius: "50%",
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(255, 255, 255, 0.8)",
            boxShadow: "0 20px 40px rgba(0,0,0,0.05)",
            border: "1px solid rgba(255,255,255,0.4)",
            borderRadius: "40px",
            padding: "80px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "120px",
              height: "120px",
              background: "#1d4ed8",
              borderRadius: "32px",
              marginBottom: "40px",
              boxShadow: "0 10px 25px rgba(29, 78, 216, 0.4)",
            }}
          >
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <h1
            style={{
              fontSize: "80px",
              fontWeight: "900",
              color: "#111827",
              margin: "0 0 20px 0",
              letterSpacing: "-2px",
            }}
          >
            InteriorOS
          </h1>
          <p
            style={{
              fontSize: "40px",
              color: "#4B5563",
              margin: 0,
              fontWeight: "600",
              textAlign: "center",
            }}
          >
            60대 인테리어 사장님을 위한
            <br />
            AI 업무 자동화 플랫폼
          </p>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
