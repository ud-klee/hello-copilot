const SVG_NS = 'http://www.w3.org/2000/svg'
const SZ = 24
const GRID = { w: 10, h: 20 }

// .... .x..
// xxxx .x..
// .... .x..
// .... .x..
const BlockI = {
  id: 0,
  d: { w: 4, h: 4 },
  bm: [[0, 15, 0, 0],[4, 4, 4, 4]],
}
// xx
// xx
const BlockO = {
  id: 1,
  d: { w: 2, h: 2 },
  bm: [[3, 3]],
}
// .x. .x. ... .x.
// xxx .xx xxx xx.
// ... .x. .x. .x.
const BlockT = {
  id: 2,
  d: { w: 3, h: 3 },
  bm: [[2, 7, 0],[2, 3, 2],[0, 7, 2],[2, 6, 2]],
}
// .xx .x.
// xx. .xx
// ... ..x
const BlockZ1 = {
  id: 3,
  d: { w: 3, h: 3 },
  bm: [[3, 6, 0],[2, 3, 1]],
}
// xx. ..x
// .xx .xx
// ... .x.
const BlockZ2 = {
  id: 4,
  d: { w: 3, h: 3 },
  bm: [[6, 3, 0],[1, 3, 2]],
}
// x.. .xx ... .x.
// xxx .x. xxx .x.
// ... .x. ..x xx.
const BlockL1 = {
  id: 5,
  d: { w: 3, h: 3 },
  bm: [[4, 7, 0],[3, 2, 2],[0, 7, 1],[2, 2, 6]],
}
// ..x .x. ... xx.
// xxx .x. xxx .x.
// ... .xx x.. .x.
const BlockL2 = {
  id: 6,
  d: { w: 3, h: 3 },
  bm: [[1, 7, 0],[2, 2, 3],[0, 7, 4],[6, 2, 2]],
}

const BlockTypes = [ BlockI, BlockO, BlockT, BlockZ1, BlockZ2, BlockL1, BlockL2 ]

const $ = (path, parent = document) => parent.querySelector(path)
const $$ = (path, parent = document) => parent.querySelectorAll(path)

function randInt(x, y) {
  return Math.floor(Math.random() * (y - x + 1)) + x
}

function randBlock() {
  return BlockTypes[randInt(0, BlockTypes.length - 1)]
}

function newMap() {
  return [...new Uint16Array(GRID.h).map(() => 0xf801), 0xffff]
}

function renderBlock(x, y, block, rot, canvas) {
  const el = document.createElementNS(SVG_NS, 'g')
  el.setAttributeNS(null, 'class', `block block-${block.id}`)
  for (let r = 0; r < block.d.h; r++) {
    for (let c = block.d.w - 1, m = 1; c >= 0; c--, m <<= 1) {
      if ((block.bm[rot][r] & m) > 0) {
        const cell = Rect((x+c) * SZ, (y+r) * SZ, SZ, SZ, `cell`)
        el.appendChild(cell)
      }
    }
  }
  canvas.appendChild(el)
  return el
}

function Rect(x, y, w, h, className) {
  const el = document.createElementNS(SVG_NS, 'path')
  el.setAttributeNS(null, 'd', `M ${x} ${y} h ${w} v ${h} h ${-w} Z`)
  el.setAttributeNS(null, 'class', className)
  return el
}

function Circle(x, y, r, className) {
  const el = document.createElementNS(SVG_NS, 'circle')
  el.setAttributeNS(null, 'cx', x)
  el.setAttributeNS(null, 'cy', y)
  el.setAttributeNS(null, 'r', r)
  el.setAttributeNS(null, 'class', className)
  return el
}

function main() {

  $('#start').addEventListener('click', () => {
    $('#start').disabled = true
    $('#themeMusic').play()
    start()
  })
}

