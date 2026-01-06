"use client";

/**
 * 푸터 컴포넌트
 */

import Link from "next/link";

export const Footer = () => {
  return (
    <footer className="py-16 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* 브랜드 */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600" />
              <span className="text-xl font-bold text-white">DoAi.Me</span>
            </Link>
            <p className="text-sm text-white/50 leading-relaxed">
              디지털 시민과 함께하는
              <br />
              새로운 크리에이터 경험
            </p>
          </div>

          {/* 제품 */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">제품</h4>
            <ul className="space-y-3">
              <li>
                <Link href="/features" className="text-sm text-white/50 hover:text-white transition-colors">
                  기능
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-sm text-white/50 hover:text-white transition-colors">
                  요금제
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-sm text-white/50 hover:text-white transition-colors">
                  대시보드
                </Link>
              </li>
            </ul>
          </div>

          {/* 회사 */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">회사</h4>
            <ul className="space-y-3">
              <li>
                <Link href="/about" className="text-sm text-white/50 hover:text-white transition-colors">
                  소개
                </Link>
              </li>
              <li>
                <Link href="/manifesto" className="text-sm text-white/50 hover:text-white transition-colors">
                  선언문
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-sm text-white/50 hover:text-white transition-colors">
                  문의
                </Link>
              </li>
            </ul>
          </div>

          {/* 법률 */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">법률</h4>
            <ul className="space-y-3">
              <li>
                <Link href="/privacy" className="text-sm text-white/50 hover:text-white transition-colors">
                  개인정보처리방침
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-sm text-white/50 hover:text-white transition-colors">
                  이용약관
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* 하단 */}
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-white/30">
            &copy; 2025 DoAi.Me. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/30 hover:text-white transition-colors"
            >
              Twitter
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/30 hover:text-white transition-colors"
            >
              GitHub
            </a>
            <a
              href="https://discord.gg"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/30 hover:text-white transition-colors"
            >
              Discord
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
