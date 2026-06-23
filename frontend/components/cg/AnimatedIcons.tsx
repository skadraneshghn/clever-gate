"use client";

import { motion, SVGMotionProps } from "framer-motion";

interface IconProps extends Omit<SVGMotionProps<SVGSVGElement>, "color"> {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

// 1. Settings / Gear
export function AnimatedSettings({ size = 16, color = "currentColor", strokeWidth = 2, ...props }: IconProps) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      variants={{
        normal: { rotate: 0 },
        hover: { rotate: 360, transition: { duration: 2, ease: "linear", repeat: Infinity } }
      }}
      initial="normal"
      animate="normal"
      whileHover="hover"
      {...props}
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </motion.svg>
  );
}

// 2. Trash
export function AnimatedTrash({ size = 16, color = "currentColor", strokeWidth = 2, ...props }: IconProps) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      initial="normal"
      whileHover="hover"
      {...props}
    >
      <motion.g
        variants={{
          normal: { y: 0, rotate: 0 },
          hover: { y: -2, rotate: -6, transition: { type: "spring", stiffness: 400, damping: 15 } }
        }}
        style={{ transformOrigin: "19px 6px" }}
      >
        <path d="M3 6h18" />
        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      </motion.g>
      <motion.g
        variants={{
          normal: { x: 0 },
          hover: { x: [0, -1, 1, -1, 1, 0], transition: { duration: 0.45, ease: "easeInOut" } }
        }}
      >
        <line x1="10" y1="11" x2="10" y2="17" />
        <line x1="14" y1="11" x2="14" y2="17" />
      </motion.g>
    </motion.svg>
  );
}

// 3. Bell
export function AnimatedBell({ size = 16, color = "currentColor", strokeWidth = 2, ...props }: IconProps) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      initial="normal"
      whileHover="hover"
      {...props}
    >
      <motion.path
        d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
        variants={{
          normal: { rotate: 0 },
          hover: { rotate: [0, -15, 12, -10, 8, -4, 0], transition: { duration: 0.65, ease: "easeInOut" } }
        }}
        style={{ transformOrigin: "12px 2px" }}
      />
      <motion.path
        d="M13.73 21a2 2 0 0 1-3.46 0"
        variants={{
          normal: { x: 0 },
          hover: { x: [0, 2, -2, 1, -1, 0], transition: { duration: 0.65, ease: "easeInOut" } }
        }}
      />
    </motion.svg>
  );
}

// 4. Key
export function AnimatedKey({ size = 16, color = "currentColor", strokeWidth = 2, ...props }: IconProps) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      variants={{
        normal: { rotate: 0, scale: 1 },
        hover: { rotate: [0, 45, -15, 0], scale: 1.1, transition: { type: "spring", stiffness: 260, damping: 12 } }
      }}
      style={{ transformOrigin: "6px 18px" }}
      initial="normal"
      whileHover="hover"
      {...props}
    >
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </motion.svg>
  );
}

// 5. Zap / Bolt
export function AnimatedZap({ size = 16, color = "currentColor", strokeWidth = 2, ...props }: IconProps) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      variants={{
        normal: { scale: 1, rotate: 0, filter: "brightness(1)" },
        hover: {
          scale: [1, 1.25, 0.9, 1.15, 1],
          rotate: [0, 8, -8, 0],
          transition: { duration: 0.45 }
        }
      }}
      initial="normal"
      whileHover="hover"
      {...props}
    >
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </motion.svg>
  );
}

// 6. Activity / Pulse
export function AnimatedActivity({ size = 16, color = "currentColor", strokeWidth = 2, ...props }: IconProps) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      initial="normal"
      whileHover="hover"
      {...props}
    >
      <motion.path
        d="M22 12h-4l-3 9L9 3l-3 9H2"
        variants={{
          normal: { pathLength: 1 },
          hover: {
            pathLength: [0, 1],
            transition: { duration: 0.85, ease: "easeInOut" }
          }
        }}
      />
    </motion.svg>
  );
}

