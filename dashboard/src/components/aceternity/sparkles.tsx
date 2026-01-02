"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export const Sparkles = ({
  className,
  count = 50,
}: {
  className?: string;
  count?: number;
}) => {
  const [sparkles, setSparkles] = useState<Array<{
    id: number;
    x: number;
    y: number;
    size: number;
    duration: number;
  }>>([]);

  useEffect(() => {
    const newSparkles = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 2 + 1,
    }));
    setSparkles(newSparkles);
  }, [count]);

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
