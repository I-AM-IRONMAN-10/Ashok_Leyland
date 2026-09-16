import React, { useState } from 'react';
import { 
  Info, 
  Layers, 
  RefreshCw, 
  ZoomIn, 
  ZoomOut, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRightLeft,
  Navigation,
  PackageCheck,
  ChevronLeft,
  ChevronRight,
  X,
  Compass,
  ArrowRight
} from 'lucide-react';

export default function WarehouseGrid({ 
  gridData = [], 
  onSelectLocation, 
  selectedLocCode, 
  searchQuery, 
  activeRelocationPath = [],
  activePath = null,
  onClearPath = () => {},
  onTriggerRetrievalForCell,
  onTriggerInboundForCell
}) {
  const [tooltipLoc, setTooltipLoc] = useState(null);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [gridScale, setGridScale] = useState(1.0); // 0.7 to 1.4
  const [stepIdx, setStepIdx] = useState(0);

  const rows = ["A", "B", "C", "D", "E", "F", "G", "H"];
  const cols = Array.from({ length: 12 }, (_, i) => i + 1);

  // Status Legend Counts
  const counts = {
    OCCUPIED: gridData.filter(c => c.status === 'OCCUPIED').length,
    AVAILABLE: gridData.filter(c => c.status === 'AVAILABLE').length,
    PENDING_CONFIRMATION: gridData.filter(c => c.status === 'PENDING_CONFIRMATION').length,
    BLOCKED: gridData.filter(c => c.status === 'BLOCKED').length,
    RELOCATING: gridData.filter(c => c.status === 'RELOCATING').length,
    RESERVED_TEMP: gridData.filter(c => c.status === 'RESERVED_TEMP').length,
  };

  const getCellStatusClass = (cell) => {
    if (cell.is_dispatch || cell.is_retrieval_target) return 'cell-dispatch hover:bg-red-700 text-white font-black ring-4 ring-red-500 animate-pulse shadow-lg shadow-red-500/50 z-30';
    switch (cell.status) {
      case 'OCCUPIED': return 'cell-occupied hover:bg-emerald-800 text-white';
      case 'AVAILABLE': return 'cell-available hover:bg-slate-300 text-slate-800';
      case 'PENDING_CONFIRMATION': return 'cell-pending hover:bg-amber-600 text-white';
      case 'BLOCKED': return 'cell-blocked hover:bg-red-700 text-white';
      case 'RELOCATING': return 'cell-relocating hover:bg-purple-800 text-white';
      case 'RESERVED_TEMP': return 'cell-reserved hover:bg-neutral-800 text-white';
      default: return 'cell-available text-slate-800';
    }
  };

  const isMatchSearch = (cell) => {
    if (!searchQuery || !searchQuery.trim()) return false;
    const q = searchQuery.toLowerCase().trim();
    return (
      (cell.location_code && cell.location_code.toLowerCase().includes(q)) ||
      (cell.engine_number && cell.engine_number.toLowerCase().includes(q)) ||
      (cell.barcode && cell.barcode.toLowerCase().includes(q)) ||
      (cell.model_name && cell.model_name.toLowerCase().includes(q)) ||
      (cell.batch_number && cell.batch_number.toLowerCase().includes(q))
    );
  };

  const getRelocationBadge = (locCode) => {
    if (!activeRelocationPath || activeRelocationPath.length === 0) return null;
    const step = activeRelocationPath.find(s => s.from_location === locCode || s.to_location === locCode);
    if (step) {
      return { step: step.step_number, phase: step.phase, isFromLoc: step.from_location === locCode };
    }
    return null;
  };

  // Path step checking
  const getPathStepInfo = (locCode) => {
    if (!activePath || !activePath.path) return null;
    const item = activePath.path.find(p => p.location_code === locCode);
    if (!item) return null;
    return item;
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col h-full">
      {/* Active Path Visual Header Banner & Labor Navigation Controller */}
      {activePath && activePath.type === 'INBOUND' && (
        <div className="p-4 border-b text-white shadow-md transition-all bg-gradient-to-r from-emerald-800 via-teal-900 to-emerald-950 border-emerald-500">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl text-white font-extrabold bg-emerald-600">
                <PackageCheck className="w-6 h-6 animate-bounce" />
              </div>
              <div>
                <div className="text-[11px] font-mono uppercase tracking-widest text-emerald-300 font-bold">
                  📥 INBOUND STORAGE ROOM PATH
                </div>
                <h3 className="text-base font-extrabold tracking-tight">
                  {activePath.title}
                </h3>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="bg-black/40 px-3 py-1.5 rounded-xl border border-white/20 text-xs font-mono">
                Distance: <strong className="text-amber-300 font-bold">{activePath.distanceMeters}m</strong> | Steps: <strong className="text-white">{activePath.totalSteps}</strong>
              </div>
              <button
                onClick={onClearPath}
                className="px-3 py-1.5 bg-white/10 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1 border border-white/20"
              >
                <X className="w-4 h-4" />
                <span>Clear Path</span>
              </button>
            </div>
          </div>

          {/* Laborer Turn-by-Turn Guidance Banner */}
          {activePath.instructions && activePath.instructions.length > 0 && (
            <div className="bg-slate-900/90 border border-slate-700 rounded-xl p-3 flex flex-col md:flex-row items-center justify-between gap-3 shadow-inner">
              <div className="flex items-center space-x-3 text-sm font-bold text-amber-200">
                <span className="bg-amber-500 text-slate-950 px-2.5 py-1 rounded-lg text-xs font-mono font-black shrink-0">
                  STEP {stepIdx + 1}/{activePath.instructions.length}
                </span>
                <span className="text-white font-extrabold tracking-wide">
                  {activePath.instructions[stepIdx]}
                </span>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  disabled={stepIdx === 0}
                  onClick={() => setStepIdx(prev => Math.max(0, prev - 1))}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white rounded-lg text-xs font-bold flex items-center space-x-1 border border-slate-600"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Prev</span>
                </button>
                <button
                  disabled={stepIdx === activePath.instructions.length - 1}
                  onClick={() => setStepIdx(prev => Math.min(activePath.instructions.length - 1, prev + 1))}
                  className="px-4 py-1.5 bg-[#016FB6] hover:bg-blue-600 disabled:opacity-40 text-white rounded-lg text-xs font-bold flex items-center space-x-1 shadow-md"
                >
                  <span>Next Step</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Header & Status Legend */}
      <div className="bg-[#3F3F3F] text-white p-3.5 flex flex-wrap items-center justify-between border-b border-slate-700 gap-2">
        <div className="flex items-center space-x-2">
          <Layers className="w-5 h-5 text-[#016FB6]" />
          <h2 className="text-sm font-bold tracking-wide uppercase"> Warehouse Storage Grid</h2>
          <span className="text-xs text-slate-300 font-mono bg-[#2B2B2B] px-2 py-0.5 rounded border border-slate-600">
            Bay 04 (A1 Entrance)
          </span>
          <div className="flex items-center bg-[#2B2B2B] border border-slate-600 rounded-lg overflow-hidden ml-2">
            <button
              onClick={() => setGridScale(prev => Math.max(0.7, prev - 0.1))}
              className="p-1.5 hover:bg-gray-700 text-slate-300 transition"
              title="Zoom Out Map"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] px-2 font-mono font-bold text-slate-200 border-x border-slate-600">
              {Math.round(gridScale * 100)}%
            </span>
            <button
              onClick={() => setGridScale(prev => Math.min(1.4, prev + 0.1))}
              className="p-1.5 hover:bg-gray-700 text-slate-300 transition"
              title="Zoom In Map"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Legend Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
          <button 
            onClick={() => setFilterStatus('ALL')}
            className={`px-2 py-0.5 rounded border transition ${filterStatus === 'ALL' ? 'bg-[#016FB6] text-white border-blue-400' : 'bg-slate-700 text-slate-300 border-slate-600'}`}
          >
            All ({gridData.length})
          </button>
          <span className="flex items-center space-x-1 bg-emerald-900/80 text-emerald-200 px-2 py-0.5 rounded border border-emerald-600">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>Occupied ({counts.OCCUPIED})</span>
          </span>
          <span className="flex items-center space-x-1 bg-slate-700 text-slate-200 px-2 py-0.5 rounded border border-slate-500">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span>
            <span>Available ({counts.AVAILABLE})</span>
          </span>
          <span className="flex items-center space-x-1 bg-amber-900/80 text-amber-200 px-2 py-0.5 rounded border border-amber-600">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
            <span>Pending ({counts.PENDING_CONFIRMATION})</span>
          </span>
          <span className="flex items-center space-x-1 bg-red-900/90 text-red-100 px-2 py-0.5 rounded border border-red-500 font-bold animate-pulse">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
            <span>Target Retrieval (Red)</span>
          </span>
        </div>
      </div>

      {/* Storage Room Gate 1 Entrance Marker Banner */}
      <div className="bg-slate-100 border-b border-slate-300 py-1.5 px-4 flex items-center justify-between text-xs font-bold text-slate-700 uppercase">
        <div className="flex items-center space-x-2 bg-emerald-100 text-emerald-900 px-3 py-1 rounded-full border border-emerald-300">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-ping"></span>
          <span>🏁 GATE 1: STORAGE ROOM INTAKE & DISPATCH ENTRANCE (A1)</span>
        </div>
        <div className="hidden sm:inline-flex items-center space-x-2 text-slate-500 text-[11px]">
          <ArrowRightLeft className="w-3.5 h-3.5 text-[#016FB6]" />
          <span>MAIN FORKLIFT ACCESS AISLE (COL 1)</span>
        </div>
      </div>

      {/* Main Grid Viewport */}
      <div className="p-4 overflow-auto flex-1 bg-[#F5F7FA]">
        <div className="min-w-[760px] transition-all duration-200">
          {/* Column Header Numbers */}
          <div className="flex mb-2 ml-10">
            {cols.map(c => (
              <div key={c} className={`flex-1 text-center font-bold text-xs font-mono ${c === 1 ? 'text-emerald-700 underline font-black' : 'text-slate-500'}`}>
                {c === 1 ? 'COL 1 (AISLE)' : `COL ${c}`}
              </div>
            ))}
          </div>

          {/* Rows A to H */}
          {rows.map(r => (
            <div key={r} className="flex items-center mb-2">
              <div 
                style={{ height: `${56 * gridScale}px` }}
                className="w-10 font-extrabold text-sm text-[#016FB6] font-mono tracking-wider flex items-center justify-center bg-slate-200 rounded border border-slate-300 mr-2 shadow-sm"
              >
                {r}
              </div>

              {/* Grid Cells in Row */}
              <div className="flex-1 grid grid-cols-12 gap-2">
                {cols.map(c => {
                  const locCode = `${r}${c}`;
                  const cell = gridData.find(g => g.location_code === locCode) || {
                    location_code: locCode,
                    status: 'AVAILABLE'
                  };
                  const isSelected = selectedLocCode === locCode;
                  const isMatched = isMatchSearch(cell);
                  const relocInfo = getRelocationBadge(locCode);
                  const isTargetRetrieval =
                    (activePath && activePath.type === 'RETRIEVAL' && activePath.targetLocation === locCode) ||
                    cell.is_dispatch ||
                    cell.is_retrieval_target ||
                    (relocInfo && relocInfo.phase === 'TARGET_EXTRACTION' && relocInfo.isFromLoc);

                  const pathStep = getPathStepInfo(locCode);

                  // Styling for active path overlay
                  let pathBorderClass = '';
                  if (pathStep) {
                    if (activePath.type === 'INBOUND') {
                      pathBorderClass = 'ring-4 ring-emerald-500 bg-emerald-600 text-white font-bold animate-pulse shadow-lg z-20';
                    } else {
                      pathBorderClass = 'ring-4 ring-red-500 bg-red-600 text-white font-bold animate-pulse shadow-lg shadow-red-500/40 z-20';
                    }
                  }

                  return (
                    <div
                      key={locCode}
                      onClick={() => onSelectLocation(cell)}
                      onMouseEnter={() => setTooltipLoc(cell)}
                      onMouseLeave={() => setTooltipLoc(null)}
                      style={{ 
                        height: `${56 * gridScale}px`,
                        fontSize: `${Math.max(8, Math.round(10 * gridScale))}px`
                      }}
                      className={`relative rounded-xl border-2 p-1.5 flex flex-col justify-between cursor-pointer transition-all duration-150 shadow-sm select-none ${
                        isTargetRetrieval
                          ? 'cell-dispatch bg-red-600 border-red-800 text-white ring-4 ring-red-500 animate-pulse shadow-xl shadow-red-600/60 z-30 scale-105 font-extrabold'
                          : pathStep 
                            ? pathBorderClass 
                            : getCellStatusClass(cell)
                      } ${
                        isSelected ? 'ring-4 ring-[#016FB6] ring-offset-1 z-30 scale-105 shadow-xl' : ''
                      } ${isMatched ? 'pulse-highlight border-blue-500 ring-2 ring-blue-400' : ''}`}
                    >
                      {/* Top Bar: Location Code & Step Badge */}
                      <div className="flex items-center justify-between text-[9px] font-mono leading-none">
                        <span className="font-extrabold tracking-tight opacity-90">{locCode}</span>
                        
                        {isTargetRetrieval && (
                          <span className="px-1 py-0.5 rounded bg-black/80 text-red-300 font-mono text-[9px] font-extrabold uppercase border border-red-400 tracking-tighter shrink-0 animate-pulse">
                            🚨 RETRIEVE
                          </span>
                        )}

                        {pathStep && !isTargetRetrieval && (
                          <span className={`px-1 rounded font-black font-mono text-[10px] ${activePath.type === 'INBOUND' ? 'bg-black text-emerald-300' : 'bg-black text-red-200'}`}>
                            #{pathStep.step} {pathStep.icon}
                          </span>
                        )}

                        {!pathStep && !isTargetRetrieval && cell.status === 'OCCUPIED' && (
                          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm"></span>
                        )}
                      </div>

                      {/* Middle: Engine Number (like TLHM117681) */}
                      <div 
                        style={{ fontSize: `${Math.max(9, Math.round(11 * gridScale))}px` }}
                        className="text-center font-extrabold tracking-tight truncate my-0.5 font-mono"
                      >
                        {cell.engine_number ? cell.engine_number : 'EMPTY'}
                      </div>

                      {/* Bottom Status / Direction Icon */}
                      <div className="flex items-center justify-between text-[8px] font-medium uppercase tracking-tighter truncate opacity-90">
                        <span>{cell.status === 'PENDING_CONFIRMATION' ? 'PENDING' : cell.status.replace('_TEMP', '')}</span>
                        {locCode === 'A1' && <span className="bg-emerald-800 text-white px-1 rounded font-bold">GATE 1</span>}
                      </div>

                      {/* Hover Tooltip Card */}
                      {tooltipLoc && tooltipLoc.location_code === locCode && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 bg-[#1E293B] text-white p-3.5 rounded-xl shadow-2xl z-50 text-xs border border-slate-600 pointer-events-none space-y-2">
                          <div className="flex justify-between items-center border-b border-slate-700 pb-1.5">
                            <span className="font-bold text-amber-400 font-mono text-sm">Rack Cell {cell.location_code}</span>
                            <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${cell.status === 'OCCUPIED' ? 'bg-emerald-900 text-emerald-300' : 'bg-slate-800 text-slate-300'}`}>
                              {cell.status}
                            </span>
                          </div>
                          {cell.engine_number ? (
                            <div className="space-y-1 text-slate-300">
                              <div><strong className="text-white">Engine SN:</strong> <span className="font-mono font-bold text-amber-300 text-sm">{cell.engine_number}</span></div>
                              <div><strong className="text-white">Barcode:</strong> <span className="font-mono text-emerald-400">{cell.barcode}</span></div>
                              <div><strong className="text-white">Model:</strong> {cell.model_name || 'H-Series 6-Cyl'}</div>
                              <div><strong className="text-white">Batch:</strong> {cell.batch_number || 'BATCH-2026-Q3'}</div>
                            </div>
                          ) : (
                            <div className="text-slate-400 italic">Empty storage cell available for engine placement</div>
                          )}

                          {cell.engine_number && (
                            <div className="pt-2 border-t border-slate-700 flex space-x-2 pointer-events-auto">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onTriggerInboundForCell) onTriggerInboundForCell(cell.location_code);
                                }}
                                className="w-full py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded font-bold text-[10px] uppercase tracking-wider shadow"
                              >
                                📥 Inbound Path
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
