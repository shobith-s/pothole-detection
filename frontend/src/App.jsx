import { useState, useRef } from 'react'

function App() {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [resultImage, setResultImage] = useState(null)
  const [loading, setLoading] = useState(false)
  const [detectCount, setDetectCount] = useState(0)
  const [logs, setLogs] = useState([])
  
  const fileInputRef = useRef(null)

  const handleFileChange = (e) => {
    const selected = e.target.files[0]
    if (selected) {
      setFile(selected)
      setPreview(URL.createObjectURL(selected))
      setResultImage(null)
      setDetectCount(0)
      addLog(`Selected file: ${selected.name}`)
    }
  }

  const addLog = (message, type = 'info', count = null, conf = null) => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false })
    setLogs(prev => [{ time, message, type, count, conf }, ...prev.slice(0, 49)])
  }

  const handleScan = async () => {
    if (!file) return
    
    setLoading(true)
    addLog(`Running detection on ${file.name}...`)
    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch("http://localhost:8000/detect", {
        method: "POST",
        body: formData,
      })
      
      const data = await res.json()
      if (data.status === "success") {
        setResultImage(data.image_base64)
        setDetectCount(data.potholes_detected)
        addLog(`DETECTED ${data.potholes_detected} OBJECTS`, data.potholes_detected > 0 ? 'alert' : 'info', data.potholes_detected)
      } else {
        alert(data.error || "Failed to scan image.")
        addLog(`Error: ${data.error}`, 'error')
      }
    } catch (err) {
      console.error(err)
      alert("Error contacting the API. Make sure the FastAPI backend is running.")
      addLog(`API Connection Error`, 'error')
    } finally {
      setLoading(false)
    }
  }
  
  const triggerFileInput = () => fileInputRef.current.click()
  
  return (
    <div className="h-screen flex flex-col font-sg uppercase tracking-tight bg-[#FFFBE6] text-[#0A0A0A]">
      {/* Top Nav */}
      <header className="bg-[#0A0A0A] text-white flex justify-between items-center w-full px-10 py-4 border-b-3 border-[#0A0A0A] flex-shrink-0 z-50">
        <div className="flex items-center gap-2">
            <span className="text-4xl font-bold text-white uppercase tracking-tighter">
                POTHOLE<span className="text-[#FF3D00]">.</span>AI
            </span>
        </div>
        <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 bg-[#291712] px-4 py-2 neo-border">
                <div className="w-3 h-3 rounded-full bg-[#00E5FF] animate-pulse"></div>
                <span className="text-sm font-bold text-[#00E5FF] uppercase">SYSTEM ONLINE</span>
            </div>
            <button 
                onClick={triggerFileInput}
                className="bg-[#FF3D00] text-[#0A0A0A] px-6 py-3 text-lg font-bold uppercase neo-border neo-shadow neo-shadow-hover flex items-center gap-2">
                UPLOAD
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/*" 
              className="hidden" 
            />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col lg:flex-row gap-6 p-6 overflow-hidden bg-[#FFFBE6]">
        
        {/* Left Column: Controls (22%) */}
        <aside className="w-full lg:w-[22%] flex flex-col gap-6 h-full overflow-y-auto pb-6">
          <div className="bg-[#FFFBE6] neo-border neo-shadow p-2 flex flex-col gap-0 h-full">
            <div className="border-b-3 border-[#0A0A0A] p-4 bg-[#FFEB3B]">
                <h2 className="text-2xl font-bold uppercase text-[#0A0A0A]">CONTROLS</h2>
            </div>
            <div className="p-6 flex flex-col gap-8 flex-1">
                {/* Sliders Placeholder */}
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-end">
                            <label className="text-base font-bold uppercase">CONFIDENCE THRESHOLD</label>
                            <span className="text-sm font-bold bg-[#0A0A0A] text-[#00E5FF] px-2 py-1 neo-border">0.75</span>
                        </div>
                        <div className="h-4 bg-[#f5d3cb] neo-border relative mt-2">
                            <div className="absolute left-0 top-0 h-full w-[75%] bg-[#0A0A0A]"></div>
                            <div className="absolute left-[75%] top-[-8px] w-6 h-8 bg-[#00E5FF] neo-border -ml-3"></div>
                        </div>
                    </div>
                </div>
                
                <div className="h-[3px] bg-[#0A0A0A] w-full"></div>

                <div className="mt-auto pt-4">
                    <button 
                        onClick={handleScan}
                        disabled={!file || loading}
                        className={`w-full py-6 text-2xl font-bold uppercase neo-border neo-shadow hover:neo-shadow-hover flex items-center justify-center gap-3 transition-colors ${!file || loading ? 'bg-gray-400 text-gray-700 cursor-not-allowed' : 'bg-[#FF3D00] text-[#0A0A0A]'}`}>
                        {loading ? 'SCANNING...' : 'RUN DETECTION'}
                    </button>
                </div>
            </div>
          </div>
        </aside>

        {/* Center Column: Viewer (52%) */}
        <section className="w-full lg:w-[52%] flex flex-col h-full overflow-hidden">
            <div className="bg-[#FFFBE6] neo-border neo-shadow p-2 flex flex-col h-full">
                <div className="border-b-3 border-[#0A0A0A] p-4 bg-[#FFEB3B] flex justify-between items-center">
                    <h2 className="text-2xl font-bold uppercase text-[#0A0A0A]">DETECTION VIEWER</h2>
                </div>
                {/* Main Image Area */}
                <div className="flex-1 bg-[#0A0A0A] relative overflow-hidden m-4 neo-border group cursor-crosshair flex items-center justify-center">
                    {resultImage ? (
                         <img src={resultImage} alt="Detected Potholes" className="max-h-full max-w-full object-contain" />
                    ) : preview ? (
                         <img src={preview} alt="Upload Preview" className="max-h-full max-w-full object-contain opacity-80" />
                    ) : (
                        <div className="text-[#00E5FF] opacity-50 flex flex-col items-center">
                            <p className="text-xl font-bold uppercase">AWAITING IMAGE DATA</p>
                        </div>
                    )}
                </div>
                {/* Thumbnails Placeholder */}
                <div className="h-32 border-t-3 border-[#0A0A0A] bg-[#f5d3cb] p-4 flex gap-4 overflow-x-auto">
                    {preview && (
                        <div className="h-full aspect-video bg-[#0A0A0A] neo-border border-[#FF3D00] relative cursor-pointer opacity-100">
                            <img src={preview} alt="Thumbnail 1" className="w-full h-full object-cover" />
                        </div>
                    )}
                </div>
            </div>
        </section>

        {/* Right Column: Metrics & Log (26%) */}
        <aside className="w-full lg:w-[26%] flex flex-col gap-6 h-full overflow-hidden">
            {/* Metrics Card */}
            <div className="bg-[#FFFBE6] neo-border neo-shadow flex flex-col h-[40%] flex-shrink-0">
                <div className="border-b-3 border-[#0A0A0A] p-3 bg-[#FFEB3B]">
                    <h2 className="text-xl font-bold uppercase text-[#0A0A0A]">METRICS</h2>
                </div>
                <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-[3px] bg-[#0A0A0A]">
                    <div className="bg-[#FFFBE6] p-4 flex flex-col justify-between">
                        <span className="text-sm font-bold text-[#0A0A0A] uppercase">HAZARDS</span>
                        <span className="text-5xl font-bold text-[#FF3D00] mt-auto">{detectCount}</span>
                    </div>
                    <div className="bg-[#FFFBE6] p-4 flex flex-col justify-between">
                        <span className="text-sm font-bold text-[#0A0A0A] uppercase">STATUS</span>
                        <span className="text-2xl font-bold text-[#00E5FF] mt-auto">ACTIVE</span>
                    </div>
                    <div className="bg-[#FFFBE6] p-4 flex flex-col justify-between col-span-2">
                         <span className="text-sm font-bold text-[#0A0A0A] uppercase">MODEL</span>
                         <span className="text-2xl font-bold text-[#0A0A0A] mt-auto">YOLOv8 Nano</span>
                    </div>
                </div>
            </div>

            {/* Detection Log Card */}
            <div className="bg-[#FFFBE6] neo-border neo-shadow flex flex-col flex-1 min-h-0">
                <div className="border-b-3 border-[#0A0A0A] p-3 bg-[#0A0A0A] flex justify-between items-center">
                    <h2 className="text-xl font-bold uppercase text-[#FFEB3B] flex items-center gap-2">LOG</h2>
                </div>
                <div className="flex-1 bg-[#0A0A0A] p-4 overflow-y-auto font-mono text-[13px] leading-relaxed text-[#00E5FF] space-y-2">
                    {logs.map((log, i) => (
                         <div key={i} className={`border-l-2 pl-2 ${log.type === 'alert' ? 'border-[#FF3D00]' : 'border-[#00E5FF] opacity-70'}`}>
                             <span className="text-gray-400">[{log.time}]</span> {log.message}
                         </div>
                    ))}
                </div>
            </div>
        </aside>

      </main>
    </div>
  )
}

export default App
