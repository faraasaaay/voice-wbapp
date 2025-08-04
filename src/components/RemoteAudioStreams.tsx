import React from 'react';
import AudioPlayer from './AudioPlayer';

interface RemoteAudioStreamsProps {
  remoteStreams: Map<string, MediaStream>;
}

const RemoteAudioStreams: React.FC<RemoteAudioStreamsProps> = ({ remoteStreams }) => {
  return (
    <div style={{ display: 'none' }}>
      {Array.from(remoteStreams.entries()).map(([peerId, stream]) => (
        <AudioPlayer key={peerId} stream={stream} />
      ))}
    </div>
  );
};

export default RemoteAudioStreams;
