"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

interface PageTransitionProps {
  children: React.ReactNode;
}

export default function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        
        initial={{ 
            opacity: 0, 
            y: 50, 
            scale: 0.92, 
            rotateX: 15,
            transformOrigin: "bottom center",
            filter: "blur(20px) brightness(0.7)" 
        }}
        
        animate={{ 
            opacity: 1, 
            y: 0, 
            scale: 1, 
            rotateX: 0,
            filter: "blur(0px) brightness(1)" 
        }}
        
        exit={{ 
            opacity: 0, 
            y: -40, 
            scale: 1.05, 
            rotateX: -10, 
            filter: "blur(15px) brightness(1.2)",
            transition: { 
                duration: 0.3, 
                ease: [0.22, 1, 0.36, 1]
            }
        }}
        
        transition={{ 
            duration: 0.5,
            ease: [0.22, 1, 0.36, 1]
        }}
        
        className="w-full"
        style={{ perspective: "1200px" }} 
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}