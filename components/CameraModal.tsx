import React, { useRef, useState, useEffect, useCallback } from 'react';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (base64: string) => void;
}

const CameraModal: React.FC<CameraModalProps> = ({ isOpen, onClose, onCapture }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [error, setError] = useState<string>('');
  const [isFlashing, setIsFlashing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    setError('');
    setIsLoading(true);

    // Kiểm tra hỗ trợ cơ bản
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Trình duyệt không hỗ trợ Camera hoặc kết nối không an toàn (HTTPS).");
      setIsLoading(false);
      return;
    }

    try {
      let mediaStream: MediaStream | null = null;
      let finalError: any = null;

      // --- CẤP 1: Thử cấu hình tối ưu (HD + FacingMode đúng) ---
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: false, // Quan trọng: Chỉ xin quyền video để tránh phức tạp
          video: {
            facingMode: facingMode,
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }
        });
      } catch (err: any) {
        // Nếu bị từ chối quyền (Permission Denied), DỪNG NGAY, không thử lại
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
           throw err; 
        }
        console.warn("Cấp 1 (HD) thất bại, chuyển sang fallback...", err.name);
        finalError = err;
      }

      // --- CẤP 2: Thử cấu hình cơ bản (Chỉ cần đúng FacingMode) ---
      if (!mediaStream) {
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: { facingMode: facingMode }
          });
        } catch (err: any) {
           if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
               throw err;
           }
           console.warn("Cấp 2 (FacingMode) thất bại, chuyển sang fallback...", err.name);
           finalError = err;
        }
      }

      // --- CẤP 3: Cấu hình tối thiểu (Lấy bất kỳ camera nào) ---
      if (!mediaStream) {
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: true
          });
        } catch (err: any) {
           finalError = err;
           // Nếu đến đây vẫn lỗi thì ném lỗi ra ngoài để catch xử lý
           throw finalError; 
        }
      }

      // Nếu có stream, gán vào video element
      if (mediaStream) {
        streamRef.current = mediaStream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          
          // Play video thủ công để hỗ trợ tốt hơn trên iOS Safari
          videoRef.current.onloadedmetadata = async () => {
              try {
                  await videoRef.current?.play();
              } catch (e) {
                  console.warn("Auto-play prevented:", e);
              }
              setIsLoading(false);
          };
        } else {
            setIsLoading(false);
        }
      }

    } catch (err: any) {
      console.error("Lỗi khởi động Camera:", err);
      setIsLoading(false);

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError("Quyền truy cập Camera bị chặn. Vui lòng nhấn vào biểu tượng ổ khóa 🔒 trên thanh địa chỉ để bật lại.");
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setError("Không tìm thấy Camera nào trên thiết bị.");
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          setError("Camera đang được sử dụng bởi ứng dụng khác.");
      } else if (err.name === 'OverconstrainedError') {
          setError("Camera không hỗ trợ độ phân giải yêu cầu.");
      } else {
          setError(`Không thể mở Camera (${err.name || 'Lỗi lạ'}). Thử tải lại trang.`);
      }
    }
  }, [facingMode, stopCamera]);

  useEffect(() => {
    let mounted = true;
    if (isOpen && mounted) {
      const timer = setTimeout(() => {
        startCamera();
      }, 100);
      return () => clearTimeout(timer);
    } else {
      stopCamera();
    }
    return () => {
      mounted = false;
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  const handleSwitchCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      setIsFlashing(true);
      setTimeout(() => setIsFlashing(false), 150);

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context && video.videoWidth > 0 && video.videoHeight > 0) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Lật hình nếu là camera trước
        if (facingMode === 'user') {
            context.translate(canvas.width, 0);
            context.scale(-1, 1);
        }
        
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        if (facingMode === 'user') {
             context.setTransform(1, 0, 0, 1, 0, 0);
        }

        try {
          const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
          const base64 = dataUrl.split(',')[1];
          
          setTimeout(() => {
            onCapture(base64);
            onClose();
          }, 200);
        } catch (e) {
          setError("Lỗi khi chụp ảnh. Thử lại nhé.");
        }
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white animate-fade-in">
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
        <button 
          onClick={onClose} 
          className="p-2 rounded-full bg-black/20 backdrop-blur-md hover:bg-white/20 transition text-white"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <button 
            onClick={handleSwitchCamera}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/30 backdrop-blur-md border border-white/20 text-sm font-medium hover:bg-white/20 transition"
        >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            <span>Đổi Cam</span>
        </button>

        <div className="w-10"></div>
      </div>
      
      {/* Camera Viewport */}
      <div className="relative flex-1 flex items-center justify-center bg-black overflow-hidden">
        {isLoading && !error && (
             <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
             </div>
        )}

        {error ? (
            <div className="text-center p-6 max-w-xs sm:max-w-md z-20 mx-4">
                <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-6 mb-6 backdrop-blur-sm">
                  <p className="font-medium text-red-200 mb-2">⚠️ Lỗi Camera</p>
                  <p className="text-sm text-white/90">{error}</p>
                </div>
                <div className="flex flex-col gap-3">
                     <button 
                        onClick={startCamera}
                        className="w-full px-6 py-3 bg-white text-black rounded-xl font-bold hover:bg-gray-200 transition"
                    >
                        Thử lại ngay
                    </button>
                     <button 
                        onClick={onClose}
                        className="w-full px-6 py-3 bg-gray-800 text-white rounded-xl font-bold hover:bg-gray-700 transition border border-gray-600"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        ) : (
            <>
                <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted
                    className={`w-full h-full object-contain transition-transform duration-300 ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                />
                <div className={`absolute inset-0 bg-white pointer-events-none transition-opacity duration-100 z-30 ${isFlashing ? 'opacity-100' : 'opacity-0'}`} />
            </>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Bottom Controls */}
      {!error && (
        <div className="bg-black pb-10 pt-6 flex justify-center items-center min-h-[120px]">
          <button 
              onClick={captureImage}
              disabled={isLoading}
              className={`group relative flex items-center justify-center ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
              <div className="w-20 h-20 rounded-full border-[5px] border-white/80 group-active:scale-95 transition-all duration-200"></div>
              <div className="absolute w-16 h-16 bg-white rounded-full group-active:scale-90 transition-all duration-200 shadow-lg"></div>
          </button>
        </div>
      )}
    </div>
  );
};

export default CameraModal;