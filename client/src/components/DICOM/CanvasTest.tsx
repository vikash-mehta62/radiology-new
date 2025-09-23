/**
 * Simple Canvas Test - Verify canvas drawing works
 */

import React, { useRef, useEffect, useState } from 'react';
import { Box, Typography, Paper, Button, Slider } from '@mui/material';

const CanvasTest: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotation, setRotation] = useState(0);

  const drawTest = (ctx: CanvasRenderingContext2D, rotationAngle: number) => {
    const canvas = ctx.canvas;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Save context
    ctx.save();

    // Move to center and rotate
    ctx.translate(centerX, centerY);
    ctx.rotate((rotationAngle * Math.PI) / 180);

    // Draw a simple shape
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(-30, -30, 60, 60);

    ctx.strokeStyle = '#81C784';
    ctx.lineWidth = 3;
    ctx.strokeRect(-30, -30, 60, 60);

    // Draw cross
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-20, 0);
    ctx.lineTo(20, 0);
    ctx.moveTo(0, -20);
    ctx.lineTo(0, 20);
    ctx.stroke();

    // Restore context
    ctx.restore();

    // Draw text
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Rotation: ${rotationAngle}°`, centerX, canvas.height - 20);

    console.log('✅ Canvas test drawn:', rotationAngle);
  };

  useEffect(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        drawTest(ctx, rotation);
      }
    }
  }, [rotation]);

  const handleRotationChange = (event: Event, value: number | number[]) => {
    const numValue = Array.isArray(value) ? value[0] : value;
    setRotation(numValue);
  };

  const testDraw = () => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        drawTest(ctx, Math.random() * 360);
      }
    }
  };

  return (
    <Paper sx={{ p: 2, maxWidth: 400 }}>
      <Typography variant="h6" gutterBottom>
        🧪 Canvas Test
      </Typography>

      <Box sx={{ mb: 2, border: '1px solid #ccc', borderRadius: 1 }}>
        <canvas
          ref={canvasRef}
          width={300}
          height={200}
          style={{
            width: '100%',
            height: '200px',
            display: 'block',
            backgroundColor: '#1a1a1a'
          }}
        />
      </Box>

      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" gutterBottom>
          Rotation: {rotation}°
        </Typography>
        <Slider
          value={rotation}
          onChange={handleRotationChange}
          min={0}
          max={360}
          step={5}
        />
      </Box>

      <Button onClick={testDraw} variant="contained" fullWidth>
        Random Test Draw
      </Button>
    </Paper>
  );
};

export default CanvasTest;