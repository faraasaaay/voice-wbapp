import React from 'react';
import { User, Mic, MicOff, Users, Clock, Signal } from 'lucide-react';
import { Participant } from '../hooks/useCallEngine';

interface ParticipantsListProps {
  participants: Participant[];
}

export function ParticipantsList({ participants }: ParticipantsListProps) {
  const formatJoinTime = (joinedAt: Date) => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - joinedAt.getTime()) / 1000);
    
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
      <div className="flex items-center space-x-2 mb-4">
        <User className="w-5 h-5 text-slate-400" />
        <h2 className="text-lg font-semibold text-white">
          Participants ({participants.length + 1})
        </h2>
      </div>

      <div className="space-y-3">
        {/* Current User */}
        <div className="flex items-center justify-between p-3 bg-emerald-600/10 border border-emerald-500/20 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-medium">You</p>
              <p className="text-emerald-400 text-xs">Host</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Signal className="w-4 h-4 text-emerald-400" />
            <Mic className="w-4 h-4 text-emerald-400" />
          </div>
        </div>

        {/* Other Participants */}
        {participants.map((participant) => (
          <div 
            key={participant.id}
            className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-200 ${
              participant.isConnected 
                ? 'bg-slate-700/30 border-slate-600/50' 
                : 'bg-amber-600/10 border-amber-500/20'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                participant.isConnected ? 'bg-slate-600' : 'bg-amber-600'
              }`}>
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white font-medium">
                  User {participant.id.slice(-4)}
                </p>
                <div className="flex items-center space-x-2 text-xs">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span className="text-slate-400">
                    {formatJoinTime(participant.joinedAt)}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {participant.isConnected ? (
                <>
                  <Signal className="w-4 h-4 text-emerald-400" />
                  {participant.isMuted ? (
                    <MicOff className="w-4 h-4 text-red-400" />
                  ) : (
                    <Mic className="w-4 h-4 text-emerald-400" />
                  )}
                </>
              ) : (
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                  <span className="text-amber-400 text-xs">Connecting...</span>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Empty State */}
        {participants.length === 0 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-3">
              <Users className="w-8 h-8 text-slate-500" />
            </div>
            <p className="text-slate-400 text-sm">
              Waiting for others to join...
            </p>
            <p className="text-slate-500 text-xs mt-1">
              Share your room code to invite participants
            </p>
          </div>
        )}
      </div>

      {/* Room Capacity Info */}
      <div className="mt-4 pt-4 border-t border-slate-700/50">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Room Capacity</span>
          <span>{participants.length + 1}/8</span>
        </div>
        <div className="mt-2 w-full bg-slate-700 rounded-full h-1">
          <div 
            className="bg-emerald-500 h-1 rounded-full transition-all duration-300"
            style={{ width: `${((participants.length + 1) / 8) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}