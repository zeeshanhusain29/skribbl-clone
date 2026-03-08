import { useRef, useEffect, useState, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';
import { useGame } from '../context/GameContext';
import './DrawingCanvas.css';

const COLORS = [
  '#000000', '#FFFFFF', '#FF6B6B', '#FF9F43', '#FFE66D', '#4ECDC4',
  '#45B7D1', '#96CEB4', '#DDA0DD', '#A855F7', '#3B82F6', '#10B981',
  '#F97316', '#EF4444', '#8B4513', '#808080'
];
const SIZES = [2, 5, 10, 20, 30];

export default function DrawingCanvas({ isDrawer }) {
  const canvasRef = useRef(null);
  const socket = useSocket();
  const { state } = useGame();

  const [color, setColor] = useState('#000000');
  const [size, setSize] = useState(5);
  const [tool, setTool] = useState('pen'); // pen, eraser, fill
  const [isDrawing, setIsDrawing] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const ctxRef = useRef(null);
  const lastPos = useRef(null);
  const isDrawingRef = useRef(false);

  // Init canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctxRef.current = ctx;
  }, []);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas || !ctxRef.current) return;
      const imgData = ctxRef.current.getImageData(0, 0, canvas.width, canvas.height);
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      ctxRef.current.putImageData(imgData, 0, 0);
      ctxRef.current.lineCap = 'round';
      ctxRef.current.lineJoin = 'round';
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const drawLine = useCallback((ctx, x0, y0, x1, y1, strokeColor, strokeSize, isEraser) => {
    ctx.globalCompositeOperation = isEraser ? 'destination-out' : 'source-over';
    ctx.strokeStyle = isEraser ? 'rgba(0,0,0,1)' : strokeColor;
    ctx.lineWidth = strokeSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    if (isEraser) ctx.globalCompositeOperation = 'source-over';
  }, []);

  const floodFill = useCallback((canvas, ctx, startX, startY, fillColor) => {
    startX = Math.round(startX);
    startY = Math.round(startY);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    const getIdx = (x, y) => (y * canvas.width + x) * 4;
    const targetIdx = getIdx(startX, startY);
    const targetR = data[targetIdx], targetG = data[targetIdx+1], targetB = data[targetIdx+2], targetA = data[targetIdx+3];

    const hex = fillColor.replace('#', '');
    const fillR = parseInt(hex.slice(0, 2), 16);
    const fillG = parseInt(hex.slice(2, 4), 16);
    const fillB = parseInt(hex.slice(4, 6), 16);

    if (targetR === fillR && targetG === fillG && targetB === fillB) return;

    const colorMatch = (idx) =>
      Math.abs(data[idx] - targetR) < 32 &&
      Math.abs(data[idx+1] - targetG) < 32 &&
      Math.abs(data[idx+2] - targetB) < 32 &&
      Math.abs(data[idx+3] - targetA) < 32;

    const stack = [[startX, startY]];
    const visited = new Set();

    while (stack.length > 0) {
      const [x, y] = stack.pop();
      if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) continue;
      const key = y * canvas.width + x;
      if (visited.has(key)) continue;
      const idx = getIdx(x, y);
      if (!colorMatch(idx)) continue;
      visited.add(key);
      data[idx] = fillR; data[idx+1] = fillG; data[idx+2] = fillB; data[idx+3] = 255;
      stack.push([x+1, y], [x-1, y], [x, y+1], [x, y-1]);
    }
    ctx.putImageData(imageData, 0, 0);
  }, []);

  // Replay strokes from server
  const replayStrokes = useCallback((strokes) => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let lastPt = null;
    let currentColor = '#000000';
    let currentSize = 5;
    let isErase = false;

    strokes.forEach(s => {
      if (s.type === 'start') {
        currentColor = s.color || '#000000';
        currentSize = s.size || 5;
        isErase = s.isEraser || false;
        const x = s.x * canvas.width;
        const y = s.y * canvas.height;
        lastPt = { x, y };
      } else if (s.type === 'move' && lastPt) {
        const x = s.x * canvas.width;
        const y = s.y * canvas.height;
        drawLine(ctx, lastPt.x, lastPt.y, x, y, currentColor, currentSize, isErase);
        lastPt = { x, y };
      } else if (s.type === 'end') {
        lastPt = null;
      } else if (s.type === 'fill') {
        const x = s.x * canvas.width;
        const y = s.y * canvas.height;
        floodFill(canvas, ctx, x, y, s.color || '#000000');
      }
    });
  }, [drawLine, floodFill]);

  // Socket events for receiving draws
  useEffect(() => {
    if (!socket) return;

    socket.on('draw_data', (data) => {
      const canvas = canvasRef.current;
      const ctx = ctxRef.current;
      if (!canvas || !ctx) return;

      if (data.type === 'start') {
        lastPos.current = { x: data.x * canvas.width, y: data.y * canvas.height };
      } else if (data.type === 'move' && lastPos.current) {
        const x = data.x * canvas.width;
        const y = data.y * canvas.height;
        drawLine(ctx, lastPos.current.x, lastPos.current.y, x, y, data.color, data.size, data.isEraser);
        lastPos.current = { x, y };
      } else if (data.type === 'end') {
        lastPos.current = null;
      } else if (data.type === 'fill') {
        floodFill(canvas, ctx, data.x * canvas.width, data.y * canvas.height, data.color);
      }
    });

    socket.on('canvas_cleared', () => {
      const canvas = canvasRef.current;
      const ctx = ctxRef.current;
      if (!canvas || !ctx) return;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    });

    socket.on('canvas_undo', ({ strokes }) => {
      replayStrokes(strokes);
    });

    return () => {
      socket.off('draw_data');
      socket.off('canvas_cleared');
      socket.off('canvas_undo');
    };
  }, [socket, drawLine, floodFill, replayStrokes]);

  // Replay existing strokes when joining mid-game
  useEffect(() => {
    if (state.strokes?.length > 0) {
      setTimeout(() => replayStrokes(state.strokes), 100);
    }
  }, []);

  // Drawing handlers
  const startDraw = useCallback((e) => {
    if (!isDrawer) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const { x, y } = getPos(e, canvas);
    const normX = x / canvas.width;
    const normY = y / canvas.height;

    if (tool === 'fill') {
      floodFill(canvas, ctxRef.current, x, y, color);
      socket.emit('fill_canvas', { x: normX, y: normY, color });
      return;
    }

    isDrawingRef.current = true;
    setIsDrawing(true);
    lastPos.current = { x, y };
    socket.emit('draw_start', { x: normX, y: normY, color, size, isEraser: tool === 'eraser' });
  }, [isDrawer, tool, color, size, socket, floodFill]);

  const moveDraw = useCallback((e) => {
    if (!isDrawer || !isDrawingRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    const { x, y } = getPos(e, canvas);

    if (lastPos.current) {
      drawLine(ctx, lastPos.current.x, lastPos.current.y, x, y, color, size, tool === 'eraser');
    }
    lastPos.current = { x, y };
    socket.emit('draw_move', { x: x / canvas.width, y: y / canvas.height });
  }, [isDrawer, color, size, tool, socket, drawLine]);

  const endDraw = useCallback((e) => {
    if (!isDrawer || !isDrawingRef.current) return;
    isDrawingRef.current = false;
    setIsDrawing(false);
    lastPos.current = null;
    socket.emit('draw_end');
  }, [isDrawer, socket]);

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    socket.emit('canvas_clear');
  };

  const handleUndo = () => {
    socket.emit('draw_undo');
  };

  return (
    <div className="canvas-container">
      {/* Canvas */}
      <div className="canvas-wrap">
        <canvas
          ref={canvasRef}
          className={`drawing-canvas ${isDrawer ? `cursor-${tool}` : 'cursor-default'}`}
          onMouseDown={startDraw}
          onMouseMove={moveDraw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={moveDraw}
          onTouchEnd={endDraw}
          style={{ touchAction: 'none' }}
        />
      </div>

      {/* Toolbar (only for drawer) */}
      {isDrawer && (
        <div className="drawing-toolbar">
          {/* Tools */}
          <div className="tool-group">
            {[
              { id: 'pen', icon: '✏️', label: 'Pen' },
              { id: 'eraser', icon: '⬜', label: 'Eraser' },
              { id: 'fill', icon: '🪣', label: 'Fill' },
            ].map(t => (
              <button
                key={t.id}
                className={`tool-btn ${tool === t.id ? 'active' : ''}`}
                onClick={() => setTool(t.id)}
                title={t.label}
              >{t.icon}</button>
            ))}
          </div>

          {/* Brush sizes */}
          <div className="tool-group sizes-group">
            {SIZES.map(s => (
              <button
                key={s}
                className={`size-btn ${size === s ? 'active' : ''}`}
                onClick={() => setSize(s)}
                title={`Size ${s}`}
              >
                <div style={{
                  width: Math.min(s * 1.5, 28) + 'px',
                  height: Math.min(s * 1.5, 28) + 'px',
                  borderRadius: '50%',
                  background: tool === 'eraser' ? 'transparent' : color,
                  border: tool === 'eraser' ? '2px solid var(--text-muted)' : 'none'
                }} />
              </button>
            ))}
          </div>

          {/* Colors */}
          <div className="tool-group colors-group">
            {COLORS.map(c => (
              <button
                key={c}
                className={`color-btn ${color === c && tool !== 'eraser' ? 'active' : ''}`}
                style={{ background: c, border: c === '#FFFFFF' ? '1px solid var(--border)' : 'none' }}
                onClick={() => { setColor(c); setTool('pen'); }}
                title={c}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="tool-group">
            <button className="tool-btn action-btn" onClick={handleUndo} title="Undo">↩️</button>
            <button className="tool-btn action-btn" onClick={handleClear} title="Clear">🗑️</button>
          </div>
        </div>
      )}
    </div>
  );
}
