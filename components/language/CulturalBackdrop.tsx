"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { CSSProperties } from "react";
import { getTargetLanguage } from "@/lib/languages";
import type { LanguageCode } from "@/lib/types";

const dots = [
  [14, 32],
  [18, 28],
  [22, 30],
  [26, 36],
  [31, 34],
  [38, 31],
  [43, 35],
  [48, 33],
  [54, 38],
  [59, 36],
  [64, 32],
  [69, 35],
  [73, 41],
  [78, 39],
  [83, 44],
  [27, 49],
  [33, 53],
  [39, 57],
  [46, 55],
  [53, 60],
  [60, 58],
  [66, 54],
  [72, 58],
  [78, 62],
  [21, 65],
  [28, 70],
  [35, 73],
  [44, 69],
  [52, 74],
  [61, 71],
  [70, 75],
  [82, 70]
];

function Motif({ motif }: { motif: ReturnType<typeof getTargetLanguage>["motif"] }) {
  if (motif === "soyombo") {
    return (
      <div className="absolute right-8 top-8 h-40 w-24 opacity-75 sm:right-16 sm:top-12">
        <div className="mx-auto h-8 w-8 rounded-full bg-[var(--motif-gold)]" />
        <div className="mx-auto mt-2 h-0 w-0 border-x-[18px] border-b-[28px] border-x-transparent border-b-[var(--motif-red)]" />
        <div className="mx-auto mt-2 h-16 w-7 rounded-full border-[6px] border-[var(--motif-blue)]" />
        <div className="mx-auto mt-2 h-5 w-20 rounded-full bg-[var(--motif-blue)]" />
      </div>
    );
  }

  if (motif === "mountain") {
    return (
      <div className="absolute right-4 top-12 h-36 w-44 opacity-70 sm:right-12">
        <div className="absolute bottom-0 left-2 h-0 w-0 border-x-[54px] border-b-[96px] border-x-transparent border-b-[var(--motif-blue)]" />
        <div className="absolute bottom-0 right-0 h-0 w-0 border-x-[62px] border-b-[120px] border-x-transparent border-b-[var(--motif-red)]" />
        <div className="absolute bottom-14 right-12 h-0 w-0 border-x-[18px] border-b-[34px] border-x-transparent border-b-[var(--motif-gold)]" />
      </div>
    );
  }

  if (motif === "river") {
    return (
      <div className="absolute right-4 top-16 h-28 w-52 opacity-70 sm:right-16">
        <div className="absolute left-0 top-6 h-12 w-full rounded-[999px] border-y-[10px] border-[var(--motif-blue)]" />
        <div className="absolute left-8 top-12 h-12 w-40 rounded-[999px] border-y-[10px] border-[var(--motif-gold)]" />
      </div>
    );
  }

  if (motif === "silk") {
    return (
      <div className="absolute right-8 top-14 grid h-32 w-32 rotate-45 grid-cols-3 gap-2 opacity-65 sm:right-20">
        {Array.from({ length: 9 }).map((_, index) => (
          <div
            key={index}
            className="rounded-app"
            style={{ background: index % 3 === 0 ? "var(--motif-red)" : index % 3 === 1 ? "var(--motif-blue)" : "var(--motif-gold)" }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="absolute right-6 top-10 grid h-36 w-36 grid-cols-4 gap-2 opacity-60 sm:right-20">
      {Array.from({ length: 16 }).map((_, index) => (
        <div
          key={index}
          className="rounded-full"
          style={{ background: index % 4 === 0 ? "var(--motif-red)" : index % 4 === 1 ? "var(--motif-gold)" : "var(--motif-blue)" }}
        />
      ))}
    </div>
  );
}

export function CulturalBackdrop({ languageCode }: { languageCode: LanguageCode }) {
  const language = getTargetLanguage(languageCode);
  const reducedMotion = useReducedMotion();

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-[20px]"
      style={
        {
          "--motif-blue": language.accent,
          "--motif-red": language.accent2,
          "--motif-gold": "#f2c14e"
        } as CSSProperties
      }
    >
      <div className="motif-grid absolute inset-0 opacity-70" />
      <motion.div
        className="absolute inset-x-4 top-6 h-72 rounded-full blur-3xl"
        style={{
          background: `linear-gradient(90deg, ${language.accent}33, ${language.accent2}22, #f2c14e26)`
        }}
        animate={reducedMotion ? undefined : { x: [0, 12, -8, 0], opacity: [0.8, 1, 0.82, 0.8] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="absolute inset-0">
        {dots.map(([left, top], index) => (
          <motion.span
            key={`${left}-${top}`}
            className="absolute h-1.5 w-1.5 rounded-full bg-ink/25"
            style={{ left: `${left}%`, top: `${top}%` }}
            animate={reducedMotion ? undefined : { scale: [1, 1.8, 1], opacity: [0.22, 0.62, 0.22] }}
            transition={{ duration: 4 + (index % 5), repeat: Infinity, delay: index * 0.08 }}
          />
        ))}
      </div>
      <Motif motif={language.motif} />
    </div>
  );
}
