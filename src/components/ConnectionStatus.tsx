import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';

interface ConnectionStatusProps {
  isConnected: boolean;
}

export function ConnectionStatus({ isConnected }: ConnectionStatusProps) {
  return (
    <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs ${
      isConnected 
        ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' 
        : 'bg-red-600/20 text-red-400 border border-red-500/30'
    }`}>
      {isConnected ? (
        <>
          <Wifi className="w-3 h-3" />
          <span>Connected</span>
        </>
      ) : (
        <>
          <WifiOff className="w-3 h-3" />
          <span>Disconnected</span>
        </>
      )}
    </div>
  );
}