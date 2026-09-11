import React, { useState, useEffect } from 'react';
import { Workflow, Play, QrCode, AlertTriangle, Move, PackageCheck, Target } from 'lucide-react';
import WarehouseGrid from './WarehouseGrid';
import { executeRetrievalStep } from '../utils/api';

export default function IntelligentRetrievalView({ gridData = [], onExecuteStepSequence, setActiveRelocationPath, initialBarcode }) {
  const [engineBarcode, setEngineBarcode] = useState(initialBarcode || 'TLHM117681');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Manual Blocker Allocation States
  const [targetCell, setTargetCell] = useState(null);
  const [blockers, setBlockers] = useState([]);
  const [blockerAllocations, setBlockerAllocations] = useState({});
  const [activeBlockerLoc, setActiveBlockerLoc] = useState(null);
  const [manualInputs, setManualInputs] = useState({});

  // Quick sample barcodes for populated occupied rows A-F
  const sampleEngineBarcodes = [
    { code: 'TLHM117681', eng: 'TLHM117681', loc: 'A1', note: 'Row A Front (Direct Retrieval)' },
    { code: 'TLHM117692', eng: 'TLHM117692', loc: 'A12', note: 'Row A Deepest (Blocked by A1-A11)' },
    { code: 'TLHM117693', eng: 'TLHM117693', loc: 'B1', note: 'Row B Front Engine' },
    { code: 'TLHM117705', eng: 'TLHM117705', loc: 'C1', note: 'Row C Front Engine' },
    { code: 'TLHM117717', eng: 'TLHM117717', loc: 'D1', note: 'Row D Front Engine' },
    { code: 'TLHM117741', eng: 'TLHM117741', loc: 'F1', note: 'Row F Front Engine' },
  ];

  useEffect(() => {
    if (initialBarcode) {
      setEngineBarcode(initialBarcode);
      const found = gridData.find(c => 
        (c.engine_number && c.engine_number.toUpperCase() === initialBarcode.toUpperCase()) ||
        (c.barcode && c.barcode.toUpperCase() === initialBarcode.toUpperCase()) ||
        (c.location_code && c.location_code.toUpperCase() === initialBarcode.toUpperCase())
      );
      if (found) {
        processRetrievalForCell(found);
      }
    }
  }, [initialBarcode, gridData]);

  // Determine active target location code to highlight as RED BOX on map
  const cleanInput = engineBarcode ? engineBarcode.trim().toUpperCase() : '';
  const currentTargetCell = targetCell || gridData.find(c =>
    (c.engine_number && c.engine_number.toUpperCase() === cleanInput) ||
    (c.barcode && c.barcode.toUpperCase() === cleanInput) ||
    (c.location_code && c.location_code.toUpperCase() === cleanInput)
  );

  const activeTargetLoc = currentTargetCell?.location_code;

  // Decorate gridData so the target engine cell shows in RED
  const gridWithRedHighlights = gridData.map(c => {
    if (activeTargetLoc && c.location_code === activeTargetLoc) {
      return { ...c, is_dispatch: true, is_retrieval_target: true };
    }
    return c;
  });

  const parseCellCode = (input) => {
    const match = input.trim().match(/^([A-H])\d*-?(\d+)$/i);
    if (!match) return null;
    const row = match[1].toUpperCase();
    const col = parseInt(match[2], 10);
    if (col < 1 || col > 12) return null;
    return `${row}${col}`;
  };

  const handleCalculatePlan = async (e) => {
    if (e) e.preventDefault();
    if (!engineBarcode.trim()) return;

    setLoading(true);
    setErrorMsg('');

    const foundTargetCell = gridData.find(c =>
      (c.engine_number && c.engine_number.toUpperCase() === cleanInput) ||
      (c.barcode && c.barcode.toUpperCase() === cleanInput) ||
      (c.location_code && c.location_code.toUpperCase() === cleanInput)
    );

    if (!foundTargetCell) {
      setErrorMsg(`❌ ENGINE SERIAL NUMBER / BARCODE "${cleanInput}" NOT FOUND IN WAREHOUSE INVENTORY! Please select or enter a valid stored engine code like TLHM117681.`);
      setLoading(false);
      return;
    }

    processRetrievalForCell(foundTargetCell);
  };

  const processRetrievalForCell = async (foundTargetCell) => {
    const targetLocCode = foundTargetCell.location_code;
    const row = foundTargetCell.row;
    const col = foundTargetCell.col;

    // Detect front blocking engines in row (Cols 1 to col - 1)
    const foundBlockers = [];
    for (let c = 1; c < col; c++) {
      const locCode = `${row}${c}`;
      const cell = gridData.find(g => g.location_code === locCode);
      if (cell && (cell.status === 'OCCUPIED' || cell.status === 'PENDING_CONFIRMATION')) {
        foundBlockers.push({
          loc_code: locCode,
          engine_number: cell.engine_number || `TLHM${117680 + c}`,
          barcode: cell.barcode || `TLHM-${117680 + c}`
        });
      }
    }

    setTargetCell(foundTargetCell);
    setBlockers(foundBlockers);
    setBlockerAllocations({});
    setManualInputs({});

    if (foundBlockers.length > 0) {
      setActiveBlockerLoc(foundBlockers[0].loc_code);
      setLoading(false);
    } else {
      // Direct access - no blockers
      setLoading(false);
    }
  };

  const handleExecuteDirectRetrieval = async () => {
    if (!currentTargetCell) return;
    setLoading(true);
    const directStep = {
      step_number: 1,
      phase: 'TARGET_EXTRACTION',
      action_title: `RETRIEVE TARGET ENGINE BARCODE ${currentTargetCell.barcode || currentTargetCell.engine_number} from Cell ${currentTargetCell.location_code} -> DISPATCH BAY`,
      engine_number: currentTargetCell.engine_number,
      barcode: currentTargetCell.barcode,
      from_location: currentTargetCell.location_code,
      to_location: 'DISPATCH_BAY_NORTH',
      is_target: true
    };

    onExecuteStepSequence(directStep);

    await executeRetrievalStep(
      1,
      currentTargetCell.barcode || currentTargetCell.engine_number,
      currentTargetCell.location_code,
      'DISPATCH_BAY_NORTH',
      'Floor Lifter (Operator)'
    );

    alert(`✅ Target engine ${currentTargetCell.engine_number} successfully dispatched directly!`);
    setTargetCell(null);
    setBlockers([]);
    setBlockerAllocations({});
    setActiveRelocationPath([]);
    setEngineBarcode('');
    setLoading(false);
  };

  const handleSelectMapCell = (cell) => {
    if (activeBlockerLoc && blockers.length > 0) {
      handleAssignBlockerLocation(activeBlockerLoc, cell.location_code);
    } else if (cell.status === 'OCCUPIED' && cell.engine_number) {
      setEngineBarcode(cell.engine_number);
      processRetrievalForCell(cell);
    }
  };

  const handleAssignBlockerLocation = (blockerLoc, destLoc) => {
    setErrorMsg('');
    const cell = gridData.find(g => g.location_code === destLoc);
    if (!cell) {
      setErrorMsg(`🚨 Storage cell "${destLoc}" does not exist in the warehouse.`);
      return;
    }
    if (cell.status !== 'AVAILABLE') {
      setErrorMsg(`🚨 Cell "${destLoc}" is already occupied or unavailable (Status: ${cell.status}).`);
      return;
    }

    const alreadyAllocated = Object.entries(blockerAllocations).find(
      ([bLoc, dLoc]) => bLoc !== blockerLoc && dLoc === destLoc
    );
    if (alreadyAllocated) {
      setErrorMsg(`🚨 Cell "${destLoc}" is already chosen for blocker at ${alreadyAllocated[0]}.`);
      return;
    }

    setBlockerAllocations(prev => ({
      ...prev,
      [blockerLoc]: destLoc
    }));
    setManualInputs(prev => ({
      ...prev,
      [blockerLoc]: destLoc
    }));

    const currentIdx = blockers.findIndex(b => b.loc_code === blockerLoc);
    if (currentIdx < blockers.length - 1) {
      setActiveBlockerLoc(blockers[currentIdx + 1].loc_code);
    } else {
      setActiveBlockerLoc(null);
    }
  };

  const handleManualInputSubmit = (e, blockerLoc) => {
    e.preventDefault();
    const val = manualInputs[blockerLoc] || '';
    const parsed = parseCellCode(val);
    if (!parsed) {
      setErrorMsg(`🚨 Invalid cell ID format. Use formats like B3, B2-03, or B03.`);
      return;
    }
    handleAssignBlockerLocation(blockerLoc, parsed);
  };

  const handleGenerateManualPlanAndExecute = async () => {
    const unallocated = blockers.find(b => !blockerAllocations[b.loc_code]);
    if (unallocated) {
      setErrorMsg(`🚨 Please assign a destination for all blockers before executing.`);
      return;
    }

    setLoading(true);
    setErrorMsg('');

    const sequence = [];
    let stepNum = 1;

    blockers.forEach((blocker) => {
      const tempLoc = blockerAllocations[blocker.loc_code];
      sequence.push({
        step_number: stepNum++,
        phase: 'PERMANENT_RELOCATION',
        action_title: `Move Front Blocker Barcode ${blocker.barcode} from ${blocker.loc_code} -> Cell ${tempLoc}`,
        engine_number: blocker.engine_number,
        barcode: blocker.barcode,
        from_location: blocker.loc_code,
        to_location: tempLoc,
        is_relocation: true
      });
    });

    sequence.push({
      step_number: stepNum++,
      phase: 'TARGET_EXTRACTION',
      action_title: `RETRIEVE TARGET ENGINE BARCODE ${targetCell.barcode} from Cell ${targetCell.location_code} -> DISPATCH BAY`,
      engine_number: targetCell.engine_number,
      barcode: targetCell.barcode,
      from_location: targetCell.location_code,
      to_location: 'DISPATCH_BAY_NORTH',
      is_target: true
    });

    for (let i = 0; i < sequence.length; i++) {
      const step = sequence[i];
      onExecuteStepSequence(step);

      await executeRetrievalStep(
        step.step_number,
        step.barcode,
        step.from_location,
        step.to_location,
        'Floor Lifter (Operator)'
      );
    }

    alert(`✅ Retrieval & Relocations completed! Engine ${targetCell.engine_number} successfully dispatched.`);

    setTargetCell(null);
    setBlockers([]);
    setBlockerAllocations({});
    setActiveRelocationPath([]);
    setEngineBarcode('');
    setLoading(false);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="bg-[#3F3F3F] text-white p-5 rounded-xl shadow-lg border border-slate-700 flex items-center justify-between">
        <div>
          <div className="text-xs text-[#016FB6] font-mono font-bold uppercase tracking-widest flex items-center space-x-1.5">
            <QrCode className="w-4 h-4 text-[#016FB6]" />
            <span>Barcode Scanner Engine Retrieval System</span>
          </div>
          <h2 className="text-xl font-bold flex items-center space-x-2">
            <Workflow className="w-6 h-6 text-[#016FB6]" />
            <span>Intelligent Barcode-Driven Engine Retrieval & Relocation</span>
          </h2>
        </div>
        <div className="text-right text-xs font-mono text-slate-300">
          <div>Lookup: Barcode / Serial / Grid Cell</div>
          <div className="text-red-400 font-bold flex items-center justify-end space-x-1">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
            <span>Target Highlight: RED BOX</span>
          </div>
        </div>
      </div>

      {/* Barcode Search & Scan Input Section */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-md space-y-4">
        <form onSubmit={handleCalculatePlan} className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-700 uppercase">
              Scan or Select Engine Serial Number / Barcode Tag for Retrieval
            </label>
            {activeTargetLoc && (
              <span className="bg-red-100 text-red-800 text-xs font-mono font-bold px-3 py-1 rounded-full border border-red-300 flex items-center space-x-1 animate-pulse">
                <Target className="w-3.5 h-3.5 text-red-600" />
                <span>Selected Target Cell: RED BOX [{activeTargetLoc}]</span>
              </span>
            )}
          </div>

          <div className="flex space-x-2">
            <div className="relative flex-1">
              <QrCode className="w-5 h-5 absolute left-3 top-3.5 text-slate-400" />
              <input
                type="text"
                autoFocus
                value={engineBarcode}
                onChange={(e) => {
                  setEngineBarcode(e.target.value);
                  setTargetCell(null);
                }}
                placeholder="Type or scan engine barcode (e.g. TLHM117681, A1, B12)..."
                className="w-full pl-10 pr-4 py-4 bg-slate-50 border-2 border-slate-300 rounded-xl text-base font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold uppercase tracking-wider flex items-center space-x-2 shadow-lg transition active:scale-95"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Locate Target in Red</span>
            </button>
          </div>
        </form>

        {/* Quick Sample Barcode Pills */}
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
          <span className="font-bold text-slate-700 mr-2">Click Quick Test Engines:</span>
          {sampleEngineBarcodes.map(item => (
            <button
              key={item.code}
              onClick={() => {
                setEngineBarcode(item.code);
                const found = gridData.find(c => c.engine_number === item.code || c.location_code === item.loc);
                if (found) processRetrievalForCell(found);
              }}
              className={`mr-2 my-1 px-2.5 py-1 rounded font-mono font-semibold transition border ${
                activeTargetLoc === item.loc
                  ? 'bg-red-600 text-white border-red-700 font-bold shadow-md'
                  : 'bg-white text-slate-800 border-slate-300 hover:bg-red-50 hover:text-red-700'
              }`}
              title={item.note}
            >
              {item.code} ({item.loc})
            </button>
          ))}
        </div>

        {errorMsg && (
          <div className="bg-red-50 border border-red-300 text-red-700 p-4 rounded-lg text-xs font-bold flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Warehouse Grid Map Component (Always visible in Intelligent Retrieval View) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-md space-y-3">
        <div className="flex items-center justify-between border-b pb-2">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-red-600 animate-ping"></span>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Warehouse Grid Map - Retrieval Highlight Mode
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            💡 Click any occupied engine box below to select it for retrieval (turns <strong className="text-red-600">RED</strong>)
          </span>
        </div>

        <WarehouseGrid
          gridData={gridWithRedHighlights}
          onSelectLocation={handleSelectMapCell}
          selectedLocCode={activeTargetLoc}
          searchQuery=""
          activeRelocationPath={[]}
          activePath={null}
          onClearPath={() => {}}
        />
      </div>

      {/* Target Summary / Direct Dispatch Button (when no blockers needed) */}
      {currentTargetCell && blockers.length === 0 && (
        <div className="bg-emerald-50 border-2 border-emerald-300 p-5 rounded-xl shadow-md flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center space-x-1.5">
              <PackageCheck className="w-4 h-4 text-emerald-600" />
              <span>Direct Retrieval Ready - Zero Front Blockers!</span>
            </div>
            <div className="text-sm font-mono text-slate-800">
              Target Engine: <strong className="text-red-600 font-extrabold">{currentTargetCell.engine_number}</strong> ({currentTargetCell.barcode}) at Cell <strong className="text-emerald-700 font-extrabold">{currentTargetCell.location_code}</strong>
            </div>
          </div>
          <button
            onClick={handleExecuteDirectRetrieval}
            disabled={loading}
            className="px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg transition active:scale-95"
          >
            🚀 Dispatch Target Engine Now
          </button>
        </div>
      )}

      {/* Manual Blocker Relocation Dashboard (when blockers are detected) */}
      {blockers.length > 0 && currentTargetCell && (
        <div className="bg-white p-6 rounded-xl border-2 border-red-200 shadow-md space-y-6 animate-fadeIn">
          <div>
            <div className="text-xs font-bold text-red-600 font-mono uppercase tracking-widest mb-1">
              ⚠️ {blockers.length} Front Blocker Engine(s) detected in front of target cell {currentTargetCell.location_code}!
            </div>
            <h3 className="text-base font-extrabold text-slate-800 uppercase flex items-center space-x-2">
              <Move className="w-5 h-5 text-amber-500" />
              <span>Relocation Allocation for Blocker Engines</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Target engine <strong className="text-red-600 font-bold">{currentTargetCell.engine_number}</strong> ({currentTargetCell.location_code}) is highlighted in <strong className="text-red-600 font-bold">RED</strong>. Select destination slots in rows G/H for the front blockers below.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              {blockers.map((blocker, idx) => {
                const isSelected = activeBlockerLoc === blocker.loc_code;
                const dest = blockerAllocations[blocker.loc_code] || '';
                return (
                  <div
                    key={blocker.loc_code}
                    onClick={() => setActiveBlockerLoc(blocker.loc_code)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${isSelected
                        ? 'border-[#016FB6] bg-blue-50/50 shadow-md'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-xs font-bold text-slate-700">
                          Blocker #{idx + 1}: {blocker.engine_number}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          Barcode: {blocker.barcode} | Current Loc: {blocker.loc_code}
                        </div>
                      </div>
                      {dest ? (
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-mono px-2.5 py-1 rounded-full font-bold">
                          Slides → {dest}
                        </span>
                      ) : (
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-mono px-2.5 py-1 rounded-full font-bold">
                          Pending Allocation
                        </span>
                      )}
                    </div>

                    {/* Manual Cell Number Input for Blocker */}
                    <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                      <form onSubmit={(e) => handleManualInputSubmit(e, blocker.loc_code)} className="flex space-x-2">
                        <input
                          type="text"
                          placeholder="Type free cell (e.g. G1, H3)..."
                          value={manualInputs[blocker.loc_code] || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setManualInputs(prev => ({ ...prev, [blocker.loc_code]: val }));
                          }}
                          className="flex-1 px-4 py-2.5 text-sm bg-slate-50 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#016FB6] font-mono font-bold"
                        />
                        <button
                          type="submit"
                          className="px-4 py-2.5 bg-[#016FB6] text-white text-xs rounded-lg hover:bg-blue-700 font-bold shadow-sm"
                        >
                          Assign
                        </button>
                      </form>
                    </div>
                  </div>
                );
              })}

              <button
                onClick={handleGenerateManualPlanAndExecute}
                disabled={loading}
                className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider shadow-lg transition"
              >
                Execute Relocations & Dispatch Target Engine
              </button>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
              <div className="font-bold text-slate-800 uppercase tracking-wide">
                Target & Blocker Status Summary
              </div>
              <div className="p-3 bg-red-100 border border-red-300 rounded-lg text-red-900 font-mono">
                <div>Target Engine: <strong className="text-red-700 font-extrabold">{currentTargetCell.engine_number}</strong></div>
                <div>Location: <strong className="text-red-700 font-extrabold">{currentTargetCell.location_code} (Highlighted RED)</strong></div>
              </div>
              <div className="p-3 bg-slate-200 border border-slate-300 rounded-lg font-mono text-slate-800">
                <div>Total Front Blockers: {blockers.length}</div>
                <div>Allocated: {Object.keys(blockerAllocations).length} / {blockers.length}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
