import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfjs-dist resolves its worker script relative to its own file at runtime; bundling it
  // rewrites that path into a .next chunk directory where the worker was never copied,
  // breaking PDF parsing. Keeping it (and pdf-parse, which bundles the same engine) external
  // makes Node require them straight from node_modules instead.
  serverExternalPackages: ["pdfjs-dist", "pdf-parse"],
};

export default nextConfig;