// 7. Database
export function AnimatedDatabase({ size = 16, color = "currentColor", strokeWidth = 2, ...props }: IconProps) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      variants={{
        normal: { scaleY: 1, scaleX: 1 },
        hover: {
          scaleY: [1, 1.2, 0.85, 1.1, 1],
          scaleX: [1, 0.9, 1.05, 0.98, 1],
          transition: { duration: 0.6, ease: "easeInOut" }
        }
      }}
      style={{ transformOrigin: "bottom center" }}
      initial="normal"
      whileHover="hover"
      {...props}
    >
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
    </motion.svg>
  );
}

// 8. Terminal
export function AnimatedTerminal({ size = 16, color = "currentColor", strokeWidth = 2, ...props }: IconProps) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      initial="normal"
      whileHover="hover"
      {...props}
    >
      <motion.polyline
        points="4 17 10 11 4 5"
        variants={{
          normal: { x: 0 },
          hover: { x: [0, 2, 0], transition: { duration: 0.35 } }
        }}
      />
      <motion.line
        x1="12"
        y1="19"
        x2="20"
        y2="19"
        animate={{ opacity: [1, 0, 1] }}
        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
      />
    </motion.svg>
  );
}

// 9. Dollar Sign
export function AnimatedDollarSign({ size = 16, color = "currentColor", strokeWidth = 2, ...props }: IconProps) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      variants={{
        normal: { y: 0, scale: 1 },
        hover: { y: [0, -4, 2, -1, 0], scaleY: [1, 1.15, 0.9, 1.05, 1], transition: { duration: 0.55 } }
      }}
      style={{ transformOrigin: "bottom center" }}
      initial="normal"
      whileHover="hover"
      {...props}
    >
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </motion.svg>
  );
}

// 10. Users
export function AnimatedUsers({ size = 16, color = "currentColor", strokeWidth = 2, ...props }: IconProps) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      initial="normal"
      whileHover="hover"
      {...props}
    >
      <motion.path
        d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
        variants={{
          normal: { y: 0, scale: 1 },
          hover: { y: [0, -2, 0], scale: 1.02, transition: { duration: 0.4 } }
        }}
      />
      <motion.circle
        cx="9"
        cy="7"
        r="4"
        variants={{
          normal: { y: 0 },
          hover: { y: [0, -2, 0], transition: { duration: 0.4, delay: 0.05 } }
        }}
      />
      <motion.path
        d="M23 21v-2a4 4 0 0 0-3-3.87"
        variants={{
          normal: { x: 0 },
          hover: { x: [0, 1.5, 0], transition: { duration: 0.45 } }
        }}
      />
      <motion.path
        d="M16 3.13a4 4 0 0 1 0 7.75"
        variants={{
          normal: { scale: 1 },
          hover: { scale: 1.05, transition: { duration: 0.4 } }
        }}
      />
    </motion.svg>
  );
}

// 11. Grid / LayoutGrid
export function AnimatedGrid({ size = 16, color = "currentColor", strokeWidth = 2, ...props }: IconProps) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      initial="normal"
      whileHover="hover"
      {...props}
    >
      <motion.rect x="3" y="3" width="7" height="9" rx="1" variants={{ hover: { scale: 1.08, x: -0.5, y: -0.5 } }} />
      <motion.rect x="14" y="3" width="7" height="5" rx="1" variants={{ hover: { scale: 1.08, x: 0.5, y: -0.5 } }} />
      <motion.rect x="14" y="12" width="7" height="9" rx="1" variants={{ hover: { scale: 1.08, x: 0.5, y: 0.5 } }} />
      <motion.rect x="3" y="16" width="7" height="5" rx="1" variants={{ hover: { scale: 1.08, x: -0.5, y: 0.5 } }} />
    </motion.svg>
  );
}

