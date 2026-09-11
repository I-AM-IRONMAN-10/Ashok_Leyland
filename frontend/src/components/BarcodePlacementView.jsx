import React, { useState } from 'react';
import { QrCode, CheckCircle, AlertTriangle, ArrowRight, ShieldCheck, MapPin, Sparkles, AlertOctagon, Lock, Compass, Navigation, ArrowUpRight } from 'lucide-react';
import WarehouseGrid from './WarehouseGrid';
import { confirmPlacement } from '../utils/api';

export default function BarcodePlacementView({ gridData = [], user, onPlacementConfirmed }) {
  const [engineBarcode, setEngineBarcode] = useState('');
  const [scanStep, setScanStep] = useState(1); // 1: Scan Barcode, 2: Specify Cell (Allocates & Confirms immediately)
  const [systemDirective, setSystemDirective] = useState(null);
  const [manualCellInput, setManualCellInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Quick Preset Barcodes for Testing
  const sampleEngineBarcodes = [
    { code: 'TLHM-117695', model: 'Ashok Leyland H-Series 6-Cyl 220HP' },
    { code: 'TLHM-117696', model: 'Ashok Leyland A-Series 4-Cyl 160HP' },
    { code: 'TLHM-117697', model: 'Ashok Leyland iGen6 CNG 200HP' },
  ];

  const parseCellCode = (input) => {
    const match = input.trim().match(/^([A-H])\d*-?(\d+)$/i);
    if (!match) return null;
    const row = match[1].toUpperCase();
    const col = parseInt(match[2], 10);
    if (col < 1 || col > 12) return null;
    return `${row}${col}`;
  };

  const handleScanBarcode = (e) => {
    e.preventDefault();
    if (!engineBarcode.trim()) return;

    setLoading(true);
    setErrorMsg('');

    const cleanBarcode = engineBarcode.trim().toUpperCase();
    const snMatch = cleanBarcode.match(/\d+/);
    const snVal = snMatch ? snMatch[0] : '117695';

    setTimeout(() => {
      setSystemDirective({
        directiveId: `DIR-${Math.floor(1000 + Math.random() * 9000)}`,
        engineBarcode: cleanBarcode,
        engineNumber: `TLHM${snVal}`,
        mandatoryLocation: '',
        row: '',
        col: '',
        distanceMeters: '0.0',
        pathDirections: [],
        timestamp: new Date().toLocaleTimeString(),
        reasoning: 'Manual storage cell allocation designated by operator'
      });

      setScanStep(2);
      setLoading(false);
    }, 400);
  };

  const ordRow = (r) => r.charCodeAt(0) - 64;

  const handleConfirmPlacementDirectly = async (locCode, barcode) => {
    setLoading(true);
    const result = await confirmPlacement(barcode, locCode, user?.fullName || 'Floor Lifter (Operator)');
    if (result && result.success === false) {
      setErrorMsg(`🚨 Allocation Error: ${result.error}`);
      setLoading(false);
      return;
    }

    onPlacementConfirmed(locCode, barcode);
    setLoading(false);
    alert(`✅ PLACEMENT COMPLETED! Engine ${barcode} placed at Cell ${locCode}. Database & 2D Cinema Grid updated.`);
    setScanStep(1);
    setEngineBarcode('');
    setManualCellInput('');
    setErrorMsg('');
    setSystemDirective(null);
  };

  const handleCellSelect = (locCode) => {
    setErrorMsg('');
    const cell = gridData.find(g => g.location_code === locCode);
    if (!cell) {
      setErrorMsg(`🚨 Storage cell "${locCode}" does not exist in the warehouse matrix.`);
      return;
    }
    if (cell.status !== 'AVAILABLE') {
      setErrorMsg(`🚨 Cell "${locCode}" is already occupied or unavailable (Status: ${cell.status}).`);
      return;
    }

    // Cell is valid and available - immediately call the confirmation logic!
    handleConfirmPlacementDirectly(locCode, systemDirective.engineBarcode);
  };

  const handleManualCellSubmit = (e) => {
    e.preventDefault();
    const parsed = parseCellCode(manualCellInput);
    if (!parsed) {
      setErrorMsg(`🚨 Invalid cell ID format entered. Please use formats like A7, A07, or A2-07.`);
      return;
    }
    handleCellSelect(parsed);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4">
      {/* Top Banner */}
      <div className="bg-[#3F3F3F] text-white p-5 rounded-xl shadow-lg border border-slate-700 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs text-[#016FB6] font-mono uppercase font-bold tracking-widest flex items-center space-x-1.5">
            <Lock className="w-3.5 h-3.5 text-[#016FB6]" />
            <span>Manual Storage Cell Allocation & Floor Lifter Pathfinder</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight flex items-center space-x-2">
            <QrCode className="w-6 h-6 text-[#016FB6]" />
            <span>Manual Engine Placement & Navigation System</span>
          </h2>
        </div>
        <div className="bg-[#2B2B2B] text-slate-200 text-xs px-3 py-1.5 rounded-lg border border-slate-600 font-mono">
          Floor Lifter: <strong className="text-emerald-400">{user?.fullName || 'Floor Lifter'}</strong> ({user?.badgeId || 'EMP-8042'})
        </div>
      </div>

      {/* Main Workflow Form */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-md space-y-6">
        {/* Strict Directive Notice */}
        <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-xs text-blue-900 flex items-center space-x-3">
          <AlertOctagon className="w-5 h-5 text-[#016FB6] shrink-0" />
          <div>
            <strong>Manual Storage Allocation:</strong> Scan the engine barcode, then physically locate and select a free cell. Click on the warehouse layout cell or type the ID manually.
          </div>
        </div>

        {/* Quick Test Barcode Scans */}
        {scanStep === 1 && (
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
            <span className="font-bold text-slate-700 mr-2">Quick Test Barcode Scans:</span>
            {sampleEngineBarcodes.map(item => (
              <button
                key={item.code}
                onClick={() => setEngineBarcode(item.code)}
                className="mr-2 px-2.5 py-1 bg-white border border-slate-300 rounded font-mono font-semibold hover:bg-[#016FB6] hover:text-white transition"
              >
                {item.code}
              </button>
            ))}
          </div>
        )}

        {/* Step 1: Scan Engine Barcode */}
        {scanStep === 1 && (
          <form onSubmit={handleScanBarcode} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Scan Engine Barcode Tag (Using Wireless BT Scanner)
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  autoFocus
                  value={engineBarcode}
                  onChange={(e) => setEngineBarcode(e.target.value)}
                  placeholder="Scan barcode tag (e.g. AL- 99012)..."
                  className="flex-1 px-5 py-4 bg-slate-50 border-2 border-slate-300 rounded-xl text-base font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#016FB6]"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-4 bg-[#016FB6] hover:bg-blue-700 text-white rounded-xl text-sm font-bold uppercase tracking-wider flex items-center space-x-2 shadow-lg"
                >
                  <span>Scan Tag & Proceed</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Step 2: Choose / Select Cell ID */}
        {scanStep >= 2 && systemDirective && (
          <div className="space-y-6">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase">
                Step 2: Specify Storage Cell
              </h3>

              <form onSubmit={handleManualCellSubmit} className="space-y-3">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Enter Storage Cell ID Manually (e.g., A2-07 or A7)
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={manualCellInput}
                    onChange={(e) => setManualCellInput(e.target.value)}
                    placeholder="Enter Cell ID (e.g. A2-07)..."
                    className="flex-1 px-5 py-4 bg-white border-2 border-slate-300 rounded-xl text-base font-mono focus:outline-none focus:ring-2 focus:ring-[#016FB6]"
                  />
                  <button
                    type="submit"
                    className="px-8 py-4 bg-[#016FB6] text-white rounded-xl text-sm font-bold uppercase hover:bg-blue-700 shadow-md"
                  >
                    Validate & Select
                  </button>
                </div>
              </form>

              <div className="text-xs text-slate-500">
                Or click on an available cell in the Warehouse Storage Grid below to immediately place the engine.
              </div>
            </div>

            {/* Warehouse Layout Visualizer */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <WarehouseGrid
                gridData={gridData}
                onSelectLocation={(cell) => handleCellSelect(cell.location_code)}
                selectedLocCode={systemDirective.mandatoryLocation}
                searchQuery=""
              />
            </div>

            {/* Error Mismatch Banner */}
            {errorMsg && (
              <div className="bg-red-50 border-2 border-red-400 text-red-800 p-4 rounded-xl flex items-center space-x-3 text-xs font-bold shadow-md">
                <AlertOctagon className="w-6 h-6 text-red-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex justify-start">
              <button
                type="button"
                onClick={() => {
                  setScanStep(1);
                  setEngineBarcode('');
                  setManualCellInput('');
                  setErrorMsg('');
                  setSystemDirective(null);
                }}
                className="px-4 py-2 bg-slate-200 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-300 border border-slate-300"
              >
                Reset Allocation
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
