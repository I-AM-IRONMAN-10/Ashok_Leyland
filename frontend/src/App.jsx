import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import WarehouseGrid from './components/WarehouseGrid';
import EngineDetailDrawer from './components/EngineDetailDrawer';
import BarcodePlacementView from './components/BarcodePlacementView';
import IntelligentRetrievalView from './components/IntelligentRetrievalView';
import BulkExcelView from './components/BulkExcelView';
import AnalyticsView from './components/AnalyticsView';
import ReallocationOptimizerView from './components/ReallocationOptimizerView';
import LoginScreen from './components/LoginScreen';
import { Package, History, Settings } from 'lucide-react';
import { calculateInboundStoragePath, calculateNearestRetrievalPath } from './utils/pathfinding';
import { fetchWarehouseMap, subscribeWarehouseWebSocket, confirmPlacement } from './utils/api';

export default function App() {
  // Current Authenticated User Session
  const [currentUser, setCurrentUser] = useState({
    user_id: 'usr-8042',
    username: 'operator1',
    fullName: 'Ramesh Kumar',
    role: 'OPERATOR',
    badgeId: 'EMP-8042',
    designation: 'Certified Heavy Engine Forklift Operator'
  });

  const [activeTab, setActiveTab] = useState('grid-map');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [activeRelocationPath, setActiveRelocationPath] = useState([]);
  const [activePath, setActivePath] = useState(null);
  const [retrievalTargetBarcode, setRetrievalTargetBarcode] = useState('');

  // Grid State with TLHM Engine Serial Numbers
  const [gridData, setGridData] = useState(() => {
    const rows = ["A", "B", "C", "D", "E", "F", "G", "H"];
    const cols = Array.from({ length: 12 }, (_, i) => i + 1);
    const initial = [];

    let baseSn = 117681;
    let snCounter = 0;

    const models = [
      'Ashok Leyland H-Series 6-Cylinder 220HP',
      'Ashok Leyland A-Series 4-Cylinder 160HP',
      'Ashok Leyland iGen6 CNG 200HP',
      'Ashok Leyland H-Series Heavy Duty 260HP'
    ];

    rows.forEach(r => {
      cols.forEach(c => {
        const locCode = `${r}${c}`;
        let status = 'AVAILABLE';
        let engNum = null;
        let barcode = null;
        let model = null;

        if (['A', 'B', 'C', 'D', 'E', 'F'].includes(r)) {
          status = 'OCCUPIED';
          const sn = baseSn + snCounter++;
          engNum = `TLHM${sn}`;
          barcode = `TLHM-${sn}`;
          model = models[rows.indexOf(r) % models.length];
        }

        initial.push({
          location_code: locCode,
          row: r,
          col: c,
          status,
          engine_number: engNum,
          barcode: barcode,
          model_name: model,
          batch_number: `BATCH-2026-Q3-0${(rows.indexOf(r) % 4) + 1}`,
          mfg_date: '2026-06-15',
          arrival_date: '2026-07-10 09:00',
          last_movement: '2026-07-28 14:00',
          operator_id: 'Ramesh Kumar (EMP-8042)'
        });
      });
    });
    return initial;
  });

  // Sync Grid with FastAPI Backend and WebSocket real-time updates
  useEffect(() => {
    let unsubscribeWs = null;

    async function loadBackendMap() {
      const data = await fetchWarehouseMap();
      if (data && data.grid && Array.isArray(data.grid) && data.grid.length > 0) {
        setGridData(data.grid);
      }
    }

    loadBackendMap();
    unsubscribeWs = subscribeWarehouseWebSocket((newGrid) => {
      if (newGrid && Array.isArray(newGrid)) {
        setGridData(newGrid);
      }
    });

    return () => {
      if (unsubscribeWs) unsubscribeWs();
    };
  }, []);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    if (user.role === 'OPERATOR') {
      setActiveTab('placement');
      setSidebarCollapsed(true);
    } else {
      setActiveTab('grid-map');
      setSidebarCollapsed(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  // Trigger Nearest Outbound Retrieval Path for a location or engine
  const handleTriggerRetrievalPath = (targetLocCode) => {
    const locCode = targetLocCode || (selectedLocation && selectedLocation.location_code);
    if (!locCode) return;

    const pathResult = calculateNearestRetrievalPath(locCode, gridData, 'A1');
    if (pathResult) {
      setActivePath(pathResult);
      setActiveTab('grid-map');

      const cell = gridData.find(g => g.location_code === locCode);
      if (cell && cell.barcode) {
        setRetrievalTargetBarcode(cell.barcode);
      }
    }
  };

  // Trigger Inbound Storage Room Path for a location
  const handleTriggerInboundPath = (targetLocCode) => {
    const locCode = targetLocCode || (selectedLocation && selectedLocation.location_code);
    if (!locCode) return;

    const pathResult = calculateInboundStoragePath(locCode, 'A1');
    if (pathResult) {
      setActivePath(pathResult);
      setActiveTab('grid-map');
    }
  };

  // Placement Confirmation Handler
  const handlePlacementConfirmed = (locCode, barcode) => {
    setGridData(prev => prev.map(cell => {
      if (cell.location_code === locCode) {
        return {
          ...cell,
          status: 'OCCUPIED',
          barcode: barcode,
          engine_number: cell.engine_number || `TLHM${barcode.replace(/[^0-9]/g, '').slice(-6) || '117695'}`,
          last_movement: new Date().toLocaleString()
        };
      }
      return cell;
    }));
    setActiveTab('grid-map');
  };

  // Step Relocation Execution
  const handleExecuteStepSequence = (step) => {
    setGridData(prev => prev.map(cell => {
      if (cell.location_code === step.from_location) {
        return { ...cell, status: 'AVAILABLE', engine_number: null, barcode: null };
      }
      if (cell.location_code === step.to_location) {
        return {
          ...cell,
          status: 'OCCUPIED',
          engine_number: step.engine_number,
          barcode: step.barcode,
          last_movement: new Date().toLocaleString()
        };
      }
      return cell;
    }));
  };

  // Reallocation Optimization Directive Execution
  const handleExecuteReallocation = (move) => {
    setGridData(prev => prev.map(cell => {
      if (cell.location_code === move.currentLoc) {
        return { ...cell, status: 'AVAILABLE', engine_number: null, barcode: null };
      }
      if (cell.location_code === move.recommendedOptimalLoc) {
        return {
          ...cell,
          status: 'OCCUPIED',
          engine_number: move.engineNumber,
          barcode: move.barcode,
          last_movement: new Date().toLocaleString()
        };
      }
      return cell;
    }));
  };

  if (!currentUser) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex flex-col h-screen bg-[#F5F7FA] overflow-hidden text-slate-800">
      {/* Top Navbar with Prominent Search Bar */}
      <Navbar
        currentUser={currentUser}
        currentRole={currentUser.role}
        setRole={(role) => setCurrentUser(prev => ({ ...prev, role }))}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        gridData={gridData}
        onTriggerRetrievalPath={handleTriggerRetrievalPath}
        onTriggerInboundPath={handleTriggerInboundPath}
        occupancyPct={Math.round((gridData.filter(c => c.status === 'OCCUPIED').length / gridData.length) * 100)}
        onLogout={handleLogout}
      />

      {/* Main Workspace Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
          userRole={currentUser.role}
        />

        {/* Central Viewport */}
        <main className="flex-1 p-4 overflow-y-auto relative">
          {/* Main Grid View */}
          {(activeTab === 'grid-map' || activeTab === 'dashboard') && (
            <div className="h-full flex flex-col space-y-4">
              <WarehouseGrid
                gridData={gridData}
                onSelectLocation={(cell) => setSelectedLocation(cell)}
                selectedLocCode={selectedLocation?.location_code}
                searchQuery={searchQuery}
                activeRelocationPath={activeRelocationPath}
                activePath={activePath}
                onClearPath={() => setActivePath(null)}
                onTriggerRetrievalForCell={handleTriggerRetrievalPath}
                onTriggerInboundForCell={handleTriggerInboundPath}
              />
            </div>
          )}

          {/* Barcode Placement Workflow */}
          {activeTab === 'placement' && (
            <BarcodePlacementView
              gridData={gridData}
              user={currentUser}
              onPlacementConfirmed={handlePlacementConfirmed}
            />
          )}

          {/* Intelligent Relocation Planner */}
          {activeTab === 'retrieval' && (
            <IntelligentRetrievalView
              gridData={gridData}
              initialBarcode={retrievalTargetBarcode}
              onExecuteStepSequence={handleExecuteStepSequence}
              setActiveRelocationPath={setActiveRelocationPath}
            />
          )}

          {/* AI Space Optimization & Reallocation Engine */}
          {activeTab === 'reallocation' && (
            <ReallocationOptimizerView
              gridData={gridData}
              onExecuteReallocation={handleExecuteReallocation}
            />
          )}

          {/* Excel Bulk Orders */}
          {activeTab === 'excel-upload' && (
            <BulkExcelView
              gridData={gridData}
              onApproveOrder={(orders) => {
                const barcodes = orders.map(o => o.barcode);
                setGridData(prev => prev.map(cell => {
                  if (barcodes.includes(cell.barcode)) {
                    return { ...cell, is_dispatch: true };
                  }
                  return cell;
                }));
                setActiveTab('grid-map');
              }}
            />
          )}

          {/* Analytics & Heatmaps */}
          {activeTab === 'analytics' && (
            <AnalyticsView gridData={gridData} />
          )}

          {/* Engine Inventory Catalog */}
          {activeTab === 'inventory' && (
            <div className="max-w-6xl mx-auto bg-white p-6 rounded-xl border border-slate-200 shadow-md space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center space-x-2">
                  <Package className="w-5 h-5 text-[#016FB6]" />
                  <span>Engine Inventory Master Catalog</span>
                </h2>
                <span className="text-xs font-mono bg-blue-50 text-[#016FB6] px-3 py-1 rounded border font-bold">
                  Total Tracked: {gridData.filter(c => c.engine_number).length}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b text-slate-600 font-mono">
                      <th className="p-3">Engine Serial #</th>
                      <th className="p-3">Barcode Tag</th>
                      <th className="p-3">Location</th>
                      <th className="p-3">Model</th>
                      <th className="p-3">Batch</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {gridData.filter(c => c.engine_number).map(cell => (
                      <tr key={cell.location_code} className="hover:bg-slate-50">
                        <td className="p-3 font-mono font-extrabold text-amber-600">{cell.engine_number}</td>
                        <td className="p-3 font-mono text-emerald-700 font-bold">{cell.barcode}</td>
                        <td className="p-3 font-mono font-bold text-[#016FB6]">{cell.location_code}</td>
                        <td className="p-3 font-semibold">{cell.model_name || 'H-Series 6-Cyl'}</td>
                        <td className="p-3 font-mono text-slate-600">{cell.batch_number}</td>
                        <td className="p-3">
                          <span className={`px-2.5 py-1 rounded text-[10px] font-bold ${cell.status === 'OCCUPIED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-800'
                            }`}>
                            {cell.status}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex space-x-1">
                            <button
                              onClick={() => handleTriggerRetrievalPath(cell.location_code)}
                              className="px-2 py-1 bg-red-600 text-white rounded font-bold text-[10px] hover:bg-red-700 shadow"
                            >
                              🚀 Nearest Retrieval
                            </button>
                            <button
                              onClick={() => handleTriggerInboundPath(cell.location_code)}
                              className="px-2 py-1 bg-emerald-700 text-white rounded font-bold text-[10px] hover:bg-emerald-800 shadow"
                            >
                              📥 Storage Path
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Audit Logs */}
          {activeTab === 'history' && (
            <div className="max-w-6xl mx-auto bg-white p-6 rounded-xl border border-slate-200 shadow-md space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center space-x-2 border-b pb-3">
                <History className="w-5 h-5 text-[#016FB6]" />
                <span>Real-Time Warehouse Movement Audit Trail</span>
              </h2>

              <div className="space-y-3 font-mono text-xs">
                <div className="p-3 bg-slate-50 border rounded-lg flex items-center justify-between">
                  <div>
                    <span className="text-slate-500">[2026-07-28 14:00:12]</span>
                    <span className="ml-2 font-bold text-emerald-700">INBOUND_PLACEMENT</span>
                    <span className="ml-2">Engine TLHM117681 stored at rack cell A7</span>
                  </div>
                  <span className="text-slate-600 font-bold">Operator: Ramesh Kumar</span>
                </div>
              </div>
            </div>
          )}

          {/* Admin Panel */}
          {activeTab === 'admin' && (
            <div className="max-w-4xl mx-auto bg-white p-6 rounded-xl border border-slate-200 shadow-md space-y-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center space-x-2 border-b pb-3">
                <Settings className="w-5 h-5 text-[#016FB6]" />
                <span>System Administration & Layout Configuration</span>
              </h2>

              <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
                <div className="p-4 bg-slate-50 rounded-lg border">
                  <div className="font-bold text-slate-800 text-sm mb-2">Grid Dimension Settings</div>
                  <div>Rows: A to H (8 Rows)</div>
                  <div>Columns: 1 to 12 (12 Columns per Row)</div>
                  <div>Total Cell Capacity: 96 Heavy Engine Units</div>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg border">
                  <div className="font-bold text-slate-800 text-sm mb-2">On-Premises Database Connection</div>
                  <div>Engine: PostgreSQL 14</div>
                  <div>Status: LAN Connected (Latency 1.2ms)</div>
                  <div>Backup Policy: Automated Daily Midnight Snapshots</div>
                </div>
              </div>
            </div>
          )}

          {/* Slide-over Cell Detail Drawer */}
          <EngineDetailDrawer
            location={selectedLocation}
            onClose={() => setSelectedLocation(null)}
            userRole={currentUser.role}
            onConfirmPending={(loc) => {
              confirmPlacement(loc.barcode, loc.location_code, currentUser.fullName);
              handlePlacementConfirmed(loc.location_code, loc.barcode);
              setSelectedLocation(null);
            }}
            onInitiateRetrieval={(loc) => {
              const target = loc || selectedLocation;
              if (target) {
                handleTriggerRetrievalPath(target.location_code);
              }
              setSelectedLocation(null);
            }}
            onStartPlacement={() => {
              setActiveTab('placement');
              setSelectedLocation(null);
            }}
          />
        </main>
      </div>
    </div>
  );
}
