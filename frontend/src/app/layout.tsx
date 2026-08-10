import "./globals.css";
import Header from "@/components/Header";
import StoreProvider from "@/components/store/StoreProvider";

export const metadata = {
  title: "KKCloset | Contemporary Fashion for Everyday Confidence",
  description:
    "Discover curated women's fashion, new arrivals, timeless essentials, and premium contemporary style at KKCloset.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <StoreProvider>
          <Header />
          {children}
          <footer className="border-t border-neutral-800 mt-20 p-8 text-center text-sm text-neutral-400">
            © KK Closet — Premium fashion platform
          </footer>
        </StoreProvider>
      </body>
    </html>
  );
}