import React, { useState, useEffect } from 'react';
import { analyzeLiquidImage } from './services/geminiService';
import { LiquidAnalysis } from './types';
import PHScale from './components/PHScale';
import CameraModal from './components/CameraModal';

function App() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<LiquidAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Xử lý Paste (Snipping Tool)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (isAnalyzing) return;

      if (e.clipboardData && e.clipboardData.items) {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const blob = items[i].getAsFile();
            if (blob) {
              handleFile(blob);
            }
            break; 
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isAnalyzing]);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError("Vui lòng chỉ tải lên định dạng hình ảnh (JPG, PNG).");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setImageSrc(result);
      setImageBase64(result.split(',')[1]);
      setResult(null); // Reset kết quả cũ
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // Xử lý ảnh chụp từ camera
  const handleCameraCapture = (base64: string) => {
    const fullSrc = `data:image/jpeg;base64,${base64}`;
    setImageSrc(fullSrc);
    setImageBase64(base64);
    setResult(null);
    setError(null);
    // Không gọi startAnalysis() ở đây để người dùng tự nhấn nút phân tích
  };

  const startAnalysis = async () => {
    if (!imageBase64) return;

    setIsAnalyzing(true);
    setError(null);
    try {
      const analysisData = await analyzeLiquidImage(imageBase64);
      setResult(analysisData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Đã xảy ra lỗi khi phân tích hình ảnh.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetApp = () => {
    setImageSrc(null);
    setImageBase64(null);
    setResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900 pb-20">
       <CameraModal isOpen={isCameraOpen} onClose={() => setIsCameraOpen(false)} onCapture={handleCameraCapture} />
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm backdrop-blur-md bg-white/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={resetApp}>
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-violet-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-md">
              pH
            </div>
            <h1 className="font-bold text-xl tracking-tight text-slate-800">Vision Analyzer</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-8 sm:pt-12">
        {/* Introduction */}
        {!imageSrc && (
          <div className="text-center mb-10 animate-fade-in-up">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">
              Kiểm tra độ pH bằng AI
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Tải lên hình ảnh, dán từ clipboard (Ctrl+V) hoặc chụp ảnh để nhận phân tích độ pH, cảnh báo an toàn và tính chất hóa học.
            </p>
          </div>
        )}

        {/* Upload Zone */}
        {!imageSrc && (
          <div 
            className={`relative group border-2 border-dashed rounded-3xl p-10 text-center transition-all duration-300 ease-in-out cursor-pointer animate-fade-in-up ${
              dragActive 
                ? 'border-blue-500 bg-blue-50/50 scale-[1.01] shadow-lg' 
                : 'border-slate-300 bg-white hover:border-blue-400 hover:bg-slate-50 shadow-sm'
            }`}
            style={{ animationDelay: '0.1s' }}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-upload')?.click()}
          >
             <div className="flex flex-col items-center justify-center gap-6">
                <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-inner">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                </div>
                
                <div>
                  <p className="text-xl font-semibold text-slate-700 mb-2">Kéo thả hình ảnh vào đây</p>
                  <p className="text-sm text-slate-500">Hỗ trợ JPG, PNG. Hoặc dán trực tiếp (Ctrl+V)</p>
                </div>

                <div className="flex flex-wrap justify-center gap-3 w-full">
                  <label className="pointer-events-auto cursor-pointer bg-slate-900 text-white hover:bg-slate-800 px-6 py-3 rounded-xl font-medium transition shadow-lg shadow-slate-200 active:scale-95 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                    Chọn ảnh từ thiết bị
                    <input 
                        id="file-upload" 
                        type="file" 
                        className="hidden" 
                        accept="image/*" 
                        onChange={onFileChange}
                        onClick={(e) => e.stopPropagation()}
                    />
                  </label>
                  
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsCameraOpen(true);
                    }}
                    className="pointer-events-auto bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 px-6 py-3 rounded-xl font-medium transition shadow-sm active:scale-95 flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                    </svg>
                    Chụp ảnh
                  </button>
                </div>
             </div>
          </div>
        )}

        {/* Analysis View */}
        {imageSrc && (
          <div className="animate-fade-in">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                {/* Image Column */}
                <div className="flex flex-col gap-4">
                    <div className="relative rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shadow-md group">
                        <img src={imageSrc} alt="Uploaded liquid" className="w-full h-auto object-contain max-h-[500px]" />
                        {!isAnalyzing && !result && (
                             <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors"></div>
                        )}
                    </div>
                    
                    <div className="flex gap-3">
                        <button 
                            onClick={resetApp}
                            className="flex-1 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition shadow-sm"
                        >
                            Chụp/Chọn lại
                        </button>
                        {!result && !isAnalyzing && (
                             <button 
                             onClick={startAnalysis}
                             className="flex-1 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition shadow-md shadow-blue-200 flex items-center justify-center gap-2"
                         >
                             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                             </svg>
                             Phân tích ngay
                         </button>
                        )}
                    </div>
                </div>

                {/* Results Column */}
                <div className="flex flex-col">
                    {isAnalyzing && (
                        <div className="flex flex-col items-center justify-center h-full min-h-[300px] bg-white rounded-2xl border border-slate-100 shadow-sm p-8 animate-pulse">
                            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-6"></div>
                            <h3 className="text-xl font-semibold text-slate-800 mb-2">Đang phân tích...</h3>
                            <p className="text-slate-500 text-center">AI đang xác định tính chất hóa học và độ pH.</p>
                        </div>
                    )}

                    {error && (
                         <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center animate-fade-in">
                            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008h-.008v-.008z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold text-red-800 mb-2">Lỗi phân tích</h3>
                            <p className="text-red-600 mb-6">{error}</p>
                            <button 
                                onClick={startAnalysis}
                                className="px-6 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition"
                            >
                                Thử lại
                            </button>
                         </div>
                    )}

                    {result && (
                        <div className="space-y-6 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                            {/* Main Result Card */}
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
                                <div className="bg-slate-900 p-6 text-white">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-slate-400 text-sm uppercase tracking-wider font-bold mb-1">Kết quả phát hiện</p>
                                            <h2 className="text-3xl font-bold">{result.liquidName}</h2>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold bg-white/20 backdrop-blur-sm`}>
                                            Độ tin cậy: {result.confidenceLevel}
                                        </span>
                                    </div>
                                </div>

                                <div className="p-6">
                                    <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                        </svg>
                                        Thang đo pH
                                    </h3>
                                    <PHScale ph={result.estimatedPH} />
                                    
                                    <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                        <p className="text-slate-700 italic">"{result.reasoning}"</p>
                                    </div>
                                </div>
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-1 gap-4">
                                {/* Properties */}
                                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                                    <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-500" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M7 2a1 1 0 00-.707 1.707L7 4.414v3.758a1 1 0 01-.293.707l-4 4C.817 14.761 2.154 17.25 4.327 17.25h11.346c2.173 0 3.51-2.489 2.32-4.371l-4-4A1 1 0 0113 8.172V4.414l.707-.707A1 1 0 0013 2H7zM5 6.914a1 1 0 01.293-.707l1.5-1.5A1 1 0 007.5 4.414V3h5v1.414a1 1 0 00.707.293l1.5 1.5A1 1 0 0115 6.914V8a3 3 0 00.879 2.121l.5.5h-12.75l.5-.5A3 3 0 005 8V6.914z" clipRule="evenodd" />
                                        </svg>
                                        Tính chất
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {result.properties.map((prop, idx) => (
                                            <span key={idx} className="px-3 py-1 bg-purple-50 text-purple-700 text-sm rounded-lg border border-purple-100">
                                                {prop}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Common Uses */}
                                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                                    <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-teal-500" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.968 7.968 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                                        </svg>
                                        Ứng dụng
                                    </h4>
                                    <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                                        {result.commonUses.map((use, idx) => (
                                            <li key={idx}>{use}</li>
                                        ))}
                                    </ul>
                                </div>

                                 {/* Safety Warning */}
                                 <div className="bg-white p-5 rounded-2xl border border-red-100 shadow-sm">
                                    <h4 className="font-semibold text-red-700 mb-2 flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                        Cảnh báo an toàn
                                    </h4>
                                    <p className="text-sm text-slate-600 leading-relaxed bg-red-50 p-3 rounded-lg border border-red-100">
                                        {result.safetyWarning}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
             </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;