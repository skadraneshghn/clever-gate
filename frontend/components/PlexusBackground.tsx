"use client";

import { useEffect, useRef } from "react";
import { useColorScheme } from "../theme/ThemeRegistry";

export function PlexusBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { colorScheme, themeVariant } = useColorScheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);

    // Particles configuration
    const particleCount = 70;
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
    }> = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4, // Slow, smooth float speed
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 2.2 + 1,
      });
    }

    // Dynamic colors based on active variant and light/dark scheme
    const getColors = () => {
      const isDark = colorScheme === "dark";
      if (themeVariant === "forest") {
        return {
          particle: isDark ? "rgba(137, 215, 183, 0.45)" : "rgba(66, 132, 117, 0.25)",
          line: isDark 
            ? { r: 137, g: 215, b: 183, baseAlpha: 0.14 } 
            : { r: 66, g: 132, b: 117, baseAlpha: 0.08 },
        };
      } else {
        return {
          particle: isDark ? "rgba(162, 196, 223, 0.4)" : "rgba(63, 114, 175, 0.25)",
          line: isDark 
            ? { r: 162, g: 196, b: 223, baseAlpha: 0.14 } 
            : { r: 63, g: 114, b: 175, baseAlpha: 0.08 },
        };
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      const colors = getColors();

      // Move and draw particles
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        // Bounce off canvas boundaries
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = colors.particle;
        ctx.fill();
      });

      // Connect close particles with plexus lines
      const maxDistance = 120;
      for (let i = 0; i < particleCount; i++) {
        for (let j = i + 1; j < particleCount; j++) {
          const p1 = particles[i];
          const p2 = particles[j];

          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDistance) {
            const alphaFactor = 1 - dist / maxDistance;
            const line = colors.line;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(${line.r}, ${line.g}, ${line.b}, ${line.baseAlpha * alphaFactor})`;
            ctx.lineWidth = 0.85;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [colorScheme, themeVariant]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: -2,
        pointerEvents: "none",
      }}
    />
  );
}
