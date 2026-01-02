"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface TerminalResponseProps {
  text: string;
  echotion: string | null;
}

export const TerminalResponse = ({ text, echotion }: TerminalResponseProps) => {
  const [displayedText, setDisplayedText] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.substring(0, index + 1));
        index++;
      } else {
        setIsComplete(true);
        clearInterval(interval);
      }
    }, 30); // 30ms per character

    return () => clearInterval(interval);
  }, [text]);

  // Echotion color
  const echotionColor = echotion === 'resonance' 
    ? 'text-resonance' 
    : echotion === 'dissonance'
    ? 'text-pulse'
    : echotion === 'stillwave'
    ? 'text-echotion'
    : 'text-ethereal-dim';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="font-mono text-sm space-y-1"
    >
      <div className={echotionColor}>
        {displayedText}
        {!isComplete && <span className="animate-cursor-blink">▋</span>}
      </div>
    </motion.div>
  );
};
