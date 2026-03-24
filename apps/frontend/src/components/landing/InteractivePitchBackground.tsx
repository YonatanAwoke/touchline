import { useEffect, useRef, useCallback } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  rotation: number;
  rotationSpeed: number;
}

const PARTICLE_COUNT = 55;
const CURSOR_RADIUS = 350;
const LINE_BASE_OPACITY = 0.12;
const LINE_BRIGHT_OPACITY = 0.45;

/**
 * Draws a small football (pentagon pattern) at the given position on a canvas.
 */
function drawFootball(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  opacity: number,
  rotation: number,
  color: string
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.globalAlpha = opacity;

  // Outer circle
  ctx.beginPath();
  ctx.arc(0, 0, size, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Pentagon pattern inside
  const innerR = size * 0.55;
  for (let i = 0; i < 5; i++) {
    const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
    const px = Math.cos(angle) * innerR;
    const py = Math.sin(angle) * innerR;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(px, py);
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Draws pitch markings with proximity-based brightness.
 */
function drawPitchLines(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  cursorX: number,
  cursorY: number,
  color: string
) {
  // Define line segments as arrays of drawing commands
  const pitchW = w * 0.83;
  const pitchH = h * 0.85;
  const ox = (w - pitchW) / 2;
  const oy = (h - pitchH) / 2;
  const cx = w / 2;
  const cy = h / 2;

  // Helper: compute opacity based on distance from cursor to a point
  const getOpacity = (px: number, py: number) => {
    const dist = Math.sqrt((cursorX - px) ** 2 + (cursorY - py) ** 2);
    if (dist > CURSOR_RADIUS) return LINE_BASE_OPACITY;
    const t = 1 - dist / CURSOR_RADIUS;
    return LINE_BASE_OPACITY + (LINE_BRIGHT_OPACITY - LINE_BASE_OPACITY) * t * t;
  };

  // Helper: get closest-point opacity along a line segment
  const getLineOpacity = (x1: number, y1: number, x2: number, y2: number) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    let t = lenSq === 0 ? 0 : ((cursorX - x1) * dx + (cursorY - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    return getOpacity(x1 + t * dx, y1 + t * dy);
  };

  // Helper: get closest-point opacity for a rectangle (checks all 4 edges)
  const getRectOpacity = (rx: number, ry: number, rw: number, rh: number) => {
    const edges: [number, number, number, number][] = [
      [rx, ry, rx + rw, ry],
      [rx + rw, ry, rx + rw, ry + rh],
      [rx + rw, ry + rh, rx, ry + rh],
      [rx, ry + rh, rx, ry],
    ];
    let best = LINE_BASE_OPACITY;
    for (const [ex1, ey1, ex2, ey2] of edges) {
      best = Math.max(best, getLineOpacity(ex1, ey1, ex2, ey2));
    }
    return best;
  };

  // Helper: draw a line segment with proximity glow
  const drawLine = (x1: number, y1: number, x2: number, y2: number, lineW = 1.5) => {
    ctx.globalAlpha = getLineOpacity(x1, y1, x2, y2);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineW;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  };

  // Helper: draw rect with proximity glow
  const drawRect = (rx: number, ry: number, rw: number, rh: number, lineW = 1.5, radius = 4) => {
    ctx.globalAlpha = getRectOpacity(rx, ry, rw, rh);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineW;
    ctx.beginPath();
    ctx.roundRect(rx, ry, rw, rh, radius);
    ctx.stroke();
  };

  // Helper: draw arc/circle
  const drawCircle = (acx: number, acy: number, r: number, lineW = 1.5) => {
    ctx.globalAlpha = getOpacity(acx, acy);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineW;
    ctx.beginPath();
    ctx.arc(acx, acy, r, 0, Math.PI * 2);
    ctx.stroke();
  };

  // Outer boundary
  drawRect(ox, oy, pitchW, pitchH, 2, 6);

  // Halfway line
  drawLine(ox, cy, ox + pitchW, cy, 1.5);

  // Center circle
  const circleR = Math.min(pitchW, pitchH) * 0.12;
  drawCircle(cx, cy, circleR, 1.5);

  // Center dot
  ctx.globalAlpha = getOpacity(cx, cy);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, 3, 0, Math.PI * 2);
  ctx.fill();

  // Penalty areas
  const penW = pitchW * 0.42;
  const penH = pitchH * 0.2;
  const penX = cx - penW / 2;
  drawRect(penX, oy, penW, penH, 1.2, 3);
  drawRect(penX, oy + pitchH - penH, penW, penH, 1.2, 3);

  // Goal areas
  const goalW = pitchW * 0.26;
  const goalH = pitchH * 0.09;
  const goalX = cx - goalW / 2;
  drawRect(goalX, oy, goalW, goalH, 1, 2);
  drawRect(goalX, oy + pitchH - goalH, goalW, goalH, 1, 2);

  // Penalty arcs (approximated with quadratic curves)
  const arcPoints = [
    { x1: penX + penW * 0.15, y1: oy + penH, cpx: cx, cpy: oy + penH + penH * 0.35, x2: penX + penW * 0.85, y2: oy + penH },
    { x1: penX + penW * 0.15, y1: oy + pitchH - penH, cpx: cx, cpy: oy + pitchH - penH - penH * 0.35, x2: penX + penW * 0.85, y2: oy + pitchH - penH },
  ];
  arcPoints.forEach(({ x1, y1, cpx, cpy, x2, y2 }) => {
    ctx.globalAlpha = getOpacity(cpx, cpy);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(cpx, cpy, x2, y2);
    ctx.stroke();
  });

  // Corner arcs
  const cornerR = Math.min(pitchW, pitchH) * 0.03;
  const corners = [
    { x: ox, y: oy, sa: 0, ea: Math.PI / 2 },
    { x: ox + pitchW, y: oy, sa: Math.PI / 2, ea: Math.PI },
    { x: ox, y: oy + pitchH, sa: -Math.PI / 2, ea: 0 },
    { x: ox + pitchW, y: oy + pitchH, sa: Math.PI, ea: Math.PI * 1.5 },
  ];
  corners.forEach(({ x, y, sa, ea }) => {
    ctx.globalAlpha = getOpacity(x, y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, cornerR, sa, ea);
    ctx.stroke();
  });
}

export default function InteractivePitchBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const cursorRef = useRef({ x: -1000, y: -1000 });
  const animRef = useRef<number>(0);

  const initParticles = useCallback((w: number, h: number) => {
    const particles: Particle[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: 5 + Math.random() * 7,
        opacity: 0.05 + Math.random() * 0.08,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.01,
      });
    }
    particlesRef.current = particles;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = window.devicePixelRatio || 1;
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (particlesRef.current.length === 0) initParticles(w, h);
    };

    resize();
    window.addEventListener("resize", resize);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      cursorRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    const handleMouseLeave = () => {
      cursorRef.current = { x: -1000, y: -1000 };
    };

    const parent = canvas.parentElement;
    parent?.addEventListener("mousemove", handleMouseMove);
    parent?.addEventListener("mouseleave", handleMouseLeave);

    // Use CSS computed primary color
    const primaryColor = getComputedStyle(document.documentElement)
      .getPropertyValue("--primary")
      .trim();
    const color = primaryColor ? `hsl(${primaryColor})` : "hsl(160, 100%, 30%)";

    const animate = () => {
      const w = canvas.width / (window.devicePixelRatio || 1);
      const h = canvas.height / (window.devicePixelRatio || 1);
      ctx.clearRect(0, 0, w, h);

      const { x: mx, y: my } = cursorRef.current;

      // Draw pitch lines
      drawPitchLines(ctx, w, h, mx, my, color);

      // Update and draw particles
      particlesRef.current.forEach((p) => {
        // Drift
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;

        // Wrap around
        if (p.x < -20) p.x = w + 20;
        if (p.x > w + 20) p.x = -20;
        if (p.y < -20) p.y = h + 20;
        if (p.y > h + 20) p.y = -20;

        // Cursor interaction: push away slightly + brighten
        const dx = p.x - mx;
        const dy = p.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        let drawOpacity = p.opacity;

        if (dist < CURSOR_RADIUS) {
          const force = (1 - dist / CURSOR_RADIUS) * 0.5;
          const angle = Math.atan2(dy, dx);
          p.vx += Math.cos(angle) * force * 0.15;
          p.vy += Math.sin(angle) * force * 0.15;
          p.rotationSpeed += force * 0.005;
          drawOpacity = p.opacity + (0.25 - p.opacity) * (1 - dist / CURSOR_RADIUS);
        }

        // Dampen velocity
        p.vx *= 0.98;
        p.vy *= 0.98;
        p.rotationSpeed *= 0.995;

        drawFootball(ctx, p.x, p.y, p.size, drawOpacity, p.rotation, color);
      });

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
      parent?.removeEventListener("mousemove", handleMouseMove);
      parent?.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [initParticles]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-[1] pointer-events-none"
      aria-hidden="true"
    />
  );
}
