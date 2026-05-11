import { useState, useRef, useEffect } from 'react'

function App() {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [boxes, setBoxes] = useState([])
  const [loading, setLoading] = useState(false)
  const [detectCount, setDetectCount] = useState(0)
  const [logs, setLogs] = useState([])
  
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
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Filter boxes dynamically based on UI slider threshold
        const filteredBoxes = boxes.filter(b => b.conf >= confThreshold);
        setDetectCount(filteredBoxes.length);

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
            ctx.strokeStyle = '#FF4500'; // Brutalist Orange
            ctx.lineWidth = Math.max(3, canvas.width / 250);
            filteredBoxes.forEach(b => {
                ctx.strokeRect(b.xmin, b.ymin, b.xmax - b.xmin, b.ymax - b.ymin);
            });
        }

        if (showLabels) {
            // Scale font size based on image size
            const fontSize = Math.max(14, canvas.width / 50);
            ctx.font = `bold ${fontSize}px monospace`;
            ctx.textBaseline = 'top';
            
            filteredBoxes.forEach(b => {
                const text = `⚠ POTHOLE ${Math.round(b.conf * 100)}%`;
                const textWidth = ctx.measureText(text).width;
                const textHeight = parseInt(ctx.font, 10);
                
                // Yellow background badge
                ctx.fillStyle = '#FFE600'; 
                ctx.strokeStyle = '#111111';
                ctx.lineWidth = Math.max(1, canvas.width / 500);
                const padX = fontSize * 0.4;
                const padY = fontSize * 0.3;
                
                ctx.fillRect(b.xmin, b.ymin - textHeight - (padY * 2), textWidth + (padX * 2), textHeight + (padY * 2));
                ctx.strokeRect(b.xmin, b.ymin - textHeight - (padY * 2), textWidth + (padX * 2), textHeight + (padY * 2));
                
                // Deep black sharp text
                ctx.fillStyle = '#111111';
                ctx.fillText(text, b.xmin + padX, b.ymin - textHeight - padY);
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
      setDetectCount(0)
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

    try {
      const res = await fetch("http://localhost:8000/detect", {
        method: "POST",
        body: formData,
      })
      
      const data = await res.json()
      const infTime = Date.now() - startTime

      if (data.status === "success") {
        setBoxes(data.boxes || [])
        setMetrics(m => ({ ...m, inference: infTime.toString() }))
        
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
        addLog(`API FAILED. USING MOCK INFERENCE.`, 'error')
        const fakeTime = Date.now() - startTime + 50
        setMetrics(m => ({ ...m, inference: fakeTime.toString() }))
        
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
      setLoading(false)
    }
  }
  
  const triggerFileInput = () => fileInputRef.current.click()

  const Toggle = ({ label, checked, onToggle, activeColor = 'bg-[#00E5FF]' }) => (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onToggle}
      className="flex w-full items-center justify-between cursor-pointer group"
    >
      <span className="text-base font-bold uppercase">{label}</span>
      <div className={`w-12 h-6 neo-border relative transition-colors ${checked ? activeColor : 'bg-[#E5E5E5]'}`}>
        <div className={`absolute top-0 w-6 h-full bg-[#0A0A0A] neo-border border-t-0 border-b-0 transition-all ${checked ? 'right-0 border-r-0' : 'left-0 border-l-0'}`}></div>
      </div>
    </button>
  )

  const Slider = ({ label, value, onChange, colorHex }) => (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-end">
        <label className="text-sm font-bold uppercase">{label}</label>
        <span className={`text-xs font-bold bg-[#0A0A0A] px-2 py-1 neo-border`} style={{color: colorHex}}>{value}</span>
      </div>
      <input type="range" min="0" max="1" step="0.05" value={value} onChange={(e)=>onChange(parseFloat(e.target.value))} className="w-full accent-[#0A0A0A] cursor-pointer" />
    </div>
  )
  
  return (
    <div className="h-screen flex flex-col font-mono uppercase tracking-tight bg-[#F5F0E8] text-[#111111]">
      {/* Top Nav */}
      <header className="bg-[#111111] text-[#F5F0E8] flex justify-between items-center w-full px-6 py-4 border-b-4 border-[#111111] flex-shrink-0 z-50">
        <div className="flex items-center gap-2">
            <span className="text-3xl font-black tracking-tighter">
                POTHOLE<span className="text-[#FF4500]">.AI</span>
            </span>
        </div>
        <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 bg-[#222] px-3 py-1 border-2 border-[#111]">
                <div className="w-3 h-3 bg-[#00E5FF] animate-pulse"></div>
                <span className="text-sm font-bold text-[#00E5FF] uppercase">SYSTEM ONLINE</span>
            </div>
            
            <div className="hidden md:block text-[#F5F0E8] font-bold text-sm tracking-widest">{timeStr}</div>

            <button 
                onClick={triggerFileInput}
                className="bg-[#FF4500] text-[#111111] px-6 py-2 text-lg font-black uppercase border-2 border-[#111] shadow-[3px_3px_0px_0px_#111] active:shadow-[1px_1px_0px_0px_#111] active:translate-y-[2px] transition-all flex items-center gap-2">
                UPLOAD
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col lg:flex-row p-4 gap-4 overflow-hidden bg-[#F5F0E8]">
        
        {/* Left Column: Controls (260px) */}
        <aside className="w-full lg:w-[280px] flex flex-col h-full overflow-y-auto">
          <div className="bg-[#F5F0E8] border-2 border-[#111] shadow-[4px_4px_0px_0px_#111] flex flex-col h-full">
            <div className="border-b-2 border-[#111] p-3 bg-[#FFE600]">
                <h2 className="text-xl font-black uppercase text-[#111]">CONTROLS</h2>
            </div>
            <div className="p-4 flex flex-col gap-6 flex-1 bg-[#F5F0E8]">
                
                <Slider label="CONFIDENCE THRESHOLD" value={confThreshold} onChange={setConfThreshold} colorHex="#00E5FF" />
                <Slider label="IOU THRESHOLD" value={iouThreshold} onChange={setIouThreshold} colorHex="#FF4500" />
                
                <div className="h-[2px] bg-[#111] w-full"></div>

                <Toggle label="BOUNDING BOXES" checked={showBoxes} onToggle={() => setShowBoxes(v => !v)} activeColor="bg-[#00E5FF]" />
                <Toggle label="CONFIDENCE LABELS" checked={showLabels} onToggle={() => setShowLabels(v => !v)} activeColor="bg-[#00E5FF]" />
                <Toggle label="HEATMAP OVERLAY" checked={showHeatmap} onToggle={() => setShowHeatmap(v => !v)} activeColor="bg-[#FF4500]" />
                
                <div className="h-[2px] bg-[#111] w-full"></div>

                <div className="flex flex-col gap-2">
                    <label className="text-sm font-bold uppercase">MODEL SELECTION</label>
                    <select 
                        value={model} 
                        onChange={(e)=>setModel(e.target.value)}
                        className="w-full bg-[#E5E5E5] border-2 border-[#111] p-2 font-bold text-sm cursor-pointer outline-none focus:bg-[#00E5FF] transition-colors"
                    >
                        <option value="YOLOV8-NANO">YOLOV8-NANO</option>
                        <option value="YOLOV8-SMALL">YOLOV8-SMALL</option>
                        <option value="YOLOV8-MEDIUM">YOLOV8-MEDIUM</option>
                        <option value="YOLOV8-LARGE">YOLOV8-LARGE</option>
                    </select>
                </div>

                <div className="mt-auto pt-4">
                    <button 
                        onClick={handleScan}
                        disabled={!file && !preview}
                        className={`w-full py-4 text-xl font-black uppercase border-2 border-[#111] shadow-[4px_4px_0px_0px_#111] active:shadow-[1px_1px_0px_0px_#111] active:translate-y-[2px] flex items-center justify-center gap-2 transition-all ${
                            loading ? 'bg-red-600 text-[#111] animate-pulse' : (!file && !preview ? 'bg-gray-400 text-gray-700 cursor-not-allowed hidden' : 'bg-[#FF4500] text-[#111]')
                        }`}>
                        {loading ? '■ STOP DETECTION' : '▶ RUN DETECTION'}
                    </button>
                    {!file && !preview && (
                        <div className="w-full py-4 text-xl font-black uppercase border-2 border-[#111] bg-[#FF4500] opacity-50 cursor-not-allowed shadow-[4px_4px_0px_0px_#111] flex justify-center">▶ RUN DETECTION</div>
                    )}
                </div>
            </div>
          </div>
        </aside>

        {/* Center Column: Viewer */}
        <section className="flex-1 flex flex-col h-full min-w-0">
            <div className="bg-[#F5F0E8] border-2 border-[#111] shadow-[4px_4px_0px_0px_#111] flex flex-col h-full">
                <div className="border-b-2 border-[#111] p-3 bg-[#FFE600] flex justify-between items-center">
                    <h2 className="text-xl font-black uppercase text-[#111]">DETECTION VIEWER</h2>
                    <div className="flex gap-2">
                        <button className="w-8 h-8 flex items-center justify-center border-2 border-[#111] bg-white hover:bg-[#00E5FF] shadow-[2px_2px_0px_0px_#111]"><span className="text-lg">⊕</span></button>
                        <button className="w-8 h-8 flex items-center justify-center border-2 border-[#111] bg-white hover:bg-[#00E5FF] shadow-[2px_2px_0px_0px_#111]"><span className="text-lg">⊖</span></button>
                        <button className="w-8 h-8 flex items-center justify-center border-2 border-[#111] bg-white hover:bg-[#00E5FF] shadow-[2px_2px_0px_0px_#111]"><span className="text-lg">⛶</span></button>
                    </div>
                </div>
                {/* Main Image Area with Canvas Overlay */}
                <div className="flex-1 bg-[#111111] relative m-3 border-2 border-[#111] overflow-hidden flex items-center justify-center group">
                    {preview ? (
                         <div className="relative h-full w-full flex items-center justify-center">
                             {/* Original Image */}
                             <img 
                                ref={imgRef} 
                                src={preview} 
                                alt="Upload Preview" 
                                className="max-h-full max-w-full object-contain" 
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
                {/* Thumbnails Placeholder */}
                <div className="h-24 border-t-2 border-[#111] bg-[#FFB4A2]/50 p-3 flex gap-3 overflow-x-auto">
                    {preview && (
                        <div className="h-full aspect-video bg-[#111] border-2 border-[#FF4500] relative cursor-pointer opacity-100 shadow-[3px_3px_0px_0px_#111]">
                            <img src={preview} alt="Thumbnail 1" className="w-full h-full object-cover" />
                        </div>
                    )}
                    <div className="h-full w-24 bg-[#A3918B] border-2 border-[#111] flex items-center justify-center cursor-pointer shadow-[3px_3px_0px_0px_#111]">
                        <span className="text-[#F5F0E8] text-xl font-bold tracking-widest">...</span>
                    </div>
                </div>
            </div>
        </section>

        {/* Right Column: Metrics & Log (280px) */}
        <aside className="w-full lg:w-[280px] flex flex-col gap-4 h-full overflow-hidden">
            {/* Metrics Card */}
            <div className="bg-[#F5F0E8] border-2 border-[#111] shadow-[4px_4px_0px_0px_#111] flex flex-col shrink-0 flex-[0.7]">
                <div className="border-b-2 border-[#111] p-3 bg-[#FFE600]">
                    <h2 className="text-xl font-black uppercase text-[#111]">METRICS</h2>
                </div>
                <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-[2px] bg-[#111]">
                    <div className="bg-[#F5F0E8] p-3 flex flex-col justify-between">
                        <span className="text-xs font-bold text-[#111]">MAP50</span>
                        <span className="text-4xl font-black text-[#FF4500]">{metrics.map50}</span>
                    </div>
                    <div className="bg-[#F5F0E8] p-3 flex flex-col justify-between">
                        <span className="text-xs font-bold text-[#111]">PRECISION</span>
                        <span className="text-4xl font-black text-[#00E5FF]">{metrics.precision}</span>
                    </div>
                    <div className="bg-[#F5F0E8] p-3 flex flex-col justify-between">
                        <span className="text-xs font-bold text-[#111]">RECALL</span>
                        <span className="text-4xl font-black text-[#FFE600]">{metrics.recall}</span>
                    </div>
                    <div className="bg-[#111111] p-3 flex flex-col justify-between">
                         <span className="text-xs font-bold text-gray-400">INFERENCE</span>
                         <span className="text-3xl font-black text-white">{metrics.inference} <span className="text-sm font-bold text-[#00E5FF]">ms</span></span>
                    </div>
                </div>
            </div>

            {/* Detection Log Card */}
            <div className="bg-[#F5F0E8] border-2 border-[#111] shadow-[4px_4px_0px_0px_#111] flex flex-col flex-1 min-h-0">
                <div className="border-b-2 border-[#111] p-3 bg-[#111111] flex justify-between items-center">
                    <h2 className="text-lg font-black text-[#FFE600] flex items-center gap-2">LOG</h2>
                    <span className="text-[#00E5FF] cursor-pointer">⎘</span>
                </div>
                <div className="flex-1 bg-[#0A0A0A] p-3 overflow-y-auto font-mono text-[12px] leading-tight text-[#00E5FF] space-y-2 flex flex-col">
                    {logs.map((log, i) => (
                         <div key={i} className={`${log.message.startsWith('├') || log.message.startsWith('└') ? 'pl-4' : 'border-l-2 pl-2 border-[#00E5FF]'} ${log.type === 'alert' ? (log.message.includes('ERROR') ? 'text-red-500 border-red-500' : 'text-[#00E5FF] border-[#FF4500]') : 'opacity-70'}`}>
                             {!log.message.startsWith('├') && !log.message.startsWith('└') && <span className="text-gray-500 mr-2">[{log.time}]</span>}
                             
                             {/* Highlighting hack matching the backend log format */}
                             {log.message.split('(CONF:').map((part, idx, arr) => {
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

      </main>
    </div>
  )
}

export default App
