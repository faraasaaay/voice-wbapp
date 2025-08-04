import { io, Socket } from 'socket.io-client';

export class SocketService {
  private socket: Socket | null = null;
  private eventListeners: Map<string, Function[]> = new Map();

  async connect(serverUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = io(serverUrl, {
          transports: ['websocket', 'polling'],
          timeout: 20000,
          forceNew: true
        });

        this.socket.on('connect', () => {
          console.log('Connected to signaling server');
          this.triggerEvent('connect', null);
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          console.error('Connection error:', error);
          this.triggerEvent('connect_error', error);
          reject(error);
        });

        this.socket.on('disconnect', (reason) => {
          console.log('Disconnected from server:', reason);
          this.triggerEvent('disconnect', reason);
        });

        // Set up WebRTC signaling event listeners
        this.socket.on('room-joined', (data) => this.triggerEvent('room-joined', data));
        this.socket.on('user-joined', (data) => this.triggerEvent('user-joined', data));
        this.socket.on('user-left', (data) => this.triggerEvent('user-left', data));
        this.socket.on('room-error', (data) => this.triggerEvent('room-error', data));
        this.socket.on('offer', (data) => this.triggerEvent('offer', data));
        this.socket.on('answer', (data) => this.triggerEvent('answer', data));
        this.socket.on('ice-candidate', (data) => this.triggerEvent('ice-candidate', data));
        this.socket.on('error', (data) => this.triggerEvent('error', data));

      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.eventListeners.clear();
  }

  emit(event: string, data?: any): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('Socket not connected, cannot emit event:', event);
    }
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

  private triggerEvent(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}