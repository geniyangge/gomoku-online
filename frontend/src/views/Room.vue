<template>
  <div class="room-container">
    <div class="room-layout">
      <!-- 左侧：玩家信息 -->
      <div class="players-panel">
        <div class="player-card" :class="{ active: currentRoom?.currentPlayer === 0 }">
          <svg class="player-avatar" viewBox="0 0 60 60">
            <circle cx="30" cy="30" r="26" fill="url(#room-black-gradient)" />
            <defs>
              <radialGradient id="room-black-gradient" cx="30%" cy="30%">
                <stop offset="0%" stop-color="#666" />
                <stop offset="100%" stop-color="#000" />
              </radialGradient>
            </defs>
          </svg>
          <div class="player-info">
            <div class="player-name">
              {{ getPlayerName(0) }}
              <span v-if="isCurrentPlayer(0)" class="tag">你</span>
            </div>
            <div class="player-status">
              <template v-if="currentRoom?.players[0]">
                {{
                  currentRoom?.status === 'playing' && currentRoom?.currentPlayer === 0
                    ? '思考中...'
                    : '已准备'
                }}
              </template>
              <template v-else>等待加入</template>
            </div>
          </div>
        </div>

        <div class="vs-divider">
          <span v-if="currentRoom?.status === 'playing'" class="turn-indicator">
            {{ currentRoom?.currentPlayer === 0 ? '黑子回合' : '白子回合' }}
          </span>
          <span v-else-if="currentRoom?.status === 'finished'" class="game-over"> 游戏结束 </span>
          <span v-else>VS</span>
        </div>

        <div class="player-card" :class="{ active: currentRoom?.currentPlayer === 1 }">
          <svg class="player-avatar white" viewBox="0 0 60 60">
            <circle
              cx="30"
              cy="30"
              r="26"
              fill="url(#room-white-gradient)"
              stroke="#bbb"
              stroke-width="2"
            />
            <defs>
              <radialGradient id="room-white-gradient" cx="30%" cy="30%">
                <stop offset="0%" stop-color="#fff" />
                <stop offset="100%" stop-color="#ddd" />
              </radialGradient>
            </defs>
          </svg>
          <div class="player-info">
            <div class="player-name">
              {{ getPlayerName(1) }}
              <span v-if="isCurrentPlayer(1)" class="tag">你</span>
            </div>
            <div class="player-status">
              <template v-if="currentRoom?.players[1]">
                {{
                  currentRoom?.status === 'playing' && currentRoom?.currentPlayer === 1
                    ? '思考中...'
                    : '已准备'
                }}
              </template>
              <template v-else>等待加入</template>
            </div>
          </div>
        </div>
      </div>

      <!-- 中间：棋盘 -->
      <div class="game-panel">
        <div class="board-container">
          <canvas
            ref="boardCanvas"
            :width="boardSize"
            :height="boardSize"
            @click="handleBoardClick"
            class="game-board"
          ></canvas>

          <!-- 结算弹窗 -->
          <div v-if="settlementData" class="settlement-overlay">
            <div class="settlement-modal">
              <h2>{{ settlementData.winner ? '游戏结束' : '和局' }}</h2>
              <p v-if="settlementData.winner" class="winner">
                {{ getPlayerNameById(settlementData.winner) }} 获胜！
              </p>
              <p v-else class="draw">双方和局</p>
              <p class="countdown">{{ settlementCountdown }} 秒后重新开始</p>
            </div>
          </div>
        </div>

        <!-- 游戏控制按钮 -->
        <div class="game-controls">
          <button v-if="canStartGame" class="btn btn-primary" @click="startGame">开始游戏</button>
          <button v-if="canRequestDraw" class="btn btn-warning" @click="requestDraw">
            请求和局 ({{ remainingDrawCount }})
          </button>
          <button v-if="canSurrender" class="btn btn-danger" @click="surrender">投降</button>
          <button v-if="isSpectator && hasEmptySeat" class="btn btn-secondary" @click="sitDown">
            加入游戏
          </button>
          <button
            v-if="isPlayer && currentRoom?.status === 'idle'"
            class="btn btn-secondary"
            @click="standUp"
          >
            离开座位
          </button>
          <button class="btn btn-secondary" @click="leaveRoom">返回大厅</button>
        </div>
      </div>

      <!-- 右侧：聊天 -->
      <div class="chat-panel">
        <div class="chat-tabs">
          <div class="chat-tab active">房间聊天</div>
        </div>
        <div class="chat-messages" ref="chatContainer">
          <div v-for="msg in socketService.roomMessages.value" :key="msg.id" class="chat-message">
            <span class="chat-nickname">{{ msg.nickname }}:</span>
            <span class="chat-content">{{ msg.content }}</span>
            <span class="chat-time">{{ formatTime(msg.timestamp) }}</span>
          </div>
        </div>
        <div class="chat-input">
          <input
            v-model="chatMessage"
            type="text"
            placeholder="输入消息..."
            class="input"
            @keyup.enter="sendChat"
          />
          <button class="btn btn-primary" @click="sendChat">发送</button>
        </div>
      </div>
    </div>

    <!-- 和局请求弹窗 -->
    <div v-if="drawRequest" class="modal-overlay">
      <div class="modal">
        <h3>和局请求</h3>
        <p>{{ drawRequest.playerNickname }} 请求和局</p>
        <p class="draw-count">你和局请求剩余次数: {{ remainingDrawCount }}</p>
        <div class="modal-actions">
          <button class="btn btn-danger" @click="rejectDraw">拒绝</button>
          <button class="btn btn-primary" @click="acceptDraw">同意</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { socketService } from '../services/socket'

