const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const os = require('os');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const path = require('path');

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Configuration
const CONFIG = {
    PORT: process.env.PORT || 3001,
    NODE_ENV: process.env.NODE_ENV || 'development',
    MAX_CLIENTS_PER_ROOM: 8, // Increased for group calls
    RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
    RATE_LIMIT_MAX: 100 // requests per window
};

// CORS middleware
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? process.env.FRONTEND_URL 
        : ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true
}));

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false // Disable CSP since we're not serving HTML
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: CONFIG.RATE_LIMIT_WINDOW,
    max: CONFIG.RATE_LIMIT_MAX,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
});
app.use(limiter);

// Body parser
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: CONFIG.NODE_ENV
    });
});

// Socket.IO configuration with enhanced security and CORS
const io = socketIo(server, {
    cors: {
        origin: process.env.NODE_ENV === 'production' 
            ? process.env.FRONTEND_URL 
            : ['http://localhost:5173', 'http://localhost:3000'],
        methods: ['GET', 'POST'],
        credentials: true
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
});

// Room management
class RoomManager {
    constructor() {
        this.rooms = new Map();
        this.userRooms = new Map();
        this.userInfo = new Map(); // Store user info like mute status
    }

    joinRoom(socketId, roomId, userInfo = {}) {
        // Leave current room if in one
        this.leaveCurrentRoom(socketId);

        // Initialize room if it doesn't exist
        if (!this.rooms.has(roomId)) {
            this.rooms.set(roomId, new Set());
        }

        const room = this.rooms.get(roomId);
        
        // Check room capacity
        if (room.size >= CONFIG.MAX_CLIENTS_PER_ROOM) {
            return { success: false, error: 'Room is full' };
        }

        // Add user to room
        room.add(socketId);
        this.userRooms.set(socketId, roomId);
        this.userInfo.set(socketId, { 
            isMuted: false, 
            joinedAt: new Date(),
            ...userInfo 
        });

        console.log(`User ${socketId} joined room ${roomId} (${room.size}/${CONFIG.MAX_CLIENTS_PER_ROOM})`);
        
        return { 
            success: true, 
            roomSize: room.size,
            isFirstUser: room.size === 1
        };
    }

    leaveCurrentRoom(socketId) {
        const currentRoomId = this.userRooms.get(socketId);
        if (!currentRoomId) return null;

        const room = this.rooms.get(currentRoomId);
        if (room) {
            room.delete(socketId);
            
            // Clean up empty rooms
            if (room.size === 0) {
                this.rooms.delete(currentRoomId);
                console.log(`Room ${currentRoomId} deleted (empty)`);
            } else {
                console.log(`User ${socketId} left room ${currentRoomId} (${room.size} remaining)`);
            }
        }

        this.userRooms.delete(socketId);
        this.userInfo.delete(socketId);
        return currentRoomId;
    }

    getRoomUsers(roomId) {
        const room = this.rooms.get(roomId);
        return room ? Array.from(room) : [];
    }

    getUserRoom(socketId) {
        return this.userRooms.get(socketId);
    }

    getUserInfo(socketId) {
        return this.userInfo.get(socketId) || {};
    }

    updateUserInfo(socketId, info) {
        const currentInfo = this.userInfo.get(socketId) || {};
        this.userInfo.set(socketId, { ...currentInfo, ...info });
    }

    getRoomStats() {
        return {
            totalRooms: this.rooms.size,
            totalUsers: this.userRooms.size,
            roomDetails: Array.from(this.rooms.entries()).map(([roomId, users]) => ({
                roomId,
                userCount: users.size
            }))
        };
    }
}

const roomManager = new RoomManager();

// Enhanced logging
class Logger {
    static info(message, data = {}) {
        console.log(`[INFO] ${new Date().toISOString()} - ${message}`, data);
    }

    static error(message, error = {}) {
        console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error);
    }

    static warn(message, data = {}) {
        console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, data);
    }

    static debug(message, data = {}) {
        if (CONFIG.NODE_ENV === 'development') {
            console.log(`[DEBUG] ${new Date().toISOString()} - ${message}`, data);
        }
    }
}

