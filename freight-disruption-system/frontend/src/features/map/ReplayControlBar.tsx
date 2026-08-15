import React from 'react';
import { Play, Pause, RotateCcw, Clock } from 'lucide-react';

interface ReplayControlBarProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  playbackProgress: number; // 0 to 100
  onSeek: (progress: number) => void;
  speed: number;
  onChangeSpeed: (speed: number) => void;
  replayRange?: '24h' | '7d';
  onChangeRange?: (range: '24h' | '7d') => void;
  className?: string;
}

export const ReplayControlBar: React.FC<ReplayControlBarProps> = ({
  isPlaying,
  onTogglePlay,
  playbackProgress,
  onSeek,
  speed,
  onChangeSpeed,
  replayRange = '24h',
  onChangeRange,
  className = '',
}) => {

  // Compute timestamp string based on progress (24h or 7d)
  const getTimestampForProgress = (pct: number) => {
    const totalMins = replayRange === '7d' ? 7 * 24 * 60 : 24 * 60;
    const totalMinutesAgo = (100 - pct) * (totalMins / 100);
    const date = new Date(Date.now() - totalMinutesAgo * 60 * 1000);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const currentTimestamp = getTimestampForProgress(playbackProgress);

  return (
    <div
      className={`glass-panel rounded-2xl p-3 shadow-2xl border border-slate-700/80 w-full max-w-xl text-slate-100 flex flex-col gap-2 ${className}`}
    >
      <div className="flex items-center justify-between text-xs font-mono text-slate-300">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-bold text-amber-400">HISTORICAL AIS REPLAY</span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-200">{currentTimestamp} UTC</span>
        </div>

        {/* Controls: Speed & Range Toggle */}
        <div className="flex items-center gap-2">
          {/* 24h / 7d Range Selector */}
          {onChangeRange && (
            <div className="flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800">
              {(['24h', '7d'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => onChangeRange(r)}
                  type="button"
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono transition-colors ${
                    replayRange === r ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          )}

          {/* Speed Multiplier Buttons */}
          <div className="flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800">
            {[1, 2, 4].map((s) => (
              <button
                key={s}
                onClick={() => onChangeSpeed(s)}
                type="button"
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono transition-colors ${
                  speed === s ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline Scrubber */}
      <div className="relative flex items-center gap-3">
        {/* Play/Pause Button */}
        <button
          onClick={onTogglePlay}
          type="button"
          aria-label={isPlaying ? 'Pause replay' : 'Play replay'}
          className="p-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold shadow-md transition-all shrink-0"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>

        {/* Range Scrubber Input */}
        <div className="relative flex-1 flex items-center">
          <input
            type="range"
            min={0}
            max={100}
            step={0.1}
            value={playbackProgress}
            onChange={(e) => onSeek(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400 focus:outline-none"
          />
        </div>

        {/* Reset Button */}
        <button
          onClick={() => onSeek(100)}
          type="button"
          title="Jump to Live Stream"
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
