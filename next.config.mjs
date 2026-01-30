/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },

  // Performance optimizations
  reactStrictMode: true,

  // Optimize production builds
  poweredByHeader: false,

  // Enable experimental features for better performance
  experimental: {
    // Optimize package imports to reduce bundle size
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;
