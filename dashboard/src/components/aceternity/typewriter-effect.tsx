"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export const TypewriterEffect = ({
  words,
  className,
  cursorClassName,
}: {
  words: string[];
  className?: string;
  cursorClassName?: string;
}) => {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentText, setCurrentText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const word = words[currentWordIndex];
    const timeout = setTimeout(
      () => {
        if (!isDeleting && currentText === word) {
          setTimeout(() => setIsDeleting(true), 1000);
        } else if (isDeleting && currentText === "") {
          setIsDeleting(false);
          setCurrentWordIndex((prev) => (prev + 1) % words.length);
        } else {
          setCurrentText(
            isDeleting
              ? word.substring(0, currentText.length - 1)
              : word.substring(0, currentText.length + 1)
          );
        }
      },
      isDeleting ? 50 : 100
    );

    return () => clearTimeout(timeout);
  }, [currentText, isDeleting, currentWordIndex, words]);

  return (
    <div className={className}>
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="inline-block"
      >
        {currentText}
        <span className={cursorClassName || "animate-pulse"}>|</span>
      </motion.span>
    </div>
  );
};
