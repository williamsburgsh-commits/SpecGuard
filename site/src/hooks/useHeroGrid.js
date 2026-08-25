import { useEffect } from 'react';

export function useHeroGrid(canvasRef) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext('2d');
    let w;
    let h;
    let t = 0;
    let frameId;

    const resize = () => {
      w = canvas.width = canvas.offsetWidth;
      h = canvas.height = canvas.offsetHeight;
    };

    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const gap = 44;
      const offsetY = (t * 0.18) % gap;
      ctx.strokeStyle = 'rgba(56, 232, 255, 0.04)';
      ctx.lineWidth = 1;

      for (let x = 0; x < w; x += gap) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = -gap + offsetY; y < h + gap; y += gap) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      const cx = w * 0.72;
      const cy = h * 0.5;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.35);
      grad.addColorStop(0, 'rgba(56, 232, 255, 0.03)');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      t += 1;
      frameId = requestAnimationFrame(draw);
    };

    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      frameId = requestAnimationFrame(draw);
    }

    return () => {
      window.removeEventListener('resize', resize);
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [canvasRef]);
}
