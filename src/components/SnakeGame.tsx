import { useRef, useEffect, useState, useCallback } from 'react'

// 游戏配置
const COLS = 20
const ROWS = 20
const CELL = 20
const CANVAS_W = COLS * CELL
const CANVAS_H = ROWS * CELL
const BASE_SPEED = 150
const TOTAL_CELLS = COLS * ROWS
const HIGH_SCORE_KEY = 'snake_high_score'

type Point = { x: number; y: number }
type Direction = 'up' | 'down' | 'left' | 'right'
type GameState = 'idle' | 'playing' | 'paused' | 'gameover'

const DIR: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 }
}

// 按键→方向映射（模块级常量，避免每次按键时重新创建）
const KEY_MAP: Record<string, Direction> = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  w: 'up', W: 'up', s: 'down', S: 'down', a: 'left', A: 'left', d: 'right', D: 'right'
}

const OPPOSITES: Record<Direction, Direction> = {
  up: 'down', down: 'up', left: 'right', right: 'left'
}

// 安全的 localStorage 读写
function loadHighScore(): number {
  try {
    const saved = localStorage.getItem(HIGH_SCORE_KEY)
    return saved ? parseInt(saved, 10) : 0
  } catch { return 0 }
}

function saveHighScore(s: number): void {
  try { localStorage.setItem(HIGH_SCORE_KEY, String(s)) } catch { /* ignore */ }
}

// 从空闲格子列表中随机选取食物，避免死循环
function randomFood(snake: Point[]): Point {
  const occupied = new Set(snake.map((p) => p.y * COLS + p.x))
  const free: number[] = []
  for (let i = 0; i < TOTAL_CELLS; i++) {
    if (!occupied.has(i)) free.push(i)
  }
  if (free.length === 0) {
    // 蛇占满全部格子 → 玩家获胜，返回任意坐标（下一帧 tick 会撞墙结束）
    return { x: 0, y: 0 }
  }
  const idx = free[Math.floor(Math.random() * free.length)]
  return { x: idx % COLS, y: Math.floor(idx / COLS) }
}

