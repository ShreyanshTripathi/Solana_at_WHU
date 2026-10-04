import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native SQLite driver: load it from node_modules at runtime instead of bundling it.
  // pdfkit reads its font metrics from node_modules at runtime, so it isn't bundled either.
  // The voice models run on ONNX Runtime's native binding; eSpeak NG loads its WebAssembly from its own folder.
  serverExternalPackages: ["better-sqlite3", "pdfkit", "@huggingface/transformers", "onnxruntime-node", "espeak-ng"],
};

export default nextConfig;