// Connection statistics
const stats = {
    totalConnections: 0,
    currentConnections: 0,
    messagesRelayed: 0,
    startTime: Date.now()
};

// Helper function to get local IP address
function getLocalIpAddress() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '0.0.0.0';
}

// Socket.IO connection handling
io.on('connection', (socket) => {
    stats.totalConnections++;
    stats.currentConnections++;
    
    const clientIp = socket.handshake.address;
    Logger.info('User connected', { 
        socketId: socket.id, 
        ip: clientIp,
        userAgent: socket.handshake.headers['user-agent']
    });

    // Join room event
    socket.on('join-room', (roomId) => {
        try {
            // Validate room ID
            if (!roomId || typeof roomId !== 'string' || roomId.length > 20) {
                socket.emit('error', { message: 'Invalid room ID' });
                return;
            }

            const result = roomManager.joinRoom(socket.id, roomId);
            
            if (!result.success) {
                socket.emit('room-error', { message: result.error });
                return;
            }

            // Join the socket.io room
            socket.join(roomId);
            
            // Notify existing users in the room
            const roomUsers = roomManager.getRoomUsers(roomId);
            const otherUsers = roomUsers.filter(id => id !== socket.id);
            
            if (otherUsers.length > 0) {
                // Notify other users that someone joined
                socket.to(roomId).emit('user-joined', socket.id);
                Logger.info('User joined existing room', { 
                    socketId: socket.id, 
                    roomId, 
                    roomSize: result.roomSize 
                });
            } else {
                Logger.info('User created new room', { 
                    socketId: socket.id, 
                    roomId 
                });
            }

            socket.emit('room-joined', { 
                roomId, 
                isFirstUser: result.isFirstUser,
                roomSize: result.roomSize
            });

        } catch (error) {
            Logger.error('Error in join-room', error);
            socket.emit('error', { message: 'Failed to join room' });
        }
    });

    // Handle mute status updates
    socket.on('mute-status', (data) => {
        try {
            const roomId = roomManager.getUserRoom(socket.id);
            if (roomId) {
                roomManager.updateUserInfo(socket.id, { isMuted: data.isMuted });
                socket.to(roomId).emit('user-mute-status', {
                    userId: socket.id,
                    isMuted: data.isMuted
                });
                Logger.debug('User mute status updated', { 
                    socketId: socket.id, 
                    isMuted: data.isMuted 
                });
            }
        } catch (error) {
            Logger.error('Error updating mute status', error);
        }
    });

    // WebRTC signaling events with enhanced error handling
    socket.on('offer', (payload) => {
        try {
            if (!payload.target || !payload.sdp) {
                Logger.warn('Invalid offer payload', { socketId: socket.id });
                return;
            }

            Logger.debug('Relaying offer', { 
                from: socket.id, 
                to: payload.target 
            });

            io.to(payload.target).emit('offer', {
                sdp: payload.sdp,
                sender: socket.id
            });

            stats.messagesRelayed++;
        } catch (error) {
            Logger.error('Error relaying offer', error);
        }
    });

    socket.on('answer', (payload) => {
        try {
            if (!payload.target || !payload.sdp) {
                Logger.warn('Invalid answer payload', { socketId: socket.id });
                return;
            }

            Logger.debug('Relaying answer', { 
                from: socket.id, 
                to: payload.target 
            });

            io.to(payload.target).emit('answer', {
                sdp: payload.sdp,
                sender: socket.id
            });

            stats.messagesRelayed++;
        } catch (error) {
            Logger.error('Error relaying answer', error);
        }
    });

    socket.on('ice-candidate', (payload) => {
        try {
            if (!payload.target || !payload.candidate) {
                Logger.warn('Invalid ICE candidate payload', { socketId: socket.id });
                return;
            }

            Logger.debug('Relaying ICE candidate', { 
                from: socket.id, 
                to: payload.target 
            });

            io.to(payload.target).emit('ice-candidate', {
                candidate: payload.candidate,
                sender: socket.id
            });

            stats.messagesRelayed++;
        } catch (error) {
            Logger.error('Error relaying ICE candidate', error);
        }
    });

    // Handle explicit leave room
    socket.on('leave-room', () => {
        try {
            const roomId = roomManager.leaveCurrentRoom(socket.id);
            if (roomId) {
                socket.to(roomId).emit('user-left', socket.id);
                socket.leave(roomId);
                Logger.info('User left room', { socketId: socket.id, roomId });
            }
        } catch (error) {
            Logger.error('Error in leave-room', error);
        }
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
        try {
            stats.currentConnections--;
            
            const roomId = roomManager.leaveCurrentRoom(socket.id);
            if (roomId) {
                socket.to(roomId).emit('user-left', socket.id);
            }

            Logger.info('User disconnected', { 
                socketId: socket.id, 
                reason,
                roomId: roomId || 'none'
            });
        } catch (error) {
            Logger.error('Error handling disconnect', error);
        }
    });

    // Handle errors
    socket.on('error', (error) => {
        Logger.error('Socket error', { socketId: socket.id, error });
    });
});

