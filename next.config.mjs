/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
    unoptimized: false,
    },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Optimizaciones para producción
  poweredByHeader: false,
  compress: true,
  // Generación de sitio estático optimizado
  output: 'standalone',
  // No especificar trilingSlash para comportamiento compatible
  trailingSlash: true,
};

export default nextConfig;