const route = useRoute()
const router = useRouter()
const boardCanvas = ref<HTMLCanvasElement>()
const chatContainer = ref<HTMLDivElement>()
const chatMessage = ref('')

const BOARD_SIZE = 15
const getBoardDimensions = () => {
  const width = window.innerWidth
  if (width <= 480) {
    return { cellSize: 20, padding: 12 }
  } else if (width <= 768) {
    return { cellSize: 28, padding: 16 }
  } else {
    return { cellSize: 40, padding: 20 }
  }
}

const boardDimensions = ref(getBoardDimensions())
const CELL_SIZE = computed(() => boardDimensions.value.cellSize)
const PADDING = computed(() => boardDimensions.value.padding)
const boardSize = computed(() => (BOARD_SIZE - 1) * CELL_SIZE.value + PADDING.value * 2)

const updateBoardSize = () => {
  boardDimensions.value = getBoardDimensions()
  drawBoard()
}

onMounted(() => {
  window.addEventListener('resize', updateBoardSize)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateBoardSize)
})

const currentRoom = computed(() => socketService.currentRoom.value)
const playerIndex = computed(() => socketService.playerIndex.value)
const settlementData = computed(() => socketService.settlementData.value)
const drawRequest = computed(() => socketService.drawRequest.value)

const isPlayer = computed(() => playerIndex.value !== null)
const isSpectator = computed(() => playerIndex.value === null)
const hasEmptySeat = computed(() => {
  return currentRoom.value?.players[0] === null || currentRoom.value?.players[1] === null
})
const canStartGame = computed(() => {
  return (
    isPlayer.value &&
    currentRoom.value?.status === 'idle' &&
    currentRoom.value?.players[0] &&
    currentRoom.value?.players[1]
  )
})
const canRequestDraw = computed(() => {
  return (
    isPlayer.value &&
    currentRoom.value?.status === 'playing' &&
    currentRoom.value?.currentPlayer === playerIndex.value
  )
})
const canSurrender = computed(() => {
  return isPlayer.value && currentRoom.value?.status === 'playing'
})
const remainingDrawCount = computed(() => {
  if (!currentRoom.value || !socketService.player.value) return 3
  const count = currentRoom.value.drawCount[socketService.player.value.id] || 0
  return Math.max(0, 3 - count)
})
const settlementCountdown = ref(10)

onMounted(() => {
  // 如果没有当前房间，尝试加入
  if (!currentRoom.value) {
    const roomId = route.params.id as string
    socketService.joinRoom(roomId)
  }

  drawBoard()

  // 监听棋盘变化
  watch(
    () => currentRoom.value?.board,
    () => {
      drawBoard()
    },
    { deep: true }
  )

  // 结算倒计时
  const countdownInterval = setInterval(() => {
    if (settlementData.value) {
      const endTime = Date.now() + settlementData.value.countdown * 1000
      const remaining = Math.ceil((endTime - Date.now()) / 1000)
      settlementCountdown.value = Math.max(0, remaining)
    }
  }, 1000)

  onUnmounted(() => {
    clearInterval(countdownInterval)
  })
})

