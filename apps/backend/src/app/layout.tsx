import "./globals.css";

export const metadata = {
    title: "Touchline Backend",
    description: "API for the Touchline coaching platform",
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
