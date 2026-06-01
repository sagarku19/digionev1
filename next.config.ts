import type { NextConfig } from "next";

// NOTE: Next 16 prints a "multiple lockfiles" warning at dev startup because
// C:\Users\sagar\package.json (and its package-lock.json) exist outside this
// project and Next walks up the tree to find a workspace root.
//
// The "fix" — setting `turbopack: { root: __dirname }` — is REPRODUCIBLY BROKEN
// on this Windows + OneDrive layout: it cascades into webpack's PostCSS
// resolver, which then walks up from digionev1 and finds the stray
// C:\Users\sagar\package.json before locating digionev1\node_modules\tailwindcss,
// producing "Can't resolve 'tailwindcss'" and failing every page compile.
// Verified empirically — __dirname does resolve to digionev1, so the value is
// correct; the bug is in Next 16's downstream propagation of turbopack.root.
//
// The cleanest local fix is to remove C:\Users\sagar\package.json, but that
// file is the user's home shell config (and the task forbids deleting it).
// So we accept the informational warning rather than break the build.

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "192.168.0.179",
    "192.168.1.8",
    "192.168.1.2",
    "*.local",
  ],
};

export default nextConfig;
