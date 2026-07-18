import { motion } from "motion/react";
import { type ReactNode, Children } from "react";
import { cn } from "@/lib/utils";

type MarqueeProps = {
  children: ReactNode;
  className?: string;
  /** seconds for a full loop */
  duration?: number;
  /** gap between items in px */
  gap?: number;
  reverse?: boolean;
  pauseOnHover?: boolean;
};

/**
 * Marquee — seamless, continuous horizontal scroll.
 * Renders the children twice and animates 0 → -50%, so the loop point is
 * invisible regardless of the total content width.
 */
export function Marquee({
  children,
  className,
  duration = 40,
  gap = 64,
  reverse = false,
  pauseOnHover = false,
}: MarqueeProps) {
  const items = Children.toArray(children);

  return (
    <div className={cn("group flex w-full overflow-hidden", className)}>
      <motion.div
        className="flex w-max shrink-0 flex-nowrap"
        style={{ gap }}
        animate={{ x: reverse ? ["-50%", "0%"] : ["0%", "-50%"] }}
        transition={{ duration, ease: "linear", repeat: Infinity }}
        {...(pauseOnHover
          ? {
              whileHover: { animationPlayState: "paused" },
            }
          : {})}
      >
        {[...items, ...items].map((child, i) => (
          <div key={i} className="shrink-0" style={{ marginRight: 0 }}>
            {child}
          </div>
        ))}
      </motion.div>
    </div>
  );
}