export default function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [gameState, setGameState] = useState<GameState>('idle')
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(loadHighScore)

  const snakeRef = useRef<Point[]>([])
  const foodRef = useRef<Point>({ x: 10, y: 10 })
  const dirRef = useRef<Direction>('right')
  const nextDirRef = useRef<Direction>('right')
  const timerRef = useRef<number | null>(null)
  const scoreRef = useRef(0)
  const gameStateRef = useRef<GameState>('idle')

  // 同步 gameState 到 ref（供键盘监听器等读取最新值）
  const setGameStateWrapped = (s: GameState) => {
    gameStateRef.current = s
    setGameState(s)
  }

  // 当前速度（由分数推导）
  function currentSpeed(): number {
    return Math.max(60, BASE_SPEED - Math.floor(scoreRef.current / 50) * 10)
  }

  // 绘制
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

    ctx.strokeStyle = '#16213e'
    ctx.lineWidth = 0.5
    for (let x = 0; x <= COLS; x++) {
      ctx.beginPath()
      ctx.moveTo(x * CELL, 0)
      ctx.lineTo(x * CELL, CANVAS_H)
      ctx.stroke()
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.beginPath()
      ctx.moveTo(0, y * CELL)
      ctx.lineTo(CANVAS_W, y * CELL)
      ctx.stroke()
    }

    const f = foodRef.current
    ctx.fillStyle = '#ef4444'
    ctx.shadowColor = '#ef4444'
    ctx.shadowBlur = 8
    ctx.beginPath()
    ctx.arc(f.x * CELL + CELL / 2, f.y * CELL + CELL / 2, CELL / 2 - 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0

    const snake = snakeRef.current
    snake.forEach((p, i) => {
      const ratio = 1 - i / (snake.length + 10)
      const r = Math.floor(74 + (100 - 74) * ratio)
      const g = Math.floor(222 + (200 - 222) * ratio)
      const b = Math.floor(128 + (60 - 128) * ratio)
      ctx.fillStyle = `rgb(${r},${g},${b})`
      ctx.fillRect(p.x * CELL + 1, p.y * CELL + 1, CELL - 2, CELL - 2)

      if (i === 0) {
        ctx.fillStyle = '#fff'
        const d = dirRef.current
        const cx = p.x * CELL + CELL / 2
        const cy = p.y * CELL + CELL / 2
        const ex = d === 'left' ? -3 : d === 'right' ? 3 : 0
        const ey = d === 'up' ? -3 : d === 'down' ? 3 : 0
        ctx.beginPath()
        ctx.arc(cx + ex - 3, cy + ey - 3, 2.5, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(cx + ex + 3, cy + ey + 3, 2.5, 0, Math.PI * 2)
        ctx.fill()
      }
    })
  }, [])

  // 结束游戏 — 直接从 localStorage 读取最新最高分，避免闭包陷阱
  function endGame() {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
    setGameStateWrapped('gameover')
    const s = scoreRef.current
    const currentHigh = loadHighScore() // 从 localStorage 读最新值，不用 state 闭包
    if (s > currentHigh) {
      saveHighScore(s)
      setHighScore(s)
    }
  }

  const tick = useCallback(() => {
    dirRef.current = nextDirRef.current
    const snake = snakeRef.current
    const head = snake[0]
    const dir = dirRef.current
    const newHead: Point = { x: head.x + DIR[dir].x, y: head.y + DIR[dir].y }

    if (newHead.x < 0 || newHead.x >= COLS || newHead.y < 0 || newHead.y >= ROWS) {
      endGame()
      return
    }
    if (snake.some((p) => p.x === newHead.x && p.y === newHead.y)) {
      endGame()
      return
    }

    const ate = newHead.x === foodRef.current.x && newHead.y === foodRef.current.y
    const newSnake = [newHead, ...snake]
    if (!ate) {
      newSnake.pop()
    } else {
      const s = scoreRef.current + 10
      scoreRef.current = s
      setScore(s)
      foodRef.current = randomFood(newSnake)
    }

    snakeRef.current = newSnake
    draw()

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(tick, currentSpeed())
  }, [draw])

  function startGame() {
    const initialSnake: Point[] = [
      { x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }
    ]
    snakeRef.current = initialSnake
    dirRef.current = 'right'
    nextDirRef.current = 'right'
    scoreRef.current = 0
    foodRef.current = randomFood(initialSnake)
    setScore(0)
    setGameStateWrapped('playing')
    draw()

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(tick, BASE_SPEED)
  }

  function togglePause() {
    if (gameStateRef.current === 'playing') {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = null
      setGameStateWrapped('paused')
    } else if (gameStateRef.current === 'paused') {
      setGameStateWrapped('playing')
      timerRef.current = window.setTimeout(tick, currentSpeed())
    }
  }

  // 键盘监听（仅在游戏进行中处理方向键）
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const gs = gameStateRef.current
      if (gs !== 'playing' && gs !== 'paused') return // 非游戏状态忽略

      const newDir = KEY_MAP[e.key]
      if (!newDir) return

      e.preventDefault()
      if (newDir !== OPPOSITES[dirRef.current]) {
        nextDirRef.current = newDir
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  // 组件卸载时清理计时器
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  // 游戏结束后重绘
  useEffect(() => {
    if (gameState === 'gameover') draw()
  }, [gameState, draw])

  // 方向键回调（避免 JSX 中每次渲染重建内联函数）
  const pressUp = useCallback(() => {
    if (dirRef.current !== 'down') nextDirRef.current = 'up'
  }, [])
  const pressDown = useCallback(() => {
    if (dirRef.current !== 'up') nextDirRef.current = 'down'
  }, [])
  const pressLeft = useCallback(() => {
    if (dirRef.current !== 'right') nextDirRef.current = 'left'
  }, [])
  const pressRight = useCallback(() => {
    if (dirRef.current !== 'left') nextDirRef.current = 'right'
  }, [])

  return (
    <div className="snake-game">
      <h2>🐍 贪吃蛇</h2>

      <div className="snake-scoreboard">
        <div className="snake-score-item">
          <span className="snake-score-label">得分</span>
          <span className="snake-score-value">{score}</span>
        </div>
        <div className="snake-score-item">
          <span className="snake-score-label">最高分</span>
          <span className="snake-score-value high">🏆 {highScore}</span>
        </div>
      </div>

      <div className="snake-canvas-wrapper">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="snake-canvas"
        />

        {gameState === 'idle' && (
          <div className="snake-overlay">
            <p className="snake-overlay-title">🐍 贪吃蛇</p>
            <p className="snake-overlay-hint">方向键 / WASD 控制方向</p>
            <button className="snake-btn start" onClick={startGame}>开始游戏</button>
          </div>
        )}

        {gameState === 'paused' && (
          <div className="snake-overlay">
            <p className="snake-overlay-title">⏸️ 已暂停</p>
            <button className="snake-btn resume" onClick={togglePause}>继续游戏</button>
          </div>
        )}

        {gameState === 'gameover' && (
          <div className="snake-overlay">
            <p className="snake-overlay-title">💀 游戏结束</p>
            <p className="snake-overlay-score">得分：{score}</p>
            {score >= highScore && score > 0 && (
              <p className="snake-overlay-new">🎉 新纪录！</p>
            )}
            <button className="snake-btn restart" onClick={startGame}>再来一局</button>
          </div>
        )}
      </div>

      <div className="snake-controls">
        {gameState === 'playing' && (
          <button className="snake-btn pause" onClick={togglePause}>暂停</button>
        )}
        {(gameState === 'paused' || gameState === 'gameover') && (
          <button className="snake-btn restart" onClick={startGame}>
            {gameState === 'gameover' ? '重新开始' : '开始'}
          </button>
        )}
      </div>

      {/* 移动端虚拟方向键 */}
      <div className="snake-dpad">
        <div className="dpad-row">
          <button className="dpad-btn" onClick={pressUp}>▲</button>
        </div>
        <div className="dpad-row">
          <button className="dpad-btn" onClick={pressLeft}>◀</button>
          <button className="dpad-btn" onClick={togglePause}>
            {gameState === 'playing' ? '⏸' : '▶'}
          </button>
          <button className="dpad-btn" onClick={pressRight}>▶</button>
        </div>
        <div className="dpad-row">
          <button className="dpad-btn" onClick={pressDown}>▼</button>
        </div>
      </div>
    </div>
  )
}
