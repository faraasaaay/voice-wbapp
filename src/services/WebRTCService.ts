export class WebRTCService {
  public localStream: MediaStream | null = null;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private eventListeners: Map<string, Function[]> = new Map();
  private isMuted: boolean = false;

  private rtcConfiguration: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ]
  };

  async initialize(): Promise<void> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1
        },
        video: false
      });

      this.triggerEvent('localStream', this.localStream);
      console.log('Local audio stream obtained');
    } catch (error) {
      console.error('Failed to get user media:', error);
      throw new Error('Microphone access denied or not available');
    }
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    const peerConnection = new RTCPeerConnection(this.rtcConfiguration);
    const peerId = this.generatePeerId();
    
    this.setupPeerConnection(peerConnection, peerId);
    this.peerConnections.set(peerId, peerConnection);

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, this.localStream!);
      });
    }

    const offer = await peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: false
    });

    await peerConnection.setLocalDescription(offer);
    return offer;
  }

  async handleOffer(offer: RTCSessionDescriptionInit, senderId: string): Promise<RTCSessionDescriptionInit> {
    const peerConnection = new RTCPeerConnection(this.rtcConfiguration);
    this.setupPeerConnection(peerConnection, senderId);
    this.peerConnections.set(senderId, peerConnection);

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, this.localStream!);
      });
    }

    await peerConnection.setRemoteDescription(offer);
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    return answer;
  }

  async handleAnswer(answer: RTCSessionDescriptionInit, senderId: string): Promise<void> {
    const peerConnection = this.peerConnections.get(senderId);
    if (peerConnection) {
      await peerConnection.setRemoteDescription(answer);
    }
  }

  async addIceCandidate(candidate: RTCIceCandidateInit, senderId: string): Promise<void> {
    const peerConnection = this.peerConnections.get(senderId);
    if (peerConnection && peerConnection.remoteDescription) {
      try {
        await peerConnection.addIceCandidate(candidate);
      } catch (error) {
        console.error('Failed to add ICE candidate:', error);
      }
    }
  }

  setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !muted;
      });
    }
  }

  removePeer(peerId: string): void {
    const peerConnection = this.peerConnections.get(peerId);
    if (peerConnection) {
      peerConnection.close();
      this.peerConnections.delete(peerId);
    }
  }


  cleanup(): void {
    // Close all peer connections
    this.peerConnections.forEach(pc => pc.close());
    this.peerConnections.clear();

    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    this.eventListeners.clear();
  }

  private setupPeerConnection(peerConnection: RTCPeerConnection, peerId: string): void {
    // Handle remote stream
    peerConnection.ontrack = (event) => {
      console.log('Received remote stream from:', peerId);
      this.triggerEvent('remoteStream', event.streams[0], peerId);
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.triggerEvent('iceCandidate', {
          candidate: event.candidate,
          target: peerId
        });
      }
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log(`Connection state with ${peerId}:`, peerConnection.connectionState);
      this.triggerEvent('connectionStateChange', peerConnection.connectionState, peerId);
      
      if (peerConnection.connectionState === 'failed') {
        console.error('Connection failed with peer:', peerId);
        this.removePeer(peerId);
      }
    };

    // Handle ICE connection state changes
    peerConnection.oniceconnectionstatechange = () => {
      console.log(`ICE connection state with ${peerId}:`, peerConnection.iceConnectionState);
    };
  }

  private generatePeerId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off(event: string, callback?: Function): void {
    if (callback) {
      const listeners = this.eventListeners.get(event);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    } else {
      this.eventListeners.delete(event);
    }
  }

  private triggerEvent(event: string, ...args: any[]): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`Error in WebRTC event listener for ${event}:`, error);
        }
      });
    }
  }

  getConnectionStats(): Map<string, RTCPeerConnectionState> {
    const stats = new Map<string, RTCPeerConnectionState>();
    this.peerConnections.forEach((pc, peerId) => {
      stats.set(peerId, pc.connectionState);
    });
    return stats;
  }

  async getAudioDevices(): Promise<MediaDeviceInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(device => device.kind === 'audioinput');
    } catch (error) {
      console.error('Failed to get audio devices:', error);
      return [];
    }
  }

  async switchAudioDevice(deviceId: string): Promise<void> {
    try {
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
      }

      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: { 
          deviceId: { exact: deviceId },
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });

      // Update all peer connections with new stream
      this.peerConnections.forEach(pc => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'audio');
        if (sender && this.localStream) {
          const audioTrack = this.localStream.getAudioTracks()[0];
          sender.replaceTrack(audioTrack);
        }
      });

      this.triggerEvent('localStream', this.localStream);
    } catch (error) {
      console.error('Failed to switch audio device:', error);
      throw error;
    }
  }
}