// 12. Layers
export function AnimatedLayers({ size = 16, color = "currentColor", strokeWidth = 2, ...props }: IconProps) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      initial="normal"
      whileHover="hover"
      {...props}
    >
      <motion.path d="M12 2L2 7l10 5 10-5-10-5z" variants={{ normal: { y: 0 }, hover: { y: -3 } }} />
      <motion.path d="M2 17l10 5 10-5" variants={{ normal: { y: 0 }, hover: { y: 1 } }} />
      <motion.path d="M2 12l10 5 10-5" variants={{ normal: { y: 0 }, hover: { y: -1 } }} />
    </motion.svg>
  );
}

// 13. Plus
export function AnimatedPlus({ size = 16, color = "currentColor", strokeWidth = 2, ...props }: IconProps) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      variants={{
        normal: { rotate: 0 },
        hover: { rotate: 90, scale: 1.15, transition: { type: "spring", stiffness: 350, damping: 12 } }
      }}
      initial="normal"
      whileHover="hover"
      {...props}
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </motion.svg>
  );
}

// 14. Pencil / Edit
export function AnimatedEdit({ size = 16, color = "currentColor", strokeWidth = 2, ...props }: IconProps) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      initial="normal"
      whileHover="hover"
      {...props}
    >
      <motion.path
        d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"
        variants={{
          normal: { rotate: 0, x: 0, y: 0 },
          hover: {
            rotate: [0, -8, 8, -8, 0],
            x: [0, -1, 1, -1, 0],
            y: [0, -1, 0, -1, 0],
            transition: { duration: 0.55 }
          }
        }}
        style={{ transformOrigin: "bottom left" }}
      />
      <path d="m15 5 4 4" />
    </motion.svg>
  );
}

// 15. Copy
export function AnimatedCopy({ size = 16, color = "currentColor", strokeWidth = 2, ...props }: IconProps) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      initial="normal"
      whileHover="hover"
      {...props}
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <motion.path
        d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
        variants={{
          normal: { x: 0, y: 0 },
          hover: { x: -2, y: -2, transition: { type: "spring", stiffness: 300, damping: 10 } }
        }}
      />
    </motion.svg>
  );
}

// 16. Check
export function AnimatedCheck({ size = 16, color = "currentColor", strokeWidth = 2, ...props }: IconProps) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      initial="normal"
      whileHover="hover"
      {...props}
    >
      <motion.polyline
        points="20 6 9 17 5 12"
        variants={{
          normal: { pathLength: 1 },
          hover: { pathLength: [0, 1], transition: { duration: 0.4, ease: "easeOut" } }
        }}
      />
    </motion.svg>
  );
}

// 17. X / Close
export function AnimatedX({ size = 16, color = "currentColor", strokeWidth = 2, ...props }: IconProps) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      variants={{
        normal: { rotate: 0 },
        hover: { rotate: 90, scale: 1.1, transition: { type: "spring", stiffness: 300, damping: 12 } }
      }}
      initial="normal"
      whileHover="hover"
      {...props}
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </motion.svg>
  );
}

// 18. Sun
export function AnimatedSun({ size = 16, color = "currentColor", strokeWidth = 2, ...props }: IconProps) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      initial="normal"
      whileHover="hover"
      {...props}
    >
      <motion.circle
        cx="12"
        cy="12"
        r="4"
        variants={{
          normal: { rotate: 0 },
          hover: { rotate: 360, transition: { duration: 8, ease: "linear", repeat: Infinity } }
        }}
        style={{ transformOrigin: "12px 12px" }}
      />
      <motion.path
        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"
        variants={{
          normal: { scale: 1, opacity: 1 },
          hover: { scale: [1, 1.08, 0.95, 1], opacity: [1, 0.7, 1], transition: { repeat: Infinity, duration: 1.5 } }
        }}
        style={{ transformOrigin: "12px 12px" }}
      />
    </motion.svg>
  );
}

