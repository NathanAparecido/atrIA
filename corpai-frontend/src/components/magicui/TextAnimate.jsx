import React from "react";
import { motion } from "framer-motion";

export function TextAnimate({ children, animation = "blurInUp", by = "character", once = true, className = "", delayOffset = 0 }) {
  const text = typeof children === "string" ? children.split("") : [];
  
  const defaultContainer = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: delayOffset,
      },
    },
  };

  const defaultItem = {
    hidden: { opacity: 0, y: 20, filter: "blur(10px)" },
    show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.6, ease: "easeOut" } },
  };

  return (
    <motion.span
      variants={defaultContainer}
      initial="hidden"
      whileInView="show"
      viewport={{ once }}
      className={`inline-block ${className}`}
    >
      {text.map((char, i) => (
        <motion.span key={i} variants={defaultItem} className="inline-block">
          {char === " " ? "\u00A0" : char}
        </motion.span>
      ))}
    </motion.span>
  );
}
