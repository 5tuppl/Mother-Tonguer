/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"]
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), geolocation=(), payment=()" }
        ]
      }
    ];
  },
  async rewrites() {
    return [
      { source: "/translate", destination: "/api/translate" },
      { source: "/asr", destination: "/api/asr" },
      { source: "/tts", destination: "/api/tts" },
      { source: "/voices/clone", destination: "/api/voices/clone" }
    ];
  }
};

export default nextConfig;