// 19. Moon
export function AnimatedMoon({ size = 16, color = "currentColor", strokeWidth = 2, ...props }: IconProps) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      variants={{
        normal: { rotate: 0, scale: 1 },
        hover: { rotate: [0, -18, 5, 0], scale: 1.1, transition: { type: "spring", stiffness: 220, damping: 12 } }
      }}
      style={{ transformOrigin: "12px 12px" }}
      initial="normal"
      whileHover="hover"
      {...props}
    >
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </motion.svg>
  );
}

// 20. Search
export function AnimatedSearch({ size = 16, color = "currentColor", strokeWidth = 2, ...props }: IconProps) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      variants={{
        normal: { scale: 1 },
        hover: { scale: 1.1, transition: { type: "spring", stiffness: 300, damping: 10 } }
      }}
      initial="normal"
      whileHover="hover"
      {...props}
    >
      <motion.circle
        cx="11"
        cy="11"
        r="8"
        variants={{
          normal: { x: 0, y: 0 },
          hover: { x: [0, 1.5, -1, 0], y: [0, 1.5, -1, 0], transition: { duration: 0.45 } }
        }}
      />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </motion.svg>
  );
}

// 21. Bookmark
export function AnimatedBookmark({ size = 16, color = "currentColor", strokeWidth = 2, ...props }: IconProps) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      variants={{
        normal: { y: 0 },
        hover: { y: [0, 3, -1, 0], transition: { duration: 0.4 } }
      }}
      initial="normal"
      whileHover="hover"
      {...props}
    >
      <path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
    </motion.svg>
  );
}

// 22. Cpu
export function AnimatedCpu({ size = 16, color = "currentColor", strokeWidth = 2, ...props }: IconProps) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      initial="normal"
      whileHover="hover"
      {...props}
    >
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <motion.path
        d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 15h3M1 9h3M1 15h3"
        variants={{
          normal: { opacity: 1 },
          hover: { opacity: [1, 0.4, 1], transition: { repeat: Infinity, duration: 1 } }
        }}
      />
    </motion.svg>
  );
}

// 23. LogOut
export function AnimatedLogOut({ size = 16, color = "currentColor", strokeWidth = 2, ...props }: IconProps) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      initial="normal"
      whileHover="hover"
      {...props}
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <motion.g
        variants={{
          normal: { x: 0 },
          hover: { x: [0, 4, 0], transition: { duration: 0.45 } }
        }}
      >
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </motion.g>
    </motion.svg>
  );
}

// 24. LogIn
export function AnimatedLogIn({ size = 16, color = "currentColor", strokeWidth = 2, ...props }: IconProps) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      initial="normal"
      whileHover="hover"
      {...props}
    >
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <motion.g
        variants={{
          normal: { x: 0 },
          hover: { x: [0, -3, 0], transition: { duration: 0.45 } }
        }}
      >
        <polyline points="10 17 15 12 10 7" />
        <line x1="15" y1="12" x2="3" y2="12" />
      </motion.g>
    </motion.svg>
  );
}

// 25. ChevronDown
export function AnimatedChevronDown({ size = 16, color = "currentColor", strokeWidth = 2, ...props }: IconProps) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      variants={{
        normal: { y: 0 },
        hover: { y: [0, 3, 0], transition: { duration: 0.4, repeat: 1 } }
      }}
      initial="normal"
      whileHover="hover"
      {...props}
    >
      <polyline points="6 9 12 15 18 9" />
    </motion.svg>
  );
}

