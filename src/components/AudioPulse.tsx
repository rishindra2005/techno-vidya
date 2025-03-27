import React, { memo, useState, useEffect } from 'react';

type AudioPulseProps = {
  volume: number;
  active: boolean;
  hover?: boolean;
  size?: number;
};

const AudioPulse: React.FC<AudioPulseProps> = ({ 
  volume, 
  active, 
  hover = false,
  size = 24
}) => {
  const [animVolume, setAnimVolume] = useState(0);
  
  useEffect(() => {
    // Smooth animation
    const target = active ? Math.max(0.05, volume / 100) : 0;
    const diff = target - animVolume;
    if (Math.abs(diff) > 0.01) {
      setAnimVolume(prev => prev + diff * 0.2);
    }
  }, [volume, active]);

  const pulseSize = size * (0.5 + animVolume * 0.5);
  
  return (
    <div 
      className="audio-pulse-container" 
      style={{
        position: 'relative', 
        width: `${size}px`, 
        height: `${size}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div
        className="audio-pulse"
        style={{
          position: 'absolute',
          borderRadius: '50%',
          width: `${pulseSize}px`,
          height: `${pulseSize}px`,
          background: active ? 'rgba(0, 120, 255, 0.2)' : 'transparent',
          border: active ? '1px solid rgba(0, 120, 255, 0.5)' : 'none',
          transition: 'all 0.1s ease-out',
          opacity: hover ? 0.8 : 0.5,
        }}
      />
      <div
        className="audio-center"
        style={{
          width: `${size * 0.4}px`,
          height: `${size * 0.4}px`,
          borderRadius: '50%',
          background: active ? 'rgb(0, 120, 255)' : '#888',
          transition: 'background 0.3s ease',
        }}
      />
    </div>
  );
};

export default memo(AudioPulse); 