onUnmounted(() => {
  socketService.leaveRoom()
})

const drawBoard = () => {
  const canvas = boardCanvas.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const cellSize = CELL_SIZE.value
  const padding = PADDING.value
  const size = boardSize.value
  const pieceRadius = cellSize * 0.4

  // 清空画布
  ctx.fillStyle = '#eecfa1'
  ctx.fillRect(0, 0, size, size)

  // 绘制网格
  ctx.strokeStyle = '#666'
  ctx.lineWidth = 1

  for (let i = 0; i < BOARD_SIZE; i++) {
    // 横线
    ctx.beginPath()
    ctx.moveTo(padding, padding + i * cellSize)
    ctx.lineTo(size - padding, padding + i * cellSize)
    ctx.stroke()

    // 竖线
    ctx.beginPath()
    ctx.moveTo(padding + i * cellSize, padding)
    ctx.lineTo(padding + i * cellSize, size - padding)
    ctx.stroke()
  }

  // 绘制星位
  const stars = [
    [3, 3],
    [3, 11],
    [7, 7],
    [11, 3],
    [11, 11],
  ]
  ctx.fillStyle = '#666'
  const starRadius = Math.max(2, cellSize * 0.1)
  stars.forEach(([x, y]) => {
    ctx.beginPath()
    ctx.arc(padding + x * cellSize, padding + y * cellSize, starRadius, 0, Math.PI * 2)
    ctx.fill()
  })

  // 绘制棋子
  if (currentRoom.value?.board) {
    currentRoom.value.board.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell !== -1) {
          const centerX = padding + x * cellSize
          const centerY = padding + y * cellSize

          // 棋子阴影
          ctx.beginPath()
          ctx.arc(centerX + 2, centerY + 2, pieceRadius, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
          ctx.fill()

          // 棋子
          ctx.beginPath()
          ctx.arc(centerX, centerY, pieceRadius, 0, Math.PI * 2)
          const gradient = ctx.createRadialGradient(
            centerX - pieceRadius * 0.3,
            centerY - pieceRadius * 0.3,
            0,
            centerX,
            centerY,
            pieceRadius
          )

          if (cell === 0) {
            gradient.addColorStop(0, '#666')
            gradient.addColorStop(1, '#000')
          } else {
            gradient.addColorStop(0, '#fff')
            gradient.addColorStop(1, '#ddd')
          }

          ctx.fillStyle = gradient
          ctx.fill()

          if (cell === 1) {
            ctx.strokeStyle = '#999'
            ctx.lineWidth = 1
            ctx.stroke()
          }
        }
      })
    })
  }

  // 高亮最后一步
  // 这里可以添加最后一步的高亮显示
}

const handleBoardClick = (e: MouseEvent) => {
  console.log('Board clicked!')
  console.log('isPlayer:', isPlayer.value)
  console.log('room status:', currentRoom.value?.status)
  console.log('currentPlayer:', currentRoom.value?.currentPlayer)
  console.log('playerIndex:', playerIndex.value)

  if (!isPlayer.value) {
    console.log('Cannot move: not a player')
    return
  }
  if (currentRoom.value?.status !== 'playing') {
    console.log('Cannot move: game not playing')
    return
  }
  if (currentRoom.value?.currentPlayer !== playerIndex.value) {
    console.log('Cannot move: not your turn')
    return
  }

  const canvas = boardCanvas.value
  if (!canvas) {
    console.log('Cannot move: no canvas')
    return
  }

  const rect = canvas.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top

  const cellSize = CELL_SIZE.value
  const padding = PADDING.value
  const boardX = Math.round((x - padding) / cellSize)
  const boardY = Math.round((y - padding) / cellSize)

  console.log('Attempting to place at:', boardX, boardY)

  if (boardX >= 0 && boardX < BOARD_SIZE && boardY >= 0 && boardY < BOARD_SIZE) {
    socketService.makeMove(boardX, boardY)
  }
}

