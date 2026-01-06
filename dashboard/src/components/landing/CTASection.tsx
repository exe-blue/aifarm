"use client";

/**
 * CTA (Call to Action) 섹션
 */

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const CTASection = () => {
  return (
    <section className="py-32 bg-[#080808]">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative rounded-3xl overflow-hidden"
        >
          {/* 배경 그라데이션 */}
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/20 via-yellow-600/10 to-transparent" />
          <div className="absolute inset-0 bg-[#0a0a0a]" />

          <div className="relative p-12 md:p-20 text-center">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
              지금 바로 시작하세요
            </h2>
            <p className="text-lg text-white/60 max-w-xl mx-auto mb-10">
              무료로 시작하고 디지털 시민과 함께 채널을 성장시키세요.
              신용카드 없이 바로 시작할 수 있습니다.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-semibold text-lg hover:from-yellow-400 hover:to-yellow-500 transition-all shadow-lg shadow-yellow-500/20"
              >
                무료로 가입하기
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full border border-white/20 text-white font-medium text-lg hover:bg-white/5 transition-all"
              >
                문의하기
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
