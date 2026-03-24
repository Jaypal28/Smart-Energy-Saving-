import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import {
  Activity, Zap, Leaf, DollarSign, Lightbulb, Wind, Thermometer, ShieldCheck, User, Clock, Settings, LogOut
} from 'lucide-react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';

const API_BASE = 'http://127.0.0.1:5000';
const socket = io(API_BASE, {
  transports: ['websocket', 'polling']
});

function App() {
  const [stats, setStats] = useState({
    energy: 0, cost: 0, savings: 0, carbon: 0, occupancy: 'waiting...', duration: 0
  });

  const [devices, setDevices] = useState({
    lights: false, ventilation: false, ecoMode: true, climate: 22.0
  });

  const [activities, setActivities] = useState([]);
  const [energyHistory, setEnergyHistory] = useState([]);
  const [connected, setConnected] = useState(false);
  const lastUpdateRef = React.useRef(0);

  useEffect(() => {
    console.log("Connecting to:", API_BASE);
    
    // Initial data fetch
    const fetchInitialData = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/status`);
        const data = await res.json();
        console.log("Initial data:", data);
        if (data) {
          if (data.stats) setStats(data.stats);
          if (data.activities) setActivities(data.activities);
          if (data.decisions) {
            setDevices(prev => ({
              ...prev,
              lights: data.decisions.lights !== 'off',
              ventilation: data.decisions.ventilation !== 'off'
            }));
          }
        }

        const histRes = await fetch(`${API_BASE}/api/history`);
        const histData = await histRes.json();
        if (Array.isArray(histData)) {
          setEnergyHistory(histData.map(d => ({ 
            time: d.timestamp.split('T')[1].substring(0,5), 
            energy: d.power || 0 // Use power for trend
          })).reverse());
        }
      } catch (err) {
        console.error("Initial fetch error:", err);
      }
    };

    fetchInitialData();

    socket.on('connect', () => {
      console.log("WebSocket connected!");
      setConnected(true);
    });

    socket.on('disconnect', () => {
      console.log("WebSocket disconnected!");
      setConnected(false);
    });

    // Real-time updates via Socket.io
    socket.on('system_update', (data) => {
      if (data.stats) {
        setStats(data.stats);
        
        // Throttled graph update (once per second)
        const now = Date.now();
        if (now - lastUpdateRef.current > 1000) {
          lastUpdateRef.current = now;
          setEnergyHistory(prev => {
            const newPoint = { 
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), 
              energy: data.stats.power || 0 // Use real-time power flux
            };
            const newHist = [...prev, newPoint].slice(-30);
            return newHist;
          });
        }
      }
      
      if (data.decisions) {
        setDevices(prev => ({
          ...prev,
          lights: data.decisions.lights !== 'off',
          ventilation: data.decisions.ventilation !== 'off'
        }));
      }
      if (data.activities) setActivities(data.activities);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('system_update');
    };
  }, []);

  const toggleDevice = async (device, state) => {
    try {
      await fetch(`${API_BASE}/api/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device, state })
      });
    } catch (err) {
      console.error("Control error:", err);
    }
  };

  return (
    <div className="dashboard-container">
      <header>
        <div className="title-group">
          <h1>Smart Energy v2.0</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Enterprise Home Automation</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div className={`status-badge ${connected ? 'connected' : 'disconnected'}`}>
            {connected ? <ShieldCheck size={16} /> : <Activity size={16} />}
            {connected ? ' Live Link Active' : ' Reconnecting...'}
          </div>
          <button className="card" style={{ padding: '0.5rem', display: 'flex', alignItems: 'center' }} title="Logout">
             <LogOut size={18} />
          </button>
        </div>
      </header>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Consumption</span>
          <div className="stat-value">{stats.energy.toFixed(3)} <small>kWh</small></div>
          <Zap size={24} style={{ position: 'absolute', right: '1.5rem', top: '2rem', opacity: 0.2 }} />
        </div>
        <div className="stat-card" style={{ '--primary': 'var(--positive)' }}>
          <span className="stat-label">Estimated Savings</span>
          <div className="stat-value">${stats.savings.toFixed(2)}</div>
          <Leaf size={24} style={{ position: 'absolute', right: '1.5rem', top: '2rem', opacity: 0.2 }} />
        </div>
        <div className="stat-card" style={{ '--primary': 'var(--info)' }}>
          <span className="stat-label">Current Power</span>
          <div className="stat-value">{stats.power.toFixed(1)} <small>W</small></div>
          <Zap size={24} style={{ position: 'absolute', right: '1.5rem', top: '2rem', opacity: 0.2 }} />
        </div>
        <div className="stat-card" style={{ '--primary': 'var(--info)' }}>
          <span className="stat-label">Occupancy Status</span>
          <div className="stat-value" style={{ color: stats.occupancy === 'occupied' ? 'var(--positive)' : 'var(--negative)' }}>
            {stats.occupancy.toUpperCase()}
          </div>
          <User size={24} style={{ position: 'absolute', right: '1.5rem', top: '2rem', opacity: 0.2 }} />
        </div>
      </div>

      <div className="main-content">
        <div className="left-col">
          <div className="card">
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <Activity size={20} color="var(--primary)" /> Real-time Power Flux
            </div>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={energyHistory}>
                  <defs>
                    <linearGradient id="colorEnergy" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={v => `${v}W`} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px' }} />
                  <Area type="monotone" dataKey="energy" stroke="var(--primary)" fill="url(#colorEnergy)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
             <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <Settings size={20} color="var(--primary)" /> Automation Override
            </div>
            <div className="device-controls">
              {['lights', 'ventilation', 'ecoMode'].map(device => (
                <div key={device} className="control-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {device === 'lights' ? <Lightbulb size={18} /> : device === 'ventilation' ? <Wind size={18} /> : <Leaf size={18} />}
                    <span style={{ textTransform: 'capitalize' }}>{device}</span>
                  </div>
                  <label className="toggle-switch">
                    <input type="checkbox" checked={devices[device]} onChange={() => toggleDevice(device, !devices[device])} />
                    <span className="slider"></span>
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="right-col">
          <div className="card" style={{ height: '100%' }}>
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <Clock size={20} color="var(--primary)" /> System Event Log
            </div>
            <div className="activity-feed">
              {activities.length > 0 ? activities.map(item => (
                <div key={item.id} className="activity-item">
                  <div className="activity-time">{item.time}</div>
                  <div className="activity-content">{item.message}</div>
                </div>
              )) : <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '2rem' }}>Awaiting events...</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
