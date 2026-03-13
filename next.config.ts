import type { NextConfig } from "next";

const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
});

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Añadir configuración vacía de turbopack para silenciar el warning
  turbopack: {},
};

export default withPWA(nextConfig);
