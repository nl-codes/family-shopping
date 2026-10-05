import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = {
    title: "Together · Family shopping",
    description: "A little list for everyone at home.",
    icons: {
        icon: "/icon.svg",
    },
    manifest: "/manifest.webmanifest",
    appleWebApp: { capable: true, title: "Together" },
};
export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    themeColor: "#24734e",
};
export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
