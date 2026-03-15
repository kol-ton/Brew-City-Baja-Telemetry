import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import ReactGridLayout, { Responsive as ResponsiveGridLayout, useContainerWidth } from 'react-grid-layout';
type Layout = ReactGridLayout.Layout;
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  ZAxis,
  ReferenceLine,
  Cell
} from 'recharts';
import { AlertCircle, X, Plus, Edit2 } from 'lucide-react';

type DataRow = Record<string, any>;

export default function App() {
  const [data, setData] = useState<DataRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Chart configuration
  const [xAxisKey, setXAxisKey] = useState<string>('');
  const [numericKeys, setNumericKeys] = useState<string[]>([]);
  const [chartType, setChartType] = useState<'line' | 'area'>('line');
  const [frictionXKey, setFrictionXKey] = useState<string>('');
  const [frictionYKey, setFrictionYKey] = useState<string>('');
  const [gyroXKey, setGyroXKey] = useState<string>('');
  const [gyroYKey, setGyroYKey] = useState<string>('');
  const [mapLatKey, setMapLatKey] = useState<string>('');
  const [mapLonKey, setMapLonKey] = useState<string>('');

  // UI State
  const [activeMainTab, setActiveMainTab] = useState<'chart' | 'data'>('chart');
  
  const { width, containerRef, mounted } = useContainerWidth();
  const gridWrapperRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [gridRowHeight, setGridRowHeight] = useState(50);

  useEffect(() => {
    const updateHeight = () => {
      // 60px is the height of the top bar
      const availableHeight = window.innerHeight - 60;
      // 12 rows total in the layout. No margins.
      setGridRowHeight(availableHeight / 12);
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  // Dashboard Layout State
  const [layout, setLayout] = useState<Layout[]>([
    { i: 'map', x: 0, y: 0, w: 3, h: 4 },
    { i: 'telemetry', x: 3, y: 0, w: 6, h: 4 },
    { i: 'live', x: 9, y: 0, w: 3, h: 4 },
    { i: 'tilt', x: 0, y: 4, w: 3, h: 3 },
    { i: 'custom', x: 3, y: 4, w: 6, h: 3 },
    { i: 'friction', x: 9, y: 4, w: 3, h: 3 }
  ]);

  const [panels, setPanels] = useState<any[]>([
    { id: 'map', activeTabIdx: 0, tabs: [{ id: 'map-tab', type: 'map', title: 'GPS MAP' }] },
    { id: 'telemetry', activeTabIdx: 0, tabs: [{ id: 'telemetry-tab', type: 'telemetry', title: 'TELEMETRY PLOT' }] },
    { id: 'live', activeTabIdx: 0, tabs: [{ id: 'live-tab', type: 'live', title: 'LIVE DATA' }] },
    { id: 'tilt', activeTabIdx: 0, tabs: [{ id: 'tilt-tab', type: 'tilt', title: 'CAR TILT PANEL' }] },
    { id: 'custom', activeTabIdx: 0, tabs: [{ id: 'custom-tab', type: 'custom', title: 'CUSTOM GRAPH', config: { metric: '' } }] },
    { id: 'friction', activeTabIdx: 0, tabs: [{ id: 'friction-tab', type: 'friction', title: 'G-G DIAGRAM' }] }
  ]);

  const [editingPanelId, setEditingPanelId] = useState<string | null>(null);
  const [showMergeMenu, setShowMergeMenu] = useState<string | null>(null);
  const [editTitleValue, setEditTitleValue] = useState('');

  const handleLayoutChange = (newLayout: Layout[]) => {
    setLayout(newLayout);
  };

  const removePanel = (id: string) => {
    setPanels(panels.filter(p => p.id !== id));
    setLayout(layout.filter(l => l.i !== id));
  };

  const updatePanelConfig = (id: string, config: any) => {
    setPanels(panels.map(p => {
      if (p.id === id) {
        const activeTab = p.tabs[p.activeTabIdx];
        const newTitle = (activeTab.title === 'CUSTOM GRAPH' && config.metric) ? config.metric.toUpperCase() : activeTab.title;
        const updatedTabs = p.tabs.map((tab: any, idx: number) => 
          idx === p.activeTabIdx ? { ...tab, title: newTitle, config: { ...tab.config, ...config } } : tab
        );
        return { ...p, tabs: updatedTabs };
      }
      return p;
    }));
  };

  const editPanelTitle = (id: string) => {
    const panel = panels.find(p => p.id === id);
    if (!panel) return;
    const activeTab = panel.tabs[panel.activeTabIdx];
    setEditingPanelId(id);
    setEditTitleValue(activeTab.title);
  };

  const savePanelTitle = () => {
    if (editingPanelId && editTitleValue.trim() !== '') {
      setPanels(panels.map(p => {
        if (p.id === editingPanelId) {
          const updatedTabs = p.tabs.map((tab: any, idx: number) => 
            idx === p.activeTabIdx ? { ...tab, title: editTitleValue.trim().toUpperCase() } : tab
          );
          return { ...p, tabs: updatedTabs };
        }
        return p;
      }));
    }
    setEditingPanelId(null);
  };

  const cancelEditPanelTitle = () => {
    setEditingPanelId(null);
  };

  const addPanel = (type: string, title: string) => {
    const newTabId = `${type}-${Date.now()}-tab`;
    const newTab = { id: newTabId, type, title, config: type === 'custom' ? { metric: '' } : undefined };

    if (panels.length > 0) {
      // Stack onto the first panel
      setPanels(panels.map((p, idx) => {
        if (idx === 0) {
          return {
            ...p,
            tabs: [...p.tabs, newTab],
            activeTabIdx: p.tabs.length
          };
        }
        return p;
      }));
    } else {
      // Create first panel
      const newId = `${type}-${Date.now()}`;
      const newPanel: any = { 
        id: newId, 
        activeTabIdx: 0, 
        tabs: [newTab] 
      };
      setPanels([newPanel]);
      setLayout([{ i: newId, x: 0, y: 0, w: 6, h: 6 }]);
    }
  };

  const mergePanels = (sourceId: string, targetId: string) => {
    const sourcePanel = panels.find(p => p.id === sourceId);
    const targetPanel = panels.find(p => p.id === targetId);
    if (!sourcePanel || !targetPanel) return;

    setPanels(panels.filter(p => p.id !== sourceId).map(p => {
      if (p.id === targetId) {
        return {
          ...p,
          tabs: [...p.tabs, ...sourcePanel.tabs],
          activeTabIdx: p.tabs.length // Switch to the first newly added tab
        };
      }
      return p;
    }));
    setLayout(layout.filter(l => l.i !== sourceId));
    setShowMergeMenu(null);
  };

  const detachTab = (panelId: string, tabIdx: number) => {
    const panel = panels.find(p => p.id === panelId);
    if (!panel || panel.tabs.length <= 1) return;

    const tabToDetach = panel.tabs[tabIdx];
    const newId = `${tabToDetach.type}-${Date.now()}`;
    
    setPanels(panels.map(p => {
      if (p.id === panelId) {
        const newTabs = p.tabs.filter((_, idx) => idx !== tabIdx);
        return {
          ...p,
          tabs: newTabs,
          activeTabIdx: Math.min(p.activeTabIdx, newTabs.length - 1)
        };
      }
      return p;
    }).concat([{
      id: newId,
      activeTabIdx: 0,
      tabs: [tabToDetach]
    }]));

    setLayout([...layout, { i: newId, x: 0, y: Infinity, w: 3, h: 3 }]);
  };

  const removeTab = (panelId: string, tabIdx: number) => {
    const panel = panels.find(p => p.id === panelId);
    if (!panel) return;

    if (panel.tabs.length <= 1) {
      removePanel(panelId);
    } else {
      setPanels(panels.map(p => {
        if (p.id === panelId) {
          const newTabs = p.tabs.filter((_, idx) => idx !== tabIdx);
          return {
            ...p,
            tabs: newTabs,
            activeTabIdx: Math.min(p.activeTabIdx, newTabs.length - 1)
          };
        }
        return p;
      }));
    }
  };

  const calculateSpeed = (lat1: number, lon1: number, lat2: number, lon2: number, t1: any, t2: any) => {
    if (!lat1 || !lon1 || !lat2 || !lon2 || !t1 || !t2) return 0;
    const R = 3958.8; // Earth radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    // Handle ISO strings or numeric timestamps
    const t1_ms = typeof t1 === 'string' ? new Date(t1).getTime() : Number(t1);
    const t2_ms = typeof t2 === 'string' ? new Date(t2).getTime() : Number(t2);
    
    let timeDiffMs = Math.abs(t2_ms - t1_ms);
    if (isNaN(timeDiffMs) || timeDiffMs === 0) return 0;
    
    const hours = timeDiffMs / (1000 * 3600);
    const speed = distance / hours;
    return isFinite(speed) ? speed : 0;
  };

  const processParsedData = (parsedData: DataRow[], name: string) => {
    if (parsedData.length === 0) {
      setError('The CSV file is empty.');
      return;
    }

    const extractedHeaders = Object.keys(parsedData[0]);
    
    // Calculate Speed and Elapsed Time
    const latCol = extractedHeaders.find(h => h.toLowerCase().match(/^lat(itude)?$/));
    const lonCol = extractedHeaders.find(h => h.toLowerCase().match(/^lon(gitude)?$/));
    const timeCol = extractedHeaders.find(h => h.toLowerCase().includes('time') || h.toLowerCase().includes('date') || h.toLowerCase() === 'timestamp_iso');
    const accelLonCol = extractedHeaders.find(h => h.toLowerCase().includes('accel_lon') || h.toLowerCase() === 'raw_ay_g');
    
    let speedIntegrated = 0;
    let lastSmoothedSpeed = 0;
    let startTimeMs: number | null = null;

    const processedData = parsedData.map((row, idx) => {
      let speed = 0;
      const prev = idx > 0 ? parsedData[idx - 1] : null;

      const tCurrMs = typeof row[timeCol] === 'string' ? new Date(row[timeCol]).getTime() : Number(row[timeCol]);
      if (idx === 0 && !isNaN(tCurrMs)) startTimeMs = tCurrMs;
      const elapsedTime = startTimeMs !== null && !isNaN(tCurrMs) ? (tCurrMs - startTimeMs) / 1000 : idx;

      if (latCol && lonCol && timeCol && prev) {
        // GPS Speed
        speed = calculateSpeed(
          Number(row[latCol]), Number(row[lonCol]),
          Number(prev[latCol]), Number(prev[lonCol]),
          row[timeCol], prev[timeCol]
        );
      } else if (accelLonCol && timeCol && prev) {
        // Inertial Speed Fallback (Integration)
        const tPrev = typeof prev[timeCol] === 'string' ? new Date(prev[timeCol]).getTime() : Number(prev[timeCol]);
        const dt = Math.abs(tCurrMs - tPrev) / 1000; // seconds
        
        if (!isNaN(dt) && dt > 0 && dt < 1) { // Sanity check for dt
          const accelG = Number(row[accelLonCol]) || 0;
          // v = u + at. 1g = 21.937 mph/s
          // We use a small decay factor to prevent infinite drift
          speedIntegrated = (speedIntegrated + (accelG * 21.937 * dt)) * 0.995;
          if (speedIntegrated < 0) speedIntegrated = 0;
          speed = speedIntegrated;
        }
      }
      
      // Smoothing
      const smoothedSpeed = idx > 0 ? lastSmoothedSpeed * 0.7 + speed * 0.3 : speed;
      lastSmoothedSpeed = smoothedSpeed;
      return { 
        ...row, 
        'SPEED_MPH': Number(smoothedSpeed.toFixed(2)) || 0,
        'ELAPSED_TIME': Number(elapsedTime.toFixed(3))
      };
    });

    if (!extractedHeaders.includes('SPEED_MPH')) {
      extractedHeaders.push('SPEED_MPH');
    }
    if (!extractedHeaders.includes('ELAPSED_TIME')) {
      extractedHeaders.push('ELAPSED_TIME');
    }

    setHeaders(extractedHeaders);
    setData(processedData);
    setFileName(name);

    // Auto-select axes and group metrics
    if (extractedHeaders.length > 0) {
      const xKey = 'ELAPSED_TIME';
      setXAxisKey(xKey);

      const numericCols = extractedHeaders.filter(h => h !== xKey && typeof processedData[0][h] === 'number');
      setNumericKeys(numericCols);

      const newPanels = [
        { id: 'live', activeTabIdx: 0, tabs: [{ id: 'live-tab', type: 'telemetry-group', title: 'ALL TELEMETRY', config: { metrics: numericCols } }] },
        { id: 'temp', activeTabIdx: 0, tabs: [{ id: 'temp-tab', type: 'telemetry-group', title: 'TEMPERATURE PLOT', config: { metrics: numericCols.filter(c => c.toLowerCase().includes('temp')) } }] },
        { id: 'accel', activeTabIdx: 0, tabs: [{ id: 'accel-tab', type: 'telemetry-group', title: 'ACCELERATION', config: { metrics: numericCols.filter(c => (c.toLowerCase().includes('accel') || c.toLowerCase().match(/^ax|ay|az$/i)) && c.toLowerCase() !== 'raw_ay_g') } }] },
        { id: 'mag', activeTabIdx: 0, tabs: [{ id: 'mag-tab', type: 'telemetry-group', title: 'MAGNETOMETER', config: { metrics: numericCols.filter(c => c.toLowerCase().includes('mag')) } }] },
        { id: 'pitch-roll-yaw', activeTabIdx: 0, tabs: [{ id: 'pitch-roll-yaw-tab', type: 'telemetry-group', title: 'PITCH, ROLL & YAW', config: { metrics: numericCols.filter(c => ['pitch_deg', 'roll_deg', 'yaw_deg'].includes(c.toLowerCase())) } }] },
        { id: 'friction', activeTabIdx: 0, tabs: [{ id: 'friction-tab', type: 'friction', title: 'G-G DIAGRAM' }] },
        { id: 'gyro', activeTabIdx: 0, tabs: [{ id: 'gyro-tab', type: 'gyro', title: 'GYRO SCATTER PLOT' }] }
      ];

      const newLayout: Layout[] = [
        { i: 'live', x: 0, y: 0, w: 4, h: 6 },
        { i: 'temp', x: 0, y: 6, w: 4, h: 6 },
        { i: 'accel', x: 4, y: 0, w: 4, h: 4 },
        { i: 'mag', x: 4, y: 4, w: 4, h: 4 },
        { i: 'pitch-roll-yaw', x: 4, y: 8, w: 4, h: 4 },
        { i: 'friction', x: 8, y: 0, w: 4, h: 6 },
        { i: 'gyro', x: 8, y: 6, w: 4, h: 6 }
      ];

      setPanels(newPanels);
      setLayout(newLayout);

      const latGCol = extractedHeaders.find(h => h.toLowerCase().match(/lat.*g|g.*lat|accel.*x|ax/));
      const longGCol = extractedHeaders.find(h => h.toLowerCase().match(/lon.*g|g.*lon|accel.*y|ay/));
      if (latGCol) setFrictionXKey(latGCol);
      if (longGCol) setFrictionYKey(longGCol);

      const gyroXCol = extractedHeaders.find(h => h.toLowerCase().match(/gyro.*x|gx/));
      const gyroYCol = extractedHeaders.find(h => h.toLowerCase().match(/gyro.*y|gy/));
      if (gyroXCol) setGyroXKey(gyroXCol);
      if (gyroYCol) setGyroYKey(gyroYCol);

      const mapLatCol = extractedHeaders.find(h => h.toLowerCase().match(/^lat(itude)?$/));
      const mapLonCol = extractedHeaders.find(h => h.toLowerCase().match(/^lon(gitude)?$/));
      if (mapLatCol) setMapLatKey(mapLatCol);
      if (mapLonCol) setMapLonKey(mapLonCol);
    }
  };

  const handleFileUpload = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a valid CSV file.');
      return;
    }

    setError(null);
    setFileName(file.name);

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          console.warn('CSV Parsing warnings:', results.errors);
        }
        processParsedData(results.data as DataRow[], file.name);
      },
      error: (err) => {
        setError(`Failed to parse CSV: ${err.message}`);
      }
    });
  };

  const loadTestData = async () => {
    setError(null);
    try {
      const response = await fetch('/test_data.csv');
      if (!response.ok) throw new Error('Failed to fetch test data file');
      const csvText = await response.text();
      
      Papa.parse(csvText, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          processParsedData(results.data as DataRow[], 'witmotion_raw_parsed_20260306_174117.csv');
        },
        error: (err) => {
          setError(`Failed to parse test data: ${err.message}`);
        }
      });
    } catch (err: any) {
      setError(`Failed to load test data: ${err.message}`);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const colors = useMemo(() => [
    '#FFCD00', '#FFFFFF', '#00FF00', '#FF3333', '#00FFFF', '#FF00FF'
  ], []);

  const latestData = data.length > 0 ? data[data.length - 1] : null;

  const renderPanelContent = (panel: any) => {
    const activeTab = panel.tabs[panel.activeTabIdx];
    if (!activeTab) return null;

    switch (activeTab.type) {
      case 'map':
        const showMap = mapLatKey && mapLonKey && data.length > 0;
        if (!showMap) {
          return (
            <div className="absolute inset-0 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-30" style={{
                backgroundImage: 'radial-gradient(#333 1px, transparent 1px)',
                backgroundSize: '20px 20px'
              }}></div>
              <div className="text-[#666666] font-mono text-[12px] uppercase z-10">
                {data.length > 0 ? 'MAP DATA NOT CONFIGURED' : 'WAITING FOR CONNECTION...'}
              </div>
            </div>
          );
        }

        // Calculate domain for map to keep aspect ratio roughly square
        let minLat = Infinity, maxLat = -Infinity;
        let minLon = Infinity, maxLon = -Infinity;
        data.forEach(d => {
          const lat = Number(d[mapLatKey]);
          const lon = Number(d[mapLonKey]);
          if (!isNaN(lat) && !isNaN(lon)) {
            if (lat < minLat) minLat = lat;
            if (lat > maxLat) maxLat = lat;
            if (lon < minLon) minLon = lon;
            if (lon > maxLon) maxLon = lon;
          }
        });

        // Add some padding
        const latPad = (maxLat - minLat) * 0.1 || 0.01;
        const lonPad = (maxLon - minLon) * 0.1 || 0.01;

        return (
          <div className="absolute inset-0 pt-4 pr-4 pb-4 pl-0 flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="#222222" />
                <XAxis type="number" dataKey={mapLonKey} domain={[minLon - lonPad, maxLon + lonPad]} stroke="#555555" tick={{ fill: '#555555', fontSize: 9, fontFamily: 'Consolas, monospace' }} name="LONGITUDE" tickFormatter={(val) => val.toFixed(4)} />
                <YAxis type="number" dataKey={mapLatKey} domain={[minLat - latPad, maxLat + latPad]} stroke="#555555" tick={{ fill: '#555555', fontSize: 9, fontFamily: 'Consolas, monospace' }} name="LATITUDE" width={60} tickFormatter={(val) => val.toFixed(4)} />
                <ZAxis type="number" range={[10, 10]} />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }}
                  contentStyle={{ backgroundColor: '#000000', border: '1px solid #00FF00', borderRadius: '0px', fontFamily: 'Consolas, monospace', fontSize: '10px' }}
                  itemStyle={{ color: '#00FF00' }}
                  formatter={(value: number, name: string) => [value.toFixed(6), name]}
                />
                <Scatter name="GPS Path" data={data} fill="#00FF00" opacity={0.6} line={{ stroke: '#00FF00', strokeWidth: 1 }} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        );
      case 'telemetry-group':
        const metrics = activeTab.config?.metrics || [];
        if (metrics.length === 0) {
          return (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-[#666666] font-mono text-[10px] uppercase">NO METRICS CONFIGURED</p>
            </div>
          );
        }

        const ChartComponentGroup = chartType === 'line' ? LineChart : AreaChart;
        const DataComponentGroup = chartType === 'line' ? Line : Area;

        return (
          <div className="absolute inset-0 pt-4 pr-4 pb-2 pl-0">
            <ResponsiveContainer width="100%" height="100%">
              <ChartComponentGroup data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="#222222" vertical={false} />
                <XAxis 
                  dataKey={xAxisKey} 
                  stroke="#555555" 
                  tick={{ fill: '#555555', fontSize: 9, fontFamily: 'Consolas, monospace' }}
                  tickMargin={5}
                  minTickGap={20}
                />
                <YAxis 
                  stroke="#555555" 
                  tick={{ fill: '#555555', fontSize: 9, fontFamily: 'Consolas, monospace' }}
                  tickMargin={5}
                  width={45}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#000000', 
                    border: '1px solid #FFCD00',
                    borderRadius: '0px',
                    fontFamily: 'Consolas, monospace',
                    fontSize: '10px'
                  }}
                  itemStyle={{ color: '#FFCD00' }}
                  labelStyle={{ color: '#a0a0a0', marginBottom: '4px', textTransform: 'uppercase' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontFamily: 'Consolas, monospace' }} />
                {metrics.map((metric: string, idx: number) => (
                  <DataComponentGroup
                    key={metric}
                    type="monotone"
                    dataKey={metric}
                    stroke={colors[idx % colors.length]}
                    fill={chartType === 'area' ? `${colors[idx % colors.length]}33` : 'none'}
                    strokeWidth={1.5}
                    dot={false}
                    activeDot={{ r: 3, fill: '#000', stroke: colors[idx % colors.length], strokeWidth: 2 }}
                    isAnimationActive={false}
                  />
                ))}
              </ChartComponentGroup>
            </ResponsiveContainer>
          </div>
        );
      case 'telemetry':
        return (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-[#666666] font-mono text-[10px] uppercase">LEGACY PANEL</p>
          </div>
        );
      case 'live':
        if (!latestData || numericKeys.length === 0) {
          return (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-[#666666] font-mono text-[10px] uppercase">NO LIVE DATA</p>
            </div>
          );
        }
        return (
          <div className="absolute inset-0 p-2 overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-2 gap-2">
              {numericKeys.map((key, i) => {
                const val = latestData[key];
                const isNumber = typeof val === 'number' && !isNaN(val);
                const displayVal = isNumber ? Number(val).toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(val ?? '--');
                return (
                  <div key={key} className="bg-[#111111] border border-[#222222] p-2 flex flex-col justify-center items-center">
                    <span className="text-[9px] text-[#a0a0a0] uppercase mb-1 truncate w-full text-center" title={key}>{key}</span>
                    <span className="text-[18px] font-bold font-mono leading-none truncate w-full text-center" style={{ color: colors[i % colors.length] }}>
                      {displayVal}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      case 'tilt':
        return (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-[#666666] font-mono text-[10px] uppercase">WAITING FOR CONNECTION...</p>
          </div>
        );
      case 'custom':
        if (!activeTab.config?.metric) {
          return (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
              <p className="text-[#666666] font-mono text-[10px] uppercase mb-2">SELECT METRIC TO GRAPH</p>
              <select 
                className="bg-[#000000] border border-[#444444] text-[#FFCD00] font-mono px-2 py-1 text-[12px] outline-none w-full max-w-[200px]"
                onChange={(e) => updatePanelConfig(panel.id, { metric: e.target.value })}
                value=""
              >
                <option value="" disabled>-- SELECT --</option>
                {headers.filter(h => h !== xAxisKey).map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          );
        }
        
        const ChartComponentCustom = chartType === 'line' ? LineChart : AreaChart;
        const DataComponentCustom = chartType === 'line' ? Line : Area;
        
        return (
          <div className="absolute inset-0 pt-4 pr-4 pb-2 pl-0">
            <ResponsiveContainer width="100%" height="100%">
              <ChartComponentCustom data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="#222222" vertical={false} />
                <XAxis 
                  dataKey={xAxisKey} 
                  stroke="#555555" 
                  tick={{ fill: '#555555', fontSize: 9, fontFamily: 'Consolas, monospace' }}
                  tickMargin={5}
                  minTickGap={20}
                />
                <YAxis 
                  stroke="#555555" 
                  tick={{ fill: '#555555', fontSize: 9, fontFamily: 'Consolas, monospace' }}
                  tickMargin={5}
                  width={45}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#000000', 
                    border: '1px solid #FFCD00',
                    borderRadius: '0px',
                    fontFamily: 'Consolas, monospace',
                    fontSize: '10px'
                  }}
                  itemStyle={{ color: '#FFCD00' }}
                  labelStyle={{ color: '#a0a0a0', marginBottom: '4px', textTransform: 'uppercase' }}
                />
                <DataComponentCustom
                  type="monotone"
                  dataKey={activeTab.config.metric}
                  stroke="#00FFFF"
                  fill={chartType === 'area' ? '#00FFFF33' : 'none'}
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={{ r: 3, fill: '#000', stroke: '#00FFFF', strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              </ChartComponentCustom>
            </ResponsiveContainer>
          </div>
        );
      case 'gyro':
        const showGyro = gyroXKey && gyroYKey && frictionXKey && frictionYKey && data.length > 0;
        if (!showGyro) {
          return (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-[#666666] font-mono text-[10px] uppercase">GYRO DATA NOT CONFIGURED</p>
            </div>
          );
        }

        const gyroData = data.map(d => {
          const gx = Number(d[gyroXKey]) || 0;
          const gy = Number(d[gyroYKey]) || 0;
          const ax = Number(d[frictionXKey]) || 0;
          const ay = Number(d[frictionYKey]) || 0;
          const gForce = Math.sqrt(ax * ax + ay * ay);
          return { x: gx, y: gy, gForce };
        });

        let maxGyro = 0;
        let maxGForce = 0;
        gyroData.forEach(d => {
          if (Math.abs(d.x) > maxGyro) maxGyro = Math.abs(d.x);
          if (Math.abs(d.y) > maxGyro) maxGyro = Math.abs(d.y);
          if (d.gForce > maxGForce) maxGForce = d.gForce;
        });
        maxGyro = Math.ceil(maxGyro * 1.2);
        if (maxGyro === 0) maxGyro = 1;

        const getColor = (g: number) => {
          if (isNaN(g)) return 'rgb(0,255,0)';
          const ratio = maxGForce > 0 ? Math.min(g / maxGForce, 1) : 0;
          const r = ratio < 0.5 ? Math.floor(255 * (ratio * 2)) : 255;
          const g_col = ratio > 0.5 ? Math.floor(255 * (1 - (ratio - 0.5) * 2)) : 255;
          return `rgb(${r},${g_col},0)`;
        };

        return (
          <div className="absolute inset-0 pt-4 pr-4 pb-4 pl-0">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="#222222" />
                <XAxis type="number" dataKey="x" domain={[-maxGyro, maxGyro]} stroke="#555555" tick={{ fill: '#555555', fontSize: 9, fontFamily: 'Consolas, monospace' }} name="GYRO X" />
                <YAxis type="number" dataKey="y" domain={[-maxGyro, maxGyro]} stroke="#555555" tick={{ fill: '#555555', fontSize: 9, fontFamily: 'Consolas, monospace' }} name="GYRO Y" width={45} />
                <ZAxis type="number" range={[10, 10]} />
                <ReferenceLine x={0} stroke="#666666" />
                <ReferenceLine y={0} stroke="#666666" />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }}
                  contentStyle={{ backgroundColor: '#000000', border: '1px solid #FFCD00', borderRadius: '0px', fontFamily: 'Consolas, monospace', fontSize: '10px' }}
                  itemStyle={{ color: '#FFCD00' }}
                  formatter={(value: number, name: string) => [value.toFixed(3), name === 'x' ? 'GYRO X' : 'GYRO Y']}
                />
                <Scatter name="Gyro" data={gyroData}>
                  {gyroData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getColor(entry.gForce)} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        );
      case 'friction':
        const showFriction = frictionXKey && frictionYKey && data.length > 0;
        if (!showFriction) {
          return (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-[#666666] font-mono text-[10px] uppercase">G-G DATA NOT CONFIGURED</p>
            </div>
          );
        }

        const scatterData = data.map(d => {
          const x = Number(d[frictionXKey]) || 0;
          const y = Number(d[frictionYKey]) || 0;
          const gForce = Math.sqrt(x * x + y * y);
          return { x, y, gForce };
        });

        let maxG = 0;
        let maxGForceFriction = 0;
        scatterData.forEach(d => {
          if (Math.abs(d.x) > maxG) maxG = Math.abs(d.x);
          if (Math.abs(d.y) > maxG) maxG = Math.abs(d.y);
          if (d.gForce > maxGForceFriction) maxGForceFriction = d.gForce;
        });
        maxG = Math.ceil(maxG * 1.2 * 10) / 10;
        if (maxG === 0) maxG = 1;

        const getColorFriction = (g: number) => {
          if (isNaN(g)) return 'rgb(0,255,0)';
          const ratio = maxGForceFriction > 0 ? Math.min(g / maxGForceFriction, 1) : 0;
          const r = ratio < 0.5 ? Math.floor(255 * (ratio * 2)) : 255;
          const g_col = ratio > 0.5 ? Math.floor(255 * (1 - (ratio - 0.5) * 2)) : 255;
          return `rgb(${r},${g_col},0)`;
        };

        return (
          <div className="absolute inset-0 pt-4 pr-4 pb-4 pl-0">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
              <div className="w-[80%] h-[80%] rounded-full border border-[#FFCD00] absolute"></div>
              <div className="w-[53%] h-[53%] rounded-full border border-[#FFCD00] absolute"></div>
              <div className="w-[26%] h-[26%] rounded-full border border-[#FFCD00] absolute"></div>
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="#222222" />
                <XAxis type="number" dataKey="x" domain={[-maxG, maxG]} stroke="#555555" tick={{ fill: '#555555', fontSize: 9, fontFamily: 'Consolas, monospace' }} name="LATERAL" />
                <YAxis type="number" dataKey="y" domain={[-maxG, maxG]} stroke="#555555" tick={{ fill: '#555555', fontSize: 9, fontFamily: 'Consolas, monospace' }} name="LONGITUDINAL" width={45} />
                <ZAxis type="number" range={[10, 10]} />
                <ReferenceLine x={0} stroke="#666666" />
                <ReferenceLine y={0} stroke="#666666" />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }}
                  contentStyle={{ backgroundColor: '#000000', border: '1px solid #FFCD00', borderRadius: '0px', fontFamily: 'Consolas, monospace', fontSize: '10px' }}
                  itemStyle={{ color: '#FFCD00' }}
                  formatter={(value: number, name: string) => [value.toFixed(3), name === 'x' ? 'LAT' : 'LON']}
                />
                <Scatter name="G-Force" data={scatterData} opacity={0.6} isAnimationActive={false}>
                  {scatterData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getColorFriction(entry.gForce)} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#000000] text-[#f0f0f0] font-sans overflow-y-auto">
      
      {/* Top Bar */}
      <div className="h-[60px] bg-[#0a0a0a] border-b border-[#333333] flex items-center px-4 z-10 shadow-md gap-4 shrink-0 overflow-x-auto custom-scrollbar">
        <div className="flex items-center gap-3 mr-4 shrink-0">
          <img src="/logo.png" alt="Brew City Baja" className="h-10 w-auto object-contain" referrerPolicy="no-referrer" />
          <h1 className="text-[14px] font-bold tracking-[2px] text-[#FFCD00] uppercase whitespace-nowrap">Brew City Baja Telemetry</h1>
        </div>

        {/* File Upload */}
        <div className="flex items-center gap-2 shrink-0">
          <label className="bg-[#FFCD00] text-[#000000] px-3 py-1 text-[11px] font-bold uppercase cursor-pointer hover:bg-[#ffe666] transition-colors whitespace-nowrap">
            {fileName ? 'CHANGE FILE' : 'UPLOAD CSV'}
            <input 
              ref={fileInputRef}
              type="file" 
              accept=".csv" 
              onChange={handleFileInput} 
              className="hidden" 
            />
          </label>
          {fileName && <span className="text-[10px] text-[#a0a0a0] font-mono truncate max-w-[150px]">{fileName}</span>}
        </div>

        {data.length > 0 && (
          <>
            <div className="w-px h-8 bg-[#333333] mx-2 shrink-0"></div>
            
            {/* Config items */}
            <div className="flex items-center gap-4 text-[10px] shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[#666666] font-bold uppercase">X-Axis</span>
                <select 
                  value={xAxisKey}
                  onChange={(e) => setXAxisKey(e.target.value)}
                  className="bg-[#000000] border border-[#444444] text-[#FFCD00] font-mono px-2 py-1 outline-none w-[100px]"
                >
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[#666666] font-bold uppercase">G-G X</span>
                <select 
                  value={frictionXKey}
                  onChange={(e) => setFrictionXKey(e.target.value)}
                  className="bg-[#000000] border border-[#444444] text-[#FFCD00] font-mono px-2 py-1 outline-none w-[100px]"
                >
                  <option value="">-- NONE --</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[#666666] font-bold uppercase">G-G Y</span>
                <select 
                  value={frictionYKey}
                  onChange={(e) => setFrictionYKey(e.target.value)}
                  className="bg-[#000000] border border-[#444444] text-[#FFCD00] font-mono px-2 py-1 outline-none w-[100px]"
                >
                  <option value="">-- NONE --</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[#666666] font-bold uppercase">Gyro X</span>
                <select 
                  value={gyroXKey}
                  onChange={(e) => setGyroXKey(e.target.value)}
                  className="bg-[#000000] border border-[#444444] text-[#FFCD00] font-mono px-2 py-1 outline-none w-[100px]"
                >
                  <option value="">-- NONE --</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[#666666] font-bold uppercase">Gyro Y</span>
                <select 
                  value={gyroYKey}
                  onChange={(e) => setGyroYKey(e.target.value)}
                  className="bg-[#000000] border border-[#444444] text-[#FFCD00] font-mono px-2 py-1 outline-none w-[100px]"
                >
                  <option value="">-- NONE --</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[#666666] font-bold uppercase">Chart</span>
                <select 
                  value={chartType}
                  onChange={(e) => setChartType(e.target.value as 'line' | 'area')}
                  className="bg-[#000000] border border-[#444444] text-[#FFCD00] font-mono px-2 py-1 outline-none w-[80px]"
                >
                  <option value="line">LINE</option>
                  <option value="area">AREA</option>
                </select>
              </div>
            </div>

            <div className="w-px h-8 bg-[#333333] mx-2 shrink-0"></div>

            <button 
              onClick={() => addPanel('custom', 'CUSTOM GRAPH')}
              className="bg-[#111111] text-[#a0a0a0] border border-[#444444] px-3 py-1 text-[11px] font-bold uppercase hover:text-[#FFCD00] hover:border-[#FFCD00] transition-colors whitespace-nowrap shrink-0 flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> ADD PANEL
            </button>

            <button 
              onClick={() => { 
                setData([]); 
                setHeaders([]); 
                setFileName(null); 
                setNumericKeys([]); 
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="bg-[#300] text-[#fcc] border border-[#500] px-3 py-1 text-[11px] font-bold uppercase hover:bg-[#4d0000] transition-colors whitespace-nowrap shrink-0"
            >
              CLEAR
            </button>
          </>
        )}
      </div>

      {error && (
        <div className="bg-[#FF3333]/10 border-b border-[#FF3333]/30 px-4 py-2 flex items-center gap-2 text-[#FF3333] text-xs font-mono shrink-0">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-y-auto">
        
        {/* Right Panel - Main Dashboard Area */}
        <div ref={containerRef} className="flex-1 flex flex-col bg-[#000000] relative min-w-0 overflow-y-auto">
          
          {data.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
              <div className="text-[#333333] font-mono text-[24px] tracking-[2px] font-bold uppercase">
                NO SIGNAL
              </div>
              <button 
                onClick={loadTestData}
                className="bg-[#111111] text-[#FFCD00] border border-[#FFCD00] px-6 py-2 text-[12px] font-bold uppercase hover:bg-[#FFCD00] hover:text-black transition-all cursor-pointer shadow-[0_0_15px_rgba(255,205,0,0.2)]"
              >
                LOAD TEST DATA
              </button>
            </div>
          ) : (
            mounted && (
              <div ref={gridWrapperRef} className="absolute inset-0">
                <ResponsiveGridLayout
                  className="layout w-full h-full"
                  layouts={{ lg: layout }}
                  breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                  cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
                  rowHeight={gridRowHeight}
                  margin={[0, 0]}
                  containerPadding={[0, 0]}
                  width={width}
                  onLayoutChange={handleLayoutChange}
                  dragConfig={{ handle: '.drag-handle' }}
                >
                  {panels.map(panel => (
                    <div key={panel.id} className="bg-[#0a0a0a] border border-[#333333] flex flex-col shadow-lg relative">
                      <div className="bg-[#111111] border-b border-[#333333] px-3 py-1 flex justify-between items-center drag-handle cursor-move min-h-[32px]">
                        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-[70%]">
                          {panel.tabs.map((tab: any, idx: number) => (
                            <div key={tab.id} className="flex items-center group/tab border-r border-[#222222] last:border-r-0 pr-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); setPanels(panels.map(p => p.id === panel.id ? { ...p, activeTabIdx: idx } : p)); }}
                                className={`px-2 py-1 text-[9px] font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${
                                  panel.activeTabIdx === idx 
                                    ? 'text-[#FFCD00] bg-[#222222]/50' 
                                    : 'text-[#666666] hover:text-[#a0a0a0]'
                                }`}
                              >
                                {tab.title}
                              </button>
                              <div className="flex items-center overflow-hidden w-0 group-hover/tab:w-auto transition-all duration-200">
                                {panel.tabs.length > 1 && (
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); detachTab(panel.id, idx); }}
                                    className="text-[#666666] hover:text-[#00FFFF] ml-1"
                                    title="Detach to new window"
                                  >
                                    <Plus className="w-2 h-2 rotate-45" />
                                  </button>
                                )}
                                <button 
                                  onClick={(e) => { e.stopPropagation(); removeTab(panel.id, idx); }}
                                  className="text-[#666666] hover:text-[#FF3333] ml-1 mr-1"
                                  title="Remove tab"
                                >
                                  <X className="w-2 h-2" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => editPanelTitle(panel.id)} className="text-[#666666] hover:text-[#FFCD00]">
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button onClick={() => removePanel(panel.id)} className="text-[#666666] hover:text-[#FF3333]">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <div className="flex-1 relative overflow-hidden">
                        {renderPanelContent(panel)}
                      </div>
                    </div>
                  ))}
                </ResponsiveGridLayout>
              </div>
            )
          )}
        </div>
      </div>
      {/* Edit Panel Title Modal */}
      {editingPanelId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111111] border border-[#333333] p-6 w-96 shadow-2xl">
            <h3 className="text-[#FFCD00] font-mono text-[14px] uppercase mb-4">Edit Panel Title</h3>
            <input
              type="text"
              value={editTitleValue}
              onChange={(e) => setEditTitleValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') savePanelTitle();
                if (e.key === 'Escape') cancelEditPanelTitle();
              }}
              className="w-full bg-[#000000] border border-[#333333] text-[#a0a0a0] font-mono text-[12px] p-2 mb-4 focus:outline-none focus:border-[#FFCD00]"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={cancelEditPanelTitle}
                className="px-4 py-2 text-[#a0a0a0] hover:text-white font-mono text-[10px] uppercase transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={savePanelTitle}
                className="px-4 py-2 bg-[#FFCD00] text-black font-bold font-mono text-[10px] uppercase hover:bg-white transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
