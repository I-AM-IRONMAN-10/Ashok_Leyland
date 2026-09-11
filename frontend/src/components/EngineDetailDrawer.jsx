import React from 'react';
import { X, QrCode, Workflow, History, Calendar, User, PackageCheck, AlertCircle, Printer, ArrowRight } from 'lucide-react';

export default function EngineDetailDrawer({ location, onClose, onInitiateRetrieval, onStartPlacement, userRole, onConfirmPending }) {
  if (!location) return null;

  const isOccupied = location.status === 'OCCUPIED' || location.status === 'PENDING_CONFIRMATION';

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl z-50 border-l border-slate-300 flex flex-col transform transition-transform duration-300 ease-in-out">
      {/* Header */}
      <div className="bg-[#3F3F3F] text-white p-4 flex items-center justify-between border-b border-slate-700">
        <div>
          <div className="text-xs text-[#016FB6] font-extrabold uppercase font-mono tracking-widest">
            Storage Location Detail
          </div>
          <h2 className="text-xl font-bold font-mono tracking-tight text-white flex items-center space-x-2">
            <span>Cell {location.location_code}</span>
            <span className="text-xs font-normal px-2 py-0.5 rounded bg-slate-700 text-slate-200 border border-slate-600">
              Row {location.row} | Col {location.col}
            </span>
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-full hover:bg-slate-700 text-slate-300 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content Body */}
      <div className="p-5 overflow-y-auto flex-1 space-y-6 bg-[#F5F7FA]">
        {/* Status Card */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium">Location Status</div>
            <div className="text-base font-bold text-slate-800 uppercase tracking-wide flex items-center space-x-2 mt-0.5">
              <span className={`w-3 h-3 rounded-full ${
                location.status === 'OCCUPIED' ? 'bg-emerald-600' :
                location.status === 'PENDING_CONFIRMATION' ? 'bg-amber-500 animate-ping' :
                location.status === 'RESERVED_TEMP' ? 'bg-neutral-700' : 'bg-slate-400'
              }`}></span>
              <span>{location.status.replace('_', ' ')}</span>
            </div>
          </div>
          <div className="text-right font-mono text-xs text-slate-500">
            <div>Zone: MAIN_BAY</div>
            <div>Temp Allowed: YES</div>
          </div>
        </div>

        {/* Engine Specification Card */}
        {isOccupied && location.engine_number ? (
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b pb-2 flex items-center justify-between">
              <span>Engine Metadata</span>
              <span className="font-mono text-[#016FB6] font-bold text-xs">ASHOK LEYLAND</span>
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Engine Serial #:</span>
                <span className="font-bold font-mono text-slate-800">{location.engine_number}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Barcode Tag:</span>
                <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {location.barcode}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Engine Model:</span>
                <span className="font-semibold text-slate-800">{location.model_name || 'H-Series 6-Cylinder'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Engine Type:</span>
                <span className="font-semibold text-slate-800">{location.engine_type || 'Diesel'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Batch Number:</span>
                <span className="font-mono text-slate-700">{location.batch_number || 'BATCH-2026-Q3'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Mfg Date:</span>
                <span className="text-slate-700">{location.mfg_date || '2026-06-15'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Arrival Timestamp:</span>
                <span className="text-slate-700">{location.arrival_date || '2026-07-15 08:30'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Last Operator:</span>
                <span className="font-semibold text-slate-800">{location.operator_id || 'Ramesh Kumar'}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-xl border border-dashed border-slate-300 text-center text-slate-500 space-y-2">
            <PackageCheck className="w-10 h-10 mx-auto text-slate-300" />
            <div className="font-semibold text-sm text-slate-700">Storage Cell Empty</div>
            <div className="text-xs">This location is available for new engine inbound placement.</div>
          </div>
        )}

        {/* Movement History Timeline */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5 border-b pb-2">
            <History className="w-4 h-4 text-[#016FB6]" />
            <span>Cell Movement Audit Trail</span>
          </h3>

          <div className="space-y-3 text-xs pl-2 border-l-2 border-slate-200">
            <div className="relative pl-3">
              <div className="absolute -left-[13px] top-0.5 w-2 h-2 rounded-full bg-[#016FB6]"></div>
              <div className="font-semibold text-slate-800">Placement Confirmed</div>
              <div className="text-[10px] text-slate-500">Operator: Ramesh Kumar | 2026-07-28 14:00</div>
            </div>
            <div className="relative pl-3">
              <div className="absolute -left-[13px] top-0.5 w-2 h-2 rounded-full bg-slate-300"></div>
              <div className="font-semibold text-slate-700">Inbound Scan Received</div>
              <div className="text-[10px] text-slate-500">BT Scanner: AL-SCN-04 | 2026-07-28 13:58</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Action Buttons */}
      <div className="p-4 bg-white border-t border-slate-200 space-y-2">
        {location.status === 'PENDING_CONFIRMATION' && userRole === 'OPERATOR' ? (
          <button
            onClick={() => onConfirmPending(location)}
            className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-2 shadow transition"
          >
            <PackageCheck className="w-4 h-4" />
            <span>Confirm Pending Placement</span>
          </button>
        ) : location.status === 'OCCUPIED' ? (
          <button
            onClick={() => onInitiateRetrieval(location)}
            className="w-full py-2.5 bg-[#016FB6] hover:bg-blue-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-2 shadow transition"
          >
            <Workflow className="w-4 h-4" />
            <span>Initiate Intelligent Retrieval</span>
          </button>
        ) : location.status === 'PENDING_CONFIRMATION' ? (
          <div className="w-full py-2.5 bg-amber-100 text-amber-800 rounded-lg text-xs font-bold uppercase tracking-wider text-center shadow-sm border border-amber-300">
            Awaiting Operator Confirmation
          </div>
        ) : (
          <button
            onClick={() => onStartPlacement(location)}
            className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-2 shadow transition"
          >
            <QrCode className="w-4 h-4" />
            <span>Scan & Assign Inbound Placement</span>
          </button>
        )}

        <button 
          onClick={() => alert(`Printing barcode tag for Location ${location.location_code}...`)}
          className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 border border-slate-300"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print Location Barcode Label</span>
        </button>
      </div>
    </div>
  );
}