const getPlayerName = (index: number) => {
  const playerId = currentRoom.value?.players[index]
  if (!playerId) return '等待加入'
  if (playerId === socketService.player.value?.id) return socketService.player.value?.nickname
  return '玩家' + playerId.slice(0, 4)
}

const getPlayerNameById = (playerId: string) => {
  if (playerId === socketService.player.value?.id) return socketService.player.value?.nickname
  return '玩家' + playerId.slice(0, 4)
}

const isCurrentPlayer = (index: number) => {
  return playerIndex.value === index
}

const startGame = () => {
  socketService.startGame()
}

const requestDraw = () => {
  if (remainingDrawCount.value > 0) {
    socketService.requestDraw()
  }
}

const acceptDraw = () => {
  socketService.acceptDraw()
}

const rejectDraw = () => {
  socketService.rejectDraw()
}

const surrender = () => {
  if (confirm('确定要投降吗？')) {
    socketService.surrender()
  }
}

const sitDown = () => {
  if (currentRoom.value?.players[0] === null) {
    socketService.sitDown(0)
  } else if (currentRoom.value?.players[1] === null) {
    socketService.sitDown(1)
  }
}

const standUp = () => {
  socketService.standUp()
}

const leaveRoom = () => {
  router.push('/')
}

const sendChat = () => {
  if (!chatMessage.value.trim()) return
  socketService.sendRoomChat(chatMessage.value.trim())
  chatMessage.value = ''

  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  })
}

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp)
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}
</script>

<style scoped>
.room-container {
  min-height: calc(100vh - 200px);
}

.room-layout {
  display: grid;
  grid-template-columns: 250px 1fr 300px;
  gap: 2rem;
  align-items: start;
}

.players-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.player-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  padding: 1.5rem;
  text-align: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 2px solid transparent;
}

.player-card.active {
  box-shadow: 0 0 30px rgba(76, 175, 80, 0.4);
  border: 2px solid #4caf50;
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.1), rgba(255, 255, 255, 0.95));
}

.player-avatar {
  width: 70px;
  height: 70px;
  margin: 0 auto 1rem;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
}

.player-name {
  font-weight: 700;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: #1a1a2e;
}

