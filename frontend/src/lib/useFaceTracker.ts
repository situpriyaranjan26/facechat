'use client';

import { useState, useEffect, useRef } from 'react';

export interface FaceTrackingData {
  x: number; // Center X in percentage (0 - 100)
  y: number; // Top Y in percentage (0 - 100)
  width: number; // Face width in percentage (0 - 100)
  height: number; // Face height in percentage (0 - 100)
  eyeY: number; // Eye level offset from top of face (percentage)
  noseY: number; // Nose level offset from top of face (percentage)
  mouthY: number; // Mouth level offset from top of face (percentage)
  isDetected: boolean;
  tiltDeg: number; // Head tilt angle in degrees
}

const DEFAULT_FACE: FaceTrackingData = {
  x: 50,
  y: 22,
  width: 44,
  height: 52,
  eyeY: 34,
  noseY: 55,
  mouthY: 74,
  isDetected: false,
  tiltDeg: 0,
};

export function useFaceTracker(videoRef: React.RefObject<HTMLVideoElement> | null): FaceTrackingData {
  const [faceData, setFaceData] = useState<FaceTrackingData>(DEFAULT_FACE);
  const smoothedRef = useRef<FaceTrackingData>(DEFAULT_FACE);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let isCancelled = false;
    let animId: number;
    let nativeDetector: any = null;

    if (typeof window !== 'undefined' && (window as any).FaceDetector) {
      try {
        nativeDetector = new (window as any).FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
      } catch {
        nativeDetector = null;
      }
    }

    if (typeof document !== 'undefined') {
      const c = document.createElement('canvas');
      c.width = 80;
      c.height = 60;
      canvasRef.current = c;
    }

    let lastCheckTime = 0;

    const trackLoop = async (timestamp: number) => {
      if (isCancelled) return;

      const video = videoRef?.current;
      if (video && video.readyState >= 2 && !video.paused && timestamp - lastCheckTime > 75) {
        lastCheckTime = timestamp;

        try {
          let detected = false;
          let targetX = smoothedRef.current.x;
          let targetY = smoothedRef.current.y;
          let targetW = smoothedRef.current.width;
          let targetH = smoothedRef.current.height;
          let tilt = 0;

          // Priority 1: Native browser FaceDetector API
          if (nativeDetector) {
            try {
              const faces = await nativeDetector.detect(video);
              if (faces && faces.length > 0) {
                const b = faces[0].boundingBox;
                const vw = video.videoWidth || 640;
                const vh = video.videoHeight || 480;

                targetX = ((b.x + b.width / 2) / vw) * 100;
                targetY = (b.y / vh) * 100;
                targetW = (b.width / vw) * 100;
                targetH = (b.height / vh) * 100;
                detected = true;

                if (faces[0].landmarks) {
                  const eyes = faces[0].landmarks.filter((l: any) => l.type === 'eye');
                  if (eyes.length === 2) {
                    const dx = eyes[1].locations[0].x - eyes[0].locations[0].x;
                    const dy = eyes[1].locations[0].y - eyes[0].locations[0].y;
                    tilt = Math.atan2(dy, dx) * (180 / Math.PI);
                  }
                }
              }
            } catch {
              // Fallback to optical tracker
            }
          }

          // Priority 2: Fast optical skin-tone / facial center-of-mass tracker
          if (!detected && canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (ctx) {
              ctx.drawImage(video, 0, 0, 80, 60);
              const imgData = ctx.getImageData(0, 0, 80, 60);
              const data = imgData.data;

              let minX = 80, maxX = 0, minY = 60, maxY = 0;
              let count = 0;
              let sumX = 0, sumY = 0;

              // Sample skin-tone chromatic locus in center 70% viewport
              for (let y = 6; y < 54; y += 2) {
                for (let x = 10; x < 70; x += 2) {
                  const idx = (y * 80 + x) * 4;
                  const r = data[idx];
                  const g = data[idx + 1];
                  const b = data[idx + 2];

                  // Skin chromatic range filter
                  if (
                    r > 60 &&
                    g > 38 &&
                    b > 20 &&
                    r > g &&
                    r > b &&
                    Math.abs(r - g) > 12 &&
                    r - Math.min(g, b) > 15
                  ) {
                    count++;
                    sumX += x;
                    sumY += y;
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                  }
                }
              }

              // If a plausible face cluster was detected
              if (count > 25 && maxX > minX && maxY > minY) {
                const avgX = sumX / count;
                const avgY = sumY / count;
                const bw = Math.max(22, (maxX - minX) * 1.15);
                const bh = Math.max(26, (maxY - minY) * 1.15);

                targetX = (avgX / 80) * 100;
                targetY = ((avgY - bh * 0.45) / 60) * 100;
                targetW = (bw / 80) * 100;
                targetH = (bh / 60) * 100;
                detected = true;
              }
            }
          }

          // Smooth interpolation (Exponential Moving Average) to eliminate jitter
          const alpha = detected ? 0.35 : 0.08;
          smoothedRef.current = {
            x: smoothedRef.current.x * (1 - alpha) + targetX * alpha,
            y: Math.max(2, Math.min(65, smoothedRef.current.y * (1 - alpha) + targetY * alpha)),
            width: Math.max(25, Math.min(68, smoothedRef.current.width * (1 - alpha) + targetW * alpha)),
            height: Math.max(30, Math.min(75, smoothedRef.current.height * (1 - alpha) + targetH * alpha)),
            eyeY: 34,
            noseY: 55,
            mouthY: 74,
            isDetected: detected,
            tiltDeg: smoothedRef.current.tiltDeg * 0.8 + tilt * 0.2,
          };

          setFaceData({ ...smoothedRef.current });
        } catch (err) {
          console.warn('[FaceTracker] Tracking warning:', err);
        }
      }

      animId = requestAnimationFrame(trackLoop);
    };

    animId = requestAnimationFrame(trackLoop);

    return () => {
      isCancelled = true;
      if (animId) cancelAnimationFrame(animId);
    };
  }, [videoRef]);

  return faceData;
}
