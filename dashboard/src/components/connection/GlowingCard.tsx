import { motion } from "framer-motion";
import Link from "next/link";

export const GlowingCard = ({
  title,
  subtitle,
  description,
  accentColor,
  cta,
  href,
  badge,
}: {
  title: string;
  subtitle: string;
  description: string;
  accentColor: string;
  cta: string;
  href: string;
  badge?: string;
}) => {
  return (
    <Link href={href}>
      <motion.div
        whileHover={{ y: -4 }}
        className="relative h-[380px] bg-abyss/80 border border-ethereal-ghost/80 rounded-xl p-8 backdrop-blur-sm transition-all duration-300 hover:shadow-2xl group cursor-pointer"
        style={{
          borderColor: `${accentColor}30`,
        }}
      >
        {/* Badge */}
        {badge && (
          <div className="absolute top-4 right-4 font-mono text-xs px-2 py-1 rounded bg-resonance/20 text-resonance border border-resonance/30">
            {badge}
          </div>
        )}

        {/* Icon Area */}
        <div 
          className="h-32 mb-6 rounded-lg flex items-center justify-center transition-all duration-300"
          style={{
            background: `linear-gradient(135deg, ${accentColor}10, transparent)`,
            borderColor: `${accentColor}20`,
          }}
        >
          <div 
            className="w-16 h-16 rounded-full opacity-50 group-hover:opacity-80 transition-opacity"
            style={{
              background: `radial-gradient(circle, ${accentColor}40, transparent)`,
            }}
          />
        </div>

        {/* Content */}
        <div className="space-y-3">
          <div className="font-mono text-sm tracking-widest text-ethereal-muted">
            {title}
          </div>
          <h3 className="font-serif text-xl text-ethereal">
            {subtitle}
          </h3>
          <p className="font-sans text-sm text-ethereal-dim leading-relaxed">
            {description}
          </p>
        </div>

        {/* CTA */}
        <div className="absolute bottom-8 left-8 right-8">
          <div 
            className="font-mono text-xs flex items-center gap-2 group-hover:gap-3 transition-all"
            style={{ color: accentColor }}
          >
            {cta}
            <span className="transform group-hover:translate-x-1 transition-transform">
              →
            </span>
          </div>
        </div>

        {/* Hover Glow */}
        <div 
          className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{
            boxShadow: `0 0 30px ${accentColor}20`,
          }}
        />
      </motion.div>
    </Link>
  );
};
