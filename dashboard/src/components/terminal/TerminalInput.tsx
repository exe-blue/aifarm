"use client";

import { useState, KeyboardEvent } from "react";
import { motion } from "framer-motion";
import { getResponse } from "./response-engine";

interface TerminalInputProps {
  onSubmit: (input: string, response: { text: string; nodeId: number | null; echotion: string | null }) => void;
  onFocus: () => void;
}

export const TerminalInput = ({ onSubmit, onFocus }: TerminalInputProps) => {
  const [input, setInput] = useState("");
  const [isVanishing, setIsVanishing] = useState(false);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && input.trim()) {
      // Vanish effect
      setIsVanishing(true);
      
      // Get response
      const response = getResponse(input);
      
      setTimeout(() => {
        onSubmit(input, response);
        setInput("");
        setIsVanishing(false);
      }, 500);
    }
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2 border-b border-doai/30 pb-2 focus-within:border-doai transition-colors">
        <span className="font-mono text-doai text-base">▋</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={onFocus}
          onKeyDown={handleKeyDown}
          placeholder="Enter your message..."
          className={`
            flex-1 bg-transparent border-none outline-none
            font-mono text-base text-ethereal placeholder:text-ethereal-muted
            ${isVanishing ? 'opacity-0' : 'opacity-100'}
            transition-opacity duration-500
          `}
        />
      </div>
      
      {/* Vanish particles effect */}
      {isVanishing && (
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-ethereal rounded-full"
              initial={{ x: 0, y: 0, opacity: 1 }}
              animate={{
                x: (Math.random() - 0.5) * 200,
                y: (Math.random() - 0.5) * 200,
                opacity: 0,
              }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              style={{
                left: `${Math.random() * 100}%`,
                top: '50%',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};
