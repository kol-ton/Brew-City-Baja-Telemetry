import React, { useState, useCallback, useMemo } from 'react';
import Papa from 'papaparse';
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
  ReferenceLine
} from 'recharts';
import { AlertCircle } from 'lucide-react';

type DataRow = Record<string, any>;

export default function App() {
  const [data, setData] = useState<DataRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Chart configuration
  const [xAxisKey, setXAxisKey] = useState<string>('');
  const [yAxisKeys, setYAxisKeys] = useState<string[]>([]);
  const [chartType, setChartType] = useState<'line' | 'area'>('line');
  const [frictionXKey, setFrictionXKey] = useState<string>('');
  const [frictionYKey, setFrictionYKey] = useState<string>('');

  // UI State
  const [activeMainTab, setActiveMainTab] = useState<'chart' | 'data'>('chart');

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
        
        const parsedData = results.data as DataRow[];
        if (parsedData.length === 0) {
          setError('The CSV file is empty.');
          return;
        }

        const extractedHeaders = Object.keys(parsedData[0]);
        setHeaders(extractedHeaders);
        setData(parsedData);

        // Auto-select axes
        if (extractedHeaders.length > 0) {
          const frameCol = extractedHeaders.find(h => h.toLowerCase().includes('frame'));
          const timeCol = extractedHeaders.find(h => h.toLowerCase().includes('time') || h.toLowerCase().includes('date'));
          setXAxisKey(frameCol || timeCol || extractedHeaders[0]);

          const numericCols = extractedHeaders.filter(h => h !== (frameCol || timeCol || extractedHeaders[0]) && typeof parsedData[0][h] === 'number');
          if (numericCols.length > 0) {
            setYAxisKeys([numericCols[0]]);
          } else if (extractedHeaders.length > 1) {
            setYAxisKeys([extractedHeaders[1]]);
          }

          const latGCol = extractedHeaders.find(h => h.toLowerCase().match(/lat.*g|g.*lat|accel.*x/));
          const longGCol = extractedHeaders.find(h => h.toLowerCase().match(/lon.*g|g.*lon|accel.*y/));
          if (latGCol) setFrictionXKey(latGCol);
          if (longGCol) setFrictionYKey(longGCol);
        }
      },
      error: (err) => {
        setError(`Failed to parse CSV: ${err.message}`);
      }
    });
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const toggleYAxis = (key: string) => {
    setYAxisKeys(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const colors = useMemo(() => [
    '#FFCD00', '#FFFFFF', '#00FF00', '#FF3333', '#00FFFF', '#FF00FF'
  ], []);

  const latestData = data.length > 0 ? data[data.length - 1] : null;

  const renderCharts = () => {
    const showFriction = frictionXKey && frictionYKey && data.length > 0;
    if (data.length === 0 || (yAxisKeys.length === 0 && !showFriction)) return null;

    const ChartComponent = chartType === 'line' ? LineChart : AreaChart;
    const DataComponent = chartType === 'line' ? Line : Area;

    // Determine grid columns based on number of charts
    const totalCharts = yAxisKeys.length;
    const gridCols = totalCharts === 1 ? 'grid-cols-1' : totalCharts <= 4 ? 'grid-cols-2' : 'grid-cols-3';

    let maxG = 0;
    if (showFriction) {
      data.forEach(d => {
        const x = Math.abs(Number(d[frictionXKey]) || 0);
        const y = Math.abs(Number(d[frictionYKey]) || 0);
        if (x > maxG) maxG = x;
        if (y > maxG) maxG = y;
      });
      maxG = Math.ceil(maxG * 1.2 * 10) / 10;
      if (maxG === 0) maxG = 1;
    }

    return (
      <div className={`w-full h-full overflow-y-auto p-4 grid ${gridCols} gap-4 content-start custom-scrollbar`}>
        {yAxisKeys.map((key, index) => (
          <div key={key} className="bg-[#0a0a0a] border border-[#333333] flex flex-col h-[300px] shadow-lg">
            <div className="bg-[#111111] border-b border-[#333333] px-3 py-1.5 flex justify-between items-center">
              <span className="text-[10px] font-bold text-[#FFCD00] uppercase tracking-wider font-sans">{key}</span>
              <span className="text-[9px] text-[#666666] font-mono uppercase">VS {xAxisKey}</span>
            </div>
            <div className="flex-1 pt-4 pr-4 pb-2 pl-0">
              <ResponsiveContainer width="100%" height="100%">
                <ChartComponent data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
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
                  <DataComponent
                    type="monotone"
                    dataKey={key}
                    stroke={colors[index % colors.length]}
                    fill={chartType === 'area' ? `${colors[index % colors.length]}33` : 'none'}
                    strokeWidth={1.5}
                    dot={false}
                    activeDot={{ r: 3, fill: '#000', stroke: colors[index % colors.length], strokeWidth: 2 }}
                    isAnimationActive={false}
                  />
                </ChartComponent>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderFrictionCircle = () => {
    const showFriction = frictionXKey && frictionYKey && data.length > 0;
    if (!showFriction) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-[#0a0a0a] border border-[#333333]">
          <p className="text-[#666666] font-mono text-[10px] uppercase">G-G DATA NOT CONFIGURED</p>
        </div>
      );
    }

    let maxG = 0;
    data.forEach(d => {
      const x = Math.abs(Number(d[frictionXKey]) || 0);
      const y = Math.abs(Number(d[frictionYKey]) || 0);
      if (x > maxG) maxG = x;
      if (y > maxG) maxG = y;
    });
    maxG = Math.ceil(maxG * 1.2 * 10) / 10;
    if (maxG === 0) maxG = 1;

    return (
      <div className="bg-[#0a0a0a] border border-[#333333] flex flex-col h-full shadow-lg">
        <div className="bg-[#111111] border-b border-[#333333] px-3 py-1.5 flex justify-between items-center">
          <span className="text-[10px] font-bold text-[#FFCD00] uppercase tracking-wider font-sans">G-G DIAGRAM</span>
          <span className="text-[9px] text-[#666666] font-mono uppercase">{frictionXKey} vs {frictionYKey}</span>
        </div>
        <div className="flex-1 pt-4 pr-4 pb-4 pl-0 flex items-center justify-center relative">
          {/* Concentric circles for G-G diagram */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
            <div className="w-[80%] h-[80%] rounded-full border border-[#FFCD00] absolute"></div>
            <div className="w-[53%] h-[53%] rounded-full border border-[#FFCD00] absolute"></div>
            <div className="w-[26%] h-[26%] rounded-full border border-[#FFCD00] absolute"></div>
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
              <CartesianGrid strokeDasharray="2 2" stroke="#222222" />
              <XAxis type="number" dataKey={frictionXKey} domain={[-maxG, maxG]} stroke="#555555" tick={{ fill: '#555555', fontSize: 9, fontFamily: 'Consolas, monospace' }} name="LATERAL" />
              <YAxis type="number" dataKey={frictionYKey} domain={[-maxG, maxG]} stroke="#555555" tick={{ fill: '#555555', fontSize: 9, fontFamily: 'Consolas, monospace' }} name="LONGITUDINAL" width={45} />
              <ZAxis type="number" range={[10, 10]} />
              <ReferenceLine x={0} stroke="#666666" />
              <ReferenceLine y={0} stroke="#666666" />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3' }}
                contentStyle={{ backgroundColor: '#000000', border: '1px solid #FFCD00', borderRadius: '0px', fontFamily: 'Consolas, monospace', fontSize: '10px' }}
                itemStyle={{ color: '#FFCD00' }}
              />
              <Scatter name="G-Force" data={data} fill="#FFCD00" opacity={0.6} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const renderMapPlaceholder = () => (
    <div className="bg-[#0a0a0a] border border-[#333333] flex flex-col h-full shadow-lg">
      <div className="bg-[#111111] border-b border-[#333333] px-3 py-1.5 flex justify-between items-center">
        <span className="text-[10px] font-bold text-[#FFCD00] uppercase tracking-wider font-sans">GPS MAP</span>
      </div>
      <div className="flex-1 flex items-center justify-center relative overflow-hidden">
        {/* Fake map background */}
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: 'radial-gradient(#333 1px, transparent 1px)',
          backgroundSize: '20px 20px'
        }}></div>
        <div className="text-[#666666] font-mono text-[12px] uppercase z-10">
          {data.length > 0 ? 'MAP DATA NOT AVAILABLE' : 'WAITING FOR CONNECTION...'}
        </div>
      </div>
    </div>
  );

  const renderLiveData = () => {
    if (!latestData || yAxisKeys.length === 0) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-[#0a0a0a] border border-[#333333]">
          <p className="text-[#666666] font-mono text-[10px] uppercase">NO LIVE DATA</p>
        </div>
      );
    }

    return (
      <div className="bg-[#0a0a0a] border border-[#333333] flex flex-col h-full shadow-lg">
        <div className="bg-[#111111] border-b border-[#333333] px-3 py-1.5 flex justify-between items-center">
          <span className="text-[10px] font-bold text-[#FFCD00] uppercase tracking-wider font-sans">LIVE DATA</span>
        </div>
        <div className="flex-1 p-2 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-2 gap-2">
            {yAxisKeys.map((key, i) => {
              const val = latestData[key];
              const isNumber = typeof val === 'number';
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
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#000000] text-[#f0f0f0] font-sans overflow-hidden">
      
      {/* Connection Bar */}
      <div className="h-12 bg-[#111111] border-b border-[#333333] px-4 flex items-center gap-4 flex-shrink-0">
        <div className="font-mono font-bold text-[18px] tracking-[1px] mr-1 text-white">
          TELEMETRY<span className="text-[#FFCD00]">_SYS</span>
        </div>
        <div className="w-px h-[25px] bg-[#333333]"></div>
        
        <label className="bg-[#222222] text-[#cccccc] border border-[#444444] px-[15px] h-[24px] text-[11px] font-bold uppercase cursor-pointer hover:bg-[#333333] hover:border-[#777777] hover:text-white transition-all tracking-[0.5px] flex items-center justify-center whitespace-nowrap">
          LOAD CSV
          <input type="file" className="hidden" accept=".csv" onChange={handleFileInput} />
        </label>

        {data.length > 0 && (
          <button 
            onClick={() => { setData([]); setHeaders([]); setFileName(null); setYAxisKeys([]); }}
            className="bg-[#300] text-[#fcc] border border-[#500] px-[15px] h-[24px] text-[11px] font-bold uppercase cursor-pointer hover:bg-[#4d0000] hover:border-red-500 transition-all tracking-[0.5px] flex items-center justify-center whitespace-nowrap"
          >
            CLEAR
          </button>
        )}

        <div className="ml-auto flex gap-5">
          <div className="flex flex-col items-start min-w-[40px]">
            <span className="text-[8px] text-[#666666] font-bold uppercase">SOURCE</span>
            <span className="font-mono text-[16px] text-white font-bold tracking-[0.5px] truncate max-w-[200px]">
              {fileName || 'NONE'}
            </span>
          </div>
          <div className="flex flex-col items-start min-w-[40px]">
            <span className="text-[8px] text-[#666666] font-bold uppercase">STATUS</span>
            <span className={`font-mono text-[16px] font-bold tracking-[0.5px] ${fileName ? 'text-[#FFCD00] text-shadow-gold' : 'text-[#444444]'}`}>
              {fileName ? 'CONNECTED' : 'DISCONNECTED'}
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-[#FF3333]/10 border-b border-[#FF3333]/30 px-4 py-2 flex items-center gap-2 text-[#FF3333] text-xs font-mono">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Panel - Config & Live Data */}
        <div className="w-[320px] bg-[#121212] border-r border-[#333333] flex flex-col flex-shrink-0">
          
          {/* Panel Tabs */}
          <div className="flex bg-[#1a1a1a] border-b border-[#333333] h-[28px] flex-shrink-0">
            <div className="px-4 flex items-center text-[11px] uppercase tracking-[0.5px] font-sans border-r border-[#222222] text-[#FFCD00] bg-[#000000] border-t-2 border-t-[#FFCD00]">
              CONFIGURATION
            </div>
          </div>

          <div className="flex-1 overflow-y-auto flex flex-col">
            {headers.length > 0 ? (
              <div className="p-4 flex flex-col gap-4">
                {/* X Axis */}
                <div className="flex flex-col justify-center">
                  <label className="text-[8px] text-[#666666] mb-[1px] font-bold uppercase">X-Axis (Domain)</label>
                  <select 
                    value={xAxisKey}
                    onChange={(e) => setXAxisKey(e.target.value)}
                    className="bg-[#000000] border border-[#444444] text-[#FFCD00] font-mono px-[6px] py-[2px] text-[12px] w-full outline-none focus:border-[#FFCD00] h-[24px]"
                  >
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                {/* Chart Type */}
                <div className="flex flex-col justify-center">
                  <label className="text-[8px] text-[#666666] mb-[1px] font-bold uppercase">Chart Type</label>
                  <div className="flex border border-[#444444] bg-[#000000] h-[24px]">
                    <div 
                      onClick={() => setChartType('line')}
                      className={`flex-1 flex items-center justify-center text-[10px] font-bold cursor-pointer transition-all ${chartType === 'line' ? 'bg-[#333333] text-[#FFCD00]' : 'text-[#666666] hover:text-[#a0a0a0]'}`}
                    >
                      LINE
                    </div>
                    <div className="w-px bg-[#444444]"></div>
                    <div 
                      onClick={() => setChartType('area')}
                      className={`flex-1 flex items-center justify-center text-[10px] font-bold cursor-pointer transition-all ${chartType === 'area' ? 'bg-[#333333] text-[#FFCD00]' : 'text-[#666666] hover:text-[#a0a0a0]'}`}
                    >
                      AREA
                    </div>
                  </div>
                </div>

                {/* Y Axis */}
                <div className="flex flex-col justify-center flex-1 min-h-0">
                  <label className="text-[8px] text-[#666666] mb-[1px] font-bold uppercase">Y-Axis (Metrics)</label>
                  <div className="bg-[#333333] border border-[#333333] grid grid-cols-1 gap-px overflow-y-auto max-h-[150px]">
                    {headers.filter(h => h !== xAxisKey).map(h => {
                      const isActive = yAxisKeys.includes(h);
                      return (
                        <div 
                          key={h} 
                          onClick={() => toggleYAxis(h)}
                          className={`bg-[#000000] p-2 flex items-center gap-2 cursor-pointer hover:bg-[#111111] transition-colors`}
                        >
                          <div className={`w-3 h-3 border flex items-center justify-center ${isActive ? 'border-[#FFCD00]' : 'border-[#444444]'}`}>
                            {isActive && <div className="w-1.5 h-1.5 bg-[#FFCD00]" />}
                          </div>
                          <span className={`font-mono text-[11px] truncate ${isActive ? 'text-[#f0f0f0]' : 'text-[#a0a0a0]'}`}>
                            {h}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Friction Circle Config */}
                <div className="flex flex-col justify-center mt-2">
                  <label className="text-[8px] text-[#666666] mb-[1px] font-bold uppercase">Friction Circle (G-G)</label>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-[#a0a0a0] w-10">LAT(X)</span>
                      <select 
                        value={frictionXKey}
                        onChange={(e) => setFrictionXKey(e.target.value)}
                        className="bg-[#000000] border border-[#444444] text-[#FFCD00] font-mono px-[6px] py-[2px] text-[12px] w-full outline-none focus:border-[#FFCD00] h-[24px]"
                      >
                        <option value="">-- NONE --</option>
                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-[#a0a0a0] w-10">LON(Y)</span>
                      <select 
                        value={frictionYKey}
                        onChange={(e) => setFrictionYKey(e.target.value)}
                        className="bg-[#000000] border border-[#444444] text-[#FFCD00] font-mono px-[6px] py-[2px] text-[12px] w-full outline-none focus:border-[#FFCD00] h-[24px]"
                      >
                        <option value="">-- NONE --</option>
                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 text-[11px] text-[#666666] font-mono text-center mt-10">
                AWAITING DATA SOURCE...
              </div>
            )}

            {/* Live Data Grid (Removed from sidebar, moved to main view) */}
          </div>
        </div>

        {/* Right Panel - Main Dashboard Area */}
        <div className="flex-1 flex flex-col bg-[#000000] relative min-w-0 p-4 gap-4 overflow-y-auto custom-scrollbar">
          
          {data.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-[#333333] font-mono text-[24px] tracking-[2px] font-bold uppercase">
                NO SIGNAL
              </div>
            </div>
          ) : (
            <>
              {/* Top Row: Map, Main Chart, Live Data */}
              <div className="grid grid-cols-12 gap-4 h-[400px] flex-shrink-0">
                {/* Map (Left) */}
                <div className="col-span-3 h-full">
                  {renderMapPlaceholder()}
                </div>
                
                {/* Main Telemetry Plot (Center) */}
                <div className="col-span-6 h-full bg-[#0a0a0a] border border-[#333333] flex flex-col shadow-lg">
                  <div className="bg-[#111111] border-b border-[#333333] px-3 py-1.5 flex justify-between items-center">
                    <span className="text-[10px] font-bold text-[#FFCD00] uppercase tracking-wider font-sans">TELEMETRY PLOT</span>
                  </div>
                  <div className="flex-1 relative">
                    {yAxisKeys.length === 0 ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <p className="text-[#666666] font-mono text-[12px] uppercase">SELECT METRICS TO PLOT</p>
                      </div>
                    ) : (
                      <div className="absolute inset-0">
                        {renderCharts()}
                      </div>
                    )}
                  </div>
                </div>

                {/* Live Data (Right) */}
                <div className="col-span-3 h-full">
                  {renderLiveData()}
                </div>
              </div>

              {/* Bottom Row: Additional Charts, Friction Circle */}
              <div className="grid grid-cols-12 gap-4 h-[300px] flex-shrink-0">
                {/* Extra space for future panels or more charts */}
                <div className="col-span-3 h-full bg-[#0a0a0a] border border-[#333333] flex flex-col shadow-lg">
                   <div className="bg-[#111111] border-b border-[#333333] px-3 py-1.5 flex justify-between items-center">
                    <span className="text-[10px] font-bold text-[#FFCD00] uppercase tracking-wider font-sans">CAR TILT PANEL</span>
                  </div>
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-[#666666] font-mono text-[10px] uppercase">WAITING FOR CONNECTION...</p>
                  </div>
                </div>

                <div className="col-span-6 h-full bg-[#0a0a0a] border border-[#333333] flex flex-col shadow-lg">
                   <div className="bg-[#111111] border-b border-[#333333] px-3 py-1.5 flex justify-between items-center">
                    <span className="text-[10px] font-bold text-[#FFCD00] uppercase tracking-wider font-sans">CUSTOM GRAPH</span>
                  </div>
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-[#666666] font-mono text-[10px] uppercase">ADD GRAPH TO VIEW</p>
                  </div>
                </div>

                {/* Friction Circle (Bottom Right) */}
                <div className="col-span-3 h-full">
                  {renderFrictionCircle()}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
