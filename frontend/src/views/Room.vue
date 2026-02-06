<template>
  <div class="room-container">
    <div class="room-layout">
      <!-- 左侧：玩家信息 -->
      <div class="players-panel">
        <div class="player-card" :class="{ 'active': currentRoom?.currentPlayer === 0 }">
          <div class="player-avatar black">黑</div>
          <div class="player-info">
            <div class="player-name">
              {{ getPlayerName(0) }}
              <span v-if="isCurrentPlayer(0)" class="tag">你</span>
            </div>
            <div class="player-status">
              <template v-if="currentRoom?.players[0]">
                {{ currentRoom?.status === 'playing' && currentRoom?.currentPlayer === 0 ? '思考中...' : '已准备' }}
              </template>
              <template v-else>等待加入</template>
            </div>
          </div>
        </div>

        <div class="vs-divider">
          <span v-if="currentRoom?.status === 'playing'" class="turn-indicator">
            {{ currentRoom?.currentPlayer === 0 ? '黑子回合' : '白子回合' }}
          </span>
          <span v-else-if="currentRoom?.status === 'finished'" class="game-over">
            游戏结束
          </span>
          <span v-else>VS</span>
        </div>

        <div class="player-card" :class="{ 'active': currentRoom?.currentPlayer === 1 }">
          <div class="player-avatar white">白</div>
          <div class="player-info">
            <div class="player-name">
              {{ getPlayerName(1) }}
              <span v-if="isCurrentPlayer(1)" class="tag">你</span>
            </div>
            <div class="player-status">
              <template v-if="currentRoom?.players[1]">
                {{ currentRoom?.status === 'playing' && currentRoom?.currentPlayer === 1 ? '思考中...' : '已准备' }}
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
          <button 
            v-if="canStartGame" 
            class="btn btn-primary"
            @click="startGame"
          >
            开始游戏
          </button>
          <button 
            v-if="canRequestDraw" 
            class="btn btn-warning"
            @click="requestDraw"
          >
            请求和局 ({{ remainingDrawCount }})
          </button>
          <button 
            v-if="canSurrender" 
            class="btn btn-danger"
            @click="surrender"
          >
            投降
          </button>
          <button 
            v-if="isSpectator && hasEmptySeat" 
            class="btn btn-secondary"
            @click="sitDown"
          >
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
          <div 
            v-for="msg in socketService.roomMessages.value" 
            :key="msg.id"
            class="chat-message"
          >
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
const CELL_SIZE = 40
const PADDING = 20
const boardSize = (BOARD_SIZE - 1) * CELL_SIZE + PADDING * 2

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
  return isPlayer.value && 
         currentRoom.value?.status === 'idle' && 
         currentRoom.value?.players[0] && 
         currentRoom.value?.players[1]
})
const canRequestDraw = computed(() => {
  return isPlayer.value && 
         currentRoom.value?.status === 'playing' &&
         currentRoom.value?.currentPlayer === playerIndex.value
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
  watch(() => currentRoom.value?.board, () => {
    drawBoard()
  }, { deep: true })

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

  // 清空画布
  ctx.fillStyle = '#eecfa1'
  ctx.fillRect(0, 0, boardSize, boardSize)

  // 绘制网格
  ctx.strokeStyle = '#666'
  ctx.lineWidth = 1

  for (let i = 0; i < BOARD_SIZE; i++) {
    // 横线
    ctx.beginPath()
    ctx.moveTo(PADDING, PADDING + i * CELL_SIZE)
    ctx.lineTo(boardSize - PADDING, PADDING + i * CELL_SIZE)
    ctx.stroke()

    // 竖线
    ctx.beginPath()
    ctx.moveTo(PADDING + i * CELL_SIZE, PADDING)
    ctx.lineTo(PADDING + i * CELL_SIZE, boardSize - PADDING)
    ctx.stroke()
  }

  // 绘制星位
  const stars = [[3, 3], [3, 11], [7, 7], [11, 3], [11, 11]]
  ctx.fillStyle = '#666'
  stars.forEach(([x, y]) => {
    ctx.beginPath()
    ctx.arc(PADDING + x * CELL_SIZE, PADDING + y * CELL_SIZE, 4, 0, Math.PI * 2)
    ctx.fill()
  })

  // 绘制棋子
  if (currentRoom.value?.board) {
    currentRoom.value.board.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell !== -1) {
          const centerX = PADDING + x * CELL_SIZE
          const centerY = PADDING + y * CELL_SIZE
          
          // 棋子阴影
          ctx.beginPath()
          ctx.arc(centerX + 2, centerY + 2, 16, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
          ctx.fill()

          // 棋子
          ctx.beginPath()
          ctx.arc(centerX, centerY, 16, 0, Math.PI * 2)
          const gradient = ctx.createRadialGradient(
            centerX - 5, centerY - 5, 0,
            centerX, centerY, 16
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

  const boardX = Math.round((x - PADDING) / CELL_SIZE)
  const boardY = Math.round((y - PADDING) / CELL_SIZE)

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
  border-radius: 12px;
  padding: 1.5rem;
  text-align: center;
  transition: all 0.3s;
}

.player-card.active {
  box-shadow: 0 0 20px rgba(76, 175, 80, 0.5);
  border: 2px solid #4CAF50;
}

.player-avatar {
  width: 60px;
  height: 60px;
  background: #333;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: bold;
  margin: 0 auto 1rem;
}

.player-avatar.white {
  background: #fff;
  color: #333;
  border: 3px solid #333;
}

.player-name {
  font-weight: bold;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.tag {
  background: #4CAF50;
  color: white;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  font-size: 0.7rem;
}

.player-status {
  font-size: 0.85rem;
  color: #666;
}

.vs-divider {
  text-align: center;
  padding: 0.5rem;
  font-size: 1.2rem;
  font-weight: bold;
  color: white;
}

.turn-indicator {
  background: #4CAF50;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.9rem;
}

.game-over {
  background: #f44336;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.9rem;
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
  padding: 1rem;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.game-board {
  display: block;
  cursor: pointer;
  border-radius: 4px;
}

.settlement-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
}

.settlement-modal {
  background: white;
  padding: 3rem;
  border-radius: 16px;
  text-align: center;
}

.settlement-modal h2 {
  margin-bottom: 1rem;
  font-size: 2rem;
}

.winner {
  font-size: 1.5rem;
  color: #4CAF50;
  margin-bottom: 1rem;
}

.draw {
  font-size: 1.5rem;
  color: #ff9800;
  margin-bottom: 1rem;
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
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  height: 600px;
}

.chat-tabs {
  display: flex;
  border-bottom: 1px solid #eee;
}

.chat-tab {
  padding: 1rem 1.5rem;
  cursor: pointer;
  border-bottom: 2px solid transparent;
}

.chat-tab.active {
  color: #4CAF50;
  border-bottom-color: #4CAF50;
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
  flex-direction: column;
  gap: 0.25rem;
}

.chat-nickname {
  font-weight: bold;
  color: #4CAF50;
  font-size: 0.9rem;
}

.chat-content {
  word-break: break-all;
  line-height: 1.4;
}

.chat-time {
  font-size: 0.75rem;
  color: #999;
}

.chat-input {
  padding: 1rem;
  display: flex;
  gap: 0.5rem;
  border-top: 1px solid #eee;
}

.chat-input .input {
  flex: 1;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  padding: 2rem;
  border-radius: 16px;
  width: 90%;
  max-width: 400px;
}

.modal h3 {
  margin-bottom: 0.5rem;
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
  }
  
  .players-panel {
    flex-direction: row;
    justify-content: center;
  }
  
  .chat-panel {
    height: 300px;
  }
}
</style>