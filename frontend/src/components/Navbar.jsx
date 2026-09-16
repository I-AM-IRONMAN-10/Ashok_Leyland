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
