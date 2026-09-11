import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdfjs-dist', 'pdf-parse', 'mammoth']
};

export default nextConfig;
