// app/printed/layout.tsx
import type { Metadata } from "next";
import PrintedHeader from "./components/Header";

export const metadata: Metadata = {
  title: "FASTOCR - Printed",
  // description: "...",
};

export default function PrintedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PrintedHeader />
      {children}
    </>
  );
}