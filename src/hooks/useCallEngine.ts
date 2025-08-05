import { useState, useEffect, useRef, useCallback } from 'react';
import { SocketService } from '../services/SocketService';
import { WebRTCService } from '../services/WebRTCService';

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

export const useCallEngine = () => {
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

  const [localAudioStream, setLocalAudioStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());

  const socketService = useRef<SocketService | null>(null);
  const webrtcService = useRef<WebRTCService | null>(null);
  const callStartTime = useRef<Date | null>(null);
  const durationInterval = useRef<NodeJS.Timeout | null>(null);

  const startCallTimer = useCallback(() => {
    durationInterval.current = setInterval(() => {
      if (callStartTime.current) {
        const duration = Math.floor((Date.now() - callStartTime.current.getTime()) / 1000);
        setCallState(prev => ({ ...prev, callDuration: duration }));
      }
    }, 1000);
  }, []);

  const cleanup = useCallback(() => {
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
    }
    socketService.current?.disconnect();
    webrtcService.current?.cleanup();
  }, []);

  const handleRemoteStream = useCallback((stream: MediaStream, peerId: string) => {
    setRemoteStreams(prev => new Map(prev).set(peerId, stream));
  }, []);

  const handleLocalStream = useCallback((stream: MediaStream) => {
    setLocalAudioStream(stream);
  }, []);

  const handleConnectionStateChange = useCallback((state: RTCPeerConnectionState, peerId: string) => {
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
  }, [startCallTimer]);

  const handleOffer = useCallback(async (data: { sdp: RTCSessionDescriptionInit; sender: string }) => {
    if (!webrtcService.current) return;
    try {
      const answer = await webrtcService.current.handleOffer(data.sdp, data.sender);
      socketService.current?.emit('answer', { target: data.sender, sdp: answer });
      setCallState(prev => ({
        ...prev,
        participants: prev.participants.map(p =>
          p.id === data.sender ? { ...p, isConnected: true } : p
        )
      }));
    } catch (error) {
      console.error('Failed to handle offer:', error);
    }
  }, []);

  const handleAnswer = useCallback(async (data: { sdp: RTCSessionDescriptionInit; sender: string }) => {
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
  }, []);

  const handleIceCandidate = useCallback((data: { candidate: RTCIceCandidateInit; sender: string }) => {
    webrtcService.current?.addIceCandidate(data.candidate, data.sender);
  }, []);

  const initiateConnection = useCallback(async (userId: string) => {
    if (!webrtcService.current) return;
    setCallState(prev => ({
      ...prev,
      participants: [...prev.participants, { id: userId, isMuted: false, isConnected: false, joinedAt: new Date() }]
    }));
    try {
      // Create offer only if we have a local stream and are ready to connect
      if (webrtcService.current.localStream) {
        const offer = await webrtcService.current.createOffer(); // No userId argument
        socketService.current?.emit('offer', { target: userId, sdp: offer });
      } else {
        console.warn('Local stream not available yet, cannot create offer.');
      }
    } catch (error) {
      console.error(`Failed to create offer for ${userId}:`, error);
    }
  }, []);

  const handleRoomJoined = useCallback((data: { roomId: string; isFirstUser: boolean; roomSize: number; existingUsers: string[]; }) => {
    setCallState(prev => ({ ...prev, isInCall: true, roomId: data.roomId, isConnecting: !data.isFirstUser, error: null }));
    data.existingUsers?.forEach(userId => {
      initiateConnection(userId);
    });
  }, [initiateConnection]);

  const handleUserJoined = useCallback((data: { userId: string }) => {
    setCallState(prev => ({
      ...prev,
      participants: [...prev.participants, { id: data.userId, isMuted: false, isConnected: false, joinedAt: new Date() }]
    }));
  }, []);

  const handleUserLeft = useCallback((userId: string) => {
    setCallState(prev => ({ ...prev, participants: prev.participants.filter(p => p.id !== userId) }));
    webrtcService.current?.removePeer(userId);
    setRemoteStreams(prev => {
      const newStreams = new Map(prev);
      newStreams.delete(userId);
      return newStreams;
    });
  }, []);

  useEffect(() => {
    socketService.current = new SocketService();
    webrtcService.current = new WebRTCService();

    const s = socketService.current;
    const w = webrtcService.current;

    s.on('room-joined', handleRoomJoined);
    s.on('user-joined', handleUserJoined);
    s.on('user-left', handleUserLeft);
    s.on('room-error', (data: { message: string }) => setCallState(prev => ({ ...prev, error: data.message, isConnecting: false })));
    s.on('offer', handleOffer);
    s.on('answer', handleAnswer);
    s.on('ice-candidate', handleIceCandidate);
    s.on('connect', () => setCallState(prev => ({ ...prev, isConnected: true, error: null })));
    s.on('disconnect', () => setCallState(prev => ({ ...prev, isConnected: false })));
    w.on('remoteStream', handleRemoteStream);
    w.on('connectionStateChange', handleConnectionStateChange);
    w.on('localStream', handleLocalStream);

    return () => {
      cleanup();
    };
  }, [cleanup, handleAnswer, handleConnectionStateChange, handleIceCandidate, handleOffer, handleRemoteStream, handleRoomJoined, handleUserJoined, handleUserLeft]);

  const joinRoom = useCallback(async (roomId: string, serverUrl: string) => {
    if (!socketService.current || !webrtcService.current) return;
    setCallState(prev => ({ ...prev, isConnecting: true, error: null }));
    try {
      await socketService.current.connect(serverUrl);
      await webrtcService.current.initialize();
      socketService.current.emit('join-room', roomId);
    } catch (error) {
      console.error('Failed to join room:', error);
      setCallState(prev => ({ ...prev, error: 'Failed to connect to server', isConnecting: false }));
    }
  }, []);

  const leaveRoom = useCallback(() => {
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
      durationInterval.current = null;
    }
    socketService.current?.emit('leave-room');
    cleanup();
    callStartTime.current = null;
    setRemoteStreams(new Map());
    setLocalAudioStream(null); // Clear local stream on leave
    setCallState({
      isInCall: false, isConnected: false, isMuted: false, roomId: null,
      participants: [], callDuration: 0, isConnecting: false, error: null
    });
  }, [cleanup]);

  const toggleMute = useCallback(() => {
    const newMutedState = !callState.isMuted;
    webrtcService.current?.setMuted(newMutedState);
    setCallState(prev => ({ ...prev, isMuted: newMutedState }));
  }, [callState.isMuted]);

  return { callState, localAudioStream, remoteStreams, joinRoom, leaveRoom, toggleMute };
};
