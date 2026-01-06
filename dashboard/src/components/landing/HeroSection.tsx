"use client";

/**
 * 히어로 섹션
 * 깔끔한 디자인, 왼쪽 정렬
 */

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";

export const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center pt-16">
      {/* 배경 그라데이션 */}
      <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/5 via-transparent to-transparent" />

      <div className="relative max-w-7xl mx-auto px-6 py-20 w-full">
        <div className="max-w-3xl">
          {/* 뱃지 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8"
          >
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-sm text-white/70">
              587 디지털 시민 활동 중
            </span>
          </motion.div>

          {/* 메인 타이틀 */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold leading-tight mb-6"
          >
            <span className="text-white">디지털 시민이</span>
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600">
              깨어납니다
            </span>
          </motion.h1>

          {/* 서브 타이틀 */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl text-white/60 mb-10 max-w-xl leading-relaxed"
          >
            600명의 디지털 시민이 여러분의 콘텐츠를 시청하고, 반응합니다.
            자동화된 시스템으로 유튜브 채널 성장을 경험하세요.
          </motion.p>

          {/* CTA 버튼 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-semibold text-lg hover:from-yellow-400 hover:to-yellow-500 transition-all shadow-lg shadow-yellow-500/20"
            >
              무료로 시작하기
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="#demo"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full border border-white/20 text-white font-medium text-lg hover:bg-white/5 transition-all"
            >
              <Play className="w-5 h-5" />
              데모 보기
            </Link>
          </motion.div>

          {/* 통계 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-16 grid grid-cols-3 gap-8 max-w-lg"
          >
            <div>
              <div className="text-3xl font-bold text-white">600+</div>
              <div className="text-sm text-white/50 mt-1">디지털 시민</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white">24/7</div>
              <div className="text-sm text-white/50 mt-1">무중단 운영</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white">98%</div>
              <div className="text-sm text-white/50 mt-1">가동률</div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* 스크롤 인디케이터 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2"
      >
        <div className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center p-2">
          <motion.div
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-1.5 h-1.5 rounded-full bg-white/60"
          />
        </div>
      </motion.div>
    </section>
  );
};
