import { useState } from 'react'
import { UploadCloud, AlertTriangle, ShieldCheck } from 'lucide-react'

// NeoButton Component
const NeoButton = ({ children, variant = 'primary', onClick, className = '' }) => {
  const bgClass = variant === 'primary' ? 'bg-primary text-white' : 'bg-accent-blue text-deep-black'
  return (
    <button 
      onClick={onClick}
      className={`font-bold py-3 px-6 neo-border neo-shadow neo-shadow-hover transition-transform duration-100 ${bgClass} ${className}`}
    >
      {children}
    </button>
  )
}

function App() {
  const [image, setImage] = useState(null)
  
  return (
    <div className="min-h-screen flex flex-col font-sg uppercase tracking-tight">
      {/* Top Nav */}
      <header className="bg-deep-black text-white px-8 py-5 flex justify-between items-center neo-border border-b-4 border-deep-black">
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
            
            <div className="border-3 border-dashed border-deep-black bg-surface p-8 text-center cursor-pointer hover:bg-[#F5EAD4] transition-colors mt-4">
              <UploadCloud className="mx-auto mb-2 w-12 h-12" />
              <p className="font-bold">Select File or Drag & Drop</p>
              <p className="text-xs mt-1">JPG, PNG, WEBP (Max 5MB)</p>
            </div>
            
            <NeoButton variant="primary" className="w-full mt-2 flex items-center justify-center gap-2">
              <ShieldCheck className="w-5 h-5"/> Run Scan
            </NeoButton>
          </div>
        </section>

        {/* Right Column: Output */}
        <section className="col-span-2 flex flex-col gap-6">
          <div className="bg-white p-0 neo-border neo-shadow min-h-[500px] flex flex-col">
            <div className="bg-deep-black text-white p-4 flex justify-between items-center border-b-3 border-deep-black">
              <h2 className="text-xl font-bold">Telemetry Output</h2>
              <span className="bg-primary text-white text-xs px-2 py-1 font-bold neo-border">LIVE FEED</span>
            </div>
            
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#EBE7D9] bg-[radial-gradient(#d1ccc0_1px,transparent_1px)] [background-size:16px_16px]">
              {image ? (
                <div className="w-full h-full bg-deep-black"></div> // Placeholder for image
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
