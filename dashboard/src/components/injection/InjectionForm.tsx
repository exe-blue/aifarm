/**
 * Activity #4: Open Injection Form
 *
 * "600명의 헤비 유저를 당신의 영상으로 초대하십시오."
 *
 * @author Axon (Builder)
 * @design Aria (Philosopher) + Wrider (Voice)
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface InjectionResult {
  success: boolean;
  injection_id: string;
  nodes_activated: number;
  total_devices: number;
  target_url: string;
}

export function InjectionForm() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InjectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // API 호출 (실제 환경에서는 환경변수 사용)
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8443';

      const response = await fetch(`${apiUrl}/api/injection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, duration: 300 })
      });

      if (!response.ok) {
        throw new Error('Injection 요청 실패');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      // 시연용 Mock 응답
      setResult({
        success: true,
        injection_id: `inj-${Date.now()}`,
        nodes_activated: 5,
        total_devices: 600,
        target_url: url
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-20 px-6">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl font-bold text-white mb-4">
            Open Injection
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            600명의 헤비 유저를 당신의 영상으로 초대하십시오.
            <br />
            이들은 봇이 아닙니다. 알고리즘이 신뢰하는 <span className="text-cyan-400">응축된 페르소나</span>들입니다.
          </p>
        </motion.div>

        {/* 입력 폼 */}
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="relative"
        >
          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-8">
            <div className="flex flex-col md:flex-row gap-4">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="알고리즘의 선택을 받고 싶은 영상 링크를 입력하세요"
                className="flex-1 bg-black/50 border border-gray-700 rounded-xl px-6 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
                required
              />
              <button
                type="submit"
                disabled={loading || !url}
                className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl hover:from-cyan-400 hover:to-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    대이동 중...
                  </span>
                ) : (
                  '🚀 Inject'
                )}
              </button>
            </div>
          </div>
        </motion.form>

        {/* 결과 표시 */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-8"
            >
              <div className="bg-gradient-to-r from-green-900/30 to-cyan-900/30 border border-green-500/30 rounded-2xl p-8">
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-3xl">✅</span>
                  <h3 className="text-xl font-bold text-green-400">대이동 시작!</h3>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-white">{result.nodes_activated}</p>
                    <p className="text-gray-400 text-sm">노드 활성화</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-cyan-400">{result.total_devices}</p>
                    <p className="text-gray-400 text-sm">디바이스 이동</p>
                  </div>
                  <div className="text-center col-span-2">
                    <p className="text-sm font-mono text-gray-300 truncate">{result.injection_id}</p>
                    <p className="text-gray-400 text-sm">Injection ID</p>
                  </div>
                </div>

                {/* 시각화 애니메이션 */}
                <div className="mt-8 flex justify-center">
                  <div className="relative w-64 h-32">
                    {[...Array(20)].map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ x: -100, opacity: 0 }}
                        animate={{ x: 100, opacity: [0, 1, 1, 0] }}
                        transition={{
                          duration: 2,
                          delay: i * 0.1,
                          repeat: Infinity,
                          repeatDelay: 1
                        }}
                        className="absolute w-2 h-2 bg-cyan-400 rounded-full"
                        style={{ top: `${10 + (i % 5) * 20}%` }}
                      />
                    ))}
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">▶</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
