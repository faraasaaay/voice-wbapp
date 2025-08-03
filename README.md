# SecureVoice - Voice Call Application

A modern, secure peer-to-peer voice calling application built with React and WebRTC, featuring real-time communication through Socket.IO signaling.

## Features

- 🎙️ **High-Quality Voice Calls** - Crystal clear audio with WebRTC
- 👥 **Group Calls** - Support for up to 8 participants per room
- 🔇 **Mute Controls** - Easy mute/unmute functionality
- 🌐 **Room-Based System** - Join calls using simple room codes
- 📱 **Responsive Design** - Works seamlessly on all devices
- 🔒 **Secure** - Peer-to-peer encryption with WebRTC
- ⚡ **Low Latency** - Optimized for real-time communication
- 🎨 **Modern UI** - Beautiful dark theme with smooth animations

## Quick Start

### Development Mode

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start both frontend and backend:**
   ```bash
   npm run dev:full
   ```

   This will start:
   - Backend server on `http://localhost:3001`
   - Frontend development server on `http://localhost:5173`

3. **Open your browser** and navigate to `http://localhost:5173`

### Individual Services

**Start only the backend server:**
```bash
npm run dev:server
```

**Start only the frontend:**
```bash
npm run dev
```

### Production Build

1. **Build the application:**
   ```bash
   npm run build
   ```

2. **Start the production server:**
   ```bash
   npm start
   ```

## How to Use

1. **Generate or Enter Room Code** - Create a new room or join an existing one
2. **Share Room Code** - Send the room code to others to invite them
3. **Start Talking** - Once connected, you can communicate with all participants
4. **Mute/Unmute** - Use the microphone button to control your audio
5. **Leave Call** - Click the "Leave Call" button to exit

## Architecture

### Frontend (React + TypeScript)
- **React 18** with TypeScript for type safety
- **Tailwind CSS** for responsive styling
- **Lucide React** for beautiful icons
- **Socket.IO Client** for real-time communication
- **WebRTC** for peer-to-peer audio streaming

### Backend (Node.js + Express)
- **Express.js** server with Socket.IO
- **WebRTC signaling** server for connection establishment
- **Room management** system for group calls
- **Rate limiting** and security middleware
- **Health monitoring** and statistics

### Key Components

- `JoinRoom` - Landing page for entering/creating rooms
- `CallInterface` - Main call controls and audio visualization
- `ParticipantsList` - Real-time participant management
- `ConnectionStatus` - Network status indicator
- `SocketService` - WebSocket communication handler
- `WebRTCService` - Peer-to-peer connection management

## Configuration

### Environment Variables

```bash
# Server Configuration
PORT=3001
NODE_ENV=development
ADMIN_KEY=your-admin-key

# CORS Configuration
FRONTEND_URL=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Server Settings

- **Max Participants:** 8 per room (configurable)
- **Rate Limiting:** 100 requests per 15 minutes
- **Connection Timeout:** 60 seconds
- **Ping Interval:** 25 seconds

## API Endpoints

- `GET /health` - Server health check
- `GET /admin/stats` - Server statistics (requires admin key)
- `WebSocket /socket.io/` - Real-time communication

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

*WebRTC support required for voice functionality*

## Development

### Project Structure
```
├── src/
│   ├── components/     # React components
│   ├── services/       # WebRTC and Socket services
│   └── App.tsx         # Main application
├── server/
│   └── server.js       # Backend signaling server
└── package.json
```

### Scripts
- `npm run dev:full` - Start both frontend and backend
- `npm run dev` - Frontend development server only
- `npm run dev:server` - Backend server only
- `npm run build` - Build for production
- `npm run lint` - Run ESLint

## Troubleshooting

### Common Issues

1. **Microphone Access Denied**
   - Ensure HTTPS in production
   - Check browser permissions
   - Try refreshing the page

2. **Connection Failed**
   - Verify server is running on port 3001
   - Check firewall settings
   - Ensure WebSocket support

3. **Audio Not Working**
   - Check device audio settings
   - Verify microphone is not muted
   - Test with different browsers

### Debug Mode

Set `NODE_ENV=development` to enable detailed logging and debug information.

## License

MIT License - feel free to use this project for personal or commercial purposes.