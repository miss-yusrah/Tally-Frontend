import Image from "next/image";
import { cn } from "@/lib/utils";

interface TabrLogoProps {
  className?: string;
  title?: string;
}

/** Reusable Tabr wordmark — use anywhere (auth, nav, splash). */
export function TabrLogo({ className, title = "Tabr" }: TabrLogoProps) {
  return (
    <Image
      src="/tabr/brand/tabr-logo.webp"
      alt={title}
      width={101}
      height={47}
      priority
      className={cn("h-8 w-auto", className)}
    />
  );
}
