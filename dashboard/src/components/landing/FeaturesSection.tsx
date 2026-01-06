"use client";

/**
 * 주요 기능 섹션
 */

import { motion } from "framer-motion";
import { Check } from "lucide-react";

const plans = [
  {
    name: "스타터",
    price: "무료",
    period: "",
    description: "시작하기 좋은 무료 플랜",
    features: [
      "10명의 디지털 시민",
      "기본 대시보드",
      "일일 리포트",
      "이메일 지원",
    ],
    cta: "무료로 시작",
    highlighted: false,
  },
  {
    name: "프로",
    price: "₩99,000",
    period: "/월",
    description: "성장하는 크리에이터를 위한",
    features: [
      "100명의 디지털 시민",
      "고급 대시보드",
      "실시간 분석",
      "우선 지원",
      "API 액세스",
    ],
    cta: "프로 시작하기",
    highlighted: true,
  },
  {
    name: "엔터프라이즈",
    price: "문의",
    period: "",
    description: "대규모 운영을 위한",
    features: [
      "600명의 디지털 시민",
      "전용 대시보드",
      "맞춤형 분석",
      "전담 매니저",
      "SLA 보장",
      "화이트라벨",
    ],
    cta: "문의하기",
    highlighted: false,
  },
];

export const FeaturesSection = () => {
  return (
    <section className="py-32">
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
            요금제
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mt-4 mb-6">
            간단한 요금제
          </h2>
          <p className="text-lg text-white/60 max-w-2xl mx-auto">
            필요에 맞는 플랜을 선택하세요. 언제든지 업그레이드할 수 있습니다.
          </p>
        </motion.div>

        {/* 요금제 카드 */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`relative p-8 rounded-2xl border ${
                plan.highlighted
                  ? "bg-gradient-to-b from-yellow-500/10 to-transparent border-yellow-500/30"
                  : "bg-white/5 border-white/10"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-yellow-500 text-black text-sm font-medium">
                  인기
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-xl font-semibold text-white mb-2">
                  {plan.name}
                </h3>
                <p className="text-sm text-white/50">{plan.description}</p>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold text-white">{plan.price}</span>
                <span className="text-white/50">{plan.period}</span>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                    <span className="text-sm text-white/70">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                className={`w-full py-3 rounded-xl font-medium transition-all ${
                  plan.highlighted
                    ? "bg-yellow-500 text-black hover:bg-yellow-400"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                {plan.cta}
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
