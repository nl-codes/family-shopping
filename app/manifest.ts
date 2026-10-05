import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "Together Family Shopping",
        short_name: "Together",
        description: "Shopping lists for the whole family",
        start_url: "/",
        display: "standalone",
        background_color: "#f6f7f2",
        theme_color: "#24734e",
        icons: [
            {
                src: "/icon.svg",
                sizes: "any",
                type: "image/svg+xml",
                purpose: "any",
            },
        ],
    };
}
