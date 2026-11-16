import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Myndora Care",
    short_name: "Myndora Care",
    description: "Offline-first chronic care for hypertension and diabetes.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f7fa",
    theme_color: "#0a63d8",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
