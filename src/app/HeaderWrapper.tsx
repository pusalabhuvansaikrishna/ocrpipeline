"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/Header";

export default function HeaderWrapper() {
  const pathname = usePathname();

  const hideHeader = pathname.includes("/printed");

  if (hideHeader) return null;

  return <Header />;
}