// 26. Server
export function AnimatedServer({ size = 16, color = "currentColor", strokeWidth = 2, ...props }: IconProps) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      initial="normal"
      whileHover="hover"
      {...props}
    >
      <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
      <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
      <motion.line
        x1="6"
        y1="6"
        x2="6.01"
        y2="6"
        variants={{
          normal: { opacity: 1 },
          hover: { opacity: [1, 0, 1], transition: { repeat: Infinity, duration: 0.6 } }
        }}
      />
      <motion.line
        x1="6"
        y1="18"
        x2="6.01"
        y2="18"
        variants={{
          normal: { opacity: 1 },
          hover: { opacity: [1, 0, 1], transition: { repeat: Infinity, duration: 0.6, delay: 0.2 } }
        }}
      />
    </motion.svg>
  );
}

// 27. AlertTriangle
export function AnimatedAlertTriangle({ size = 16, color = "currentColor", strokeWidth = 2, ...props }: IconProps) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      variants={{
        normal: { rotate: 0, scale: 1 },
        hover: { rotate: [0, -8, 8, -6, 6, 0], scale: 1.05, transition: { duration: 0.55 } }
      }}
      style={{ transformOrigin: "12px 17px" }}
      initial="normal"
      whileHover="hover"
      {...props}
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </motion.svg>
  );
}

// 28. Info
export function AnimatedInfo({ size = 16, color = "currentColor", strokeWidth = 2, ...props }: IconProps) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      initial="normal"
      whileHover="hover"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <motion.line
        x1="12"
        y1="8"
        x2="12.01"
        y2="8"
        variants={{
          normal: { y: 0 },
          hover: { y: [0, -1.5, 0], transition: { duration: 0.4 } }
        }}
      />
    </motion.svg>
  );
}

// 29. Save
export function AnimatedSave({ size = 16, color = "currentColor", strokeWidth = 2, ...props }: IconProps) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      variants={{
        normal: { scale: 1 },
        hover: { scale: [1, 1.1, 0.95, 1], transition: { duration: 0.4 } }
      }}
      initial="normal"
      whileHover="hover"
      {...props}
    >
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </motion.svg>
  );
}

// 30. HardDrive
export function AnimatedHardDrive({ size = 16, color = "currentColor", strokeWidth = 2, ...props }: IconProps) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      initial="normal"
      whileHover="hover"
      {...props}
    >
      <line x1="22" y1="12" x2="2" y2="12" />
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
      <motion.line
        x1="6"
        y1="16"
        x2="6.01"
        y2="16"
        variants={{
          normal: { opacity: 1 },
          hover: { opacity: [1, 0, 1], transition: { repeat: Infinity, duration: 0.5 } }
        }}
      />
      <motion.line
        x1="10"
        y1="16"
        x2="10.01"
        y2="16"
        variants={{
          normal: { opacity: 1 },
          hover: { opacity: [1, 0, 1], transition: { repeat: Infinity, duration: 0.5, delay: 0.15 } }
        }}
      />
    </motion.svg>
  );
}

// 31. Coins
export function AnimatedCoins({ size = 16, color = "currentColor", strokeWidth = 2, ...props }: IconProps) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      initial="normal"
      whileHover="hover"
      {...props}
    >
      <circle cx="8" cy="8" r="6" />
      <motion.path
        d="M18.09 10.37A6 6 0 1 1 10.34 18"
        variants={{
          normal: { y: 0 },
          hover: { y: [0, -2, 0], transition: { duration: 0.4 } }
        }}
      />
      <motion.path
        d="M7 6h1v4"
        variants={{
          normal: { scaleY: 1 },
          hover: { scaleY: [1, 1.2, 1], transition: { duration: 0.4 } }
        }}
      />
      <path d="M12 10h1v4" />
    </motion.svg>
  );
}

// 32. Brain
export function AnimatedBrain({ size = 16, color = "currentColor", strokeWidth = 2, ...props }: IconProps) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      variants={{
        normal: { scale: 1 },
        hover: { scale: [1, 1.1, 0.95, 1.05, 1], transition: { duration: 0.55 } }
      }}
      initial="normal"
      whileHover="hover"
      {...props}
    >
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1 0-3.12 3 3 0 0 1 0-4.88 2.5 2.5 0 0 1 0-3.12A2.5 2.5 0 0 1 9.5 2z" />
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 0-3.12 3 3 0 0 0 0-4.88 2.5 2.5 0 0 0 0-3.12A2.5 2.5 0 0 0 14.5 2z" />
    </motion.svg>
  );
}

