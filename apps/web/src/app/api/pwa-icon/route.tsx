import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const size = Number(searchParams.get("size") ?? "192");
  const validSize = [192, 512].includes(size) ? size : 192;

  const fontSize = Math.round(validSize * 0.52);
  const subFontSize = Math.round(validSize * 0.15);
  const borderRadius = Math.round(validSize * 0.21);
  const gap = Math.round(validSize * 0.02);

  return new ImageResponse(
    (
      <div
        style={{
          width: validSize,
          height: validSize,
          background: "linear-gradient(135deg, #1d4ed8 0%, #7c3aed 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: `${borderRadius}px`,
        }}
      >
        <span
          style={{
            color: "white",
            fontSize,
            fontWeight: 900,
            lineHeight: 1,
            fontFamily: "sans-serif",
          }}
        >
          I
        </span>
        <span
          style={{
            color: "rgba(255,255,255,0.85)",
            fontSize: subFontSize,
            fontWeight: 700,
            marginTop: gap,
            fontFamily: "sans-serif",
            letterSpacing: "0.05em",
          }}
        >
          OS
        </span>
      </div>
    ),
    { width: validSize, height: validSize }
  );
}
