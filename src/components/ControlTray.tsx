"use client";

import React, { useEffect, useState, useRef } from 'react';
import { AudioRecorder } from '../utils/AudioRecorder';
import { useLiveAPIContext } from '../contexts/LiveAPIContext';
import AudioPulse from './AudioPulse';

interface ControlTrayProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  supportsVideo?: boolean;
  autoSpeak?: boolean;
  onAutoSpeakChange?: (enabled: boolean) => void;
}

const ControlTray: React.FC<ControlTrayProps> = ({ 
  videoRef, 
  supportsVideo = true,
  autoSpeak = false,
  onAutoSpeakChange
}) => {
  const [videoActive, setVideoActive] = useState(false);
  const [audioActive, setAudioActive] = useState(false);
  const [videoPermission, setVideoPermission] = useState(false);
  const [audioPermission, setAudioPermission] = useState(false);
  const [micVolume, setMicVolume] = useState(0);
  const [streamActive, setStreamActive] = useState(false);
  const [autoSpeakEnabled, setAutoSpeakEnabled] = useState(autoSpeak);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const videoStream = useRef<MediaStream | null>(null);
  const audioRecorder = useRef<AudioRecorder | null>(null);
  const { client, connected, loading, error } = useLiveAPIContext();

  // Sync autoSpeak with prop
  useEffect(() => {
    setAutoSpeakEnabled(autoSpeak);
  }, [autoSpeak]);

  // Update error message when API error occurs
  useEffect(() => {
    if (error) {
      setErrorMessage(error);
      console.error('LiveAPI Error:', error);
    } else {
      setErrorMessage(null);
    }
  }, [error]);

  // Initialize audio recorder on mount
  useEffect(() => {
    audioRecorder.current = new AudioRecorder({
      maxSeconds: 15,
      mimeType: 'audio/webm'
    });

    audioRecorder.current.on('volume', (volume) => {
      setMicVolume(volume);
    });

    audioRecorder.current.on('recorded', async (data) => {
      if (!connected || !streamActive) return;
      
      try {
        // Convert to base64
        const base64Audio = await audioRecorder.current?.convertToBase64(data.blob);
        if (base64Audio) {
          // Send to API
          client.addAudioData(base64Audio);
          console.log('Audio data sent successfully', {
            mimeType: data.mimeType,
            duration: data.duration,
            size: data.blob.size
          });
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error('Error processing audio:', errorMsg);
        setErrorMessage(`Audio error: ${errorMsg}`);
      }
    });

    return () => {
      if (audioRecorder.current) {
        audioRecorder.current.stop();
      }
      if (videoStream.current) {
        videoStream.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [client, connected, streamActive]);

  // Initialize video capture if video is active
  useEffect(() => {
    if (videoActive && videoRef.current && connected && streamActive) {
      try {
        client.startVideoCapture(videoRef.current, 3000); // Capture every 3 seconds
        console.log('Video capture started successfully');
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error('Error starting video capture:', errorMsg);
        setErrorMessage(`Video capture error: ${errorMsg}`);
      }
    } else {
      client.stopVideoCapture();
    }

    return () => {
      client.stopVideoCapture();
    };
  }, [videoActive, videoRef, client, connected, streamActive]);

  const toggleVideo = async () => {
    try {
      if (videoActive) {
        // Turn off video
        if (videoStream.current) {
          videoStream.current.getTracks().forEach(track => track.stop());
          videoStream.current = null;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
        setVideoActive(false);
        console.log('Video deactivated successfully');
      } else {
        // Request permission if not already granted
        if (!videoPermission) {
          try {
            await navigator.mediaDevices.getUserMedia({ video: true });
            setVideoPermission(true);
            console.log('Video permission granted');
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.error('Error requesting video permission:', errorMsg);
            setErrorMessage(`Camera permission error: ${errorMsg}`);
            return;
          }
        }

        // Turn on video
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          }
        });
        
        videoStream.current = stream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        
        setVideoActive(true);
        console.log('Video activated successfully');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('Error toggling video:', errorMsg);
      setErrorMessage(`Camera error: ${errorMsg}`);
    }
  };

  const toggleAudio = async () => {
    try {
      if (audioActive) {
        // Turn off microphone
        if (audioRecorder.current) {
          audioRecorder.current.stop();
        }
        setAudioActive(false);
        console.log('Microphone deactivated successfully');
      } else {
        // Request permission if not already granted
        if (!audioPermission) {
          const hasPermission = await audioRecorder.current?.requestPermission();
          if (hasPermission) {
            setAudioPermission(true);
            console.log('Microphone permission granted');
          } else {
            const errorMsg = 'Microphone permission denied';
            console.error(errorMsg);
            setErrorMessage(errorMsg);
            return;
          }
        }

        // Turn on microphone
        if (audioRecorder.current) {
          const started = await audioRecorder.current.start();
          if (started) {
            setAudioActive(true);
            console.log('Microphone activated successfully');
          } else {
            setErrorMessage('Failed to start microphone');
          }
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('Error toggling audio:', errorMsg);
      setErrorMessage(`Microphone error: ${errorMsg}`);
    }
  };

  const toggleStream = () => {
    try {
      setStreamActive(prevState => !prevState);
      if (!streamActive) {
        console.log('AI Stream started');
      } else {
        console.log('AI Stream stopped');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('Error toggling stream:', errorMsg);
      setErrorMessage(`Stream error: ${errorMsg}`);
    }
  };

  const toggleAutoSpeak = () => {
    const newState = !autoSpeakEnabled;
    setAutoSpeakEnabled(newState);
    if (onAutoSpeakChange) {
      onAutoSpeakChange(newState);
    }
    console.log(`Auto-speak ${newState ? 'enabled' : 'disabled'}`);
  };

  const clearError = () => {
    setErrorMessage(null);
  };

  // Add a reconnect function
  const handleReconnect = async () => {
    try {
      setErrorMessage(null);
      // Get the client to reconnect
      await client.connect();
      console.log('Reconnection attempt initiated');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('Error reconnecting:', errorMsg);
      setErrorMessage(`Reconnect error: ${errorMsg}`);
    }
  };

  return (
    <div className="control-tray">
      <div className={`connection-status ${connected ? 'connected' : loading ? 'loading' : 'disconnected'}`}>
        <div className="status-indicator"></div>
        <span>{connected ? 'Connected' : loading ? 'Connecting...' : 'Disconnected'}</span>
        {!connected && !loading && (
          <button 
            className="reconnect-button" 
            onClick={handleReconnect}
            title="Try to reconnect"
          >
            <span className="material-symbols-outlined">refresh</span>
          </button>
        )}
      </div>
      
      {supportsVideo && (
        <button 
          className={`control-button ${videoActive ? 'active' : ''}`}
          onClick={toggleVideo}
          aria-label={videoActive ? "Turn off camera" : "Turn on camera"}
          disabled={!connected}
        >
          <span className="material-symbols-outlined">
            {videoActive ? 'videocam' : 'videocam_off'}
          </span>
        </button>
      )}
      
      <button 
        className={`control-button ${audioActive ? 'active' : ''}`}
        onClick={toggleAudio}
        aria-label={audioActive ? "Turn off microphone" : "Turn on microphone"}
        disabled={!connected}
      >
        <span className="material-symbols-outlined">
          {audioActive ? 'mic' : 'mic_off'}
        </span>
        {audioActive && (
          <AudioPulse 
            volume={micVolume} 
            active={audioActive} 
            size={32}
          />
        )}
      </button>

      <button 
        className={`control-button ${streamActive ? 'active' : ''}`}
        onClick={toggleStream}
        aria-label={streamActive ? "Stop AI stream" : "Start AI stream"}
        disabled={!connected}
        title={connected ? (streamActive ? "Stop AI stream" : "Start AI stream") : "Disconnected from API"}
      >
        <span className="material-symbols-outlined">
          {streamActive ? 'stop' : 'play_arrow'}
        </span>
        <div className="button-status">
          {streamActive ? 'Streaming' : 'Stream'}
        </div>
      </button>

      <button 
        className={`control-button ${autoSpeakEnabled ? 'active' : ''}`}
        onClick={toggleAutoSpeak}
        aria-label={autoSpeakEnabled ? "Turn off auto-speak" : "Turn on auto-speak"}
        title={autoSpeakEnabled ? "Disable automatic speech" : "Enable automatic speech"}
      >
        <span className="material-symbols-outlined">
          {autoSpeakEnabled ? 'volume_up' : 'volume_off'}
        </span>
        <div className="button-status">
          Auto-speak
        </div>
      </button>

      {errorMessage && (
        <div className="error-message">
          <p>{errorMessage}</p>
          <button className="close-error" onClick={clearError}>×</button>
        </div>
      )}

      <style jsx>{`
        .control-tray {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.9);
          border-radius: 12px;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
          margin-top: 1rem;
          grid-column: 1 / -1;
          grid-row: 2;
          z-index: 10;
          position: relative;
        }

        .connection-status {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          border-radius: 16px;
          font-size: 0.875rem;
          font-weight: 500;
          transition: all 0.3s ease;
        }
        
        .connection-status.connected {
          background: rgba(76, 175, 80, 0.1);
          color: #2e7d32;
        }
        
        .connection-status.disconnected {
          background: rgba(244, 67, 54, 0.1);
          color: #d32f2f;
        }

        .connection-status.loading {
          background: rgba(255, 193, 7, 0.1);
          color: #f57c00;
        }

        .status-indicator {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }
        
        .connected .status-indicator {
          background: #4CAF50;
          box-shadow: 0 0 5px rgba(76, 175, 80, 0.5);
        }
        
        .disconnected .status-indicator {
          background: #F44336;
          box-shadow: 0 0 5px rgba(244, 67, 54, 0.5);
        }

        .loading .status-indicator {
          background: #FFC107;
          box-shadow: 0 0 5px rgba(255, 193, 7, 0.5);
          animation: pulse 1.5s infinite;
        }
        
        @keyframes pulse {
          0% {
            opacity: 0.6;
            transform: scale(0.8);
          }
          50% {
            opacity: 1;
            transform: scale(1.2);
          }
          100% {
            opacity: 0.6;
            transform: scale(0.8);
          }
        }

        .reconnect-button {
          background: none;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
          margin-left: 4px;
          color: inherit;
          opacity: 0.8;
          transition: opacity 0.2s;
        }
        
        .reconnect-button:hover {
          opacity: 1;
        }
        
        .reconnect-button .material-symbols-outlined {
          font-size: 16px;
        }

        .control-button {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 64px;
          height: 64px;
          border-radius: 12px;
          border: none;
          background: #f5f5f5;
          cursor: pointer;
          transition: all 0.3s ease;
          padding: 0.5rem;
        }

        .control-button:hover:not(:disabled) {
          background: #ebebeb;
        }

        .control-button.active {
          background: #4a80f5;
          color: white;
        }

        .control-button.active:hover:not(:disabled) {
          background: #3a70e5;
        }

        .control-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .material-symbols-outlined {
          font-size: 24px;
        }

        .button-status {
          font-size: 0.65rem;
          margin-top: 0.25rem;
          opacity: 0.8;
        }

        .error-message {
          position: absolute;
          bottom: calc(100% + 10px);
          left: 50%;
          transform: translateX(-50%);
          background: #ffebee;
          border: 1px solid #ffcdd2;
          border-radius: 8px;
          padding: 0.75rem 1rem;
          width: 90%;
          max-width: 400px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          z-index: 100;
        }

        .error-message p {
          margin: 0;
          color: #d32f2f;
          font-size: 0.875rem;
        }

        .close-error {
          background: none;
          border: none;
          color: #d32f2f;
          font-size: 1.25rem;
          cursor: pointer;
          padding: 0;
          margin-left: 1rem;
        }
      `}</style>
    </div>
  );
};

export default ControlTray; 