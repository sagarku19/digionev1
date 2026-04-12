import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "192.168.0.179",
    "192.168.1.8",
    "192.168.1.2",
    "*.local",
  ],
};

export default nextConfig;