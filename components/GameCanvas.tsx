
import React, { useRef, useEffect } from 'react';
import { GamePhase, Platform, Player } from '../types';
import { 
  GRAVITY, 
  JUMP_SPEED_MULTIPLIER, 
  MAX_CHARGE_TIME,
  GAME_DURATION_MS,
  PLATFORM_COLORS, 
  PLATFORM_DIST_MAX, 
  PLATFORM_DIST_MIN, 
  PLATFORM_SIZE_MAX, 
  PLATFORM_SIZE_MIN, 
  PLAYER_HEIGHT, 
  PLAYER_RADIUS 
} from '../constants';

interface GameCanvasProps {
  phase: GamePhase;
  onScoreUpdate: (score: number) => void;
  onTimeUpdate: (seconds: number) => void;
  onGameOver: () => void;
  setPhase: (phase: GamePhase) => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ phase, onScoreUpdate, onTimeUpdate, onGameOver, setPhase }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Game State Refs (Mutable for performance)
  const scoreRef = useRef(0);
  const cameraRef = useRef({ x: 0, z: 0 }); // Changed to track World X and Z
  const playerRef = useRef<Player>({ 
    x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, rotation: 0, scaleY: 1 
  });
  const platformsRef = useRef<Platform[]>([]);
  const frameIdRef = useRef<number>(0);
  const isChargingRef = useRef(false);
  const chargeStartTimeRef = useRef(0);
  const isJumpingRef = useRef(false);
  
  // Timer Refs
  const timeLeftRef = useRef(GAME_DURATION_MS);
  const lastReportedSecondsRef = useRef(GAME_DURATION_MS / 1000);
  const prevPhaseRef = useRef<GamePhase>(phase);
  
  // Isometric projection helpers
  const toScreen = (x: number, y: number, z: number, width: number, height: number) => {
    const scale = 1.0;
    // World coordinates to Iso coordinates
    const isoX = (x - z) * Math.cos(Math.PI / 6);
    const isoY = (x + z) * Math.sin(Math.PI / 6) - y;
    
    // Camera offset (Iso coordinates)
    const camIsoX = (cameraRef.current.x - cameraRef.current.z) * Math.cos(Math.PI / 6);
    const camIsoY = (cameraRef.current.x + cameraRef.current.z) * Math.sin(Math.PI / 6);

    return {
      x: width / 2 + (isoX - camIsoX) * scale,
      y: height / 2 + (isoY - camIsoY) * scale + 150 // Offset down slightly
    };
  };

  // Initialize Game
  const resetGame = () => {
    scoreRef.current = 0;
    onScoreUpdate(0);
    
    timeLeftRef.current = GAME_DURATION_MS;
    lastReportedSecondsRef.current = Math.ceil(GAME_DURATION_MS / 1000);
    onTimeUpdate(lastReportedSecondsRef.current);

    const startPlatform: Platform = {
      x: 0, z: 0, w: 80, h: 80, color: PLATFORM_COLORS[0], id: 0
    };
    
    const nextPlatform = generateNextPlatform(startPlatform, 1);

    platformsRef.current = [startPlatform, nextPlatform];
    
    playerRef.current = {
      x: 0, y: 0, z: 0,
      vx: 0, vy: 0, vz: 0,
      rotation: 0,
      scaleY: 1
    };

    cameraRef.current = { x: 0, z: 0 };
    isChargingRef.current = false;
    isJumpingRef.current = false;
  };

  const generateNextPlatform = (prev: Platform, id: number): Platform => {
    // Decide direction: 0 = +X (Right), 1 = -Z (Left/Forward)
    const dir = Math.random() > 0.5 ? 'x' : 'z';
    const dist = PLATFORM_DIST_MIN + Math.random() * (PLATFORM_DIST_MAX - PLATFORM_DIST_MIN);
    const w = PLATFORM_SIZE_MIN + Math.random() * (PLATFORM_SIZE_MAX - PLATFORM_SIZE_MIN);
    
    let nextX = prev.x;
    let nextZ = prev.z;

    if (dir === 'x') {
      nextX += dist;
    } else {
      nextZ -= dist; // Moving into negative Z for forward
    }

    return {
      x: nextX,
      z: nextZ,
      w: w,
      h: w, // square tops mostly
      color: PLATFORM_COLORS[id % PLATFORM_COLORS.length],
      id
    };
  };

  const updatePhysics = (dt: number) => {
    if (phase !== GamePhase.PLAYING) return;

    // Update Timer
    timeLeftRef.current -= dt;
    if (timeLeftRef.current <= 0) {
      timeLeftRef.current = 0;
      onTimeUpdate(0);
      onGameOver();
      return;
    }

    // Throttle timer updates to UI
    const remainingSeconds = Math.ceil(timeLeftRef.current / 1000);
    if (remainingSeconds !== lastReportedSecondsRef.current) {
        lastReportedSecondsRef.current = remainingSeconds;
        onTimeUpdate(remainingSeconds);
    }

    const player = playerRef.current;
    const platforms = platformsRef.current;
    
    // Determine Target Rotation (Look at next platform)
    // The target is usually the last platform in the list if we are on the second to last
    const currentP = platforms[platforms.length - 2];
    const nextP = platforms[platforms.length - 1];
    
    if (currentP && nextP) {
        const dx = nextP.x - currentP.x;
        const dz = nextP.z - currentP.z;
        const targetRot = Math.atan2(dz, dx); // 0 for +X, -PI/2 for -Z
        
        // Smooth rotation
        let diff = targetRot - player.rotation;
        // Normalize angle
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        
        player.rotation += diff * 0.1;
    }

    // Camera smoothing (Lerp towards player)
    const lerpSpeed = 0.05;
    cameraRef.current.x += (player.x - cameraRef.current.x) * lerpSpeed;
    cameraRef.current.z += (player.z - cameraRef.current.z) * lerpSpeed;

    // Charging Logic (Squash)
    if (isChargingRef.current && !isJumpingRef.current) {
      const pressTime = Date.now() - chargeStartTimeRef.current;
      // Cap squash
      const factor = Math.min(pressTime / MAX_CHARGE_TIME, 1);
      player.scaleY = 1 - (factor * 0.4); // Squash down to 60%
    } else if (!isJumpingRef.current) {
      // Recover squash
      player.scaleY += (1 - player.scaleY) * 0.2;
    }

    // Jumping Logic
    if (isJumpingRef.current) {
      player.scaleY = 1 + (player.vy * 2); // Stretch when flying up
      if (player.scaleY > 1.3) player.scaleY = 1.3;
      if (player.scaleY < 0.8) player.scaleY = 0.8;

      player.x += player.vx * dt;
      player.z += player.vz * dt;
      player.y += player.vy * dt;
      player.vy -= GRAVITY * dt;

      // Collision Check
      // We only check for landing if we are falling (vy < 0) and hit the ground plane (y <= 0)
      if (player.y <= 0 && player.vy <= 0) {
        const landedPlatformIndex = checkPlatformCollision(player.x, player.z);
        
        if (landedPlatformIndex !== -1) {
            // Landed on a platform!
            player.y = 0;
            isJumpingRef.current = false;
            player.vy = 0;
            player.vx = 0;
            player.vz = 0;
            player.scaleY = 1;
            
            handleLanding(landedPlatformIndex);
        } else {
            // Missed! Fall into abyss.
            // Do NOT snap to y=0. Let gravity continue.
        }
      }
    }
    
    // Fallen off world check
    if (player.y < -200) {
        onGameOver();
    }
  };

  const checkPlatformCollision = (px: number, pz: number): number => {
    const platforms = platformsRef.current;
    for (let i = 0; i < platforms.length; i++) {
      const p = platforms[i];
      const halfW = p.w / 2;
      const halfH = p.h / 2;

      if (
        px >= p.x - halfW &&
        px <= p.x + halfW &&
        pz >= p.z - halfH &&
        pz <= p.z + halfH
      ) {
        return i;
      }
    }
    return -1;
  };

  const handleLanding = (index: number) => {
    const platforms = platformsRef.current;
    
    // If we landed on the NEW platform (last one)
    if (index === platforms.length - 1) {
        scoreRef.current += 1;
        onScoreUpdate(scoreRef.current);
        
        // Spawn new platform
        const newPlat = generateNextPlatform(platforms[platforms.length - 1], platforms.length);
        platformsRef.current.push(newPlat);
        
        // Remove old ones to save memory, keep last 4 for visuals
        if (platformsRef.current.length > 5) {
            platformsRef.current.shift();
        }
    }
  };

  const draw = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.clearRect(0, 0, width, height);

    // Background Gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#e0f2fe'); // Light blue
    gradient.addColorStop(1, '#f0f9ff');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Sort by depth for painter's algorithm
    const renderList = [
      ...platformsRef.current.map(p => ({ type: 'platform', data: p, sortDepth: (p.x + p.z) })), 
      { type: 'player', data: playerRef.current, sortDepth: (playerRef.current.x + playerRef.current.z) }
    ];
    
    // Sort ascending (draw far first)
    // FIX: Changed from b.sortDepth - a.sortDepth to a.sortDepth - b.sortDepth
    // Objects with smaller x+z are "further away" in iso view (higher up screen).
    renderList.sort((a, b) => a.sortDepth - b.sortDepth);

    renderList.forEach(item => {
        if (item.type === 'platform') {
            drawPlatform(ctx, item.data as Platform, width, height);
        } else {
            drawPlayer(ctx, item.data as Player, width, height);
        }
    });
  };

  const drawPlatform = (ctx: CanvasRenderingContext2D, p: Platform, w: number, h: number) => {
    const pos = toScreen(p.x, 0, p.z, w, h);
    const size = p.w;
    const isoW = size * Math.cos(Math.PI / 6);
    const isoH = size * Math.sin(Math.PI / 6);
    const blockH = 40; // Thickness

    ctx.lineWidth = 1;
    ctx.lineJoin = 'round';

    // Top Face
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y - isoH); // Top
    ctx.lineTo(pos.x + isoW, pos.y); // Right
    ctx.lineTo(pos.x, pos.y + isoH); // Bottom
    ctx.lineTo(pos.x - isoW, pos.y); // Left
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.stroke();

    // Right Face (Darker)
    ctx.fillStyle = shadeColor(p.color, -20);
    ctx.beginPath();
    ctx.moveTo(pos.x + isoW, pos.y);
    ctx.lineTo(pos.x + isoW, pos.y + blockH);
    ctx.lineTo(pos.x, pos.y + isoH + blockH);
    ctx.lineTo(pos.x, pos.y + isoH);
    ctx.closePath();
    ctx.fill();

    // Left Face (Darkest)
    ctx.fillStyle = shadeColor(p.color, -40);
    ctx.beginPath();
    ctx.moveTo(pos.x - isoW, pos.y);
    ctx.lineTo(pos.x - isoW, pos.y + blockH);
    ctx.lineTo(pos.x, pos.y + isoH + blockH);
    ctx.lineTo(pos.x, pos.y + isoH);
    ctx.closePath();
    ctx.fill();
  };

  const drawPlayer = (ctx: CanvasRenderingContext2D, p: Player, w: number, h: number) => {
    const pos = toScreen(p.x, p.y, p.z, w, h);
    const shadowPos = toScreen(p.x, 0, p.z, w, h);
    
    // Only draw shadow if above ground roughly
    if (p.y >= -50) {
        const shadowScale = Math.max(0, 1 - (p.y / 400));
        ctx.fillStyle = `rgba(0,0,0,${0.2 * shadowScale})`;
        ctx.beginPath();
        ctx.ellipse(shadowPos.x, shadowPos.y, 12 * shadowScale, 6 * shadowScale, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    // Player Body
    const bodyW = PLAYER_RADIUS * 2.5;
    const bodyH = PLAYER_HEIGHT * p.scaleY;
    const topY = pos.y - bodyH;

    ctx.fillStyle = '#374151'; // Gray-700
    
    // Simple pawn shape
    // Base
    ctx.beginPath();
    ctx.ellipse(pos.x, pos.y - (bodyW/2), bodyW/1.8, bodyW/2.2, 0, 0, Math.PI*2);
    ctx.fill();
    
    // Body
    ctx.beginPath();
    ctx.moveTo(pos.x - bodyW/2, pos.y - bodyW/2);
    ctx.lineTo(pos.x + bodyW/2, pos.y - bodyW/2);
    ctx.lineTo(pos.x + bodyW/2.5, topY + bodyW);
    ctx.lineTo(pos.x - bodyW/2.5, topY + bodyW);
    ctx.fill();
    
    // Head
    ctx.beginPath();
    ctx.arc(pos.x, topY + bodyW/2, bodyW/1.6, 0, Math.PI * 2);
    ctx.fill();

    // Charging effect (White glow)
    if (isChargingRef.current) {
        ctx.fillStyle = `rgba(255, 255, 255, ${0.2 + (1-p.scaleY)})`;
        ctx.fill();
    }

    // EYES (Direction indicator)
    const eyeDist = 6;
    const eyeOffsetY = topY + bodyW/2 - 2;
    
    // Project a point slightly in front of player based on rotation
    const lookX = Math.cos(p.rotation) * 10;
    const lookZ = Math.sin(p.rotation) * 10;
    
    // Convert look vector to screen space delta
    const screenLookX = (lookX - lookZ) * Math.cos(Math.PI / 6);
    const screenLookY = (lookX + lookZ) * Math.sin(Math.PI / 6);
    
    // Normalize screen look vector for eye placement
    const len = Math.sqrt(screenLookX*screenLookX + screenLookY*screenLookY);
    const nX = len > 0.001 ? screenLookX / len : 0;
    const nY = len > 0.001 ? screenLookY / len : 1;

    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(pos.x + nX * 4 - nY * 3, eyeOffsetY + nY * 2, 3, 0, Math.PI * 2); // Left Eye
    ctx.arc(pos.x + nX * 4 + nY * 3, eyeOffsetY + nY * 2, 3, 0, Math.PI * 2); // Right Eye
    ctx.fill();

    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(pos.x + nX * 5 - nY * 3, eyeOffsetY + nY * 2, 1, 0, Math.PI * 2); // Left Pupil
    ctx.arc(pos.x + nX * 5 + nY * 3, eyeOffsetY + nY * 2, 1, 0, Math.PI * 2); // Right Pupil
    ctx.fill();
  };

  const shadeColor = (color: string, percent: number) => {
    let R = parseInt(color.substring(1, 3), 16);
    let G = parseInt(color.substring(3, 5), 16);
    let B = parseInt(color.substring(5, 7), 16);

    R = Math.round((R * (100 + percent)) / 100);
    G = Math.round((G * (100 + percent)) / 100);
    B = Math.round((B * (100 + percent)) / 100);

    R = (R < 255) ? R : 255;
    G = (G < 255) ? G : 255;
    B = (B < 255) ? B : 255;
    
    const RR = ((R.toString(16).length === 1) ? "0" + R.toString(16) : R.toString(16));
    const GG = ((G.toString(16).length === 1) ? "0" + G.toString(16) : G.toString(16));
    const BB = ((B.toString(16).length === 1) ? "0" + B.toString(16) : B.toString(16));

    return "#" + RR + GG + BB;
  };

  // Game Loop
  useEffect(() => {
    // Check for phase transitions to trigger reset
    if (phase === GamePhase.MENU) {
      resetGame();
    } else if (phase === GamePhase.PLAYING && prevPhaseRef.current === GamePhase.GAME_OVER) {
      resetGame();
    }
    
    prevPhaseRef.current = phase;

    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = Math.min(time - lastTime, 50); 
      lastTime = time;

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          updatePhysics(dt);
          draw(ctx, canvas.width, canvas.height);
        }
      }
      frameIdRef.current = requestAnimationFrame(loop);
    };

    frameIdRef.current = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(frameIdRef.current);
  }, [phase]);

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
        if(canvasRef.current) {
            canvasRef.current.width = window.innerWidth;
            canvasRef.current.height = window.innerHeight;
        }
    }
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Inputs
  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (phase !== GamePhase.PLAYING) return;
    if (isJumpingRef.current) return;
    
    isChargingRef.current = true;
    chargeStartTimeRef.current = Date.now();
  };

  const handleEnd = (e: React.MouseEvent | React.TouchEvent) => {
    if (phase !== GamePhase.PLAYING) return;
    if (!isChargingRef.current) return;
    if (isJumpingRef.current) return;

    isChargingRef.current = false;
    const pressTime = Date.now() - chargeStartTimeRef.current;
    const clampedTime = Math.min(pressTime, MAX_CHARGE_TIME);
    
    // Jump!
    isJumpingRef.current = true;
    const power = clampedTime * JUMP_SPEED_MULTIPLIER;
    
    const platforms = platformsRef.current;
    // Determine target direction based on last two platforms
    const currentP = platforms[platforms.length - 2];
    const nextP = platforms[platforms.length - 1];
    
    const dx = nextP.x - currentP.x;
    const dz = nextP.z - currentP.z;
    
    let jumpVx = 0;
    let jumpVz = 0;
    
    // Normalize direction
    if (Math.abs(dx) > Math.abs(dz)) {
        jumpVx = Math.sign(dx) * power;
        jumpVz = 0;
    } else {
        jumpVz = Math.sign(dz) * power;
        jumpVx = 0;
    }

    playerRef.current.vx = jumpVx;
    playerRef.current.vz = jumpVz;
    playerRef.current.vy = power * 0.7; // Vertical force component
  };

  return (
    <canvas
      ref={canvasRef}
      className="block w-full h-full touch-none cursor-pointer"
      onMouseDown={handleStart}
      onMouseUp={handleEnd}
      onTouchStart={handleStart}
      onTouchEnd={handleEnd}
    />
  );
};

export default GameCanvas;