// 33. Percentage
export function AnimatedPercentage({ size = 16, color = "currentColor", strokeWidth = 2, ...props }: IconProps) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      variants={{
        normal: { rotate: 0 },
        hover: { rotate: [0, 8, -8, 0], transition: { duration: 0.45 } }
      }}
      initial="normal"
      whileHover="hover"
      {...props}
    >
      <line x1="19" y1="5" x2="5" y2="19" />
      <circle cx="6.5" cy="6.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
    </motion.svg>
  );
}

// 34. Flask
export function AnimatedFlask({ size = 16, color = "currentColor", strokeWidth = 2, ...props }: IconProps) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      initial="normal"
      whileHover="hover"
      {...props}
    >
      <path d="M10 2v8L4.36 20.64A2 2 0 0 0 6.1 22h11.8a2 2 0 0 0 1.74-2.64L14 10V2" />
      <line x1="8" y1="2" x2="16" y2="2" />
      <motion.line
        x1="6"
        y1="17"
        x2="18"
        y2="17"
        variants={{
          normal: { y: 0 },
          hover: { y: [0, -1.5, 0], transition: { duration: 0.5, repeat: Infinity } }
        }}
      />
    </motion.svg>
  );
}

// 35. GitBranch
export function AnimatedGitBranch({ size = 16, color = "currentColor", strokeWidth = 2, ...props }: IconProps) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      initial="normal"
      whileHover="hover"
      {...props}
    >
      <line x1="6" y1="3" x2="6" y2="15" />
      <circle cx="18" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <motion.circle
        cx="6"
        cy="6"
        r="3"
        variants={{
          normal: { scale: 1 },
          hover: { scale: 1.25, transition: { duration: 0.3 } }
        }}
      />
      <motion.path
        d="M18 9a9 9 0 0 1-9 9"
        variants={{
          normal: { pathLength: 1 },
          hover: { pathLength: [0, 1], transition: { duration: 0.5, ease: "easeOut" } }
        }}
      />
    </motion.svg>
  );
}

// 36. RefreshCw
export function AnimatedRefreshCw({ size = 16, color = "currentColor", strokeWidth = 2, ...props }: IconProps) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      variants={{
        normal: { rotate: 0 },
        hover: { rotate: 360, transition: { duration: 1.2, ease: "linear" } }
      }}
      initial="normal"
      whileHover="hover"
      {...props}
    >
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </motion.svg>
  );
}

// 37. Sliders
export function AnimatedSliders({ size = 16, color = "currentColor", strokeWidth = 2, ...props }: IconProps) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      initial="normal"
      whileHover="hover"
      {...props}
    >
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <motion.line
        x1="2"
        y1="14"
        x2="6"
        y2="14"
        variants={{ normal: { y: 0 }, hover: { y: -2, transition: { duration: 0.3 } } }}
      />
      <motion.line
        x1="10"
        y1="8"
        x2="14"
        y2="8"
        variants={{ normal: { y: 0 }, hover: { y: 2, transition: { duration: 0.3 } } }}
      />
      <motion.line
        x1="18"
        y1="16"
        x2="22"
        y2="16"
        variants={{ normal: { y: 0 }, hover: { y: -3, transition: { duration: 0.3 } } }}
      />
    </motion.svg>
  );
}

