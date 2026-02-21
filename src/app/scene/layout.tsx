import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FASTOCR - Scene Text",
  // description: "Extract printed text from images and PDFs",
  // You can add icons, open graph, etc. here later if needed
};

export default function PrintedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}