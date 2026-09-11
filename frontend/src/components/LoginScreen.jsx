import React, { useState } from 'react';
import { ShieldCheck, Lock, User, Key, Truck, ShieldAlert, Cpu } from 'lucide-react';

export default function LoginScreen({ onLoginSuccess }) {
  const [username, setUsername] = useState('operator1');
  const [password, setPassword] = useState('operator123');
  const [selectedRole, setSelectedRole] = useState('OPERATOR'); // OPERATOR, SUPERVISOR, ADMIN
  const [error, setError] = useState('');

  // Sample User Accounts Database
  const usersDb = {
    operator1: {
      user_id: 'usr-8042',
      username: 'operator1',
      password: 'operator123',
      fullName: 'Ramesh Kumar',
      role: 'OPERATOR',
      badgeId: 'EMP-8042',
      designation: 'Certified Heavy Engine Forklift Operator'
    },
    supervisor1: {
      user_id: 'usr-1001',
      username: 'supervisor1',
      password: 'supervisor123',
      fullName: 'Venkatesh Sharma',
      role: 'SUPERVISOR',
      badgeId: 'SUP-1001',
      designation: 'Warehouse Shift Operations Supervisor'
    },
    admin: {
      user_id: 'usr-0001',
      username: 'admin',
      password: 'admin123',
      fullName: 'Ashok Leyland System Admin',
      role: 'ADMIN',
      badgeId: 'ADM-0001',
      designation: 'System Administrator & Plant IT'
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    setError('');

    const user = usersDb[username.trim().toLowerCase()];
    if (user && user.password === password) {
      onLoginSuccess(user);
    } else {
      setError('Invalid username or password! Please check credentials.');
    }
  };

  return (
    <div className="min-h-screen bg-[#3F3F3F] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Subtle Industrial Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#2B2B2B] via-[#3F3F3F] to-[#1F1F1F] opacity-90"></div>
      
      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
        {/* Top Header Banner */}
        <div className="bg-[#3F3F3F] text-white p-6 border-b border-slate-700 text-center relative">
          <div className="w-14 h-14 bg-[#016FB6] rounded-xl mx-auto flex items-center justify-center font-extrabold text-white text-xl tracking-widest shadow-lg mb-3 border border-white/20">
            AL
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white uppercase">
            Ashok Leyland WMS
          </h1>
          <p className="text-xs text-slate-300 font-mono tracking-wider mt-0.5">
            Enterprise Heavy Engine Storage System
          </p>
          <div className="mt-2 inline-flex items-center space-x-1.5 bg-[#2B2B2B] px-3 py-1 rounded-full border border-slate-600 text-[10px] text-emerald-400 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Internal Network Secured (HTTPS/LAN)</span>
          </div>
        </div>

        {/* Form Container */}
        <div className="p-6 space-y-6">
          {/* Quick Role Selection Tabs */}
          <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => { setSelectedRole('OPERATOR'); setUsername('operator1'); setPassword('operator123'); }}
              className={`py-2 text-[11px] font-bold rounded-lg transition ${
                selectedRole === 'OPERATOR' 
                  ? 'bg-[#016FB6] text-white shadow' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Floor Lifter
            </button>
            <button
              type="button"
              onClick={() => { setSelectedRole('SUPERVISOR'); setUsername('supervisor1'); setPassword('supervisor123'); }}
              className={`py-2 text-[11px] font-bold rounded-lg transition ${
                selectedRole === 'SUPERVISOR' 
                  ? 'bg-[#016FB6] text-white shadow' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Supervisor
            </button>
            <button
              type="button"
              onClick={() => { setSelectedRole('ADMIN'); setUsername('admin'); setPassword('admin123'); }}
              className={`py-2 text-[11px] font-bold rounded-lg transition ${
                selectedRole === 'ADMIN' 
                  ? 'bg-[#016FB6] text-white shadow' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              System Admin
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Username / Badge ID
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username or badge ID..."
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#016FB6]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password..."
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#016FB6]"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-lg flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-[#016FB6] hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider shadow-lg transition flex items-center justify-center space-x-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Login to System</span>
            </button>
          </form>

          {/* Preset Demo Logins Note */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px] text-slate-500 space-y-1">
            <div className="font-bold text-slate-700">Preset Enterprise Credentials:</div>
            <div>• <strong>Floor Lifter (Operator):</strong> <code className="text-[#016FB6]">operator1</code> / <code className="text-[#016FB6]">operator123</code></div>
            <div>• <strong>Supervisor:</strong> <code className="text-[#016FB6]">supervisor1</code> / <code className="text-[#016FB6]">supervisor123</code></div>
            <div>• <strong>System Admin:</strong> <code className="text-[#016FB6]">admin</code> / <code className="text-[#016FB6]">admin123</code></div>
          </div>
        </div>
      </div>
    </div>
  );
}
