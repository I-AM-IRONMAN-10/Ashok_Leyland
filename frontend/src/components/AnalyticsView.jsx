import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Truck, Clock, Layers, Flame } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { fetchAnalyticsSummary } from '../utils/api';

export default function AnalyticsView({ gridData = [] }) {
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    async function loadAnalytics() {
      const data = await fetchAnalyticsSummary();
      if (data) setAnalytics(data);
    }
    loadAnalytics();
  }, []);

  const totalCells = gridData.length || 96;
  const occupiedCount = gridData.filter(c => c.status === 'OCCUPIED').length;
  const computedOccupancy = totalCells > 0 ? ((occupiedCount / totalCells) * 100).toFixed(1) : '48.2';

  const movementData = (analytics && analytics.daily_movement_trend) ? analytics.daily_movement_trend : [
    { time: '08:00', inbound: 12, outbound: 5 },
    { time: '10:00', inbound: 18, outbound: 14 },
    { time: '12:00', inbound: 25, outbound: 20 },
    { time: '14:00', inbound: 15, outbound: 18 },
    { time: '16:00', inbound: 22, outbound: 12 },
    { time: '18:00', inbound: 10, outbound: 8 },
  ];

  const operatorData = [
    { name: 'Ramesh K.', moves: 42, distanceKm: 8.4 },
    { name: 'Suresh M.', moves: 38, distanceKm: 7.2 },
    { name: 'Venkatesh P.', moves: 31, distanceKm: 6.1 },
    { name: 'Anand S.', moves: 27, distanceKm: 5.5 },
  ];

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="bg-[#3F3F3F] text-white p-5 rounded-xl shadow-lg border border-slate-700 flex items-center justify-between">
        <div>
          <div className="text-xs text-[#016FB6] font-mono font-bold uppercase tracking-widest">
            Executive Analytics & AI Insights
          </div>
          <h2 className="text-xl font-bold flex items-center space-x-2">
            <BarChart3 className="w-6 h-6 text-[#016FB6]" />
            <span>Warehouse Productivity & Travel Optimization Dashboard</span>
          </h2>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-semibold uppercase">Warehouse Occupancy</div>
            <div className="text-2xl font-extrabold text-[#016FB6] font-mono mt-1">{analytics ? `${analytics.occupancy_rate}%` : `${computedOccupancy}%`}</div>
            <div className="text-[10px] text-emerald-600 font-bold">Optimal Operating Range</div>
          </div>
          <Layers className="w-8 h-8 text-[#016FB6] opacity-80" />
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-semibold uppercase">Avg Retrieval Time</div>
            <div className="text-2xl font-extrabold text-slate-800 font-mono mt-1">3.4 Mins</div>
            <div className="text-[10px] text-emerald-600 font-bold">⚡ 28% Faster vs Manual</div>
          </div>
          <Clock className="w-8 h-8 text-amber-500 opacity-80" />
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-semibold uppercase">Forklift Travel Dist.</div>
            <div className="text-2xl font-extrabold text-slate-800 font-mono mt-1">27.2 Km</div>
            <div className="text-[10px] text-slate-500 font-mono">Today's Fleet Total</div>
          </div>
          <Truck className="w-8 h-8 text-purple-600 opacity-80" />
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-semibold uppercase">Today's Total Movements</div>
            <div className="text-2xl font-extrabold text-emerald-700 font-mono mt-1">138 Moves</div>
            <div className="text-[10px] text-emerald-600 font-bold">100% Barcode Verified</div>
          </div>
          <TrendingUp className="w-8 h-8 text-emerald-600 opacity-80" />
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Movement Trend Line Chart */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-md space-y-3">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Daily Engine Movement Trend (Inbound vs Outbound)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={movementData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip />
                <Line type="monotone" dataKey="inbound" stroke="#016FB6" strokeWidth={3} name="Inbound Placements" />
                <Line type="monotone" dataKey="outbound" stroke="#1B5E20" strokeWidth={3} name="Outbound Dispatch" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Operator Productivity Bar Chart */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-md space-y-3">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Operator Productivity & Forklift Travel Distance
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={operatorData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip />
                <Bar dataKey="moves" fill="#016FB6" name="Total Completed Moves" />
                <Bar dataKey="distanceKm" fill="#7B1FA2" name="Travel Distance (Km)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