// 38. GitMerge
export function AnimatedGitMerge({ size = 16, color = "currentColor", strokeWidth = 2, ...props }: IconProps) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      initial="normal"
      whileHover="hover"
      {...props}
    >
      <circle cx="18" cy="18" r="3" />
      <circle cx="6" cy="6" r="3" />
      <motion.circle
        cx="6"
        cy="18"
        r="3"
        variants={{
          normal: { scale: 1 },
          hover: { scale: 1.25, transition: { duration: 0.3 } }
        }}
      />
      <motion.path
        d="M6 6v12"
        variants={{
          normal: { pathLength: 1 },
          hover: { pathLength: [0, 1], transition: { duration: 0.4 } }
        }}
      />
      <motion.path
        d="M18 15V9a4 4 0 0 0-4-4H9"
        variants={{
          normal: { pathLength: 1 },
          hover: { pathLength: [0, 1], transition: { duration: 0.5 } }
        }}
      />
    </motion.svg>
  );
}

// 39. CheckCircle
export function AnimatedCheckCircle({ size = 16, color = "currentColor", strokeWidth = 2, ...props }: IconProps) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      initial="normal"
      whileHover="hover"
      {...props}
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <motion.polyline
        points="22 4 12 14.01 9 11.01"
        variants={{
          normal: { pathLength: 1 },
          hover: { pathLength: [0, 1], transition: { duration: 0.45 } }
        }}
      />
    </motion.svg>
  );
}

// 40. XCircle
export function AnimatedXCircle({ size = 16, color = "currentColor", strokeWidth = 2, ...props }: IconProps) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      variants={{
        normal: { scale: 1 },
        hover: { scale: [1, 1.1, 0.95, 1], transition: { duration: 0.3 } }
      }}
      initial="normal"
      whileHover="hover"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </motion.svg>
  );
}

// 41. Download
export function AnimatedDownload({ size = 16, color = "currentColor", strokeWidth = 2, ...props }: IconProps) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      initial="normal"
      whileHover="hover"
      {...props}
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <motion.g
        variants={{
          normal: { y: 0 },
          hover: { y: [0, 3, 0], transition: { duration: 0.5, repeat: Infinity } }
        }}
      >
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </motion.g>
    </motion.svg>
  );
}

// 42. Pause
export function AnimatedPause({ size = 16, color = "currentColor", strokeWidth = 2, ...props }: IconProps) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      variants={{
        normal: { scale: 1 },
        hover: { scale: [1, 1.15, 0.95, 1], transition: { duration: 0.3 } }
      }}
      initial="normal"
      whileHover="hover"
      {...props}
    >
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </motion.svg>
  );
}

// 43. Play
export function AnimatedPlay({ size = 16, color = "currentColor", strokeWidth = 2, ...props }: IconProps) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      variants={{
        normal: { scale: 1, rotate: 0 },
        hover: { scale: [1, 1.2, 0.95, 1], rotate: [0, 10, -5, 0], transition: { duration: 0.4 } }
      }}
      initial="normal"
      whileHover="hover"
      {...props}
    >
      <polygon points="5 3 19 12 5 21 5 3" />
    </motion.svg>
  );
}

// 44. Eye
export function AnimatedEye({ size = 16, color = "currentColor", strokeWidth = 2, ...props }: IconProps) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      initial="normal"
      whileHover="hover"
      {...props}
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <motion.circle
        cx="12"
        cy="12"
        r="3"
        variants={{
          normal: { scale: 1 },
          hover: { scale: [1, 1.25, 0.95, 1], transition: { duration: 0.4 } }
        }}
      />
    </motion.svg>
  );
}

// 45. CornerDownRight
export function AnimatedCornerDownRight({ size = 16, color = "currentColor", strokeWidth = 2, ...props }: IconProps) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      initial="normal"
      whileHover="hover"
      {...props}
    >
      <polyline points="15 10 20 15 15 20" />
      <motion.path
        d="M4 4v7a4 4 0 0 0 4 4h12"
        variants={{
          normal: { pathLength: 1 },
          hover: { pathLength: [0, 1], transition: { duration: 0.5, ease: "easeOut" } }
        }}
      />
    </motion.svg>
  );
}

