import React, { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Users, Settings, Volume2, VolumeX } from 'lucide-react';
import { SocketService } from './services/SocketService';
import { WebRTCService } from './services/WebRTCService';
import { JoinRoom } from './components/JoinRoom';
import { CallInterface } from './components/CallInterface';
import { ParticipantsList } from './components/ParticipantsList';
import { ConnectionStatus } from './components/ConnectionStatus';

export interface Participant {
  id: string;
  isMuted: boolean;
  isConnected: boolean;
  joinedAt: Date;
}

export interface CallState {
  isInCall: boolean;
  isConnected: boolean;
  isMuted: boolean;
  roomId: string | null;
  participants: Participant[];
  callDuration: number;
  isConnecting: boolean;
  error: string | null;
}

function App() {
  const [callState, setCallState] = useState<CallState>({
    isInCall: false,
    isConnected: false,
    isMuted: false,
    roomId: null,
    participants: [],
    callDuration: 0,
    isConnecting: false,
    error: null
  });

  const [serverUrl, setServerUrl] = useState('ws://localhost:3000');
  const [serverUrl, setServerUrl] = useState('http://localhost:3001');
  const socketService = useRef<SocketService | null>(null);
  const webrtcService = useRef<WebRTCService | null>(null);
  const callStartTime = useRef<Date | null>(null);
  const durationInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Initialize services
    socketService.current = new SocketService();
    webrtcService.current = new WebRTCService();

    // Set up event listeners
    setupEventListeners();

    return () => {
      cleanup();
    };
  }, []);

  const setupEventListeners = () => {
    if (!socketService.current || !webrtcService.current) return;

    // Socket events
    socketService.current.on('room-joined', handleRoomJoined);
    socketService.current.on('user-joined', handleUserJoined);
    socketService.current.on('user-left', handleUserLeft);
    socketService.current.on('room-error', handleRoomError);
    socketService.current.on('offer', handleOffer);
    socketService.current.on('answer', handleAnswer);
    socketService.current.on('ice-candidate', handleIceCandidate);
    socketService.current.on('connect', handleSocketConnect);
    socketService.current.on('disconnect', handleSocketDisconnect);

    // WebRTC events
    webrtcService.current.on('localStream', handleLocalStream);
    webrtcService.current.on('remoteStream', handleRemoteStream);
    webrtcService.current.on('connectionStateChange', handleConnectionStateChange);
  };

  const handleRoomJoined = (data: { roomId: string; isFirstUser: boolean; roomSize: number }) => {
    setCallState(prev => ({
      ...prev,
      isInCall: true,
      roomId: data.roomId,
      isConnecting: !data.isFirstUser,
      error: null
    }));

    if (!data.isFirstUser) {
      // Wait for other user to make an offer
    }
  };

  const handleUserJoined = async (userId: string) => {
    if (!webrtcService.current) return;

    setCallState(prev => ({
      ...prev,
      participants: [
        ...prev.participants,
        { id: userId, isMuted: false, isConnected: false, joinedAt: new Date() }
      ]
    }));

    // Create offer for the new user
    try {
      const offer = await webrtcService.current.createOffer();
      socketService.current?.emit('offer', {
        target: userId,
        sdp: offer
      });
    } catch (error) {
      console.error('Failed to create offer:', error);
      setCallState(prev => ({ ...prev, error: 'Failed to connect to user' }));
    }
  };

  const handleUserLeft = (userId: string) => {
    setCallState(prev => ({
      ...prev,
      participants: prev.participants.filter(p => p.id !== userId)
    }));

    webrtcService.current?.removePeer(userId);
  };

  const handleRoomError = (data: { message: string }) => {
    setCallState(prev => ({
      ...prev,
      error: data.message,
      isConnecting: false
    }));
  };

  const handleOffer = async (data: { sdp: RTCSessionDescriptionInit; sender: string }) => {
    if (!webrtcService.current) return;

    try {
      const answer = await webrtcService.current.handleOffer(data.sdp, data.sender);
      socketService.current?.emit('answer', {
        target: data.sender,
        sdp: answer
      });

      setCallState(prev => ({
        ...prev,
        participants: prev.participants.map(p => 
          p.id === data.sender ? { ...p, isConnected: true } : p
        )
      }));
    } catch (error) {
      console.error('Failed to handle offer:', error);
    }
  };

  const handleAnswer = async (data: { sdp: RTCSessionDescriptionInit; sender: string }) => {
    if (!webrtcService.current) return;

    try {
      await webrtcService.current.handleAnswer(data.sdp, data.sender);
      setCallState(prev => ({
        ...prev,
        participants: prev.participants.map(p => 
          p.id === data.sender ? { ...p, isConnected: true } : p
        ),
        isConnecting: false
      }));
    } catch (error) {
      console.error('Failed to handle answer:', error);
    }
  };

  const handleIceCandidate = (data: { candidate: RTCIceCandidateInit; sender: string }) => {
    webrtcService.current?.addIceCandidate(data.candidate, data.sender);
  };

  const handleSocketConnect = () => {
    setCallState(prev => ({ ...prev, isConnected: true, error: null }));
  };

  const handleSocketDisconnect = () => {
    setCallState(prev => ({ ...prev, isConnected: false }));
  };

  const handleLocalStream = (stream: MediaStream) => {
    // Handle local audio stream
  };

  const handleRemoteStream = (stream: MediaStream, peerId: string) => {
    // Handle remote audio stream
    const audio = new Audio();
    audio.srcObject = stream;
    audio.play();
  };

  const handleConnectionStateChange = (state: RTCPeerConnectionState, peerId: string) => {
    if (state === 'connected' && !callStartTime.current) {
      callStartTime.current = new Date();
      startCallTimer();
    }

    setCallState(prev => ({
      ...prev,
      participants: prev.participants.map(p => 
        p.id === peerId ? { ...p, isConnected: state === 'connected' } : p
      )
    }));
  };

  const startCallTimer = () => {
    durationInterval.current = setInterval(() => {
      if (callStartTime.current) {
        const duration = Math.floor((Date.now() - callStartTime.current.getTime()) / 1000);
        setCallState(prev => ({ ...prev, callDuration: duration }));
      }
    }, 1000);
  };

  const joinRoom = async (roomId: string, customServerUrl?: string) => {
    if (!socketService.current || !webrtcService.current) return;

    const url = customServerUrl || serverUrl;
    setCallState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      await socketService.current.connect(url);
      await webrtcService.current.initialize();
      socketService.current.emit('join-room', roomId);
    } catch (error) {
      console.error('Failed to join room:', error);
      setCallState(prev => ({
        ...prev,
        error: 'Failed to connect to server',
        isConnecting: false
      }));
    }
  };

  const leaveRoom = () => {
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
      durationInterval.current = null;
    }

    socketService.current?.emit('leave-room');
    socketService.current?.disconnect();
    webrtcService.current?.cleanup();
    callStartTime.current = null;

    setCallState({
      isInCall: false,
      isConnected: false,
      isMuted: false,
      roomId: null,
      participants: [],
      callDuration: 0,
      isConnecting: false,
      error: null
    });
  };

  const toggleMute = () => {
    const newMutedState = !callState.isMuted;
    webrtcService.current?.setMuted(newMutedState);
    setCallState(prev => ({ ...prev, isMuted: newMutedState }));
  };

  const cleanup = () => {
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
    }
    socketService.current?.disconnect();
    webrtcService.current?.cleanup();
  };

  if (!callState.isInCall) {
    return (
      <JoinRoom 
        onJoinRoom={joinRoom}
        serverUrl={serverUrl}
        onServerUrlChange={setServerUrl}
        isConnecting={callState.isConnecting}
        error={callState.error}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Phone className="w-6 h-6 text-emerald-400" />
              <h1 className="text-2xl font-bold text-white">SecureVoice</h1>
            </div>
            <ConnectionStatus isConnected={callState.isConnected} />
          </div>
          
          <button
            onClick={leaveRoom}
            className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            <PhoneOff className="w-4 h-4" />
            <span>Leave Call</span>
          </button>
        </div>

        {/* Main Call Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <CallInterface
              roomId={callState.roomId!}
              isMuted={callState.isMuted}
              callDuration={callState.callDuration}
              isConnecting={callState.isConnecting}
              onToggleMute={toggleMute}
              participantCount={callState.participants.length}
            />
          </div>
          
          <div className="lg:col-span-1">
            <ParticipantsList participants={callState.participants} />
          </div>
        </div>

        {/* Error Display */}
        {callState.error && (
          <div className="fixed bottom-4 right-4 bg-red-600 text-white px-4 py-3 rounded-lg shadow-lg">
            <p className="text-sm">{callState.error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;