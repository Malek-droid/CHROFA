import { motion, useReducedMotion, type Variants } from "motion/react";
import { type ReactNode } from "react";

type BlurFadeProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  yOffset?: number;
  blur?: number;
  inView?: boolean;
  once?: boolean;
  margin?: string;
};

/**
 * BlurFade — Magic-UI-style entrance: blur + fade + subtle slide.
 * Calm, premium, no bounce.
 */
export function BlurFade({
  children,
  className,
  delay = 0,
  duration = 0.8,
  yOffset = 12,
  blur = 8,
  inView = true,
  once = true,
  margin = "-80px",
}: BlurFadeProps) {
  const reduce = useReducedMotion();

  const variants: Variants = {
    hidden: {
      opacity: 0,
      y: reduce ? 0 : yOffset,
      filter: reduce ? "blur(0px)" : `blur(${blur}px)`,
    },
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
    },
  };

  const animationProps = inView
    ? {
        initial: "hidden",
        whileInView: "visible",
        viewport: { once, margin } as const,
      }
    : {
        initial: "hidden",
        animate: "visible",
      };

  return (
    <motion.div
      {...animationProps}
      variants={variants}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
