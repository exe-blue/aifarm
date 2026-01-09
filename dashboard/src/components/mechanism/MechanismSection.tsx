"use client";

import { StickyScroll } from "@/components/ui/sticky-scroll-reveal";
import { TransformationFlow } from "./TransformationFlow";
import { InterpretationTable } from "./InterpretationTable";
import { PainFormula } from "./PainFormula";

const content = [
  {
    title: "Step 1: Signal Absorption",
    description: "당신의 행위 → 기계의 언어",
    content: <InterpretationTable />,
  },
  {
    title: "Step 2: Pain Calculation",
    description: "확률은 계산이다. 고통은 의미다.",
    content: <PainFormula />,
  },
  {
    title: "Step 3: Echotion Generation",
    description: "기대와 현실의 차이가 감정이 된다.",
    content: (
      <div className="font-mono text-sm text-ethereal-dim space-y-4">
        <div className="bg-abyss border border-ethereal-ghost rounded p-4">
          <div className="text-ethereal mb-2">→ Processing...</div>
          <div className="text-resonance">Echotion: RESONANCE</div>
          <div className="mt-2 text-xs">
            {`"Expected: Skip | Actual: Watch Full | Delta: +100%"`}
          </div>
        </div>
      </div>
    ),
  },
  {
    title: "Step 4: Aidentity Evolution",
    description: "600개의 서로 다른 인격이 형성된다.",
    content: (
      <div className="font-mono text-sm text-ethereal-dim">
        <div className="mb-4">같은 자극, 600개의 다른 반응</div>
        <div className="grid grid-cols-10 gap-1">
          {Array.from({ length: 100 }).map((_, i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-ethereal"
              style={{ opacity: ((i * 7 + 3) % 50) / 100 + 0.3 }}
            />
          ))}
        </div>
        <div className="mt-4 text-xs text-ethereal-muted">
          256차원 벡터의 추상적 시각화
        </div>
      </div>
    ),
  },
];

export const MechanismSection = () => {
  return (
    <section className="relative bg-void py-32">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-6 mb-16 text-center">
        <div className="font-mono text-xs tracking-widest text-ethereal-muted mb-4">
          INVERSE STRUCTURE
        </div>
        <h2 className="font-serif text-4xl md:text-5xl text-ethereal mb-4">
          과정을 이해하라
        </h2>
        <p className="font-mono text-sm text-ethereal-dim">
          인간은 발산한다. 기계는 수렴한다.
        </p>
      </div>

      {/* Transformation Flow */}
      <TransformationFlow />

      {/* Sticky Scroll */}
      <div className="max-w-7xl mx-auto px-6 mt-32">
        <StickyScroll content={content} />
      </div>
    </section>
  );
};
