import React, { useState, useEffect, useRef } from 'react';
import { Search, Ship, Anchor, AlertTriangle, X, Clock, ChevronRight } from 'lucide-react';
import { Vessel, Port, Disruption, SearchResult } from '../../types';

interface MapSearchProps {
  vessels: Vessel[];
  ports: Port[];
  disruptions: Disruption[];
  onSelectResult: (result: SearchResult) => void;
  className?: string;
}

export const MapSearch: React.FC<MapSearchProps> = ({
  vessels,
  ports,
  disruptions,
  onSelectResult,
  className = '',
}) => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('recent_searches') || '[]');
    } catch {
      return ['EVER GIVEN', 'Port of Singapore', 'Red Sea'];
    }
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 200);
    return () => clearTimeout(handler);
  }, [query]);

  // Compute Search Results grouped by Vessels and Ports
  const getResults = (): { vesselResults: SearchResult[]; portResults: SearchResult[]; disruptionResults: SearchResult[] } => {
    if (!debouncedQuery.trim()) {
      return { vesselResults: [], portResults: [], disruptionResults: [] };
    }

    const q = debouncedQuery.toLowerCase();

    const vesselResults: SearchResult[] = vessels
      .filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          v.imo.toString().includes(q) ||
          v.flag.toLowerCase().includes(q) ||
          v.vessel_type.toLowerCase().includes(q)
      )
      .slice(0, 5)
      .map((v) => ({
        id: v.id,
        type: 'vessel',
        name: v.name,
        subtitle: `${v.flag} • IMO ${v.imo} • ${v.vessel_type} (${v.speed} kn)`,
        latitude: v.latitude,
        longitude: v.longitude,
        item: v,
      }));

    const portResults: SearchResult[] = ports
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q) ||
          p.country.toLowerCase().includes(q)
      )
      .slice(0, 5)
      .map((p) => ({
        id: p.id,
        type: 'port',
        name: p.name,
        subtitle: `${p.code} • ${p.country} • ${p.waiting_vessels} waiting vessels`,
        latitude: p.latitude,
        longitude: p.longitude,
        item: p,
      }));

    const disruptionResults: SearchResult[] = disruptions
      .filter((d) => d.name.toLowerCase().includes(q) || d.type.toLowerCase().includes(q))
      .slice(0, 3)
      .map((d) => ({
        id: d.id,
        type: 'disruption',
        name: d.name,
        subtitle: `${d.type} • ${d.affected_vessels_count} vessels affected`,
        latitude: d.polygon_coordinates[0][1],
        longitude: d.polygon_coordinates[0][0],
        item: d,
      }));

    return { vesselResults, portResults, disruptionResults };
  };

  const { vesselResults, portResults, disruptionResults } = getResults();
  const allFlattened = [...vesselResults, ...portResults, ...disruptionResults];

  // Handle Keyboard Navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
      return;
    }

    if (!isOpen || allFlattened.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % allFlattened.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + allFlattened.length) % allFlattened.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (allFlattened[selectedIndex]) {
        handleSelect(allFlattened[selectedIndex]);
      }
    }
  };

  const handleSelect = (result: SearchResult) => {
    onSelectResult(result);
    setQuery(result.name);
    setIsOpen(false);

    // Save recent search
    setRecentSearches((prev) => {
      const updated = [result.name, ...prev.filter((item) => item !== result.name)].slice(0, 5);
      localStorage.setItem('recent_searches', JSON.stringify(updated));
      return updated;
    });
  };

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={`relative w-72 sm:w-80 lg:w-96 ${className}`}>
      {/* Search Input Bar */}
      <div className="relative flex items-center">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setSelectedIndex(0);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search Vessels, Ports, Disruption Zones..."
          className="w-full h-11 pl-10 pr-9 text-xs rounded-2xl glass-panel text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/40 border border-slate-700/80 transition-all font-mono"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setDebouncedQuery('');
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Grouped Results Dropdown */}
      {isOpen && (
        <div className="absolute top-12 left-0 right-0 z-50 glass-panel rounded-2xl border border-slate-700/80 shadow-2xl p-2 max-h-96 overflow-y-auto">
          {debouncedQuery.trim() === '' ? (
            /* Recent Searches when query is empty */
            <div className="p-2">
              <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-slate-400 mb-2 px-2">
                <Clock className="w-3 h-3 text-amber-400" /> RECENT SEARCHES
              </div>
              {recentSearches.length > 0 ? (
                recentSearches.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setQuery(item);
                      setIsOpen(true);
                    }}
                    type="button"
                    className="w-full flex items-center justify-between p-2 rounded-xl text-xs text-slate-300 hover:bg-slate-800/80 transition-colors text-left font-mono"
                  >
                    <span>{item}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                ))
              ) : (
                <p className="text-xs text-slate-500 px-2">No recent searches</p>
              )}
            </div>
          ) : allFlattened.length === 0 ? (
            /* Empty Search Results */
            <div className="p-4 text-center text-xs text-slate-400">
              No matching vessels, ports, or disruption zones found.
            </div>
          ) : (
            /* Grouped Results List */
            <div className="space-y-3 p-1">
              {/* Vessels Header & List */}
              {vesselResults.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-mono font-bold text-amber-400 tracking-wider">
                    <Ship className="w-3 h-3" /> VESSELS ({vesselResults.length})
                  </div>
                  <div className="space-y-1">
                    {vesselResults.map((res) => {
                      const globalIdx = allFlattened.findIndex((item) => item.id === res.id);
                      const isSelected = globalIdx === selectedIndex;
                      return (
                        <button
                          key={res.id}
                          onClick={() => handleSelect(res)}
                          type="button"
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-colors font-mono ${
                            isSelected ? 'bg-amber-500/20 text-white border border-amber-500/40' : 'hover:bg-slate-800/80 text-slate-200'
                          }`}
                        >
                          <div>
                            <div className="text-xs font-bold text-white">{res.name}</div>
                            <div className="text-[11px] text-slate-400 font-sans">{res.subtitle}</div>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Ports Header & List */}
              {portResults.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-mono font-bold text-sky-400 tracking-wider">
                    <Anchor className="w-3 h-3" /> PORTS ({portResults.length})
                  </div>
                  <div className="space-y-1">
                    {portResults.map((res) => {
                      const globalIdx = allFlattened.findIndex((item) => item.id === res.id);
                      const isSelected = globalIdx === selectedIndex;
                      return (
                        <button
                          key={res.id}
                          onClick={() => handleSelect(res)}
                          type="button"
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-colors font-mono ${
                            isSelected ? 'bg-sky-500/20 text-white border border-sky-500/40' : 'hover:bg-slate-800/80 text-slate-200'
                          }`}
                        >
                          <div>
                            <div className="text-xs font-bold text-white">{res.name}</div>
                            <div className="text-[11px] text-slate-400 font-sans">{res.subtitle}</div>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Disruptions Header & List */}
              {disruptionResults.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-mono font-bold text-rose-400 tracking-wider">
                    <AlertTriangle className="w-3 h-3" /> DISRUPTIONS ({disruptionResults.length})
                  </div>
                  <div className="space-y-1">
                    {disruptionResults.map((res) => {
                      const globalIdx = allFlattened.findIndex((item) => item.id === res.id);
                      const isSelected = globalIdx === selectedIndex;
                      return (
                        <button
                          key={res.id}
                          onClick={() => handleSelect(res)}
                          type="button"
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-colors font-mono ${
                            isSelected ? 'bg-rose-500/20 text-white border border-rose-500/40' : 'hover:bg-slate-800/80 text-slate-200'
                          }`}
                        >
                          <div>
                            <div className="text-xs font-bold text-rose-300">{res.name}</div>
                            <div className="text-[11px] text-slate-400 font-sans">{res.subtitle}</div>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
