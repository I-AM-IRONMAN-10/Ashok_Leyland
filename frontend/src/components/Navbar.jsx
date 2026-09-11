import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Wifi, 
  Clock, 
  Layers, 
  LogOut,
  Navigation,
  ArrowRightLeft,
  PackageCheck,
  MapPin,
  Sparkles
} from 'lucide-react';

export default function Navbar({ 
  currentUser, 
  currentRole, 
  setRole, 
  searchQuery, 
  setSearchQuery, 
  gridData = [],
  onTriggerRetrievalPath,
  onTriggerInboundPath,
  occupancyPct = 48, 
  onLogout 
}) {
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  const [showSearchResults, setShowSearchResults] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getInitials = (name) => {
    if (!name) return 'RK';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  // Filter grid matching search query
  const matchingCells = searchQuery && searchQuery.trim() ? gridData.filter(cell => {
    const q = searchQuery.toLowerCase().trim();
    return (
      (cell.engine_number && cell.engine_number.toLowerCase().includes(q)) ||
      (cell.location_code && cell.location_code.toLowerCase().includes(q)) ||
      (cell.barcode && cell.barcode.toLowerCase().includes(q))
    );
  }).slice(0, 4) : [];

  const sampleQuickEngines = ['TLHM117681', 'TLHM117682', 'TLHM117683', 'TLHM117684'];

  return (
    <header className="bg-[#1E293B] text-white border-b border-slate-700 px-4 py-2 flex flex-col md:flex-row items-center justify-between shadow-xl gap-2 z-40 relative">
      {/* Brand Identity */}
      <div className="flex items-center space-x-3 w-full md:w-auto justify-between md:justify-start">
        <div className="flex items-center space-x-2.5 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 shadow-inner">
          <div className="w-9 h-9 bg-[#016FB6] rounded-lg flex items-center justify-center font-black text-white text-base shadow-md tracking-tighter">
            AL
          </div>
          <div>
            <h1 className="text-sm font-extrabold tracking-tight uppercase text-white leading-tight flex items-center gap-1.5">
              <span>Ashok Leyland</span>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-mono px-1.5 py-0.5 rounded border border-emerald-500/30">WMS</span>
            </h1>
            <p className="text-[10px] text-slate-300 tracking-wider font-medium uppercase">
              Engine Retrieval & Path Navigation
            </p>
          </div>
        </div>

        {/* Live Scanner Badge */}
        <div className="hidden lg:flex items-center space-x-2 bg-emerald-950/70 text-emerald-300 px-3 py-1 rounded-full border border-emerald-600/50 text-xs font-mono">
          <Wifi className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
          <span>Scanner: <strong className="text-white">TLHM-BT-01</strong></span>
        </div>
      </div>

      {/* Prominent Labor-Friendly Search Bar */}
      <div className="flex-1 max-w-xl w-full relative mx-0 md:mx-4">
        <div className="relative flex items-center">
          <Search className="w-5 h-5 absolute left-3 text-amber-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchResults(true);
            }}
            onFocus={() => setShowSearchResults(true)}
            placeholder="⚡ EASY RETRIEVAL: Type Engine SN like tlhm117681 or Cell ID..."
            className="w-full pl-10 pr-10 py-2 bg-slate-900 text-white text-xs md:text-sm font-mono font-bold rounded-xl border-2 border-[#016FB6] focus:outline-none focus:ring-4 focus:ring-blue-500/40 placeholder-slate-400 shadow-inner tracking-wide"
          />
          {searchQuery && (
            <button 
              onClick={() => {
                setSearchQuery('');
                setShowSearchResults(false);
              }}
              className="absolute right-3 text-xs bg-slate-700 text-slate-300 hover:text-white px-2 py-0.5 rounded-full font-bold"
            >
              ✕ Clear
            </button>
          )}
        </div>

        {/* Quick Pick Chips for Laborers */}
        <div className="flex items-center space-x-1.5 mt-1 overflow-x-auto text-[11px]">
          <span className="text-slate-400 font-bold text-[10px] uppercase shrink-0">Quick Pick:</span>
          {sampleQuickEngines.map(sn => (
            <button
              key={sn}
              onClick={() => {
                setSearchQuery(sn);
                setShowSearchResults(true);
              }}
              className={`px-2 py-0.5 rounded-md font-mono font-bold border transition shrink-0 ${searchQuery.toUpperCase() === sn ? 'bg-[#016FB6] text-white border-blue-400 shadow' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}`}
            >
              {sn}
            </button>
          ))}
        </div>

        {/* Search Results Dropdown Overlay */}
        {showSearchResults && matchingCells.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 text-white rounded-xl shadow-2xl border-2 border-blue-500 z-50 p-2 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase border-b border-slate-700 pb-1 px-2">
              <span>Matching Storage Engines ({matchingCells.length})</span>
              <button 
                onClick={() => setShowSearchResults(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Close ✕
              </button>
            </div>
            {matchingCells.map(cell => (
              <div 
                key={cell.location_code}
                className="bg-slate-800 p-2.5 rounded-lg border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-750 transition"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-extrabold text-amber-400 text-sm">{cell.engine_number || 'NO ENGINE'}</span>
                    <span className="bg-[#016FB6] text-white font-mono px-2 py-0.5 rounded text-xs font-bold">
                      Rack {cell.location_code}
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${cell.status === 'OCCUPIED' ? 'bg-emerald-900 text-emerald-300' : 'bg-slate-700 text-slate-300'}`}>
                      {cell.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-300 font-medium">
                    Barcode: <span className="font-mono text-emerald-400">{cell.barcode || 'N/A'}</span> • Model: {cell.model_name || 'H-Series'}
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 shrink-0">
                  <button
                    onClick={() => {
                      if (onTriggerRetrievalPath) onTriggerRetrievalPath(cell.location_code);
                      setShowSearchResults(false);
                    }}
                    className="px-3 py-1.5 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1 shadow-md active:scale-95 transition"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Retrieve (Nearest Path)</span>
                  </button>

                  <button
                    onClick={() => {
                      if (onTriggerInboundPath) onTriggerInboundPath(cell.location_code);
                      setShowSearchResults(false);
                    }}
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center space-x-1 shadow-md active:scale-95 transition"
                  >
                    <PackageCheck className="w-3.5 h-3.5" />
                    <span>Storage Intake Path</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-3 text-xs shrink-0">
        <div className="hidden xl:flex items-center space-x-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
          <Layers className="w-4 h-4 text-[#016FB6]" />
          <span className="text-slate-300 font-medium">Occupancy:</span>
          <span className="font-bold text-[#016FB6] font-mono text-sm">{occupancyPct}%</span>
        </div>

        <div className="hidden sm:flex items-center space-x-1 text-slate-300 font-mono">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{time}</span>
        </div>

        <div className="flex items-center space-x-2 bg-[#016FB6] text-white px-3 py-1.5 rounded-lg font-bold shadow-md">
          <ShieldCheck className="w-4 h-4 text-white" />
          <span>{currentRole === 'OPERATOR' ? 'Floor Lifter' : 'Supervisor'}</span>
        </div>

        <button
          onClick={onLogout}
          className="p-2 rounded-lg bg-slate-800 hover:bg-red-600 text-slate-300 hover:text-white transition shadow"
          title="Logout"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