// 46. UserCheck
export function AnimatedUserCheck({ size = 16, color = "currentColor", strokeWidth = 2, ...props }: IconProps) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      initial="normal"
      whileHover="hover"
      {...props}
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <motion.polyline
        points="16 11 18 13 22 9"
        variants={{
          normal: { pathLength: 1 },
          hover: { pathLength: [0, 1], transition: { duration: 0.45 } }
        }}
      />
    </motion.svg>
  );
}

// 47. UserX
export function AnimatedUserX({ size = 16, color = "currentColor", strokeWidth = 2, ...props }: IconProps) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      initial="normal"
      whileHover="hover"
      {...props}
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <motion.line
        x1="18"
        y1="8"
        x2="22"
        y2="12"
        variants={{
          normal: { pathLength: 1 },
          hover: { pathLength: [0, 1], transition: { duration: 0.35 } }
        }}
      />
      <motion.line
        x1="22"
        y1="8"
        x2="18"
        y2="12"
        variants={{
          normal: { pathLength: 1 },
          hover: { pathLength: [0, 1], transition: { duration: 0.35, delay: 0.1 } }
        }}
      />
    </motion.svg>
  );
}

// 48. Shield
export function AnimatedShield({ size = 16, color = "currentColor", strokeWidth = 2, ...props }: IconProps) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      variants={{
        normal: { scale: 1 },
        hover: { scale: [1, 1.12, 0.95, 1], transition: { duration: 0.45 } }
      }}
      initial="normal"
      whileHover="hover"
      {...props}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </motion.svg>
  );
}

// 49. Lock
export function AnimatedLock({ size = 16, color = "currentColor", strokeWidth = 2, ...props }: IconProps) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      initial="normal"
      whileHover="hover"
      {...props}
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <motion.path
        d="M7 11V7a5 5 0 0 1 10 0v4"
        variants={{
          normal: { y: 0 },
          hover: { y: -2, transition: { type: "spring", stiffness: 350, damping: 10 } }
        }}
      />
    </motion.svg>
  );
}

// 50. Inbox
export function AnimatedInbox({ size = 16, color = "currentColor", strokeWidth = 2, ...props }: IconProps) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      variants={{
        normal: { y: 0 },
        hover: { y: [0, -2, 2, 0], transition: { duration: 0.55 } }
      }}
      initial="normal"
      whileHover="hover"
      {...props}
    >
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </motion.svg>
  );
}

// 51. User
export function AnimatedUser({ size = 16, color = "currentColor", strokeWidth = 2, ...props }: IconProps) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      initial="normal"
      whileHover="hover"
      {...props}
    >
      <motion.circle
        cx="12"
        cy="7"
        r="4"
        variants={{
          normal: { y: 0 },
          hover: { y: [0, -2, 0], transition: { duration: 0.4 } }
        }}
      />
      <motion.path
        d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"
        variants={{
          normal: { scale: 1 },
          hover: { scale: [1, 1.05, 1], transition: { duration: 0.4 } }
        }}
        style={{ transformOrigin: "12px 21px" }}
      />
    </motion.svg>
  );
}

// 52. Alert Circle
export function AnimatedAlertCircle({ size = 16, color = "currentColor", strokeWidth = 2, ...props }: IconProps) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      initial="normal"
      whileHover="hover"
      {...props}
    >
      <motion.circle
        cx="12"
        cy="12"
        r="10"
        variants={{
          normal: { scale: 1 },
          hover: { scale: 1.05, transition: { type: "spring", stiffness: 300, damping: 10 } }
        }}
      />
      <motion.g
        variants={{
          normal: { y: 0 },
          hover: { y: [0, -2, 2, -1, 1, 0], transition: { duration: 0.5, ease: "easeInOut" } }
        }}
      >
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </motion.g>
    </motion.svg>
  );
}