.tag {
  background: linear-gradient(135deg, #4caf50, #45a049);
  color: white;
  padding: 0.2rem 0.5rem;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 600;
}

.player-status {
  font-size: 0.85rem;
  color: #666;
}

.vs-divider {
  text-align: center;
  padding: 0.75rem;
  font-size: 1.2rem;
  font-weight: bold;
  color: white;
}

.turn-indicator {
  background: linear-gradient(135deg, #4caf50, #45a049);
  padding: 0.5rem 1.25rem;
  border-radius: 25px;
  font-size: 0.9rem;
  box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
}

.game-over {
  background: linear-gradient(135deg, #f44336, #d32f2f);
  padding: 0.5rem 1.25rem;
  border-radius: 25px;
  font-size: 0.9rem;
  box-shadow: 0 4px 15px rgba(244, 67, 54, 0.3);
}

.game-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

.board-container {
  position: relative;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  padding: 1.5rem;
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.game-board {
  display: block;
  cursor: pointer;
  border-radius: 8px;
}

.settlement-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 20px;
}

.settlement-modal {
  background: white;
  padding: 3rem;
  border-radius: 24px;
  text-align: center;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
}

.settlement-modal h2 {
  margin-bottom: 1rem;
  font-size: 2rem;
  color: #1a1a2e;
}

.winner {
  font-size: 1.5rem;
  color: #4caf50;
  margin-bottom: 1rem;
  font-weight: 700;
}

.draw {
  font-size: 1.5rem;
  color: #ff9800;
  margin-bottom: 1rem;
  font-weight: 700;
}

.countdown {
  color: #666;
  font-size: 1.1rem;
}

.game-controls {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
}

.chat-panel {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  height: 600px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.chat-tabs {
  display: flex;
  border-bottom: 2px solid #f0f0f0;
}

.chat-tab {
  padding: 1rem 1.5rem;
  cursor: pointer;
  border-bottom: 3px solid transparent;
  font-weight: 600;
  color: #666;
  transition: all 0.2s;
}

.chat-tab.active {
  color: #4caf50;
  border-bottom-color: #4caf50;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.chat-message {
  display: flex;
  gap: 0.5rem;
  align-items: baseline;
  flex-wrap: wrap;
}

.chat-nickname {
  font-weight: 700;
  color: #4caf50;
  font-size: 0.9rem;
}

.chat-content {
  flex: 1;
  word-break: break-all;
  line-height: 1.4;
  color: #333;
}

.chat-time {
  font-size: 0.75rem;
  color: #999;
}

.chat-input {
  padding: 1rem;
  display: flex;
  gap: 0.75rem;
  border-top: 2px solid #f0f0f0;
  align-items: stretch;
}

.chat-input .input {
  flex: 1;
  min-width: 0;
  background: white;
  border: 2px solid #e0e0e0;
  color: #333;
}

.chat-input .btn {
  flex-shrink: 0;
}

.chat-input .input::placeholder {
  color: #999;
}

.chat-input .input:focus {
  border-color: #4caf50;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  padding: 2rem;
  border-radius: 24px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
}

.modal h3 {
  margin-bottom: 0.5rem;
  color: #1a1a2e;
  font-weight: 700;
}

.draw-count {
  color: #666;
  font-size: 0.9rem;
  margin: 1rem 0;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
}

@media (max-width: 1200px) {
  .room-layout {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .players-panel {
    flex-direction: row;
    justify-content: center;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .player-card {
    padding: 1rem;
    flex: 1;
    min-width: 140px;
    max-width: 200px;
  }

  .player-avatar {
    width: 50px;
    height: 50px;
  }

  .vs-divider {
    display: none;
  }

  .chat-panel {
    height: 250px;
  }
}

@media (max-width: 768px) {
  .room-layout {
    gap: 0.75rem;
  }

  .players-panel {
    order: -1;
  }

  .player-card {
    min-width: 120px;
    padding: 0.75rem;
  }

  .player-avatar {
    width: 40px;
    height: 40px;
    margin-bottom: 0.5rem;
  }

  .player-name {
    font-size: 0.9rem;
  }

  .player-status {
    font-size: 0.75rem;
  }

  .tag {
    font-size: 0.65rem;
    padding: 0.1rem 0.3rem;
  }

  .board-container {
    padding: 0.75rem;
    border-radius: 12px;
  }

  .game-controls {
    gap: 0.5rem;
  }

  .game-controls .btn {
    padding: 0.6rem 1rem;
    font-size: 0.85rem;
  }

  .chat-panel {
    height: 200px;
    border-radius: 12px;
  }

  .chat-tab {
    padding: 0.75rem 1rem;
    font-size: 0.9rem;
  }

  .settlement-modal {
    padding: 1.5rem;
  }

  .settlement-modal h2 {
    font-size: 1.5rem;
  }

  .winner,
  .draw {
    font-size: 1.2rem;
  }
}

@media (max-width: 480px) {
  .room-container {
    min-height: auto;
  }

  .players-panel {
    justify-content: space-around;
  }

  .player-card {
    min-width: 100px;
    padding: 0.5rem;
  }

  .player-avatar {
    width: 36px;
    height: 36px;
  }

  .player-name {
    font-size: 0.8rem;
  }

  .player-status {
    font-size: 0.7rem;
  }

  .turn-indicator,
  .game-over {
    font-size: 0.75rem;
    padding: 0.4rem 0.75rem;
  }

  .board-container {
    padding: 0.5rem;
    overflow-x: auto;
  }

  .game-board {
    max-width: 100%;
    height: auto;
  }

  .game-controls {
    gap: 0.4rem;
  }

  .game-controls .btn {
    padding: 0.5rem 0.75rem;
    font-size: 0.8rem;
    border-radius: 8px;
  }

  .chat-panel {
    height: 180px;
    border-radius: 12px;
  }

  .chat-messages {
    padding: 0.5rem;
    gap: 0.5rem;
  }

  .chat-tab {
    padding: 0.5rem 0.75rem;
    font-size: 0.85rem;
  }

  .chat-input {
    padding: 0.5rem;
  }

  .modal {
    padding: 1.25rem;
    margin: 1rem;
  }

  .modal h3 {
    font-size: 1.1rem;
  }

  .modal-actions {
    flex-direction: column;
  }

  .modal-actions .btn {
    width: 100%;
  }
}
</style>
