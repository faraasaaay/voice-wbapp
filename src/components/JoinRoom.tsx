import React, { useState } from 'react';
import { Phone, Server, Copy, Users, Shield, Zap, Settings } from 'lucide-react';

interface JoinRoomProps {
  onJoinRoom: (roomId: string, serverUrl?: string) => void;
  serverUrl: string;
  onServerUrlChange: (url: string) => void;
  isConnecting: boolean;
  error: string | null;
}

export function JoinRoom({ onJoinRoom, serverUrl, onServerUrlChange, isConnecting, error }: JoinRoomProps) {
  const [roomId, setRoomId] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [defaultServerUrl] = useState('http://localhost:3001');

  const generateRoomId = () => {
    const id = Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoomId(id);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomId.trim()) {
      onJoinRoom(roomId.trim(), serverUrl || defaultServerUrl);
    }
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="p-3 bg-emerald-600 rounded-full">
              <Phone className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">SecureVoice</h1>
          </div>
          <p className="text-slate-400 text-sm">
            Secure peer-to-peer voice calls with crystal clear audio
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="text-center">
            <div className="p-2 bg-slate-800 rounded-lg mb-2">
              <Shield className="w-5 h-5 text-emerald-400 mx-auto" />
            </div>
            <p className="text-xs text-slate-400">Encrypted</p>
          </div>
          <div className="text-center">
            <div className="p-2 bg-slate-800 rounded-lg mb-2">
              <Users className="w-5 h-5 text-blue-400 mx-auto" />
            </div>
            <p className="text-xs text-slate-400">Group Calls</p>
          </div>
          <div className="text-center">
            <div className="p-2 bg-slate-800 rounded-lg mb-2">
              <Zap className="w-5 h-5 text-yellow-400 mx-auto" />
            </div>
            <p className="text-xs text-slate-400">Low Latency</p>
          </div>
        </div>

        {/* Join Form */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label htmlFor="roomId" className="block text-sm font-medium text-slate-300 mb-2">
                Room Code
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="roomId"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                  placeholder="Enter room code"
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  maxLength={20}
                  disabled={isConnecting}
                />
                {roomId && (
                  <button
                    type="button"
                    onClick={copyRoomId}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={generateRoomId}
                className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors border border-slate-600"
                disabled={isConnecting}
              >
                Generate Code
              </button>
              <button
                type="submit"
                disabled={!roomId.trim() || isConnecting}
                className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                {isConnecting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Joining...</span>
                  </>
                ) : (
                  <>
                    <Phone className="w-4 h-4" />
                    <span>Join Call</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Advanced Settings */}
          <div className="mt-6">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center space-x-2 text-slate-400 hover:text-white transition-colors text-sm"
            >
              <Settings className="w-4 h-4" />
              <span>Advanced Settings</span>
            </button>

            {showAdvanced && (
              <div className="mt-4 p-4 bg-slate-700/30 rounded-lg border border-slate-600/50">
                <label htmlFor="serverUrl" className="block text-sm font-medium text-slate-300 mb-2">
                  Signaling Server URL
                </label>
                <div className="relative">
                  <Server className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    id="serverUrl"
                    value={serverUrl || defaultServerUrl}
                    onChange={(e) => onServerUrlChange(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                    placeholder="http://localhost:3001"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  URL of your hosted signaling server
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-4 bg-red-600/20 border border-red-500/50 rounded-lg">
            <p className="text-red-400 text-sm text-center">{error}</p>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 text-center">
          <p className="text-slate-500 text-xs">
            Share your room code with others to start a voice call
          </p>
        </div>
      </div>
    </div>
  );
}