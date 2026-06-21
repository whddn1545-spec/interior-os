import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #1d4ed8 0%, #7c3aed 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "38px",
        }}
      >
        <span style={{ color: "white", fontSize: 100, fontWeight: 900, lineHeight: 1 }}>I</span>
        <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 28, fontWeight: 600, marginTop: 4 }}>OS</span>
      </div>
    ),
    { ...size }
  );
}
