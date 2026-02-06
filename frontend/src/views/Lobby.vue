<template>
  <div class="lobby-container">
    <div class="lobby-header">
      <div class="search-box">
        <input 
          v-model="searchKeyword" 
          type="text" 
          placeholder="搜索房间号或名称..."
          class="input"
          @keyup.enter="searchRoom"
        />
        <button class="btn btn-secondary" @click="searchRoom">搜索</button>
        <button class="btn btn-secondary" @click="refreshRooms">刷新</button>
      </div>
      <button class="btn btn-primary" @click="showCreateRoom = true">创建房间</button>
    </div>

    <div class="rooms-grid">
      <div 
        v-for="room in socketService.rooms.value" 
        :key="room.id" 
        class="room-table"
        :class="{ 'playing': room.status === 'playing' }"
        @click="joinRoom(room.id)"
      >
        <div class="table-header">
          <span class="room-name">{{ room.name }}</span>
          <span class="room-status" :class="room.status">
            {{ room.status === 'idle' ? '空闲' : '游戏中' }}
          </span>
        </div>
        
        <div class="table-seats">
          <div class="seat" :class="{ 'occupied': room.players[0] }">
            <div class="seat-icon">黑</div>
            <div class="seat-status">
              {{ room.players[0] ? '已入座' : '虚位以待' }}
            </div>
          </div>
          
          <div class="vs">VS</div>
          
          <div class="seat" :class="{ 'occupied': room.players[1] }">
            <div class="seat-icon white">白</div>
            <div class="seat-status">
              {{ room.players[1] ? '已入座' : '虚位以待' }}
            </div>
          </div>
        </div>

        <div class="spectators-count" v-if="room.spectators.length > 0">
          {{ room.spectators.length }} 位观众
        </div>
      </div>

      <div v-if="socketService.rooms.value.length === 0" class="no-rooms">
        暂无房间，点击"创建房间"开始游戏
      </div>
    </div>

    <!-- 创建房间弹窗 -->
    <div v-if="showCreateRoom" class="modal-overlay" @click.self="showCreateRoom = false">
      <div class="modal">
        <h3>创建房间</h3>
        <input 
          v-model="newRoomName" 
          type="text" 
          placeholder="请输入房间名称"
          class="input"
          @keyup.enter="createRoom"
        />
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showCreateRoom = false">取消</button>
          <button class="btn btn-primary" @click="createRoom">创建</button>
        </div>
      </div>
    </div>

    <!-- 聊天区域 -->
    <div class="chat-section">
      <div class="chat-header">
        <h3>大厅聊天</h3>
      </div>
      <div class="chat-messages" ref="chatContainer">
        <div 
          v-for="msg in socketService.lobbyMessages.value" 
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
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { socketService } from '../services/socket'

const router = useRouter()
const showCreateRoom = ref(false)
const newRoomName = ref('')
const searchKeyword = ref('')
const chatMessage = ref('')
const chatContainer = ref<HTMLDivElement>()

onMounted(() => {
  socketService.getRooms()
  // 定期刷新房间列表
  const interval = setInterval(() => {
    socketService.getRooms()
  }, 5000)

  onUnmounted(() => {
    clearInterval(interval)
  })
})

const createRoom = () => {
  if (!newRoomName.value.trim()) return
  socketService.createRoom(newRoomName.value.trim())
  showCreateRoom.value = false
  newRoomName.value = ''
  
  // 监听房间加入成功
  const unwatch = socketService.currentRoom
  const checkRoom = setInterval(() => {
    if (socketService.currentRoom.value) {
      clearInterval(checkRoom)
      router.push(`/room/${socketService.currentRoom.value.id}`)
    }
  }, 100)
  
  setTimeout(() => clearInterval(checkRoom), 5000)
}

const joinRoom = (roomId: string) => {
  socketService.joinRoom(roomId)
  
  // 监听房间加入成功
  const checkRoom = setInterval(() => {
    if (socketService.currentRoom.value) {
      clearInterval(checkRoom)
      router.push(`/room/${socketService.currentRoom.value.id}`)
    }
  }, 100)
  
  setTimeout(() => clearInterval(checkRoom), 5000)
}

const searchRoom = () => {
  if (searchKeyword.value.trim()) {
    socketService.searchRoom(searchKeyword.value.trim())
  } else {
    socketService.getRooms()
  }
}

const refreshRooms = () => {
  searchKeyword.value = ''
  socketService.getRooms()
}

const sendChat = () => {
  if (!chatMessage.value.trim()) return
  socketService.sendLobbyChat(chatMessage.value.trim())
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
.lobby-container {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.lobby-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.search-box {
  display: flex;
  gap: 0.5rem;
  flex: 1;
  max-width: 500px;
}

.search-box .input {
  flex: 1;
}

.rooms-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.room-table {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.room-table:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
}

.room-table.playing {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.room-name {
  font-weight: bold;
  font-size: 1.1rem;
}

.room-status {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: bold;
}

.room-status.idle {
  background: #4CAF50;
  color: white;
}

.room-status.playing {
  background: #ff9800;
  color: white;
}

.table-seats {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.seat {
  flex: 1;
  text-align: center;
  padding: 1rem;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.05);
  transition: all 0.3s;
}

.room-table.playing .seat {
  background: rgba(255, 255, 255, 0.1);
}

.seat.occupied {
  background: rgba(76, 175, 80, 0.1);
}

.seat-icon {
  width: 50px;
  height: 50px;
  background: #333;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  margin: 0 auto 0.5rem;
  font-size: 1.2rem;
}

.seat-icon.white {
  background: #fff;
  color: #333;
  border: 2px solid #333;
}

.seat-status {
  font-size: 0.85rem;
  color: #666;
}

.room-table.playing .seat-status {
  color: rgba(255, 255, 255, 0.8);
}

.vs {
  font-weight: bold;
  font-size: 1.2rem;
  color: #999;
}

.spectators-count {
  text-align: center;
  margin-top: 0.75rem;
  font-size: 0.85rem;
  color: #666;
}

.room-table.playing .spectators-count {
  color: rgba(255, 255, 255, 0.8);
}

.no-rooms {
  grid-column: 1 / -1;
  text-align: center;
  padding: 3rem;
  color: white;
  font-size: 1.1rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 16px;
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
  margin-bottom: 1rem;
}

.modal .input {
  width: 100%;
  margin-bottom: 1rem;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}

.chat-section {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  padding: 1.5rem;
  height: 300px;
  display: flex;
  flex-direction: column;
}

.chat-header {
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #eee;
}

.chat-header h3 {
  color: #333;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
  padding-right: 0.5rem;
}

.chat-message {
  display: flex;
  gap: 0.5rem;
  align-items: baseline;
  flex-wrap: wrap;
}

.chat-nickname {
  font-weight: bold;
  color: #4CAF50;
}

.chat-content {
  flex: 1;
  word-break: break-all;
}

.chat-time {
  font-size: 0.75rem;
  color: #999;
}

.chat-input {
  display: flex;
  gap: 0.5rem;
}

.chat-input .input {
  flex: 1;
}
</style>