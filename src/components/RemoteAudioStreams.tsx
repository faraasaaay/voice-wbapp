import React from 'react';
import AudioPlayer from './AudioPlayer';

interface RemoteAudioStreamsProps {
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
}

const RemoteAudioStreams: React.FC<RemoteAudioStreamsProps> = ({ localStream, remoteStreams }) => {
  return (
    <div style={{ display: 'none' }}>
      {localStream && <AudioPlayer key="local-audio" stream={localStream} />}
      {Array.from(remoteStreams.entries()).map(([peerId, stream]) => (
        <AudioPlayer key={peerId} stream={stream} />
      ))}
    </div>
  );
};

export default RemoteAudioStreams;
