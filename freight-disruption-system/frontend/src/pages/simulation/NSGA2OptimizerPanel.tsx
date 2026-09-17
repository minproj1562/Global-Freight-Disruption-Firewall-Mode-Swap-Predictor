// frontend/src/pages/simulation/NSGA2OptimizerPanel.tsx
// Page 2.3 — Multi-Objective Optimizer (NSGA-II)
// Full Dark & Light Mode Theme Support

import React, { useState, useRef, useEffect } from 'react';
import {
  Boxes,
  RotateCcw,
  Zap,
  CheckCircle2,
  TrendingUp,
  Sliders,
  DollarSign,
  Clock,
  Leaf,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useTheme } from '@/shared/hooks/useTheme';
import {
  MOCK_PARETO_3D_POINTS,
  MOCK_PARETO_FRONTIER_TABLE,
  Pareto3DPoint,
} from '@/shared/mock/simulationMockData';

export const NSGA2OptimizerPanel: React.FC = () => {
  const { toast } = useToast();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Selected Point State for deep property display card
  const [selectedPoint, setSelectedPoint] = useState<Pareto3DPoint>(
    MOCK_PARETO_3D_POINTS[0] // Default to P1 (Pareto Optimal)
  );

  // Hovered Point State for tooltip canvas overlay
  const [hoveredPoint, setHoveredPoint] = useState<Pareto3DPoint | null>(null);

  // 3D Canvas Interaction State (Pitch & Yaw Angles)
  const [yawAngle, setYawAngle] = useState(0.45); // Radians
  const [pitchAngle, setPitchAngle] = useState(0.35); // Radians
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [autoRotate, setAutoRotate] = useState(true);

  // Canvas Reference
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Auto Rotation Loop
  useEffect(() => {
    let animationId: number;
    if (autoRotate && !isDragging) {
      const animate = () => {
        setYawAngle((prev) => (prev + 0.004) % (Math.PI * 2));
        animationId = requestAnimationFrame(animate);
      };
      animationId = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(animationId);
  }, [autoRotate, isDragging]);

  // 3D Rendering Engine Loop on HTML5 Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI crisp canvas
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Clear Canvas with theme-aware gradient
    ctx.clearRect(0, 0, width, height);

    const grad = ctx.createLinearGradient(0, 0, 0, height);
    if (isDark) {
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(1, '#020617');
    } else {
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(1, '#f1f5f9');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Dynamic 3D Projection Helpers
    const cx = width / 2;
    const cy = height / 2 + 10;
    const scale = Math.min(width, height) * 0.38;

    // Normalize coordinates (Cost = X, Time = Y, Carbon = Z) into [-1, 1] range
    const project3D = (cost: number, time: number, carbon: number) => {
      // Bounds: Cost [50k, 350k], Time [120h, 600h], Carbon [80t, 500t]
      const nx = ((cost - 50000) / 300000) * 2 - 1;
      const ny = ((time - 120) / 480) * 2 - 1;
      const nz = ((carbon - 80) / 420) * 2 - 1;

      // Rotation matrix around Y (yaw) and X (pitch)
      const cosY = Math.cos(yawAngle);
      const sinY = Math.sin(yawAngle);
      const cosP = Math.cos(pitchAngle);
      const sinP = Math.sin(pitchAngle);

      // Rotate around Y
      const x1 = nx * cosY + nz * sinY;
      const z1 = -nx * sinY + nz * cosY;

      // Rotate around X
      const y2 = ny * cosP - z1 * sinP;
      const z2 = ny * sinP + z1 * cosP;

      // Perspective projection
      const perspective = 3.5;
      const factor = perspective / (perspective + z2);

      const px = cx + x1 * scale * factor;
      const py = cy - y2 * scale * factor;

      return { px, py, factor, depth: z2 };
    };

    // Draw 3D Box Wireframe Boundary
    const corners = [
      project3D(50000, 120, 80),
      project3D(350000, 120, 80),
      project3D(350000, 600, 80),
      project3D(50000, 600, 80),
      project3D(50000, 120, 500),
      project3D(350000, 120, 500),
      project3D(350000, 600, 500),
      project3D(50000, 600, 500),
    ];

    ctx.strokeStyle = isDark ? 'rgba(51, 65, 85, 0.4)' : 'rgba(148, 163, 184, 0.5)';
    ctx.lineWidth = 1;

    const edges = [
      [0, 1], [1, 2], [2, 3], [3, 0],
      [4, 5], [5, 6], [6, 7], [7, 4],
      [0, 4], [1, 5], [2, 6], [3, 7],
    ];

    edges.forEach(([i, j]) => {
      ctx.beginPath();
      ctx.moveTo(corners[i].px, corners[i].py);
      ctx.lineTo(corners[j].px, corners[j].py);
      ctx.stroke();
    });

    // Draw Axis Label Guides
    ctx.fillStyle = isDark ? '#94a3b8' : '#475569';
    ctx.font = '10px monospace';
    ctx.fillText('X: Cost (USD)', corners[1].px + 6, corners[1].py);
    ctx.fillText('Y: Time (Hrs)', corners[3].px, corners[3].py - 6);
    ctx.fillText('Z: Carbon (Tons)', corners[4].px - 30, corners[4].py + 12);

    // Project all points and sort by depth for correct 3D rendering order
    const projectedPoints = MOCK_PARETO_3D_POINTS.map((pt: Pareto3DPoint) => {
      const proj = project3D(pt.costUsd, pt.timeHours, pt.carbonTons);
      return { ...pt, ...proj };
    }).sort((a, b) => b.depth - a.depth);

    // Draw Points
    projectedPoints.forEach((pt) => {
      const isSelected = selectedPoint.id === pt.id;
      const isHovered = hoveredPoint?.id === pt.id;
      const radius = (isSelected ? 9 : isHovered ? 8 : pt.isPareto ? 6.5 : 4.5) * pt.factor;

      // Glow effect for Pareto Frontier points
      if (pt.isPareto) {
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = isSelected ? 16 : 8;
      } else {
        ctx.shadowBlur = 0;
      }

      ctx.beginPath();
      ctx.arc(pt.px, pt.py, radius, 0, Math.PI * 2);

      // Color scheme
      if (isSelected) {
        ctx.fillStyle = '#f59e0b'; // Amber highlight
        ctx.strokeStyle = isDark ? '#ffffff' : '#0f172a';
        ctx.lineWidth = 2.5;
      } else if (pt.isPareto) {
        ctx.fillStyle = '#10b981'; // Emerald Pareto
        ctx.strokeStyle = '#047857';
        ctx.lineWidth = 1.5;
      } else {
        ctx.fillStyle = isDark ? '#475569' : '#64748b'; // Slate dominated
        ctx.strokeStyle = isDark ? '#334155' : '#cbd5e1';
        ctx.lineWidth = 1;
      }

      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0; // Reset shadow

      // Label Pareto points
      if (pt.isPareto || isSelected) {
        ctx.fillStyle = isSelected ? '#f59e0b' : isDark ? '#e2e8f0' : '#1e293b';
        ctx.font = isSelected ? 'bold 11px monospace' : '10px monospace';
        ctx.fillText(pt.id, pt.px + radius + 4, pt.py + 3);
      }
    });
  }, [yawAngle, pitchAngle, selectedPoint, hoveredPoint, isDark]);

  // Mouse Handlers for 3D Drag Rotation
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
    setAutoRotate(false);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (isDragging) {
      const dx = e.clientX - lastMousePos.x;
      const dy = e.clientY - lastMousePos.y;

      setYawAngle((prev) => prev + dx * 0.008);
      setPitchAngle((prev) => Math.max(-1.2, Math.min(1.2, prev + dy * 0.008)));
      setLastMousePos({ x: e.clientX, y: e.clientY });
    } else {
      // Hit detection hover tooltip check
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const cx = width / 2;
      const cy = height / 2 + 10;
      const scale = Math.min(width, height) * 0.38;

      let found: Pareto3DPoint | null = null;
      for (const pt of MOCK_PARETO_3D_POINTS) {
        const nx = ((pt.costUsd - 50000) / 300000) * 2 - 1;
        const ny = ((pt.timeHours - 120) / 480) * 2 - 1;
        const nz = ((pt.carbonTons - 80) / 420) * 2 - 1;

        const cosY = Math.cos(yawAngle);
        const sinY = Math.sin(yawAngle);
        const cosP = Math.cos(pitchAngle);
        const sinP = Math.sin(pitchAngle);

        const x1 = nx * cosY + nz * sinY;
        const z1 = -nx * sinY + nz * cosY;
        const y2 = ny * cosP - z1 * sinP;
        const z2 = ny * sinP + z1 * cosP;

        const perspective = 3.5;
        const factor = perspective / (perspective + z2);

        const px = cx + x1 * scale * factor;
        const py = cy - y2 * scale * factor;

        const dist = Math.hypot(px - mx, py - my);
        if (dist < 12) {
          found = pt;
          break;
        }
      }
      setHoveredPoint(found);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleCanvasClick = () => {
    if (hoveredPoint) {
      setSelectedPoint(hoveredPoint);
      toast({
        title: `Selected Route ${hoveredPoint.id}`,
        description: `Loaded ${hoveredPoint.name} details into decision matrix.`,
      });
    }
  };

  const resetView = () => {
    setYawAngle(0.45);
    setPitchAngle(0.35);
    setAutoRotate(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Overview */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl dark:shadow-2xl relative overflow-hidden transition-colors duration-300">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-gradient-to-l from-sky-500/10 to-transparent pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-500/30">
                PAGE 2.3 • NSGA-II MULTI-OBJECTIVE OPTIMIZER
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                3D Pareto Surface (Cost × Time × Carbon)
              </span>
            </div>
            <h2 className="text-xl font-bold font-mono text-slate-900 dark:text-white tracking-tight">
              NSGA-II PARETO FRONTIER 3D SCATTER EXPLORER
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-sans mt-1 max-w-2xl">
              Simultaneous 3-objective optimization balancing Route Cost ($), Transit Time (Hours), and Carbon Emissions (CO2 Tons). Rotate the 3D scatter plot to evaluate non-dominated Pareto solution candidates.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={resetView}
              className="px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-950 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-800 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 transition-all shadow-xl flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4 text-sky-500" />
              <span>RESET 3D VIEW</span>
            </button>
            <button
              onClick={() => setAutoRotate(!autoRotate)}
              className={`px-4 py-2.5 rounded-2xl border text-xs font-mono font-bold transition-all shadow-xl flex items-center gap-2 ${
                autoRotate
                  ? 'bg-sky-500/20 text-sky-700 dark:text-sky-300 border-sky-500/40'
                  : 'bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-800'
              }`}
            >
              <Zap className="w-4 h-4 text-sky-500" />
              <span>{autoRotate ? 'PAUSE ROTATION' : 'AUTO-ROTATE'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MAIN 3D SCATTER INTERACTION & PROPERTY CARDS LAYOUT */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive 3D Canvas Box (lg:col-span-7) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xl dark:shadow-2xl space-y-4 flex flex-col justify-between transition-colors duration-300">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
              <Boxes className="w-4 h-4" />
              <span>1. 3D PARETO SCATTER PLOT (DRAG TO ROTATE)</span>
            </div>
            <div className="flex items-center gap-3 font-mono text-[10px]">
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500" />
                Pareto Optimal
              </span>
              <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-600" />
                Dominated
              </span>
            </div>
          </div>

          {/* Canvas Wrapper */}
          <div className="relative w-full h-80 sm:h-96 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 cursor-grab active:cursor-grabbing">
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onClick={handleCanvasClick}
              className="w-full h-full block"
            />

            {/* Hover Tooltip Overlay */}
            {hoveredPoint && (
              <div className="absolute top-3 left-3 bg-white/95 dark:bg-slate-950/90 backdrop-blur-md p-3 rounded-2xl border border-slate-300 dark:border-slate-800 shadow-xl font-mono text-xs pointer-events-none space-y-1">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                  <span>{hoveredPoint.id}: {hoveredPoint.name}</span>
                  {hoveredPoint.isPareto && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40">
                      Pareto Optimal
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400">
                  Cost: <strong className="text-slate-900 dark:text-white">${hoveredPoint.costUsd.toLocaleString()}</strong> | Time: <strong className="text-slate-900 dark:text-white">{hoveredPoint.timeHours}h</strong> | Carbon: <strong className="text-emerald-600 dark:text-emerald-400">{hoveredPoint.carbonTons}t</strong>
                </div>
                <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                  Click point to select into trade-off matrix
                </div>
              </div>
            )}

            <div className="absolute bottom-3 right-3 text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-white/80 dark:bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 pointer-events-none">
              Yaw: {(yawAngle % (Math.PI * 2)).toFixed(2)} rad | Pitch: {pitchAngle.toFixed(2)} rad
            </div>
          </div>

          <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1">
            <span>Left-click + Drag to rotate 3D space</span>
            <span>Green Spheres = NSGA-II Non-dominated Rank 1 Solutions</span>
          </div>
        </div>

        {/* Right: Selected Route Property Details (lg:col-span-5) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl dark:shadow-2xl space-y-5 flex flex-col justify-between transition-colors duration-300">
          <div>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-bold font-mono text-slate-900 dark:text-white uppercase tracking-wider">
                  SELECTED CANDIDATE PROPERTIES
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                {selectedPoint.id}
              </span>
            </div>

            <div className="space-y-4 font-mono">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                  {selectedPoint.name}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-sans leading-relaxed">
                  Strategy: <strong>{selectedPoint.strategy}</strong> | Feasibility: <strong>{selectedPoint.feasibilityScore}%</strong>
                </p>
              </div>

              {/* 3 Main Metric Cards */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <DollarSign className="w-3.5 h-3.5 text-amber-500 mx-auto mb-1" />
                  <span className="text-[10px] text-slate-500 block">TOTAL COST</span>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">${(selectedPoint.costUsd / 1000).toFixed(0)}k</p>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <Clock className="w-3.5 h-3.5 text-sky-500 mx-auto mb-1" />
                  <span className="text-[10px] text-slate-500 block">TRANSIT TIME</span>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedPoint.timeHours} hrs</p>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <Leaf className="w-3.5 h-3.5 text-emerald-500 mx-auto mb-1" />
                  <span className="text-[10px] text-slate-500 block">CARBON (CO2)</span>
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{selectedPoint.carbonTons} t</p>
                </div>
              </div>

              {/* Multimodal Transport Share Breakdown */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-amber-500" />
                    MULTIMODAL MODAL SPLIT
                  </span>
                  <span className="text-[10px] text-slate-500">100% Intermodal</span>
                </div>

                {/* Progress Bar Track */}
                <div className="w-full h-3 bg-slate-200 dark:bg-slate-900 rounded-full overflow-hidden flex border border-slate-300 dark:border-slate-800">
                  <div
                    style={{ width: `${selectedPoint.modeBreakdown.sea}%` }}
                    className="h-full bg-sky-500"
                    title={`Sea: ${selectedPoint.modeBreakdown.sea}%`}
                  />
                  <div
                    style={{ width: `${selectedPoint.modeBreakdown.rail}%` }}
                    className="h-full bg-emerald-500"
                    title={`Rail: ${selectedPoint.modeBreakdown.rail}%`}
                  />
                  <div
                    style={{ width: `${selectedPoint.modeBreakdown.air}%` }}
                    className="h-full bg-purple-500"
                    title={`Air: ${selectedPoint.modeBreakdown.air}%`}
                  />
                  <div
                    style={{ width: `${selectedPoint.modeBreakdown.road}%` }}
                    className="h-full bg-amber-500"
                    title={`Road: ${selectedPoint.modeBreakdown.road}%`}
                  />
                </div>

                <div className="grid grid-cols-4 gap-1 text-[10px] text-center pt-1 text-slate-600 dark:text-slate-400">
                  <div><span className="inline-block w-2 h-2 rounded-full bg-sky-500 mr-1" />Sea {selectedPoint.modeBreakdown.sea}%</div>
                  <div><span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1" />Rail {selectedPoint.modeBreakdown.rail}%</div>
                  <div><span className="inline-block w-2 h-2 rounded-full bg-purple-500 mr-1" />Air {selectedPoint.modeBreakdown.air}%</div>
                  <div><span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-1" />Road {selectedPoint.modeBreakdown.road}%</div>
                </div>
              </div>

              {/* Hazards Bypassed */}
              <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                <span className="font-bold text-slate-800 dark:text-slate-200 block">CHOKEPOINTS BYPASSED:</span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedPoint.chokepointsBypassed.map((choke: string, i: number) => (
                    <span
                      key={i}
                      className="px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[10px]"
                    >
                      ✓ {choke}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() =>
              toast({
                title: `Dispatched ${selectedPoint.name}`,
                description: `Initiated dispatch order for ${selectedPoint.id} ($${selectedPoint.costUsd.toLocaleString()}).`,
              })
            }
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-slate-950 font-mono text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-2 transform hover:scale-[1.01]"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>SELECT & DISPATCH THIS ROUTE</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PARETO FRONTIER DECISION MATRIX TABLE */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl dark:shadow-2xl space-y-4 transition-colors duration-300">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
            <TrendingUp className="w-4 h-4" />
            <span>2. PARETO FRONTIER STRATEGIC TRADE-OFF MATRIX</span>
          </div>
          <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">4 Optimal Solution Extremes</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {MOCK_PARETO_FRONTIER_TABLE.map((tradeOff) => (
            <div
              key={tradeOff.rank}
              className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-4 hover:border-sky-500/50 transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-500/30">
                    {tradeOff.tradeoffType}
                  </span>
                  <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">Rank #{tradeOff.rank}</span>
                </div>

                <h4 className="text-sm font-bold font-mono text-slate-900 dark:text-white mb-1">
                  {tradeOff.routeTitle}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-sans leading-relaxed">
                  {tradeOff.keyBenefit}
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800 font-mono text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Cost:</span>
                  <span className="font-bold text-slate-900 dark:text-white">${tradeOff.totalCostUsd.toLocaleString()}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Time:</span>
                  <span className="text-slate-800 dark:text-slate-200 font-semibold">{tradeOff.transitTimeHours} hrs ({tradeOff.transitTimeDays})</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Carbon:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">{tradeOff.carbonTons} t</span>
                </div>

                <button
                  onClick={() => {
                    const match = MOCK_PARETO_3D_POINTS.find((p) => p.isPareto);
                    if (match) setSelectedPoint(match);
                  }}
                  className="w-full mt-2 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-800 text-[11px] font-mono font-bold text-sky-600 dark:text-sky-400 transition-all flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Inspect in 3D Space</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
