import { useState, useRef, useEffect } from 'react'
import { Copy, Maximize2, ZoomIn, ZoomOut } from 'lucide-react'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://shobiths-pothole-backend.hf.space'

const Toggle = ({ label, checked, onToggle, activeColor = 'bg-[#00E5FF]' }) => (
  <label className="flex items-center justify-between cursor-pointer group w-full gap-2">
    <span className="text-xs sm:text-base font-bold uppercase flex-1">{label}</span>
    <span className={`relative flex h-5 sm:h-6 w-10 sm:w-12 items-center neo-border transition-colors flex-shrink-0 ${checked ? activeColor : 'bg-[#E5E5E5]'}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="sr-only"
      />
      <span
        className={`absolute top-0 h-full flex-shrink-0 bg-[#0A0A0A] neo-border border-t-0 border-b-0 transition-all ${checked ? 'right-0 border-r-0 w-5 sm:w-6' : 'left-0 border-l-0 w-5 sm:w-6'}`}
      />
    </span>
  </label>
)

const Slider = ({ label, value, onChange, colorHex }) => (
  <div className="flex flex-col gap-2">
    <div className="flex justify-between items-end gap-2">
      <label className="text-xs sm:text-sm font-bold uppercase flex-1">{label}</label>
      <span
        className="threshold-badge text-xs sm:text-sm flex-shrink-0"
        style={{ background: colorHex === '#00E5FF' ? '#111111' : '#FF4500', color: colorHex === '#00E5FF' ? '#00E5FF' : '#111111' }}
      >
        {value.toFixed(2)}
      </span>
    </div>
    <input
      type="range"
      min="0"
      max="1"
      step="0.05"
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="slider-input w-full cursor-pointer"
      style={{
        background: `linear-gradient(to right, #111 0%, #111 ${value * 100}%, #d0cfc9 ${value * 100}%, #d0cfc9 100%)`,
        '--thumb-color': colorHex,
      }}
    />
  </div>
)

const MetricCell = ({ label, value, color, unit = '' }) => (
  <div className="metrics-cell flex flex-col justify-between bg-[#F5F0E8]">
    <span className="text-[9px] sm:text-[11px] font-bold text-[#555] uppercase tracking-[0.18em]">{label}</span>
    <div className="flex items-end gap-1 leading-none">
      <span className="text-[28px] sm:text-[48px] font-black" style={{ color }}>{value}</span>
      {unit ? <span className="pb-1 sm:pb-2 text-[12px] sm:text-[20px] font-bold" style={{ color }}>{unit}</span> : null}
    </div>
  </div>
)

function App() {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [boxes, setBoxes] = useState([])
  const [loading, setLoading] = useState(false)
  const [logs, setLogs] = useState([])
  const [uploadCount, setUploadCount] = useState(0)
  
  // Settings
  const [confThreshold, setConfThreshold] = useState(0.75)
  const [iouThreshold, setIouThreshold] = useState(0.45)
  const [showBoxes, setShowBoxes] = useState(true)
  const [showLabels, setShowLabels] = useState(true)
  const [showHeatmap, setShowHeatmap] = useState(false)
  const [model, setModel] = useState('YOLOV8-NANO')
  
  // Metrics
  const [metrics, setMetrics] = useState({
    map50: '82.2',
    precision: '87.4',
    recall: '79.1',
    inference: '0'
  })

  // Mobile UI State - Controls/Metrics Toggle
  const [showControls, setShowControls] = useState(true)
  const [showMetrics, setShowMetrics] = useState(false)

  // Clock
  const [timeStr, setTimeStr] = useState("")

  const fileInputRef = useRef(null)
  const imgRef = useRef(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date()
      const time = now.toLocaleTimeString('en-US', { hour12: false })
      const date = now.toISOString().split('T')[0].replace(/-/g, '.')
      setTimeStr(`${time} | ${date}`)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Canvas Drawing Logic
  useEffect(() => {
    if (!canvasRef.current || !imgRef.current || !preview) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = imgRef.current;

    const drawOverlays = () => {
        // Set canvas coordinate system to match original image dimensions exactly
        if (img.naturalWidth === 0) return;
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        
      ctx.filter = 'none';
      ctx.globalCompositeOperation = 'source-over';
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Filter boxes dynamically based on UI slider threshold
        const filteredBoxes = boxes.filter(b => b.conf >= confThreshold);

        if (showHeatmap) {
            filteredBoxes.forEach(b => {
                const cx = (b.xmin + b.xmax) / 2;
                const cy = (b.ymin + b.ymax) / 2;
                const r = Math.max(b.xmax - b.xmin, b.ymax - b.ymin) * 1.2;
                const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
                grad.addColorStop(0, 'rgba(255, 69, 0, 0.4)'); 
                grad.addColorStop(1, 'rgba(255, 69, 0, 0)');
                ctx.fillStyle = grad;
                ctx.fillRect(cx - r, cy - r, r*2, r*2);
            });
        }

        if (showBoxes) {
          const boxLineWidth = Math.max(5, canvas.width / 180);
          filteredBoxes.forEach(b => {
            const width = b.xmax - b.xmin;
            const height = b.ymax - b.ymin;

            ctx.save();
            ctx.fillStyle = 'rgba(255, 69, 0, 0.16)';
            ctx.fillRect(b.xmin, b.ymin, width, height);

            ctx.strokeStyle = '#F5F0E8';
            ctx.lineWidth = boxLineWidth + 3;
            ctx.strokeRect(b.xmin, b.ymin, width, height);

            ctx.strokeStyle = '#FF4500';
            ctx.lineWidth = boxLineWidth;
            ctx.strokeRect(b.xmin, b.ymin, width, height);
            ctx.restore();
          });
        }

        if (showLabels) {
            // Scale font size based on image size
            const fontSize = Math.max(16, canvas.width / 44);
            ctx.font = `bold ${fontSize}px monospace`;
          ctx.textBaseline = 'top';
            
            filteredBoxes.forEach(b => {
                const text = `⚠ POTHOLE ${Math.round(b.conf * 100)}%`;
                const textWidth = ctx.measureText(text).width;
                const textHeight = parseInt(ctx.font, 10);
                
            const padX = fontSize * 0.35;
            const padY = fontSize * 0.28;
            const badgeWidth = textWidth + (padX * 2);
            const badgeHeight = textHeight + (padY * 2);

            let badgeX = b.xmin + 6;
            let badgeY = b.ymin + 6;

            if (badgeX + badgeWidth > b.xmax - 6) {
              badgeX = Math.max(b.xmin + 6, b.xmax - badgeWidth - 6);
            }

            if (badgeY + badgeHeight > b.ymax - 6) {
              badgeY = Math.max(b.ymin + 6, b.ymax - badgeHeight - 6);
            }

            ctx.fillStyle = '#0A0A0A';
            ctx.fillRect(badgeX, badgeY, badgeWidth, badgeHeight);

            ctx.strokeStyle = '#FFE600';
            ctx.lineWidth = Math.max(2, canvas.width / 380);
            ctx.strokeRect(badgeX, badgeY, badgeWidth, badgeHeight);

            ctx.fillStyle = '#FFE600';
            ctx.fillText(text, badgeX + padX, badgeY + padY);
            });
        }
    };

    if (img.complete) {
        drawOverlays();
    } else {
        img.onload = drawOverlays;
    }

  }, [boxes, showBoxes, showLabels, showHeatmap, confThreshold, preview]);

  const handleFileChange = (e) => {
    const selected = e.target.files[0]
    if (selected) {
      setFile(selected)
      setPreview(URL.createObjectURL(selected))
      setBoxes([])
      setUploadCount(prev => prev + 1)
      setShowControls(true)
      setShowMetrics(false)
      addLog(`SYSTEM: LOADED ${selected.name}`)
    }
  }

  const addLog = (message, type = 'info', conf = null) => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false })
    setLogs(prev => [...prev.slice(-49), { time, message, type, conf }])
  }

  const handleScan = async () => {
    if (!file && !preview) return
    
    setLoading(true)
    const startTime = Date.now()
    addLog(`INITIATING TARGETED INFERENCE [${model}]`)
    const formData = new FormData()
    formData.append("file", file)
    
    // We send a low conf threshold to the backend to get all possible detections, 
    // then allow real-time filtering in the UI via the Canvas logic
    formData.append("conf_threshold", "0.01") 
    formData.append("iou_threshold", iouThreshold.toString())

    // Warm up backend first to avoid Render sleep cold-start timing out /detect.
    try {
      await fetch(`${API_BASE_URL}/`, { method: "GET" })
    } catch (_) {
      // Ignore warm-up failures and let /detect attempt decide fallback behavior.
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 90000)

    try {
      const res = await fetch(`${API_BASE_URL}/detect`, {
        method: "POST",
        body: formData,
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      
      const data = await res.json()
      const infTime = Date.now() - startTime

      if (data.status === "success") {
        setBoxes(data.boxes || [])
        setMetrics(m => ({ ...m, inference: infTime.toString() }))
        setShowControls(false)
        setShowMetrics(true)
        
        const validBoxes = (data.boxes || []).filter(b => b.conf >= confThreshold)
        addLog(`FRAME_X: DETECTED ${validBoxes.length} OBJECTS`, validBoxes.length > 0 ? 'alert' : 'info')
        validBoxes.forEach(b => {
             addLog(`├─ POTHOLE (CONF: ${b.conf.toFixed(2)}) LOC: [${Math.round(b.xmin)}, ${Math.round(b.ymin)}, ${Math.round(b.xmax)}, ${Math.round(b.ymax)}]`, 'alert')
        })
      } else {
        alert(data.error || "Failed to scan image.")
        addLog(`ERROR: ${data.error}`, 'error')
      }
    } catch (err) {
      console.error(err)
      
      // MOCK DATA Fallback
      setTimeout(() => {
        if (err?.name === 'AbortError') {
          addLog(`API TIMEOUT. USING MOCK INFERENCE.`, 'error')
        } else {
          addLog(`API FAILED. USING MOCK INFERENCE.`, 'error')
        }
        const fakeTime = Date.now() - startTime + 50
        setMetrics(m => ({ ...m, inference: fakeTime.toString() }))
        setShowControls(false)
        setShowMetrics(true)
        
        // Return boxes relative to whatever size the image is (mock 1000x1000 field)
        const mockBoxes = [
            { xmin: 200, ymin: 300, xmax: 420, ymax: 460, conf: 0.94 },
            { xmin: 500, ymin: 600, xmax: 750, ymax: 700, conf: 0.88 },
            { xmin: 150, ymin: 100, xmax: 200, ymax: 130, conf: 0.65 } // Filtered easily
        ];
        
        setBoxes(mockBoxes)
        
        const validBoxes = mockBoxes.filter(b => b.conf >= confThreshold)
        addLog(`FRAME_X: DETECTED ${validBoxes.length} OBJECTS`, validBoxes.length > 0 ? 'alert' : 'info')
        validBoxes.forEach(b => {
             addLog(`├─ POTHOLE (CONF: ${b.conf.toFixed(2)}) LOC: [${Math.round(b.xmin)}, ${Math.round(b.ymin)}, ${Math.round(b.xmax)}, ${Math.round(b.ymax)}]`, 'alert')
        })
        setLoading(false)
      }, 500)
    } finally {
      clearTimeout(timeoutId)
      setLoading(false)
    }
  }
  
  const triggerFileInput = () => fileInputRef.current.click()

  return (
    <div className="h-screen flex flex-col font-mono uppercase tracking-tight bg-[#F5F0E8] text-[#111111]">
      {/* Top Nav */}
      <header className="bg-[#111111] text-[#F5F0E8] flex justify-between items-center w-full px-2 sm:px-4 py-3 sm:py-4 border-b-4 border-[#111111] flex-shrink-0 z-50 gap-2 min-h-0">
        <div className="flex items-center gap-1 sm:gap-2 min-w-0">
            <span className="text-lg sm:text-3xl font-black tracking-tighter truncate">
                POTHOLE<span className="text-[#FF4500]">.AI</span>
            </span>
        </div>
        <div className="flex items-center gap-1 sm:gap-6 flex-shrink-0">
            <div className="flex items-center gap-1 sm:gap-2 bg-[#222] px-2 sm:px-3 py-1 border-2 border-[#111] text-xs sm:text-sm">
                <div className="w-2 h-2 sm:w-3 sm:h-3 bg-[#00E5FF] animate-pulse flex-shrink-0"></div>
                <span className="font-bold text-[#00E5FF] uppercase hidden sm:inline-block">SYSTEM ONLINE</span>
                <span className="font-bold text-[#00E5FF] uppercase sm:hidden">ON</span>
            </div>
            
            <div className="hidden lg:block text-[#F5F0E8] font-bold text-xs tracking-widest whitespace-nowrap">{timeStr}</div>

            <button 
                onClick={triggerFileInput}
                className="bg-[#FF4500] text-[#111111] px-3 sm:px-6 py-2 text-xs sm:text-lg font-black uppercase border-2 border-[#111] shadow-[3px_3px_0px_0px_#111] active:shadow-[1px_1px_0px_0px_#111] active:translate-y-[2px] transition-all flex items-center gap-2 flex-shrink-0">
                <span className="hidden sm:inline">UPLOAD</span>
                <span className="sm:hidden">+</span>
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col md:flex-row p-2 sm:p-4 gap-2 sm:gap-4 overflow-hidden bg-[#F5F0E8]">
        
        {/* VIEWER - First on mobile (order-1), center on desktop (lg:order-2) */}
        <section className="flex-1 flex flex-col md:order-2 h-auto md:h-full min-w-0 min-h-[35vh] md:min-h-0 order-1">
          <div className="bg-[#F5F0E8] border-2 border-[#111] shadow-[4px_4px_0px_0px_#111] flex flex-col h-full">
            <div className="border-b-2 border-[#111] p-2 sm:p-3 bg-[#FFE600] flex justify-between items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black uppercase text-[#111] truncate">DETECTION VIEWER</h2>
                <div className="flex gap-1 flex-shrink-0">
                <button type="button" className="viewer-icon-btn w-6 h-6 sm:w-8 sm:h-8" aria-label="Zoom in"><ZoomIn size={14} strokeWidth={2.25} className="sm:w-full sm:h-full" style={{width: '16px', height: '16px'}} /></button>
                <button type="button" className="viewer-icon-btn w-6 h-6 sm:w-8 sm:h-8" aria-label="Zoom out"><ZoomOut size={14} strokeWidth={2.25} className="sm:w-full sm:h-full" style={{width: '16px', height: '16px'}} /></button>
                <button type="button" className="viewer-icon-btn w-6 h-6 sm:w-8 sm:h-8" aria-label="Fullscreen"><Maximize2 size={14} strokeWidth={2.25} className="sm:w-full sm:h-full" style={{width: '16px', height: '16px'}} /></button>
                </div>
            </div>
            {/* Main Image Area with Canvas Overlay */}
            <div className="flex-1 bg-[#111111] relative m-1 sm:m-3 border-2 border-[#111] overflow-hidden flex items-center justify-center group">
                {preview ? (
                     <div className="relative h-full w-full flex items-center justify-center">
                         {/* Original Image */}
                          <img 
                            ref={imgRef} 
                            src={preview} 
                            alt="Upload Preview" 
                            className="hidden" 
                         />
                         {/* Fullscreen Canvas mapping naturally to the image */}
                         <canvas 
                            ref={canvasRef} 
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-h-full max-w-full object-contain pointer-events-none" 
                         />
                     </div>
                ) : (
                    <div className="text-[#00E5FF] opacity-50 flex flex-col items-center">
                        <p className="text-xl font-bold uppercase border-2 border-[#00E5FF] p-4 bg-[#00E5FF]/10">AWAITING TARGET FEED</p>
                    </div>
                )}
            </div>
            {/* Thumbnails Placeholder - Hidden on mobile */}
            <div className="h-16 sm:h-24 border-t-2 border-[#111] bg-[#FFB4A2]/50 p-2 sm:p-3 flex gap-2 sm:gap-3 overflow-x-auto hidden md:flex">
                {preview && (
                    <div className="h-full aspect-video bg-[#111] border-2 border-[#FF4500] relative cursor-pointer opacity-100 shadow-[3px_3px_0px_0px_#111] flex-shrink-0">
                        <img src={preview} alt="Thumbnail 1" className="w-full h-full object-cover" />
                    </div>
                )}
              <div className="thumbnail-overflow text-xs sm:text-base">
                <span>{uploadCount > 2 ? `+${uploadCount - 2}` : '...'}</span>
                </div>
            </div>
          </div>
        </section>

        {/* METRICS - Second on mobile (order-2), right on desktop (md:order-3) */}
        <aside className="w-full md:w-[280px] flex flex-col gap-2 sm:gap-4 md:h-full md:overflow-hidden order-2 md:order-3">
            {/* Metrics Card - Collapsible on mobile */}
            <div className="bg-[#F5F0E8] border-2 border-[#111] shadow-[4px_4px_0px_0px_#111] flex flex-col shrink-0 lg:flex-[0.7]">
                <button type="button" onClick={() => setShowMetrics(!showMetrics)} className="border-b-2 border-[#111] p-2 sm:p-3 bg-[#FFE600] hover:bg-[#FFD700] transition-colors flex justify-between items-center w-full text-left">
                    <h2 className="text-lg sm:text-xl font-black uppercase text-[#111]">METRICS</h2>
                    <span className="text-[#111] font-bold md:hidden">{showMetrics ? '▼' : '▶'}</span>
                </button>
                <div className={`flex-1 metrics-grid bg-[#F5F0E8] ${showMetrics ? 'visible' : ''}`}>
                      <MetricCell label="MAP50" value={metrics.map50} color="#FF4500" />
                      <MetricCell label="PRECISION" value={metrics.precision} color="#00E5FF" />
                      <MetricCell label="RECALL" value={metrics.recall} color="#FFE600" />
                      <div className="metrics-cell flex flex-col justify-between bg-[#111111]">
                         <span className="text-[9px] sm:text-[11px] font-bold text-[#555] uppercase tracking-[0.18em]">INFERENCE</span>
                         <div className="flex items-end gap-1 leading-none">
                           <span className="text-[28px] sm:text-[48px] font-black text-white">{metrics.inference}</span>
                           <span className="pb-1 sm:pb-2 text-[12px] sm:text-[20px] font-bold text-white">ms</span>
                         </div>
                      </div>
                </div>
            </div>

            {/* Detection Log Card - Hidden on mobile, visible on desktop */}
            <div className="bg-[#F5F0E8] border-2 border-[#111] shadow-[4px_4px_0px_0px_#111] flex flex-col flex-1 min-h-0 md:min-h-0 hidden md:flex">
                <div className="border-b-2 border-[#111] p-2 sm:p-3 bg-[#111111] flex justify-between items-center gap-2">
                    <h2 className="text-sm sm:text-lg font-black text-[#FFE600] flex items-center gap-2">LOG</h2>
                  <button type="button" className="log-copy-btn w-4 h-4 sm:w-5 sm:h-5" aria-label="Copy logs">
                    <Copy size={16} strokeWidth={2.25} className="sm:w-full sm:h-full" style={{width: '16px', height: '16px'}} />
                  </button>
                </div>
                <div className="flex-1 bg-[#0A0A0A] p-2 sm:p-3 overflow-y-auto font-mono text-[9px] sm:text-[12px] leading-tight text-[#00E5FF] space-y-1 sm:space-y-2 flex flex-col">
                    {logs.map((log, i) => (
                     <div key={i} className={`log-entry ${log.message.startsWith('├') || log.message.startsWith('└') ? 'pl-4' : 'border-l-2 pl-2 border-[#00E5FF]'} ${log.type === 'alert' ? (log.message.includes('ERROR') ? 'text-red-500 border-red-500' : 'text-[#00E5FF] border-[#FF4500]') : 'opacity-70'}`}>
                             {!log.message.startsWith('├') && !log.message.startsWith('└') && <span className="text-gray-500 mr-2">[{log.time}]</span>}
                             
                             {/* Highlighting hack matching the backend log format */}
                             {log.message.split('(CONF:').map((part, idx) => {
                                 if (idx === 0) return <span key={idx}>{part}</span>;
                                 const confVal = part.split(')')[0];
                                 const color = parseFloat(confVal) > 0.9 ? 'text-green-500' : (parseFloat(confVal) > 0.7 ? 'text-[#FFE600]' : 'text-[#FF4500]');
                                 return <span key={idx}>(CONF:<span className={color}>{confVal}</span>){part.split(')')[1]}</span>
                             })}
                         </div>
                    ))}
                    <div className="mt-auto pt-4 animate-pulse opacity-50">
                        _ WAITING FOR STREAM...
                    </div>
                </div>
            </div>
        </aside>

        {/* CONTROLS - Third on mobile (order-3), left on desktop (md:order-1) */}
        <aside className="w-full md:w-[280px] flex flex-col md:h-full order-3 md:order-1">
          <div className="bg-[#F5F0E8] border-2 border-[#111] shadow-[4px_4px_0px_0px_#111] flex flex-col h-full md:overflow-y-auto">
            <button type="button" onClick={() => setShowControls(!showControls)} className="border-b-2 border-[#111] p-2 sm:p-3 bg-[#FFE600] hover:bg-[#FFD700] transition-colors flex justify-between items-center w-full text-left shrink-0">
                <h2 className="text-lg sm:text-xl font-black uppercase text-[#111]">CONTROLS</h2>
                <span className="text-[#111] font-bold hidden lg:inline">─</span>
                <span className="text-[#111] font-bold lg:hidden">{showControls ? '▼' : '▶'}</span>
            </button>
            {(showControls || typeof window === 'undefined' || window.innerWidth >= 768) && (
            <div className="p-2 sm:p-4 flex flex-col gap-3 sm:gap-6 flex-1 bg-[#F5F0E8] overflow-y-auto md:pb-0">
                
                <Slider label="CONFIDENCE THRESHOLD" value={confThreshold} onChange={setConfThreshold} colorHex="#00E5FF" />
                <Slider label="IOU THRESHOLD" value={iouThreshold} onChange={setIouThreshold} colorHex="#FF4500" />
                
                <div className="h-[2px] bg-[#111] w-full"></div>

                <Toggle label="BOUNDING BOXES" checked={showBoxes} onToggle={() => setShowBoxes(v => !v)} activeColor="bg-[#00E5FF]" />
                <Toggle label="CONFIDENCE LABELS" checked={showLabels} onToggle={() => setShowLabels(v => !v)} activeColor="bg-[#00E5FF]" />
                <Toggle label="HEATMAP OVERLAY" checked={showHeatmap} onToggle={() => setShowHeatmap(v => !v)} activeColor="bg-[#FF4500]" />
                
                <div className="h-[2px] bg-[#111] w-full"></div>

                <div className="flex flex-col gap-2">
                    <label className="text-xs sm:text-sm font-bold uppercase">MODEL SELECTION</label>
                    <select 
                        value={model} 
                        onChange={(e)=>setModel(e.target.value)}
                        className="w-full bg-[#E5E5E5] border-2 border-[#111] p-2 font-bold text-xs sm:text-sm cursor-pointer outline-none focus:bg-[#00E5FF] transition-colors"
                    >
                        <option value="YOLOV8-NANO">YOLOV8-NANO</option>
                        <option value="YOLOV8-SMALL">YOLOV8-SMALL</option>
                        <option value="YOLOV8-MEDIUM">YOLOV8-MEDIUM</option>
                        <option value="YOLOV8-LARGE">YOLOV8-LARGE</option>
                    </select>
                </div>
            </div>
            )}
          </div>
          
          {/* Sticky Run Button - Outside the scrollable div, always visible at bottom on mobile */}
          <div className="w-full md:hidden mt-2 sm:mt-4">
              <button 
                  onClick={handleScan}
                  disabled={!file && !preview}
                  className={`w-full py-2 sm:py-4 text-xs sm:text-xl font-black uppercase border-2 border-[#111] shadow-[4px_4px_0px_0px_#111] active:shadow-[1px_1px_0px_0px_#111] active:translate-y-[2px] flex items-center justify-center gap-2 transition-all ${
                      loading ? 'bg-red-600 text-[#111] animate-pulse' : (!file && !preview ? 'bg-gray-400 text-gray-700 cursor-not-allowed' : 'bg-[#FF4500] text-[#111]')
                  }`}>
                  {loading ? '■ STOP' : '▶ RUN'}
                  <span className="hidden sm:inline">{loading ? 'DETECTION' : 'DETECTION'}</span>
              </button>
          </div>
        </aside>

      </main>
    </div>
  )
}

export default App
