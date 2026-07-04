import { execSync } from "node:child_process";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

function getGitSha(): string {
  try {
    return execSync("git rev-parse --short HEAD").toString().trim();
  } catch {
    return "unknown";
  }
}

export default defineConfig({
  define: {
    __BUILD_SHA__: JSON.stringify(getGitSha()),
  },
  plugins: [
    react(),
    {
      // Inject the commit SHA into index.html so the deploy workflow can verify
      // the live site is serving the expected build (mirrors the Peak setup).
      name: "inject-build-sha",
      transformIndexHtml(html) {
        return html.replace(
          '<meta name="build-sha" content="__BUILD_SHA_PLACEHOLDER__" />',
          `<meta name="build-sha" content="${getGitSha()}" />`,
        );
      },
    },
  ],
  server: {
    host: "0.0.0.0",
  },
  test: {
    globals: true,
    environment: "node",
  },
});
