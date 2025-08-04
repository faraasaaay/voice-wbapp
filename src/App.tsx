import React, { useState } from 'react';
import { Phone, PhoneOff } from 'lucide-react';
import { useCallEngine } from './hooks/useCallEngine';
import { JoinRoom } from './components/JoinRoom';
import { CallInterface } from './components/CallInterface';
import { ParticipantsList } from './components/ParticipantsList';
import { ConnectionStatus } from './components/ConnectionStatus';
import RemoteAudioStreams from './components/RemoteAudioStreams';

function App() {
  const [serverUrl, setServerUrl] = useState(import.meta.env.VITE_SERVER_URL || 'http://localhost:3001');
  const { callState, remoteStreams, joinRoom, leaveRoom, toggleMute } = useCallEngine();

  const handleJoinRoom = (roomId: string) => {
    joinRoom(roomId, serverUrl);
  };

  if (!callState.isInCall) {
    return (
      <JoinRoom 
        onJoinRoom={handleJoinRoom}
        serverUrl={serverUrl}
        onServerUrlChange={setServerUrl}
        isConnecting={callState.isConnecting}
        error={callState.error}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <RemoteAudioStreams remoteStreams={remoteStreams} />
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Phone className="w-6 h-6 text-emerald-400" />
              <h1 className="text-2xl font-bold">SecureVoice</h1>
            </div>
            <ConnectionStatus isConnected={callState.isConnected} />
          </div>
          
          <button
            onClick={leaveRoom}
            className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
          >
            <PhoneOff className="w-4 h-4" />
            <span>Leave Call</span>
          </button>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <CallInterface
              roomId={callState.roomId!}
              isMuted={callState.isMuted}
              callDuration={callState.callDuration}
              isConnecting={callState.isConnecting}
              onToggleMute={toggleMute}
              participantCount={callState.participants.length + 1}
            />
          </div>
          
          <div className="lg:col-span-1">
            <ParticipantsList participants={callState.participants} />
          </div>
        </main>

        {callState.error && (
          <div className="fixed bottom-4 right-4 bg-red-600 text-white px-4 py-3 rounded-lg shadow-lg animate-pulse">
            <p className="text-sm font-semibold">{callState.error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;