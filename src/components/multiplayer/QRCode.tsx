import qrcode from "qrcode-generator";
import { useMemo } from "react";

interface QRCodeProps {
  value: string;
  /** Rendered size in px (the SVG scales to this square). */
  size?: number;
  className?: string;
}

/**
 * Self-contained QR code rendered as an inline SVG — no network, no canvas, no
 * data-URI, so it works under any CSP. Dark modules use `currentColor`, so the
 * colour follows CSS.
 */
export function QRCode({ value, size = 200, className }: QRCodeProps) {
  const { path, count } = useMemo(() => {
    const qr = qrcode(0, "M");
    qr.addData(value);
    qr.make();
    const n = qr.getModuleCount();
    let d = "";
    for (let row = 0; row < n; row++) {
      for (let col = 0; col < n; col++) {
        if (qr.isDark(row, col)) d += `M${col},${row}h1v1h-1z`;
      }
    }
    return { path: d, count: n };
  }, [value]);

  // 1-module quiet zone on each side (QR spec recommends 4; 2 is fine on screen).
  const margin = 2;
  const dim = count + margin * 2;

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox={`${-margin} ${-margin} ${dim} ${dim}`}
      role="img"
      aria-label={`QR code per ${value}`}
      shapeRendering="crispEdges"
    >
      <path d={path} fill="currentColor" />
    </svg>
  );
}
