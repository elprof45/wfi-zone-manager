const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. Standard Brand SVG (Wi-Fi pulse aesthetic matching NetPulse)
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
    <linearGradient id="pulseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="50%" stop-color="#0ea5e9"/>
      <stop offset="100%" stop-color="#0284c7"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#0ea5e9" flood-opacity="0.35"/>
    </filter>
  </defs>

  <!-- Background Card -->
  <rect width="512" height="512" rx="112" fill="url(#bgGrad)"/>
  <rect x="8" y="8" width="496" height="496" rx="104" fill="none" stroke="#ffffff" stroke-opacity="0.08" stroke-width="3"/>

  <!-- Concentric Wi-Fi Arcs -->
  <g transform="translate(256, 290)" filter="url(#glow)">
    <!-- Outer Arc -->
    <path d="M -150 -60 A 180 180 0 0 1 150 -60" fill="none" stroke="#f8fafc" stroke-width="28" stroke-linecap="round"/>
    
    <!-- Mid Arc -->
    <path d="M -100 -10 A 120 120 0 0 1 100 -10" fill="none" stroke="url(#pulseGrad)" stroke-width="26" stroke-linecap="round"/>
    
    <!-- Inner Arc -->
    <path d="M -50 40 A 60 60 0 0 1 50 40" fill="none" stroke="#38bdf8" stroke-width="24" stroke-linecap="round"/>
    
    <!-- Center Pulse Core -->
    <circle cx="0" cy="85" r="22" fill="#ffffff"/>
    <circle cx="0" cy="85" r="10" fill="#0284c7"/>
  </g>
</svg>`;

// 2. Maskable SVG with required 15-20% safe zone padding
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGradMask" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
    <linearGradient id="pulseGradMask" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="50%" stop-color="#0ea5e9"/>
      <stop offset="100%" stop-color="#0284c7"/>
    </linearGradient>
  </defs>

  <!-- Full-bleed background for maskable -->
  <rect width="512" height="512" fill="url(#bgGradMask)"/>

  <!-- Scaled content inside safe zone (approx 70% scale centered) -->
  <g transform="translate(256, 280) scale(0.72)">
    <!-- Outer Arc -->
    <path d="M -150 -60 A 180 180 0 0 1 150 -60" fill="none" stroke="#f8fafc" stroke-width="32" stroke-linecap="round"/>
    <!-- Mid Arc -->
    <path d="M -100 -10 A 120 120 0 0 1 100 -10" fill="none" stroke="url(#pulseGradMask)" stroke-width="30" stroke-linecap="round"/>
    <!-- Inner Arc -->
    <path d="M -50 40 A 60 60 0 0 1 50 40" fill="none" stroke="#38bdf8" stroke-width="28" stroke-linecap="round"/>
    <!-- Center Pulse Core -->
    <circle cx="0" cy="85" r="26" fill="#ffffff"/>
    <circle cx="0" cy="85" r="12" fill="#0284c7"/>
  </g>
</svg>`;

async function run() {
  // Write SVGs
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent);
  fs.writeFileSync(path.join(publicDir, 'icon-maskable.svg'), maskableSvg);

  const svgBuffer = Buffer.from(svgContent);
  const maskableBuffer = Buffer.from(maskableSvg);

  // Generate 192x192
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'));

  // Generate 512x512
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'));

  // Generate maskable 512x512
  await sharp(maskableBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));

  // Generate apple-touch-icon 180x180
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  // Generate favicon 32x32 and 48x48
  await sharp(svgBuffer)
    .resize(48, 48)
    .png()
    .toFile(path.join(publicDir, 'favicon.png'));

  console.log('All PWA icons generated successfully in /public');
}

run().catch(console.error);
