
import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';

interface QRScannerProps {
    onScan: (data: string) => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScan }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [error, setError] = useState<string | null>(null);
    
    // Use a ref for the callback to prevent effect re-runs when the handler changes
    const onScanRef = useRef(onScan);
    useEffect(() => {
        onScanRef.current = onScan;
    }, [onScan]);

    useEffect(() => {
        let animationFrameId: number;
        let stream: MediaStream | null = null;
        let mounted = true;

        const startCamera = async () => {
            try {
                const mediaStream = await navigator.mediaDevices.getUserMedia({ 
                    video: { facingMode: "environment" } // Prefer back camera
                });
                
                if (!mounted) {
                    mediaStream.getTracks().forEach(track => track.stop());
                    return;
                }

                stream = mediaStream;
                
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.setAttribute("playsinline", "true"); 
                    
                    // Handle play promise to prevent "interrupted by new load request" errors
                    const playPromise = videoRef.current.play();
                    if (playPromise !== undefined) {
                        playPromise.catch(error => {
                            if (error.name !== 'AbortError' && error.name !== 'NotAllowedError') {
                                console.error("Error playing video:", error);
                            }
                        });
                    }
                    
                    requestAnimationFrame(tick);
                }
            } catch (err) {
                if (mounted) {
                    console.error("Error accessing camera:", err);
                    setError("Could not access camera. Please check permissions.");
                }
            }
        };

        const tick = () => {
            if (!mounted || !videoRef.current || !canvasRef.current) return;
            
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d', { willReadFrequently: true });

            if (video.readyState === video.HAVE_ENOUGH_DATA && context) {
                canvas.height = video.videoHeight;
                canvas.width = video.videoWidth;
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                
                const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                
                try {
                    // jsQR can throw on certain inputs (like empty images or bad RS blocks), so we must catch
                    const code = jsQR(imageData.data, imageData.width, imageData.height, {
                        inversionAttempts: "dontInvert",
                    });
    
                    if (code && code.data) {
                        onScanRef.current(code.data);
                    }
                } catch (e) {
                    // Catch RS block errors or other decoding issues without crashing the loop
                    // console.debug("QR Decode error", e); 
                }
            }
            
            animationFrameId = requestAnimationFrame(tick);
        };

        startCamera();

        return () => {
            mounted = false;
            cancelAnimationFrame(animationFrameId);
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            if (videoRef.current) {
                videoRef.current.srcObject = null;
            }
        };
    }, []); // Empty dependency array ensures camera setup runs only once

    if (error) {
        return (
            <div className="h-64 w-full bg-neutral-900 rounded-2xl flex items-center justify-center text-red-400 p-4 text-center border border-neutral-800">
                <p>{error}</p>
            </div>
        );
    }

    return (
        <div className="relative w-full overflow-hidden rounded-2xl shadow-2xl bg-black aspect-[4/3] md:aspect-video">
            <video 
                ref={videoRef} 
                className="absolute inset-0 w-full h-full object-cover" 
                muted
                playsInline
            />
            <canvas ref={canvasRef} className="hidden" />
            
            {/* Overlay UI */}
            <div className="absolute inset-0 border-[40px] border-black/50 z-10 pointer-events-none">
                <div className="relative w-full h-full border-2 border-purple-500/50 rounded-lg overflow-hidden">
                    {/* Scanning Line Animation */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.8)] animate-scan"></div>
                </div>
            </div>
            <div className="absolute bottom-4 left-0 right-0 text-center z-20">
                <span className="inline-block px-3 py-1 bg-black/60 backdrop-blur-md text-white text-xs rounded-full">
                    Searching for QR Code...
                </span>
            </div>
            
            {/* Styles for animation */}
            <style>{`
                @keyframes scan {
                    0% { top: 0%; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
                .animate-scan {
                    animation: scan 2s linear infinite;
                }
            `}</style>
        </div>
    );
};

export default QRScanner;
