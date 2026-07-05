import { useEffect } from "react";
import { describeOverflow, hasOverflow, measureOverflow } from "./overflow";

/**
 * Dev-only watchdog for the no-scroll invariant (see CLAUDE.md). Because
 * `<body>` is `overflow: hidden`, content that spills past the viewport is
 * silently clipped and becomes unreachable — that's how the game-mode selector
 * once slipped off the bottom of the screen. This observes the document size
 * and, whenever anything spills, warns in the console and stamps
 * `data-overflow` on `<html>` (which paints a warning badge, see theme.css) so
 * the problem is loud during development instead of shipping unnoticed.
 *
 * No-ops in production builds.
 */
export function useNoScrollGuard(): void {
  useEffect(() => {
    if (!import.meta.env.DEV) return;

    const check = () => {
      const doc = document.documentElement;
      const overflow = measureOverflow(
        doc.scrollWidth,
        doc.scrollHeight,
        window.innerWidth,
        window.innerHeight,
      );
      const bad = hasOverflow(overflow);
      doc.toggleAttribute("data-overflow", bad);
      if (bad) {
        console.warn(
          `[no-scroll] Off-screen content detected: ${describeOverflow(
            overflow,
          )}. The page must fit on one screen (CLAUDE.md).`,
        );
      }
    };

    // Re-check after layout settles, on resize, and whenever the DOM reflows.
    const raf = requestAnimationFrame(check);
    const observer = new ResizeObserver(check);
    observer.observe(document.body);
    window.addEventListener("resize", check);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("resize", check);
      document.documentElement.removeAttribute("data-overflow");
    };
  }, []);
}