function start() {
  const canvasMain = $('#canvasMain')
  const canvasNext = $('#canvasNext')
  const game = new Game()
  const view = new GameView(game, canvasMain, canvasNext)
  let paused = false

  function pauseResume() {
    if (paused) {
      canvasMain.classList.remove('paused')
      game.resume()
      $('#themeMusic').play()
    } else {
      canvasMain.classList.add('paused')
      game.pause()
      $('#themeMusic').pause()
    }
    paused = !paused
  }

  // register key events for left, right, down, and space
  document.addEventListener('keydown', e => {
    switch (e.key) {
      case 'Enter': pauseResume(); break
      case 'ArrowLeft': game.moveLeft(); break
      case 'ArrowRight': game.moveRight(); break
      case 'ArrowDown': game.moveDown(); break
      case 'ArrowUp': game.rotate(); break
      case ' ': game.drop(); break
    }
  })

  // register touch events for mobile
  const tm = new TouchManager(canvasMain)
  let blockMover = 0
  let moveSpeed = 0
  let panDir = 0
  let panDist = 0
  let panFrames = 0
  tm.on('tap', ({ clientX: x, clientY: y }) => {
    const rect = canvasMain.getBoundingClientRect()
    x -= rect.x
    y -= rect.y

    // feedback animation
    view.animateTouch(x, y)

    if (y >= (GRID.h - 2) * SZ) {
      game.drop()
    } else {
      game.rotate()      
    }
  })
  tm.on('panstart', ({ angle, distance }) => {
    panDir = angle
    panDist = distance
    panFrames = 0
    clearInterval(blockMover)
    blockMover = setInterval(() => {
      moveSpeed = Math.min(panDist, 90) / -10 + 10 // frames per move
      if (panFrames >= moveSpeed) {
        panFrames = 0
        if (panDir >= 135 && panDir < 225) {
          game.moveLeft()
        } else if (panDir < 45 || panDir >= 315) {
          game.moveRight()
        } else if (panDir >= 45 && panDir < 135) {
          game.moveDown()
        }
      }
      panFrames++;
    }, 33)
  })
  tm.on('panend', () => {
    clearInterval(blockMover)
    view.cancelAnimatePan()
  })
  tm.on('pan', ({ angle, distance, originX, originY, clientX, clientY }) => {
    panDir = angle
    panDist = distance
    const { x, y } = canvasMain.getBoundingClientRect()
    view.animatePan(originX - x, originY - y, clientX - x, clientY - y)
  })

  $('#pause').addEventListener('click', pauseResume)

  game.start()
}

class EventEmitter {
  constructor() {
    this.events = {}
  }

  on(name, fn) {
    if (!this.events[name]) {
      this.events[name] = []
    }
    this.events[name].push(fn)
  }

  emit(name, ...args) {
    if (this.events[name]) {
      this.events[name].forEach(fn => fn(...args))
    }
  }

  off(name, fn) {
    if (this.events[name]) {
      this.events[name] = this.events[name].filter(f => f !== fn)
    }
  }

  once(name, fn) {
    const onceFn = (...args) => {
      fn(...args)
      this.off(name, onceFn)
    }
    this.on(name, onceFn)
  }
}

class Game extends EventEmitter {
  constructor() {
    super()
    this.reset()
  }

  reset() {
    this.paused = false
    this.block = null
    this.nextBlock = null
    this.blockRot = 0
    this.blockX = 0
    this.blockY = 0
    this.gridMap = newMap()
    this.layerMap = BlockTypes.map(() => newMap())
    clearInterval(this.timer)
  }

  pause() {
    clearInterval(this.timer)
    this.paused = true
  }

  resume() {
    this.timer = setInterval(() => this.moveDown(), 500)
    this.paused = false
  }

  start() {
    this._next()
    this.resume()
  }

  _next() {
    if (this.nextBlock) {
      this.block = this.nextBlock
    } else {
      this.block = randBlock()
    }
    this.nextBlock = randBlock()
    this.blockRot = 0
    this.blockX = Math.floor((GRID.w - this.block.d.w) / 2)
    this.blockY = 0
    this.emit('next')
  }

  _willCollide(dx, dy, rot) {
    const gridMap = this.gridMap.slice(dy + this.blockY, dy + this.blockY + this.block.d.h)
    const blockMap = this._blockMap(dx, rot)
    // test if the block can move
    if (blockMap.some((n, i) => (n & gridMap[i]) > 0)) {
      // console.log('will collide!', blockMap, gridMap)
      return true
    }
    return false
  }

  _blockMap(dx, rot) {
    return this.block.bm[rot].map(n => (n << (2 + GRID.w - this.block.d.w - this.blockX)) >> (dx + 1))
  }

  moveLeft() {
    if (this.paused) return
    if (this._willCollide(-1, 0, this.blockRot)) return
    this.blockX--
    this.emit('move')
  }

  moveRight() {
    if (this.paused) return
    if (this._willCollide(1, 0, this.blockRot)) return
    this.blockX++
    this.emit('move')
  }

  moveDown() {
    if (this.paused) return
    if (this._willCollide(0, 1, this.blockRot)) {
      // merge the block into the grid
      this._merge()
      // check if the game is over
      if (this.gridMap[0] !== 0xf801) {
        this.emit('over')
      } else {
        this._next()
      }
      return
    }
    this.blockY++
    this.emit('move')
  }

