"use client";
import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

export const BackgroundBeams = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const beams: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      alpha: number;
    }> = [];

    for (let i = 0; i < 50; i++) {
      beams.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        alpha: Math.random() * 0.5,
      });
    }

    const animate = () => {
      ctx.fillStyle = "rgba(5, 5, 5, 0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      beams.forEach((beam) => {
        beam.x += beam.vx;
        beam.y += beam.vy;

        if (beam.x < 0 || beam.x > canvas.width) beam.vx *= -1;
        if (beam.y < 0 || beam.y > canvas.height) beam.vy *= -1;

        ctx.fillStyle = `rgba(16, 185, 129, ${beam.alpha})`;
        ctx.fillRect(beam.x, beam.y, 2, 2);
      });

      requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-0 pointer-events-none"
    />
  );
};
