"use client";

import { useEffect, useRef, type ReactNode } from "react";
import {
  useBottomSheet,
  useCloseBottomSheet,
  useOpenBottomSheet,
} from "@/store";
import { cn } from "@/lib/utils";

export function BottomSheet() {
  const { isOpen, content, title, height } = useBottomSheet();
  const closeBottomSheet = useCloseBottomSheet();
  const sheetRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    currentY.current = e.touches[0].clientY;
    const delta = currentY.current - startY.current;
    if (delta > 0 && sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${delta}px)`;
    }
  };

  const handleTouchEnd = () => {
    const delta = currentY.current - startY.current;
    if (sheetRef.current) {
      sheetRef.current.style.transform = "";
    }
    if (delta > 100) {
      closeBottomSheet();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="absolute inset-0 bg-[#0A0A0F]/60 backdrop-blur-[4px] transition-opacity duration-default"
        onClick={closeBottomSheet}
        aria-hidden
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal
        aria-label={title ?? "Sheet"}
        className={cn(
          "relative z-10 w-full max-w-mobile",
          "rounded-t-[20px] bg-[#13131A]",
          "transition-transform duration-default ease-tally",
          height === "75" ? "h-[75dvh]" : height === "40" ? "h-[40dvh]" : "h-[60dvh]",
          "overflow-hidden flex flex-col",
          "animate-sheet-in"
        )}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex justify-center pt-3">
          <div className="h-1 w-9 rounded-full bg-[#ffffff1a]" />
        </div>
        {title && (
          <h2 className="px-6 pt-2 text-lg font-semibold text-text-primary">
            {title}
          </h2>
        )}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pb-10 pt-1 safe-bottom">
          {content}
        </div>
      </div>
    </div>
  );
}

interface BottomSheetTriggerProps {
  children: ReactNode;
  content: ReactNode;
  title?: string;
}

export function BottomSheetTrigger({
  children,
  content,
  title,
  height,
}: BottomSheetTriggerProps & { height?: "40" | "60" | "75" }) {
  const openBottomSheet = useOpenBottomSheet();

  return (
    <div
      onClick={() => openBottomSheet(content, { title, height })}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          openBottomSheet(content, { title, height });
        }
      }}
      role="button"
      tabIndex={0}
    >
      {children}
    </div>
  );
}
