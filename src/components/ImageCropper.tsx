import React, { useState, useRef, useEffect } from 'react';
import styles from './ImageCropper.module.css';

interface ImageCropperProps {
  src: string;
  onCrop: (croppedImageData: string) => void;
  onCancel: () => void;
}

const ImageCropper: React.FC<ImageCropperProps> = ({ src, onCrop, onCancel }) => {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const handleScaleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setScale(parseFloat(e.target.value));
  };
  
  const handleRotationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRotation(parseInt(e.target.value));
  };
  
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };
  
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y
      });
    }
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      setPosition({ x: newX, y: newY });
    }
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging && e.touches.length === 1) {
      const newX = e.touches[0].clientX - dragStart.x;
      const newY = e.touches[0].clientY - dragStart.y;
      setPosition({ x: newX, y: newY });
      e.preventDefault(); // Prevent scrolling while dragging
    }
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  const handleTouchEnd = () => {
    setIsDragging(false);
  };
  
  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);
  
  const cropImage = () => {
    if (!imageRef.current || !containerRef.current) return;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    // Set canvas size to be square (1:1 aspect ratio)
    const cropSize = Math.min(containerRef.current.offsetWidth, containerRef.current.offsetHeight);
    canvas.width = 300; // Output size
    canvas.height = 300; // Output size
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const centerX = containerRect.width / 2;
    const centerY = containerRect.height / 2;
    
    // Clear canvas
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Save context state before transformations
    ctx.save();
    
    // Translate to center of canvas
    ctx.translate(canvas.width / 2, canvas.height / 2);
    
    // Rotate canvas
    ctx.rotate((rotation * Math.PI) / 180);
    
    // Draw image centered and scaled
    const scaleFactor = cropSize / Math.max(imageRef.current.naturalWidth, imageRef.current.naturalHeight);
    const adjustedScale = scale * scaleFactor;
    
    ctx.drawImage(
      imageRef.current,
      -imageRef.current.naturalWidth / 2 + position.x / adjustedScale,
      -imageRef.current.naturalHeight / 2 + position.y / adjustedScale,
      imageRef.current.naturalWidth,
      imageRef.current.naturalHeight
    );
    
    // Restore context state
    ctx.restore();
    
    // Get cropped image data
    const croppedImageData = canvas.toDataURL('image/jpeg', 0.9);
    onCrop(croppedImageData);
  };
  
  return (
    <div className={styles.cropperContainer}>
      <div className={styles.cropperHeader}>
        <h3>Crop Profile Picture</h3>
        <button className={styles.closeButton} onClick={onCancel}>
          &times;
        </button>
      </div>
      
      <div className={styles.cropperBody}>
        <div 
          ref={containerRef}
          className={styles.imageContainer}
          onMouseMove={handleMouseMove}
          onTouchMove={handleTouchMove}
        >
          <div className={styles.cropOverlay}>
            <div className={styles.cropArea}></div>
          </div>
          <img
            ref={imageRef}
            src={src}
            alt="Crop preview"
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
              cursor: isDragging ? 'grabbing' : 'grab'
            }}
          />
        </div>
        
        <div className={styles.controls}>
          <div className={styles.controlGroup}>
            <label htmlFor="scale">Zoom</label>
            <input
              type="range"
              id="scale"
              min="0.5"
              max="3"
              step="0.01"
              value={scale}
              onChange={handleScaleChange}
              className={styles.slider}
            />
          </div>
          
          <div className={styles.controlGroup}>
            <label htmlFor="rotation">Rotation</label>
            <input
              type="range"
              id="rotation"
              min="0"
              max="360"
              step="1"
              value={rotation}
              onChange={handleRotationChange}
              className={styles.slider}
            />
          </div>
          
          <div className={styles.instructions}>
            <p>Drag to position • Pinch or use slider to zoom</p>
          </div>
        </div>
      </div>
      
      <div className={styles.cropperFooter}>
        <button
          className={styles.cancelButton}
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          className={styles.cropButton}
          onClick={cropImage}
        >
          Apply
        </button>
      </div>
    </div>
  );
};

export default ImageCropper;