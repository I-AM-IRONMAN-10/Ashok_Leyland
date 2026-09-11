import React from 'react';
import { 
  LayoutDashboard, 
  Grid, 
  QrCode, 
  Workflow, 
  FileSpreadsheet, 
  Package, 
  History, 
  BarChart3, 
  Settings,
  Sparkles,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, collapsed, setCollapsed, userRole }) {
  const allMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['OPERATOR', 'SUPERVISOR', 'ADMIN'] },
    { id: 'grid-map', label: 'Warehouse Grid Map', icon: Grid, roles: ['OPERATOR', 'SUPERVISOR', 'ADMIN'] },
    { id: 'placement', label: 'Directive Placement', icon: QrCode, roles: ['OPERATOR', 'SUPERVISOR', 'ADMIN'] },
    { id: 'retrieval', label: 'Intelligent Retrieval', icon: Workflow, roles: ['OPERATOR', 'SUPERVISOR', 'ADMIN'] },
    { id: 'reallocation', label: 'Space Optimization', icon: Sparkles, roles: ['SUPERVISOR', 'ADMIN'] },
    { id: 'excel-upload', label: 'Excel Bulk Orders', icon: FileSpreadsheet, roles: ['SUPERVISOR', 'ADMIN'] },
    { id: 'inventory', label: 'Engine Inventory', icon: Package, roles: ['OPERATOR', 'SUPERVISOR', 'ADMIN'] },
    { id: 'history', label: 'Movement Logs', icon: History, roles: ['OPERATOR', 'SUPERVISOR', 'ADMIN'] },
    { id: 'analytics', label: 'Analytics & Heatmaps', icon: BarChart3, roles: ['SUPERVISOR', 'ADMIN'] },
    { id: 'admin', label: 'Admin Settings', icon: Settings, roles: ['ADMIN'] },
  ];

  const menuItems = allMenuItems.filter(item => !userRole || item.roles.includes(userRole));

  return (
    <aside 
      className={`bg-[#3F3F3F] text-gray-200 border-r border-gray-700 flex flex-col justify-between transition-all duration-200 shadow-xl z-20 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      <div className="py-3 px-2">
        {/* Toggle Collapse Button */}
        <div className="flex justify-end px-2 mb-3">
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded hover:bg-gray-700 text-gray-300 hover:text-white transition"
            title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation List */}
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive 
                    ? 'bg-[#016FB6] text-white font-semibold shadow-md' 
                    : 'text-gray-300 hover:bg-[#2B2B2B] hover:text-white'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                {!collapsed && (
                  <span className="ml-3 truncate">{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      {!collapsed && (
        <div className="p-3 m-2 bg-[#2B2B2B] rounded-lg border border-gray-700 text-[10px] text-gray-400">
          <div className="font-semibold text-gray-300">Ashok Leyland Facilities</div>
          <div>Heavy Engine Bay 04 - Plant 1</div>
          <div className="mt-1 text-emerald-400 font-mono">Status: LAN Synchronized</div>
        </div>
      )}
    </aside>
  );
}
