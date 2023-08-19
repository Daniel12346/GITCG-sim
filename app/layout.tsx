import RecoilRootWrapper from "@/components/RecoilRootWrapper";
import "./globals.css";
import { Suspense } from "react";

export const metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <main className="min-h-screen bg-background flex flex-col items-center">
          <RecoilRootWrapper>{children}</RecoilRootWrapper>
        </main>
      </body>
    </html>
  );
}
