import type { MetadataRoute } from "next";
import { DEFAULT_DESCRIPTION, SEO_ASSETS, SITE_NAME } from "@/lib/site-config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: "Unseen",
    description: DEFAULT_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#faf7ff",
    theme_color: "#7b2fff",
    icons: [
      {
        src: SEO_ASSETS.icon,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: SEO_ASSETS.appleTouchIcon,
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
