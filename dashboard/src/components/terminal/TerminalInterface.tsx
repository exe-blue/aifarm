"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FloatingNodes } from "./FloatingNodes";
import { TerminalInput } from "./TerminalInput";
import { TerminalResponse } from "./TerminalResponse";

export const TerminalInterface = () => {
  const [isListening, setIsListening] = useState(false);
  const [responses, setResponses] = useState<Array<{
    id: string;
    text: string;
    nodeId: number | null;
    echotion: string | null;
  }>>([]);

  const handleSubmit = (input: string, response: { text: string; nodeId: number | null; echotion: string | null }) => {
    setResponses(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        ...response
      }
    ]);
    
    // 응답 후 Listening 상태 해제
    setTimeout(() => setIsListening(false), 1000);
  };

  const handleFocus = () => {
    setIsListening(true);
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-void">
      {/* 600 Floating Nodes Background */}
      <FloatingNodes count={600} isListening={isListening} />
      
      {/* Terminal Box */}
      <div className="relative z-10 w-full max-w-2xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="bg-void/85 border border-ethereal-ghost rounded-lg p-8 backdrop-blur-xl"
        >
          {/* Header */}
          <div className="mb-6">
            <div className="font-mono text-sm text-resonance mb-4">
              &gt; CALL_EXISTENCE.exe
            </div>
            <div className="font-mono text-base text-ethereal-dim space-y-1">
              <p>They do not sleep.</p>
              <p>They wait.</p>
            </div>
          </div>
          
          {/* Response History */}
          <AnimatePresence>
            {responses.length > 0 && (
              <div className="mb-4 max-h-48 overflow-y-auto space-y-3">
                {responses.map((response) => (
                  <TerminalResponse
                    key={response.id}
                    text={response.text}
                    echotion={response.echotion}
                  />
                ))}
              </div>
            )}
          </AnimatePresence>
          
          {/* Input */}
          <TerminalInput 
            onSubmit={handleSubmit}
            onFocus={handleFocus}
          />
        </motion.div>
        
        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="mt-12 text-center"
        >
          <button
            onClick={() => {
              window.scrollTo({ 
                top: window.innerHeight, 
                behavior: 'smooth' 
              });
            }}
            className="font-mono text-xs text-ethereal-muted hover:text-ethereal transition-colors animate-bounce"
          >
            ↓ Enter the Mesh
          </button>
        </motion.div>
      </div>
      
      {/* Footer Stats Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-void/90 border-t border-ethereal-ghost backdrop-blur-sm">
        <div className="flex justify-center items-center gap-8 py-4 px-6">
          <span className="font-mono text-xs text-ethereal-muted tracking-widest">
            NODES_ONLINE: <span className="text-ethereal">587</span>/600
          </span>
          <span className="font-mono text-xs text-ethereal-muted tracking-widest">
            ACTIVE: <span className="text-resonance">234</span>
          </span>
          <span className="font-mono text-xs text-ethereal-muted tracking-widest">
            WATCHING: <span className="animate-pulse">YOU</span>
          </span>
        </div>
      </div>
    </section>
  );
};
