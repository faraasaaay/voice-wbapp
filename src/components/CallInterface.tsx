import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Users, Clock, Signal } from 'lucide-react';

interface CallInterfaceProps {
  roomId: string;
  isMuted: boolean;
  callDuration: number;
  isConnecting: boolean;
  onToggleMute: () => void;
  participantCount: number;
}

export function CallInterface({ 
  roomId, 
  isMuted, 
  callDuration, 
  isConnecting, 
  onToggleMute, 
  participantCount 
}: CallInterfaceProps) {
  const [volume, setVolume] = useState(80);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Simulate speaking detection for demo
  useEffect(() => {
    if (!isMuted && participantCount > 0) {
      const interval = setInterval(() => {
        setIsSpeaking(Math.random() > 0.7);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setIsSpeaking(false);
    }
  }, [isMuted, participantCount]);

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
      {/* Room Info */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center space-x-2 mb-2">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          <span className="text-slate-400 text-sm">Room</span>
          <span className="text-white font-mono font-bold">{roomId}</span>
        </div>
        
        {isConnecting ? (
          <p className="text-amber-400 text-sm flex items-center justify-center space-x-2">
            <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            <span>Connecting to call...</span>
          </p>
        ) : (
          <div className="flex items-center justify-center space-x-4 text-sm text-slate-400">
            <div className="flex items-center space-x-1">
              <Clock className="w-4 h-4" />
              <span>{formatDuration(callDuration)}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Users className="w-4 h-4" />
              <span>{participantCount + 1} participant{participantCount !== 0 ? 's' : ''}</span>
            </div>
          </div>
        )}
      </div>

      {/* Audio Visualization */}
      <div className="flex items-center justify-center mb-8">
        <div className={`relative w-32 h-32 rounded-full border-4 ${
          isSpeaking && !isMuted 
            ? 'border-emerald-400 shadow-lg shadow-emerald-400/20' 
            : 'border-slate-600'
        } flex items-center justify-center transition-all duration-300`}>
          <div className={`w-20 h-20 rounded-full ${
            isSpeaking && !isMuted 
              ? 'bg-emerald-400 shadow-lg shadow-emerald-400/30' 
              : isMuted 
                ? 'bg-red-500'
                : 'bg-slate-600'
          } flex items-center justify-center transition-all duration-300`}>
            {isMuted ? (
              <MicOff className="w-8 h-8 text-white" />
            ) : (
              <Mic className="w-8 h-8 text-white" />
            )}
          </div>
          
          {/* Pulse animation when speaking */}
          {isSpeaking && !isMuted && (
            <div className="absolute inset-0 rounded-full border-4 border-emerald-400 animate-ping opacity-30" />
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center space-x-6 mb-6">
        {/* Mute Button */}
        <button
          onClick={onToggleMute}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 ${
            isMuted 
              ? 'bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/30' 
              : 'bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/30'
          }`}
        >
          {isMuted ? (
            <MicOff className="w-6 h-6 text-white" />
          ) : (
            <Mic className="w-6 h-6 text-white" />
          )}
        </button>

        {/* Volume Control */}
        <div className="flex items-center space-x-3 bg-slate-700/50 rounded-full px-4 py-2">
          <VolumeX className="w-4 h-4 text-slate-400" />
          <div className="w-24 h-2 bg-slate-600 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-200"
              style={{ width: `${volume}%` }}
            />
          </div>
          <Volume2 className="w-4 h-4 text-slate-400" />
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="hidden"
          />
        </div>
      </div>

      {/* Call Quality */}
      <div className="text-center">
        <div className="inline-flex items-center space-x-2 px-3 py-1 bg-slate-700/50 rounded-full">
          <Signal className="w-4 h-4 text-emerald-400" />
          <span className="text-slate-300 text-sm">Excellent quality</span>
        </div>
      </div>

      {/* Tips */}
      {participantCount === 0 && (
        <div className="mt-6 p-4 bg-blue-600/10 border border-blue-500/20 rounded-lg">
          <p className="text-blue-300 text-sm text-center">
            💡 Share the room code <span className="font-mono font-bold">{roomId}</span> with others to invite them to this call
          </p>
        </div>
      )}
    </div>
  );
}