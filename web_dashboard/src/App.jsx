import React, { useState, useEffect } from 'react';
import {
  Activity,
  Zap,
  Leaf,
  DollarSign,
  Lightbulb,
  Wind,
  Thermometer,
  ShieldCheck,
  User,
  Clock,
  Settings
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

// Simulated daily energy data
const energyData = [
  { time: '08:00', energy: 1.2 },
  { time: '10:00', energy: 1.8 },
  { time: '12:00', energy: 2.5 },
  { time: '14:00', energy: 1.9 },
  { time: '16:00', energy: 2.1 },
  { time: '18:00', energy: 3.5 },
  { time: '20:00', energy: 4.2 },
  { time: '22:00', energy: 2.8 },
];

function App() {
  const [stats, setStats] = useState({
    energy: 12.45,
    cost: 1.49,
    savings: 0.42,
    carbon: 6.2,
    occupancy: 'occupied',
    duration: 0
  });

  const [devices, setDevices] = useState({
    lights: true,
    hvac: false,
    ventilation: true,
    ecoMode: true
  });

  const [activities, setActivities] = useState([
    { id: 1, time: '00:00:00', message: 'Connecting to system...', type: 'system' }
  ]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/status');
        const data = await response.json();

        if (data) {
          setStats(data.stats);
          setDevices(prev => ({
            ...prev,
            lights: data.devices.lights !== 'off',
            ventilation: data.devices.ventilation !== 'off'
          }));
          if (data.activities && data.activities.length > 0) {
            setActivities(data.activities);
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, []);

  const toggleDevice = (device) => {
    setDevices(prev => ({ ...prev, [device]: !prev[device] }));
  };

  return (
    <div className="dashboard-container">
      <header>
        <div className="title-group">
          <h1>Smart Energy Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Real-time energy optimization & building monitoring
          </p>
        </div>
        <div className="status-badge">
          <ShieldCheck size={16} />
          System Active
        </div>
      </header>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Energy Consumption</span>
            <Zap size={20} className="text-info" />
          </div>
          <div className="stat-value">{stats.energy} <span style={{ fontSize: '1rem' }}>kWh</span></div>
          <div className="stat-change text-positive">↓ 12% from average</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Total Cost (USD)</span>
            <DollarSign size={20} className="text-info" />
          </div>
          <div className="stat-value">${stats.cost}</div>
          <div className="stat-change" style={{ color: 'var(--text-muted)' }}>Est. daily total</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Carbon Saving</span>
            <Leaf size={20} className="text-positive" />
          </div>
          <div className="stat-value">{stats.savings} <span style={{ fontSize: '1rem' }}>kg CO₂</span></div>
          <div className="stat-change text-positive">Eco-mode efficiency: High</div>
        </div>
      </div>

      <div className="main-content">
        <div className="left-col">
          <div className="card">
            <div className="card-title">
              <Activity size={20} className="text-info" />
              Energy Consumption Trend
            </div>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={energyData}>
                  <defs>
                    <linearGradient id="colorEnergy" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="time"
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}kW`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderColor: 'rgba(255,255,255,0.1)',
                      color: '#f8fafc'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="energy"
                    stroke="#3b82f6"
                    fillOpacity={1}
                    fill="url(#colorEnergy)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <div className="card-title">
              <Settings size={20} className="text-info" />
              Smart Device Controls
            </div>
            <div className="device-controls">
              <div className="control-item">
                <div className="control-info">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Lightbulb size={18} color={devices.lights ? '#f59e0b' : '#64748b'} />
                    <span>Lighting System</span>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={devices.lights}
                      onChange={() => toggleDevice('lights')}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {devices.lights ? 'Optimized based on brightness' : 'Manual Override: Off'}
                </div>
              </div>

              <div className="control-item">
                <div className="control-info">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Wind size={18} color={devices.ventilation ? '#0ea5e9' : '#64748b'} />
                    <span>HVAC Ventilation</span>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={devices.ventilation}
                      onChange={() => toggleDevice('ventilation')}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {devices.ventilation ? 'Activity Level: Normal' : 'Standby Mode'}
                </div>
              </div>

              <div className="control-item">
                <div className="control-info">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Leaf size={18} color={devices.ecoMode ? '#22c55e' : '#64748b'} />
                    <span>Eco Mode Max</span>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={devices.ecoMode}
                      onChange={() => toggleDevice('ecoMode')}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Saving ~0.2kWh per hour
                </div>
              </div>

              <div className="control-item">
                <div className="control-info">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Thermometer size={18} color="#f43f5e" />
                    <span>Climate Control</span>
                  </div>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>22.4°C</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Target Range: 20-24°C
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="right-col">
          <div className="card">
            <div className="card-title">
              <Clock size={20} className="text-info" />
              Live Activity Feed
            </div>
            <div className="activity-feed">
              {activities.map(activity => (
                <div key={activity.id} className="activity-item">
                  <div className="activity-time">{activity.time}</div>
                  <div className="activity-content">{activity.message}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(59, 130, 246, 0.1))' }}>
            <div className="card-title" style={{ marginBottom: '0.75rem' }}>
              <User size={20} className="text-info" />
              Occupancy Detail
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Current Status</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600, color: stats.occupancy === 'occupied' ? '#4ade80' : '#f43f5e' }}>
                {stats.occupancy === 'occupied' ? 'Occupied (Human)' : 'Unoccupied'}
              </div>
            </div>
            <div style={{ fontSize: '0.875rem' }}>
              Presence detected: <strong>{stats.duration || '0'} seconds</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
