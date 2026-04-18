import React, { useMemo } from 'react';
import { motion } from 'motion/react';

interface ErgodicTextRendererProps {
  text: string;
  status: string;
}

export default function ErgodicTextRenderer({ text, status }: ErgodicTextRendererProps) {
  const isPanic = status.toLowerCase().includes('panic') || status.toLowerCase().includes('terror');
  const isExhausted = status.toLowerCase().includes('exhaustion') || status.toLowerCase().includes('tired');

  // Memoize processed text to prevent random shifts on re-renders (e.g. when typing in input)
  const processedText = useMemo(() => {
    let result = text;
    if (isPanic) {
      const paragraphs = text.split('\n\n');
      result = paragraphs.map((p, i) => {
        // 30% chance to add extra breaks
        if (Math.random() > 0.7 && i < paragraphs.length - 1) {
          return p + '\n\n\n\n';
        }
        return p;
      }).join('\n\n');
    }
    return result;
  }, [text, isPanic]);

  const containerClasses = `text-sm leading-relaxed whitespace-pre-wrap transition-colors duration-1000 ${
    isExhausted ? 'text-zinc-400' : 'text-zinc-100'
  }`;

  return (
    <motion.div 
      key={text}
      initial={{ opacity: 0, scale: 0.99 }}
      animate={{ 
        opacity: 1,
        scale: 1,
        x: isPanic ? [0, -4, 4, -4, 4, -2, 2, 0] : 0,
        filter: isPanic ? ['blur(4px)', 'blur(2px)', 'blur(0px)'] : 'blur(0px)',
        backgroundColor: isPanic ? ['rgba(220, 38, 38, 0)', 'rgba(220, 38, 38, 0.05)', 'rgba(220, 38, 38, 0)'] : 'rgba(0,0,0,0)'
      }}
      transition={{ 
        x: isPanic ? { duration: 0.8, times: [0, 0.1, 0.2, 0.3, 0.4, 0.6, 0.8, 1] } : { duration: 0.5 },
        filter: { duration: 3, ease: "easeOut" },
        backgroundColor: { duration: 2 },
        opacity: { duration: 1 },
        scale: { duration: 0.5 }
      }}
      className={containerClasses}
    >
      {processedText}
    </motion.div>
  );
}
