import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface VideoCallModalProps {
  url: string;
  onClose: () => void;
}

export default function VideoCallModal({ url, onClose }: VideoCallModalProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Disable background scrolling while in call
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col animate-fade-in">
      <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between px-6 z-10 pointer-events-none">
        <div className="flex items-center gap-2 text-white pointer-events-auto">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="font-semibold text-sm drop-shadow-md">Secure Video Session</span>
        </div>
        <button
          onClick={onClose}
          className="pointer-events-auto flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-full font-bold text-sm transition-colors shadow-lg"
        >
          <X className="w-4 h-4" /> End Call
        </button>
      </div>

      <div className="flex-1 w-full bg-gray-900 mt-0">
        <iframe
          ref={iframeRef}
          src={url}
          className="w-full h-full border-none"
          allow="camera; microphone; fullscreen; display-capture"
          title="Video Interview"
        />
      </div>
    </div>
  );
}