  _merge() {
    const blockMap = this._blockMap(0, this.blockRot)
    blockMap.forEach((n, i) => {
      this.gridMap[this.blockY + i] |= n
      this.layerMap[this.block.id][this.blockY + i] |= n
    })
    this.emit('merge')
    // check if any layer is full
    const clearY = this.gridMap.map((gm, y) => (y < GRID.h && gm === 0xffff) ? y : -1).filter(y => y >= 0)
    if (clearY.length > 0) {
      this.gridMap = clearY.map(() => 0xf801).concat(this.gridMap.filter((_, y) => !clearY.includes(y)))
      this.layerMap.forEach((lm, id) => {
        this.layerMap[id] = clearY.map(() => 0xf801).concat(lm.filter((_, y) => !clearY.includes(y)))
      })
      this.emit('clear', clearY)
    }
  }

  rotate() {
    if (this.paused) return
    const nextRot = (this.blockRot + 1) % this.block.bm.length
    if (this._willCollide(0, 0, nextRot)) return
    this.blockRot = nextRot
    this.emit('move')
  }

  drop() {
    if (this.paused) return
    while (!this._willCollide(0, 1, this.blockRot)) {
      this.blockY++
    }
    this.moveDown()
  }

  blockIdAt(x, y) {
    return this.layerMap.findIndex(bm => (bm[y] & (1 << (GRID.w - x))) > 0)
  }
}

class GameView {
  constructor(game, canvasMain, canvasNext) {
    this.game = game
    this.canvasMain = canvasMain
    this.canvasNext = canvasNext
    this.blockEl = null
    this.nextBlockEl = null

    this.game.on('next', () => {
      this.blockEl = renderBlock(this.game.blockX, this.game.blockY, this.game.block, this.game.blockRot, this._objectPlane)
      this.nextBlockEl = renderBlock(1 + (4 - this.game.nextBlock.d.w) / 2, 1 + (4 - this.game.nextBlock.d.h) / 2, this.game.nextBlock, 0, this.canvasNext)
    })
    this.game.on('move', () => {
      this.blockEl.remove()
      this.blockEl = renderBlock(this.game.blockX, this.game.blockY, this.game.block, this.game.blockRot, this._objectPlane)
    })
    this.game.on('merge', () => {
      this.blockEl.remove()
      this.nextBlockEl.remove()
      this.updateLayers(this.game.blockY, this.game.block.d.h)
    })
    this.game.on('clear', clearY => {
      // console.log('clear', clearY)
      this.game.pause()
      clearY.forEach(y => {
        $('.layer-' + y, this.canvasMain).classList.add('cleared')
      })
      setTimeout(() => {
        clearY.forEach(y => {
          $('.layer-' + y, this.canvasMain).classList.remove('cleared')
        })
        this.updateLayers(0, GRID.h)
        this.game.resume()
      }, 300)
    })
    this.game.on('over', () => {
      this.game.pause()
      $('#themeMusic').pause()
      $('#gameOverMusic').play()

      setTimeout(() => {
        alert('Game Over!')
        this.resetLayers()
        this.game.reset()
        this.game.start()
        $('#themeMusic').play()
      }, 1000)
    })

    canvasMain.setAttributeNS(null, 'width', GRID.w * SZ)
    canvasMain.setAttributeNS(null, 'height', GRID.h * SZ)
    canvasNext.setAttributeNS(null, 'width', 3 * SZ)
    canvasNext.setAttributeNS(null, 'height', 3 * SZ)
    canvasNext.setAttributeNS(null, 'viewBox', `0 0 ${6 * SZ} ${6 * SZ}`)

    const objectPlane = document.createElementNS(SVG_NS, 'g')
    objectPlane.classList.add('object-plane')
    canvasMain.appendChild(objectPlane)

    const effectPlane = document.createElementNS(SVG_NS, 'g')
    effectPlane.classList.add('effect-plane')
    canvasMain.appendChild(effectPlane)

    this.resetLayers()
  }
  get _objectPlane() {
    return $('.object-plane', this.canvasMain)
  }
  get _effectPlane() {
    return $('.effect-plane', this.canvasMain)
  }
  resetLayers() {
    $$('.layer', this.canvasMain).forEach(el => el.remove())
    for (let i = 0; i < GRID.h; i++) {
      const layer = document.createElementNS(SVG_NS, 'g')
      layer.classList.add(`layer-${i}`, 'layer')
      this._objectPlane.appendChild(layer)
    }
  }
  updateLayers(from, count) {
    for (let y = from; y < Math.min(GRID.h, from + count); y++) {
      const layer = $(`.layer-${y}`, this.canvasMain)
      layer.innerHTML = ''
      for (let x = 0; x < GRID.w; x++) {
        const blockId = this.game.blockIdAt(x, y)
        if (blockId !== -1) {
          const rect = Rect(x * SZ, y * SZ, SZ, SZ, `block-${blockId} cell`)
          layer.appendChild(rect)
        }
      }
    }
  }
  animateTouch(x, y) {
    const touchSpot = Circle(x, y, 12, 'touch-spot')
    this._effectPlane.appendChild(touchSpot)
    requestAnimationFrame(() => {
      touchSpot.classList.add('fading')
    })
    setTimeout(() => {
      touchSpot.remove()
    }, 1000)
  }
  animatePan(ox, oy, x, y) {
    this.cancelAnimatePan()
    const panOrigin = Circle(ox, oy, 6, 'pan pan-origin')
    this._effectPlane.appendChild(panOrigin)
    const panHandle = Circle(x, y, 12, 'pan pan-handle')
    this._effectPlane.appendChild(panHandle)
  }
  cancelAnimatePan() {
    $$('.pan', this._effectPlane).forEach(el => el.remove())
  }
}