// Admin stats endpoint (for monitoring)
app.get('/admin/stats', (req, res) => {
    // Simple authentication (in production, use proper auth)
    const adminKey = req.headers['x-admin-key'];
    if (adminKey !== process.env.ADMIN_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const uptime = Date.now() - stats.startTime;
    res.json({
        ...stats,
        uptime,
        rooms: roomManager.getRoomStats(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString()
    });
});

// Serve static files in production
if (CONFIG.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../dist')));
    
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../dist/index.html'));
    });
}

// Error handling middleware
app.use((err, req, res, next) => {
    Logger.error('Express error', err);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
    Logger.info(`Received ${signal}. Shutting down gracefully...`);
    
    server.close(() => {
        Logger.info('HTTP server closed.');
        
        // Close all socket connections
        io.close(() => {
            Logger.info('Socket.IO server closed.');
            process.exit(0);
        });
    });

    // Force close after 10 seconds
    setTimeout(() => {
        Logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
const localIp = getLocalIpAddress();

server.listen(CONFIG.PORT, () => {
    Logger.info('SecureVoice API server started', {
        port: CONFIG.PORT,
        environment: CONFIG.NODE_ENV,
        localAccess: `http://localhost:${CONFIG.PORT}`,
        networkAccess: `http://${localIp}:${CONFIG.PORT}`
    });
    
    console.log('\n🚀 SecureVoice API Server Running!');
    console.log(`   Environment: ${CONFIG.NODE_ENV}`);
    console.log(`   Local:       http://localhost:${CONFIG.PORT}`);
    console.log(`   Network:     http://${localIp}:${CONFIG.PORT}`);
    if (CONFIG.NODE_ENV === 'development') {
        console.log(`   Health:      http://localhost:${CONFIG.PORT}/health`);
    }
    console.log('\n💡 API Endpoints:');
    console.log('   - Socket.IO:  /socket.io/');
    console.log('   - Health:     /health');
    console.log('   - Stats:      /admin/stats (requires X-Admin-Key header)\n');
});

// Log statistics periodically
if (CONFIG.NODE_ENV === 'development') {
    setInterval(() => {
        const roomStats = roomManager.getRoomStats();
        if (roomStats.totalUsers > 0) {
            Logger.info('Periodic stats', {
                connections: stats.currentConnections,
                rooms: roomStats.totalRooms,
                users: roomStats.totalUsers,
                messagesRelayed: stats.messagesRelayed
            });
        }
    }, 30000); // Every 30 seconds
}