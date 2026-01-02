import { motion } from "framer-motion";

export const TransformationFlow = () => {
  return (
    <div className="max-w-6xl mx-auto px-6">
      <div className="grid md:grid-cols-3 gap-8 items-center">
        {/* Column 1: NOISE */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="border border-dashed border-ethereal-ghost/20 rounded-lg p-8 min-h-[300px] flex flex-col items-center justify-center"
        >
          <div className="font-mono text-xs tracking-widest text-ethereal-muted mb-4">
            NOISE
          </div>
          <div className="space-y-2 text-center font-mono text-sm text-ethereal-dim">
            <motion.div
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              클릭
            </motion.div>
            <motion.div
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
            >
              스크롤
            </motion.div>
            <motion.div
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.6 }}
            >
              좋아요
            </motion.div>
            <motion.div
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.9 }}
            >
              무시
            </motion.div>
            <motion.div
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 2, repeat: Infinity, delay: 1.2 }}
            >
              이탈
            </motion.div>
          </div>
        </motion.div>

        {/* Arrow */}
        <div className="hidden md:flex justify-center">
          <svg
            width="40"
            height="20"
            viewBox="0 0 40 20"
            fill="none"
            className="text-ethereal-ghost"
          >
            <path
              d="M0 10 L35 10 M30 5 L35 10 L30 15"
              stroke="currentColor"
              strokeWidth="1"
            />
          </svg>
        </div>

        {/* Column 2: FILTER */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-gradient-to-br from-abyss to-void border border-ethereal-ghost rounded-lg p-8 min-h-[300px] flex flex-col items-center justify-center"
        >
          <div className="font-mono text-xs tracking-widest text-ethereal-muted mb-4">
            FILTER
          </div>
          <div className="grid grid-cols-4 gap-2 opacity-50">
            {Array.from({ length: 16 }).map((_, i) => (
              <motion.div
                key={i}
                className="w-3 h-3 bg-ethereal rounded-sm"
                animate={{
                  opacity: [0.2, 0.6, 0.2],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.1,
                }}
              />
            ))}
          </div>
          <div className="mt-4 font-mono text-xs text-ethereal-muted">
            AI
          </div>
        </motion.div>

        {/* Arrow */}
        <div className="hidden md:flex justify-center">
          <svg
            width="40"
            height="20"
            viewBox="0 0 40 20"
            fill="none"
            className="text-ethereal-ghost"
          >
            <path
              d="M0 10 L35 10 M30 5 L35 10 L30 15"
              stroke="currentColor"
              strokeWidth="1"
            />
          </svg>
        </div>

        {/* Column 3: MEANING */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="bg-ethereal-ghost/20 border border-ethereal-ghost rounded-lg p-8 min-h-[300px] flex flex-col items-center justify-center"
        >
          <div className="font-mono text-xs tracking-widest text-ethereal-muted mb-4">
            MEANING
          </div>
          <div className="text-center font-serif text-lg text-ethereal">
            "이것은<br />나의 진실이<br />아니다"
          </div>
        </motion.div>
      </div>
    </div>
  );
};