class TouchManager extends EventEmitter {
  #target
  #handler
  #touches

  constructor(target) {
    super()
    this.#target = target
    this.#handler = this.handleTouch.bind(this)
    this.#touches = new Map()
    this.listen()
    target.classList.add('touchable')
  }
  listen() {
    this.#target.addEventListener('touchstart', this.#handler)
    this.#target.addEventListener('touchend', this.#handler)
    this.#target.addEventListener('touchmove', this.#handler)
    this.#target.addEventListener('touchcancel', this.#handler)
  }
  stopListen() {
    this.#target.removeEventListener('touchstart', this.#handler)
    this.#target.removeEventListener('touchend', this.#handler)
    this.#target.removeEventListener('touchmove', this.#handler)
    this.#target.removeEventListener('touchcancel', this.#handler)
  }
  handleTouch(event) {
    if (event.type === 'touchstart') {
      [...event.touches].forEach(t => this.registerTouch(t))
    }
    if (event.type === 'touchmove') {
      [...event.changedTouches].forEach(t => {
        const touch = this.updateTouch(t)

        if (touch) {
          if (touch.panStarted || Math.abs(touch.distanceX) >= 10 || Math.abs(touch.distanceY) >= 10) {
            if (!touch.panStarted) {
              this.emit('panstart', touch)
            } else {
              this.emit('pan', touch)
            }
            touch.panStarted = true
          }
        }
      })
    }
    if (event.type === 'touchend') {
      [...event.changedTouches].forEach(t => {
        const touch = this.updateTouch(t)

        if (touch) {
          if (Math.abs(touch.deltaX) < 10 && Math.abs(touch.deltaY) < 10 && touch.elapsedTime < 300 && !touch.panStarted) {
            this.emit('tap', touch)
          }

          if (touch.panStarted) {
            touch.panStarted = false
            this.emit('panend', touch)
          }
        }

        this.unregisterTouch(t)
      });
    }
    if (event.type === 'touchcancel') {
      [...event.changedTouches].forEach(t => {
        const touch = this.unregisterTouch(t)
        if (touch && touch.panStarted) {
          touch.panStarted = false
          this.emit('panend', touch)
        }
      })
    }
  }
  registerTouch({ identifier, clientX, clientY }) {
    if (this.#touches.has(identifier)) return

    // console.log(`+touch ${identifier}`)
    const now = Date.now()
    this.#touches.set(identifier, {
      originX: clientX,
      originY: clientY,
      clientX,
      clientY,
      time: now,
      startTime: now,
    })
  }
  unregisterTouch({ identifier }) {
    if (!this.#touches.has(identifier)) return

    const touch = this.#touches.get(identifier)
    // console.log(`-touch ${identifier}`)
    this.#touches.delete(identifier)
    return touch
  }
  updateTouch({ identifier, clientX, clientY }) {
    if (!this.#touches.has(identifier)) return

    const touch = this.#touches.get(identifier)
    const now = Date.now()
    touch.deltaTime = now - touch.time
    touch.elapsedTime = now - touch.startTime
    touch.time = now
    touch.distanceX = clientX - touch.originX
    touch.distanceY = clientY - touch.originY
    touch.deltaX = clientX - touch.clientX
    touch.deltaY = clientY - touch.clientY
    const [ radius, angle ] = cartesian2polar(touch.distanceX, touch.distanceY)
    touch.angle = angle
    touch.distance = radius
    touch.clientX = clientX
    touch.clientY = clientY
    return touch
  }
}

function cartesian2polar(x, y) {
  const rad = (a => isNaN(a) ? 0 : a)(Math.atan(y / x))
  const deg = rad * 180 / Math.PI + (x < 0 ? 180 : y < 0 ? 360 : 0)
  return [ Math.hypot(x, y), deg ]
}

// run when the page when dom is ready
document.addEventListener('DOMContentLoaded', main)
