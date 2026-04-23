import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import s from './TrackEditor.module.css';

const CW = 1280;
const CH = 720;
const BG_SRC = '/assets/tracks/backgrounds/dirt-oval.jpg';

export default function TrackEditor() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const bgRef = useRef(null);
  const [points, setPoints] = useState([]);
  const [bgReady, setBgReady] = useState(false);

  // Load background image once
  useEffect(() => {
    const img = new Image();
    img.src = BG_SRC;
    img.onload = () => {
      bgRef.current = img;
      setBgReady(true);
    };
    // On error: bgRef.current stays null, canvas shows dark fallback
  }, []);

  // Redraw whenever points or bgReady changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, CW, CH);

    if (bgRef.current) {
      ctx.drawImage(bgRef.current, 0, 0, CW, CH);
    } else {
      ctx.fillStyle = '#1a1a24';
      ctx.fillRect(0, 0, CW, CH);
    }

    for (const pt of points) {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#4fc3f7';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }, [points, bgReady]);

  function handleCanvasClick(e) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CW / rect.width;
    const scaleY = CH / rect.height;
    const x = Math.round((e.clientX - rect.left) * scaleX);
    const y = Math.round((e.clientY - rect.top) * scaleY);
    setPoints((prev) => [...prev, { x, y }]);
  }

  return (
    <div className={s.screen}>
      <div className={s.topBar}>
        <button className={s.backBtn} onClick={() => navigate('/dev')}>
          ← Back to Dev Panel
        </button>
        <h1 className={s.title}>Track Geometry Editor</h1>
        <div className={s.headerCounter}>Points: {points.length}</div>
      </div>
      <div className={s.main}>
        <div className={s.canvasWrapper}>
          <canvas
            ref={canvasRef}
            width={CW}
            height={CH}
            className={s.canvas}
            role="img"
            aria-label="Track editor canvas — click to place points"
            onClick={handleCanvasClick}
          />
        </div>
      </div>
    </div>
  );
}
