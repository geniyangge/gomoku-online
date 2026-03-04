<template>
  <div id="app">
    <header class="header">
      <h1>五子棋对战</h1>
      <div class="player-info" v-if="socketService.player.value">
        <span class="nickname">{{ socketService.player.value.nickname }}</span>
      </div>
    </header>
    <main class="main">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { socketService } from './services/socket'

onMounted(() => {
  socketService.connect()
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB',
    'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  min-height: 100vh;
}

#app {
  min-height: 100vh;
}

.header {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header h1 {
  color: white;
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
}

.player-info {
  color: white;
}

.nickname {
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.3), rgba(76, 175, 80, 0.1));
  padding: 0.5rem 1.25rem;
  border-radius: 25px;
  font-size: 0.9rem;
  border: 1px solid rgba(76, 175, 80, 0.3);
  backdrop-filter: blur(10px);
}

.main {
  padding: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
  height: calc(100vh - 70px);
  display: flex;
  flex-direction: column;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  outline: none;
}

.btn:focus-visible {
  box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.5);
}

.btn-primary {
  background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
  color: white;
  box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
}

.btn-primary:hover {
  background: linear-gradient(135deg, #5cb860 0%, #4caf50 100%);
  box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4);
  transform: translateY(-2px);
}

.btn-primary:active {
  transform: translateY(0);
}

.btn-secondary {
  background: linear-gradient(135deg, #2196f3 0%, #1976d2 100%);
  color: white;
  box-shadow: 0 4px 15px rgba(33, 150, 243, 0.3);
}

.btn-secondary:hover {
  background: linear-gradient(135deg, #42a5f5 0%, #2196f3 100%);
  box-shadow: 0 6px 20px rgba(33, 150, 243, 0.4);
  transform: translateY(-2px);
}

.btn-secondary:active {
  transform: translateY(0);
}

.btn-danger {
  background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
  color: white;
  box-shadow: 0 4px 15px rgba(244, 67, 54, 0.3);
}

.btn-danger:hover {
  background: linear-gradient(135deg, #ef5350 0%, #f44336 100%);
  box-shadow: 0 6px 20px rgba(244, 67, 54, 0.4);
  transform: translateY(-2px);
}

.btn-warning {
  background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
  color: white;
  box-shadow: 0 4px 15px rgba(255, 152, 0, 0.3);
}

.btn-warning:hover {
  background: linear-gradient(135deg, #ffa726 0%, #ff9800 100%);
  box-shadow: 0 6px 20px rgba(255, 152, 0, 0.4);
  transform: translateY(-2px);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
}

.input {
  padding: 0.75rem 1rem;
  border: 2px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  font-size: 1rem;
  outline: none;
  transition: all 0.25s ease;
  background: rgba(255, 255, 255, 0.08);
  color: white;
  backdrop-filter: blur(10px);
}

.input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.input:focus {
  border-color: #4caf50;
  background: rgba(255, 255, 255, 0.12);
  box-shadow: 0 0 0 4px rgba(76, 175, 80, 0.15);
}

@media (max-width: 768px) {
  .header {
    padding: 0.75rem 1rem;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .header h1 {
    font-size: 1.2rem;
  }

  .nickname {
    padding: 0.4rem 1rem;
    font-size: 0.8rem;
  }

  .main {
    padding: 1rem;
  }

  .btn {
    padding: 0.65rem 1.25rem;
    font-size: 0.9rem;
    min-height: 44px;
  }

  .input {
    padding: 0.65rem 0.875rem;
    font-size: 0.9rem;
    min-height: 44px;
  }
}

@media (max-width: 480px) {
  .header {
    padding: 0.5rem 0.75rem;
  }

  .header h1 {
    font-size: 1rem;
  }

  .nickname {
    padding: 0.35rem 0.75rem;
    font-size: 0.75rem;
  }

  .main {
    padding: 0.75rem;
  }

  .btn {
    padding: 0.6rem 1rem;
    font-size: 0.85rem;
    border-radius: 10px;
  }

  .input {
    padding: 0.6rem 0.75rem;
    font-size: 0.85rem;
    border-radius: 10px;
  }
}
</style>
