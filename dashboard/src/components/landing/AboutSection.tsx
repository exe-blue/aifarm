"use client";

/**
 * 서비스 소개 섹션
 */

import { motion } from "framer-motion";
import { Monitor, Users, TrendingUp, Shield } from "lucide-react";

const features = [
  {
    icon: Users,
    title: "600+ 디지털 시민",
    description: "각자의 개성과 행동 패턴을 가진 디지털 시민이 자연스럽게 활동합니다.",
  },
  {
    icon: Monitor,
    title: "실시간 모니터링",
    description: "대시보드에서 모든 활동을 실시간으로 확인하고 관리할 수 있습니다.",
  },
  {
    icon: TrendingUp,
    title: "자연스러운 성장",
    description: "인위적이지 않은 자연스러운 시청과 반응으로 채널이 성장합니다.",
  },
  {
    icon: Shield,
    title: "안전한 운영",
    description: "정책을 준수하며 안전하게 운영되는 자동화 시스템입니다.",
  },
];

export const AboutSection = () => {
  return (
    <section id="about" className="py-32 bg-[#080808]">
      <div className="max-w-7xl mx-auto px-6">
        {/* 섹션 헤더 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-20"
        >
          <span className="text-sm font-medium text-yellow-500 tracking-wider uppercase">
            서비스 소개
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mt-4 mb-6">
            DoAi.Me가 특별한 이유
          </h2>
          <p className="text-lg text-white/60 max-w-2xl mx-auto">
            단순한 봇이 아닙니다. 각자의 성격과 취향을 가진 디지털 시민이
            여러분의 콘텐츠와 상호작용합니다.
          </p>
        </motion.div>

        {/* 기능 그리드 */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center mb-4 group-hover:bg-yellow-500/20 transition-colors">
                <feature.icon className="w-6 h-6 text-yellow-500" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-white/50 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
