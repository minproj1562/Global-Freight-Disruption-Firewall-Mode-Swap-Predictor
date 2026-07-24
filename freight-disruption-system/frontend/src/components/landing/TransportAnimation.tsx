// frontend/src/components/ui/landing/TransportAnimation.tsx
import React from 'react';
import { Ship, Plane, Train } from 'lucide-react';

export const TransportAnimation: React.FC = () => {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* PLANES - Top Layer (Sky) - 20-30% from top */}
      <div className="absolute left-0 top-[20%] w-16 h-16 text-blue-400/40 animate-fly">
        <Plane className="w-full h-full rotate-45" strokeWidth={1.5} />
      </div>
      
      <div
        className="absolute left-0 top-[25%] w-12 h-12 text-blue-300/30 animate-fly"
        style={{ animationDelay: '10s', animationDuration: '35s' }}
      >
        <Plane className="w-full h-full rotate-45" strokeWidth={1.5} />
      </div>

      <div
        className="absolute left-0 top-[28%] w-10 h-10 text-sky-400/25 animate-fly"
        style={{ animationDelay: '20s', animationDuration: '40s' }}
      >
        <Plane className="w-full h-full rotate-45" strokeWidth={1.5} />
      </div>

      {/* SHIPS - Middle Layer (On Water) - 65-75% from top */}
      <div className="absolute left-0 top-[68%] w-20 h-20 text-maritime-gold/50 animate-sail drop-shadow-lg">
        <Ship className="w-full h-full" strokeWidth={1.5} />
      </div>
      
      <div
        className="absolute left-0 top-[72%] w-16 h-16 text-maritime-gold/35 animate-sail"
        style={{ animationDelay: '15s', animationDuration: '50s' }}
      >
        <Ship className="w-full h-full" strokeWidth={1.5} />
      </div>

      <div
        className="absolute left-0 top-[70%] w-14 h-14 text-amber-400/30 animate-sail"
        style={{ animationDelay: '25s', animationDuration: '55s' }}
      >
        <Ship className="w-full h-full" strokeWidth={1.5} />
      </div>

      {/* TRAINS - Bottom Layer (On Ground/Rails) - Fixed at bottom with rail */}
      <div className="absolute bottom-0 left-0 right-0 h-32">
        {/* Railway Track */}
        <div className="absolute bottom-12 left-0 right-0 h-1 bg-gray-600/20">
          <div className="absolute inset-0 flex justify-around">
            {[...Array(50)].map((_, i) => (
              <div key={i} className="w-8 h-1 bg-gray-500/30" />
            ))}
          </div>
        </div>

        {/* Train 1 */}
        <div className="absolute bottom-6 left-0 w-20 h-20 text-emerald-400/50 animate-train">
          <Train className="w-full h-full" strokeWidth={1.5} />
        </div>
        
        {/* Train 2 */}
        <div
          className="absolute bottom-6 left-0 w-16 h-16 text-emerald-300/35 animate-train"
          style={{ animationDelay: '12s', animationDuration: '40s' }}
        >
          <Train className="w-full h-full" strokeWidth={1.5} />
        </div>

        {/* Train 3 */}
        <div
          className="absolute bottom-6 left-0 w-14 h-14 text-green-400/30 animate-train"
          style={{ animationDelay: '22s', animationDuration: '45s' }}
        >
          <Train className="w-full h-full" strokeWidth={1.5} />
        </div>
      </div>
    </div>
  );
};