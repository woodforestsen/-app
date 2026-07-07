import { useRef, useEffect, useState, useCallback } from 'react'

// 游戏配置
const COLS = 20
const ROWS = 20
const CELL = 20 // 每格像素
const CANVAS_W = COLS * CELL
const CANVAS_H = ROWS * CELL
const BASE_SPEED = 150 // 毫秒/帧，越小越快

type Point = { x: number; y: number }
type Direction = 'up' | 'down' | 'left' | 'right'
type GameState = 'idle' | 'playing' | 'paused' | 'gameover'

const DIR: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 }
}

function randomFood(snake: Point[]): Point {
  const occupied = new Set(snake.map((p) => `${p.x},${p.y}`))
  let p: Point
  do {
    p = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) }
  } while (occupied.has(`${p.x},${p.y}`))
  return p
}

export default function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [gameState, setGameState] = useState<GameState>('idle')
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('snake_high_score')
    return saved ? parseInt(saved, 10) : 0
  })

  // 用 ref 存储可变状态，避免闭包陷阱
  const snakeRef = useRef<Point[]>([])
  const foodRef = useRef<Point>({ x: 10, y: 10 })
  const dirRef = useRef<Direction>('right')
  const nextDirRef = useRef<Direction>('right')
  const timerRef = useRef<number | null>(null)
  const scoreRef = useRef(0)
  const speedRef = useRef(BASE_SPEED)

  // 绘制
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 背景
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

    // 网格线
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

    // 食物
    const f = foodRef.current
    ctx.fillStyle = '#ef4444'
    ctx.shadowColor = '#ef4444'
    ctx.shadowBlur = 8
    ctx.beginPath()
    ctx.arc(f.x * CELL + CELL / 2, f.y * CELL + CELL / 2, CELL / 2 - 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0

    // 蛇
    const snake = snakeRef.current
    snake.forEach((p, i) => {
      const ratio = 1 - i / (snake.length + 10) // 越靠近头越亮
      const r = Math.floor(74 + (100 - 74) * ratio)
      const g = Math.floor(222 + (200 - 222) * ratio)
      const b = Math.floor(128 + (60 - 128) * ratio)
      ctx.fillStyle = `rgb(${r},${g},${b})`
      ctx.fillRect(p.x * CELL + 1, p.y * CELL + 1, CELL - 2, CELL - 2)

      // 头部加眼睛
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

  // 游戏循环
  const tick = useCallback(() => {
    dirRef.current = nextDirRef.current
    const snake = snakeRef.current
    const head = snake[0]
    const dir = dirRef.current
    const newHead: Point = { x: head.x + DIR[dir].x, y: head.y + DIR[dir].y }

    // 撞墙
    if (newHead.x < 0 || newHead.x >= COLS || newHead.y < 0 || newHead.y >= ROWS) {
      endGame()
      return
    }
    // 撞自己
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
      // 加速
      speedRef.current = Math.max(60, BASE_SPEED - Math.floor(s / 50) * 10)
    }

    snakeRef.current = newSnake
    draw()
    scheduleNext()
  }, [draw])

  function scheduleNext() {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(tick, speedRef.current)
  }

  function endGame() {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
    setGameState('gameover')
    const s = scoreRef.current
    if (s > highScore) {
      setHighScore(s)
      localStorage.setItem('snake_high_score', String(s))
    }
  }

  // 开始游戏
  function startGame() {
    const initialSnake: Point[] = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 }
    ]
    snakeRef.current = initialSnake
    dirRef.current = 'right'
    nextDirRef.current = 'right'
    scoreRef.current = 0
    speedRef.current = BASE_SPEED
    foodRef.current = randomFood(initialSnake)
    setScore(0)
    setGameState('playing')
    draw()

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(tick, speedRef.current)
  }

  // 暂停/继续
  function togglePause() {
    if (gameState === 'playing') {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = null
      setGameState('paused')
    } else if (gameState === 'paused') {
      setGameState('playing')
      timerRef.current = window.setTimeout(tick, speedRef.current)
    }
  }

  // 键盘监听
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const keyMap: Record<string, Direction> = {
        ArrowUp: 'up',
        ArrowDown: 'down',
        ArrowLeft: 'left',
        ArrowRight: 'right',
        w: 'up',
        W: 'up',
        s: 'down',
        S: 'down',
        a: 'left',
        A: 'left',
        d: 'right',
        D: 'right'
      }
      const newDir = keyMap[e.key]
      if (!newDir) return

      e.preventDefault()

      // 不允许反向
      const current = dirRef.current
      const opposites: Record<Direction, Direction> = {
        up: 'down',
        down: 'up',
        left: 'right',
        right: 'left'
      }
      if (newDir !== opposites[current]) {
        nextDirRef.current = newDir
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  // 清理
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  // 游戏结束后重绘（展示最终状态）
  useEffect(() => {
    if (gameState === 'gameover') draw()
  }, [gameState, draw])

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

        {/* 覆盖层 */}
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
        {gameState !== 'idle' && gameState !== 'playing' && (
          <button className="snake-btn restart" onClick={startGame}>
            {gameState === 'gameover' ? '重新开始' : '开始'}
          </button>
        )}
      </div>

      {/* 移动端虚拟方向键 */}
      <div className="snake-dpad">
        <div className="dpad-row">
          <button className="dpad-btn" onMouseDown={() => {}} onClick={() => {
            const current = dirRef.current
            if (current !== 'down') nextDirRef.current = 'up'
          }}>▲</button>
        </div>
        <div className="dpad-row">
          <button className="dpad-btn" onClick={() => {
            const current = dirRef.current
            if (current !== 'right') nextDirRef.current = 'left'
          }}>◀</button>
          <button className="dpad-btn" onClick={togglePause}>
            {gameState === 'playing' ? '⏸' : '▶'}
          </button>
          <button className="dpad-btn" onClick={() => {
            const current = dirRef.current
            if (current !== 'left') nextDirRef.current = 'right'
          }}>▶</button>
        </div>
        <div className="dpad-row">
          <button className="dpad-btn" onClick={() => {
            const current = dirRef.current
            if (current !== 'up') nextDirRef.current = 'down'
          }}>▼</button>
        </div>
      </div>
    </div>
  )
}
