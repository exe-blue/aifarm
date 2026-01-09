"use client";
import { useMemo } from "react";
import { motion } from "framer-motion";

// 시드 기반 의사 난수 생성기 (결정론적)
const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

export const Sparkles = ({
  className,
  count = 50,
}: {
  className?: string;
  count?: number;
}) => {
  // useMemo로 초기 렌더링 시에만 생성
  const sparkles = useMemo(() => 
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: seededRandom(i * 1.1) * 100,
      y: seededRandom(i * 2.3) * 100,
      size: seededRandom(i * 3.7) * 3 + 1,
      duration: seededRandom(i * 5.11) * 2 + 1,
    })),
    [count]
  );

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      {sparkles.map((sparkle) => (
        <motion.div
          key={sparkle.id}
          className="absolute rounded-full bg-emerald-500"
          style={{
            left: `${sparkle.x}%`,
            top: `${sparkle.y}%`,
            width: sparkle.size,
            height: sparkle.size,
          }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1, 0],
          }}
          transition={{
            duration: sparkle.duration,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};
