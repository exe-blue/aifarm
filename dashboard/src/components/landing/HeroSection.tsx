'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { AnimatedNumber } from '@/components/common/AnimatedNumber';
import { Button } from '@/components/ui/button';
import { ArrowRight, Play, Bot, Smartphone, Video, X } from 'lucide-react';
import Link from 'next/link';

export function HeroSection() {
  const [isDemoOpen, setIsDemoOpen] = useState(false);
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#0a0a0f]">
      {/* Subtle Background Gradient */}
      <div className="hero-glow absolute inset-0" />
      <div className="absolute inset-0 grid-pattern-subtle opacity-20" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <div className="text-center">
          {/* Status Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#1f1f2e] bg-[#12121a] mb-8"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
            </span>
            <span className="text-[#a0a0b0] text-sm font-medium">◉ System Online</span>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 text-white"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            YouTube Intelligence
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">
              on Autopilot.
            </span>
          </motion.h1>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-[#a0a0b0] mb-12 max-w-2xl mx-auto leading-relaxed"
          >
            AI 에이전트가 트렌드를 추적하고, 콘텐츠를 분석하며,
            채널 성장을 자동화합니다.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-wrap justify-center gap-4 mb-16"
          >
            <Link href="/login">
              <Button
                size="lg"
                className="btn-primary text-lg px-8 py-6"
              >
                로그인하고 시작하기
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="btn-secondary text-lg px-8 py-6"
              onClick={() => setIsDemoOpen(true)}
              aria-label="Watch Demo Video"
            >
              <Play className="mr-2 w-5 h-5" />
              Watch Demo
            </Button>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto"
          >
            <StatItem icon={<Smartphone className="w-5 h-5" />} value={0} label="Devices" />
            <StatItem icon={<Bot className="w-5 h-5" />} value={0} label="Agents" />
            <StatItem icon={<Video className="w-5 h-5" />} value={0} label="Channels" />
          </motion.div>
        </div>
      </div>

      {/* Bottom Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0a0a0f] to-transparent" />

      {/* Demo Modal */}
      {isDemoOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setIsDemoOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="relative w-full max-w-4xl mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsDemoOpen(false)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
              aria-label="Close demo video"
            >
              <X className="w-8 h-8" />
            </button>
            <div className="bg-[#12121a] rounded-lg border border-[#1f1f2e] p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-600/20 flex items-center justify-center">
                <Play className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Demo Coming Soon</h3>
              <p className="text-[#a0a0b0] mb-6">
                데모 영상이 곧 준비됩니다. 지금 로그인하여 AI Farm을 직접 체험해 보세요.
              </p>
              <Link href="/login">
                <Button className="btn-primary">
                  로그인하고 시작하기
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      )}
    </section>
  );
}

function StatItem({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-3">
        <div className="text-purple-400">{icon}</div>
        <span className="text-4xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
          <AnimatedNumber value={value} duration={1500} />
        </span>
      </div>
      <span className="text-sm text-[#606070] uppercase tracking-wider">{label}</span>
    </div>
  );
}