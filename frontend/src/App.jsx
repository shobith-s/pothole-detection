import { useState, useRef } from 'react'
import { UploadCloud, AlertTriangle, ShieldCheck, Loader2 } from 'lucide-react'

// NeoButton Component
const NeoButton = ({ children, variant = 'primary', onClick, disabled, className = '' }) => {
  const bgClass = variant === 'primary' ? 'bg-primary text-white' : 'bg-accent-blue text-deep-black'
  const disabledClass = disabled ? 'opacity-50 cursor-not-allowed transform-none shadow-none neo-border' : 'neo-shadow neo-shadow-hover transition-transform duration-100'
  
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center gap-2 font-bold py-3 px-6 neo-border ${disabledClass} ${bgClass} ${className}`}
    >
      {children}
    </button>
  )
}

function App() {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [resultImage, setResultImage] = useState(null)
  const [loading, setLoading] = useState(false)
  const [detectCount, setDetectCount] = useState(0)
  
  const fileInputRef = useRef(null)

  const handleFileChange = (e) => {
    const selected = e.target.files[0]
    if (selected) {
      setFile(selected)
      setPreview(URL.createObjectURL(selected))
      setResultImage(null)
      setDetectCount(0)
    }
  }

  const handleScan = async () => {
    if (!file) return
    
    setLoading(true)
    const formData = new FormData()
    formData.append("file", file)

    try {
      // Connect to the local FastAPI backend
      const res = await fetch("http://localhost:8000/detect", {
        method: "POST",
        body: formData,
      })
      
      const data = await res.json()
      if (data.status === "success") {
        setResultImage(data.image_base64)
        setDetectCount(data.potholes_detected)
      } else {
        alert(data.error || "Failed to scan image.")
      }
    } catch (err) {
      console.error(err)
      alert("Error contacting the API. Make sure the FastAPI backend is running.")
    } finally {
      setLoading(false)
    }
  }
  
  const triggerFileInput = () => fileInputRef.current.click()
  
  return (
    <div className="min-h-screen flex flex-col font-sg uppercase tracking-tight">
      {/* Top Nav */}
      <header className="bg-deep-black text-white px-8 py-5 flex justify-between items-center neo-border border-b-4 border-deep-black flex-shrink-0">
        <h1 className="text-4xl font-black tracking-tighter">
          POTHOLE<span className="text-primary">.</span>AI
        </h1>
        <div className="flex items-center gap-4 border-2 border-white px-4 py-2 bg-text-off">
          <div className="w-4 h-4 rounded-full bg-accent-blue animate-pulse"></div>
          <span className="text-sm font-bold text-accent-blue">SYSTEM ONLINE</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Upload */}
        <section className="col-span-1 flex flex-col gap-6">
          <div className="bg-accent-yellow p-6 neo-border neo-shadow flex flex-col gap-4">
            <h2 className="text-2xl font-black border-b-3 border-deep-black pb-2">Control Panel</h2>
            <p className="text-sm font-bold opacity-80 leading-tight">Upload street footage to detect hazards instantly. YOLOv8 Nano model active.</p>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/*" 
              className="hidden" 
            />

            <div 
              onClick={triggerFileInput} 
              className="border-3 border-dashed border-deep-black bg-surface p-8 text-center cursor-pointer hover:bg-[#F5EAD4] transition-colors mt-4"
            >
              <UploadCloud className="mx-auto mb-2 w-12 h-12" />
              <p className="font-bold">{file ? file.name : "Select File or Drag & Drop"}</p>
              <p className="text-xs mt-1">JPG, PNG, WEBP (Max 5MB)</p>
            </div>
            
            <NeoButton 
               variant="primary" 
               className="w-full mt-2"
               onClick={handleScan}
               disabled={!file || loading}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5"/>} 
              {loading ? 'Scanning Data...' : 'Run Scan'}
            </NeoButton>
          </div>

          {/* Metrics summary */}
          {resultImage && (
             <div className="bg-white p-6 neo-border neo-shadow">
               <h3 className="text-xl font-bold border-b-3 border-deep-black pb-2 mb-4">Scan Report</h3>
               <div className="flex justify-between items-center bg-surface neo-border p-4">
                  <span className="font-bold">Hazards Found</span>
                  <span className={`text-2xl font-black ${detectCount > 0 ? 'text-primary' : 'text-green-600'}`}>
                    {detectCount}
                  </span>
               </div>
             </div>
          )}
        </section>

        {/* Right Column: Output */}
        <section className="col-span-2 flex flex-col gap-6">
          <div className="bg-white p-0 neo-border neo-shadow flex-1 flex flex-col overflow-hidden min-h-[600px]">
            <div className="bg-deep-black text-white p-4 flex justify-between items-center border-b-3 border-deep-black">
              <h2 className="text-xl font-bold">Telemetry Output</h2>
              <span className="bg-primary text-white text-xs px-2 py-1 font-bold neo-border">LIVE FEED</span>
            </div>
            
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#EBE7D9] bg-[radial-gradient(#d1ccc0_1px,transparent_1px)] [background-size:16px_16px] relative">
              
              {resultImage ? (
                <div className="w-full h-full relative flex items-center justify-center">
                  <img src={resultImage} alt="Detected Potholes" className="max-h-full max-w-full object-contain neo-border neo-shadow bg-deep-black" />
                </div>
              ) : preview ? (
                <div className="w-full h-full relative flex items-center justify-center opacity-80 mix-blend-multiply">
                  <img src={preview} alt="Upload Preview" className="max-h-full max-w-full object-contain neo-border grayscale filter" />
                </div>
              ) : (
                <div className="text-center opacity-50">
                  <AlertTriangle className="mx-auto w-16 h-16 mb-4" />
                  <p className="text-xl font-bold">Awaiting telemetry data...</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
