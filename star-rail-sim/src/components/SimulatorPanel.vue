
<template>
  <el-container class="app-container">
    <div v-if="errorMessage" class="error-banner" style="position: absolute; top: 20px; left: 50%; transform: translateX(-50%); z-index: 2000; width: 60%; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
      <el-alert :title="errorMessage" type="error" show-icon closable @close="errorMessage = ''" />
    </div>
    <el-header class="app-header" height="64px">
      <div class="logo">
        <div class="logo-icon-wrapper">
          <el-icon :size="28" color="#fff"><StarFilled /></el-icon>
        </div>
        <div class="logo-text">
          <span class="title">星穹铁道模拟器</span>
          <span class="subtitle">Star Rail Simulator v0.2</span>
        </div>
      </div>
      
      <div class="sim-controls">
        <el-button :icon="isDark ? Sunny : Moon" circle @click="toggleTheme" style="margin-right: 12px;" />
        <div class="control-group">
          <span class="label">轮次限制:</span>
          <el-input-number 
            v-model="simConfig.cycles" 
            :min="0" :max="10" 
            size="small" 
            controls-position="right"
            style="width: 80px"
          />
        </div>
        <el-button type="primary" size="default" @click="runSimulation" :icon="VideoPlay">
          运行模拟
        </el-button>
        <el-popconfirm
          title="确定要重置所有配置并清除缓存吗？"
          confirm-button-text="重置"
          cancel-button-text="取消"
          width="200"
          @confirm="resetConfig"
        >
          <template #reference>
            <el-button type="danger" plain size="default" circle title="重置配置">
              <el-icon><RefreshLeft /></el-icon>
            </el-button>
          </template>
        </el-popconfirm>
      </div>
    </el-header>
    
    <el-container class="main-content">
      <!-- Left Configuration Panel -->
      <el-aside width="400px" class="config-panel">
        <div class="panel-header">
          <h3>战斗配置</h3>
        </div>
        <el-scrollbar>
          <div class="panel-body">
            <el-tabs v-model="activeTab" class="config-tabs">
              <el-tab-pane label="角色配置" name="character">
                <div class="char-management">
                  <div class="char-list">
                    <el-tag
                      v-for="(char, index) in characters"
                      :key="char.id"
                      :effect="selectedCharIndex === index ? 'dark' : 'plain'"
                      class="char-tag"
                      @click="selectedCharIndex = index"
                      closable
                      @close="removeCharacter(index)"
                    >
                      {{ char.name }}
                    </el-tag>
                    <el-button 
                      v-if="characters.length < 4" 
                      class="add-char-btn" 
                      size="small" 
                      circle 
                      @click="openAddCharDialog"
                    >
                      <el-icon><Plus /></el-icon>
                    </el-button>
                  </div>
                </div>
                <CharacterConfig v-if="selectedCharacter" :character="selectedCharacter" :key="selectedCharacter.id" />
                <div v-else class="empty-selection">
                  <el-empty description="请选择或添加角色" />
                </div>
              </el-tab-pane>
              <el-tab-pane label="敌人配置" name="enemy">
                 <div class="char-management">
                  <div class="char-list">
                    <el-tag
                      v-for="(en, index) in enemies"
                      :key="en.id"
                      :effect="selectedEnemyIndex === index ? 'dark' : 'plain'"
                      type="danger"
                      class="char-tag"
                      @click="selectedEnemyIndex = index"
                      closable
                      @close="removeEnemy(index)"
                    >
                      {{ en.name }}
                    </el-tag>
                    <el-button 
                      v-if="enemies.length < 5" 
                      class="add-char-btn" 
                      size="small" 
                      circle 
                      @click="openAddEnemyDialog"
                    >
                      <el-icon><Plus /></el-icon>
                    </el-button>
                  </div>
                </div>
                <EnemyConfig v-if="selectedEnemy" :enemy="selectedEnemy" :key="selectedEnemy.id" />
                <div v-else class="empty-selection">
                  <el-empty description="请选择或添加敌人" />
                </div>
              </el-tab-pane>
            </el-tabs>
            
            <el-alert
              title="模拟说明"
              type="info"
              :closable="false"
              show-icon
              class="info-alert"
            >
              <template #default>
                <div class="info-content">
                  <p>1. 修改上方属性，右侧模拟结果将实时更新。</p>
                  <p>2. 行动条基于 10000/Speed 公式计算 AV。</p>
                  <p>3. 伤害计算基于单次技能倍率 (默认 250%)。</p>
                </div>
              </template>
            </el-alert>
          </div>
        </el-scrollbar>
      </el-aside>
      
      <!-- Right Result Panel -->
      <el-main class="result-panel">
        <div class="result-grid" v-if="simulator">
          <div class="result-column left-col">
            <ActionOrder 
              :events="simulator.events" 
              :cycleAVs="cycleAVs"
              :key="updateKey" 
              class="full-height-card" 
              @select-event="handleEventSelect"
              @update-cycles="handleCycleUpdate"
            />
          </div>
          <div class="result-column right-col">
            <div v-if="selectedActionEvent" class="full-height-card" style="position: relative;">
               <ActionDetail :event="selectedActionEvent" />
               <el-button 
                  type="info" 
                  size="small" 
                  circle 
                  style="position: absolute; top: 10px; right: 10px; z-index: 10;"
                  @click="selectedActionEvent = null"
                  title="返回总览"
               >
                  <el-icon><Close /></el-icon>
               </el-button>
            </div>
            <DamageResult 
              v-else
              :character="selectedCharacter" 
              :enemy="selectedEnemy" 
              :simulator="simulator"
              :skill-multiplier="2.5" 
              :config="selectedCharacter.damageConfig"
              @update:config="(newVal) => Object.assign(selectedCharacter.damageConfig, newVal)"
              :key="updateKey"
              class="full-height-card" 
            />
          </div>
        </div>
        <div v-else class="empty-state">
           <el-empty description="模拟器初始化中或发生错误..." />
        </div>
      </el-main>
    </el-container>

    <!-- Add Character Dialog -->
    <el-dialog v-model="showAddCharDialog" title="添加角色" width="30%" append-to-body>
      <el-form label-position="top">
        <el-form-item label="选择角色">
          <el-select v-model="selectedNewCharId" placeholder="请选择角色" filterable style="width: 100%">
            <el-option
              v-for="char in availableCharacters"
              :key="char.id"
              :label="char.name"
              :value="char.id"
            >
              <div class="char-option">
                <span class="element-dot" :style="{ backgroundColor: getElementColor(char.element) }"></span>
                <span>{{ char.name }}</span>
                <span class="char-path">{{ getPathName(char.path) }}</span>
              </div>
            </el-option>
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showAddCharDialog = false">取消</el-button>
          <el-button type="primary" @click="confirmAddCharacter" :disabled="!selectedNewCharId">
            确认
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- Add Enemy Dialog -->
    <el-dialog v-model="showAddEnemyDialog" title="添加敌人" width="30%" append-to-body>
      <el-form label-position="top">
        <el-form-item label="选择敌人类型">
          <el-select v-model="selectedEnemyType" placeholder="请选择敌人" style="width: 100%">
            <el-option label="末日兽" value="Boss" />
            <el-option label="精英" value="Elite" />
            <el-option label="小怪" value="Minion" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showAddEnemyDialog = false">取消</el-button>
          <el-button type="primary" @click="confirmAddEnemy" :disabled="!selectedEnemyType">
            确认
          </el-button>
        </span>
      </template>
    </el-dialog>
  </el-container>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed, onMounted, onErrorCaptured } from 'vue';
import { StarFilled, Plus, Delete, User, VideoPlay, Close, Moon, Sunny, RefreshLeft } from '@element-plus/icons-vue';
import CharacterConfig from './CharacterConfig.vue';
import EnemyConfig from './EnemyConfig.vue';
import ActionOrder from './ActionOrder.vue';
import DamageResult from './DamageResult.vue';
import ActionDetail from './ActionDetail.vue';
import { Character } from '../models/Character';
import { Enemy } from '../models/Enemy';
import { BattleSimulator, BattleEvent } from '../utils/simulator';
import { ElementType } from '../models/types';
import { DataManager } from '../utils/DataManager';

const isDark = ref(false);
const toggleTheme = () => {
  isDark.value = !isDark.value;
  if (isDark.value) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};

const activeTab = ref('character');
const selectedActionEvent = ref<BattleEvent | null>(null);
const errorMessage = ref('');

onErrorCaptured((err: any) => {
  console.error('Captured Error:', err);
  errorMessage.value = `运行时错误: ${err.message || err}`;
  return false;
});

const handleEventSelect = (event: BattleEvent) => {
  selectedActionEvent.value = event;
};

const showAddCharDialog = ref(false);
const selectedNewCharId = ref('');
const showAddEnemyDialog = ref(false);
const selectedEnemyType = ref('Minion');

// Get all available characters from DataManager
const availableCharacters = computed(() => {
  return DataManager.getAllCharacters().sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
});

// Initialize Data
// Try to load March 7th as default if available, otherwise fallback
const defaultCharData = DataManager.getCharacter('1001'); // March 7th
const initialChar = defaultCharData 
  ? new Character('1001', defaultCharData.name, defaultCharData.element as ElementType, 80, defaultCharData)
  : new Character('char1', '开拓者', ElementType.Physical);

const characters = reactive([initialChar]);
const selectedCharIndex = ref(0);

// Initialize Enemies (Default 3: 1 Boss, 2 Minions)
const enemies = reactive([
  new Enemy('enemy_1', '末日兽', 90),
  new Enemy('enemy_2', '虚卒 (左)', 80),
  new Enemy('enemy_3', '虚卒 (右)', 80)
]);
const selectedEnemyIndex = ref(0);

// Initialize Simulator
const simulator = ref<BattleSimulator | null>(null);

const isRestoringConfig = ref(false);

// Computed for currently selected character/enemy
const selectedCharacter = computed(() => characters[selectedCharIndex.value]);
const selectedEnemy = computed(() => enemies[selectedEnemyIndex.value] || enemies[0]);

// Watch for Enemy Change to update Damage Config defaults for CURRENT character
watch(() => selectedEnemy.value?.id, () => {
  if (isRestoringConfig.value) return;

  if (selectedEnemy.value && selectedCharacter.value) {
    const config = selectedCharacter.value.damageConfig;
    config.defReduction = (selectedEnemy.value.defReduction || 0) * 100;
    config.vuln = (selectedEnemy.value.vuln || 0) * 100;
    config.dmgRed = (selectedEnemy.value.dmgRed || 0) * 100;
    config.enemyLevel = selectedEnemy.value.level || 90;
    config.isBroken = selectedEnemy.value.isBroken || false;
    
    const element = selectedCharacter.value.element || 'Physical';
    config.enemyRes = (selectedEnemy.value.res?.[element] || 0.2) * 100;
  }
}, { deep: true });

try {
  simulator.value = new BattleSimulator(characters, enemies);
} catch (e: any) {
  console.error('Simulator Initialization Error:', e);
  errorMessage.value = `模拟器初始化失败: ${e.message}`;
}

// Enemy Management
const openAddEnemyDialog = () => {
  if (enemies.length < 5) {
    selectedEnemyType.value = 'Minion';
    showAddEnemyDialog.value = true;
  }
};

const confirmAddEnemy = () => {
  if (!selectedEnemyType.value) return;
  
  const id = `enemy_${Date.now()}`;
  let name = 'Enemy';
  let level = 80;
  
  switch (selectedEnemyType.value) {
    case 'Boss':
      name = '末日兽';
      level = 90;
      break;
    case 'Elite':
      name = '精英怪';
      level = 85;
      break;
    case 'Minion':
      name = '小怪';
      level = 80;
      break;
  }
  
  const newEnemy = new Enemy(id, name, level);
  enemies.push(newEnemy);
  selectedEnemyIndex.value = enemies.length - 1;
  showAddEnemyDialog.value = false;
};

const removeEnemy = (index: number) => {
  if (enemies.length > 1) {
    enemies.splice(index, 1);
    if (selectedEnemyIndex.value >= enemies.length) {
      selectedEnemyIndex.value = enemies.length - 1;
    }
  }
};

// Character Management
const openAddCharDialog = () => {
  if (characters.length < 4) {
    selectedNewCharId.value = '';
    showAddCharDialog.value = true;
  }
};

const confirmAddCharacter = () => {
  if (!selectedNewCharId.value) return;
  
  try {
    const charData = DataManager.getCharacter(selectedNewCharId.value);
    if (charData) {
      // Check if character already exists (optional, but good practice)
      // Allow duplicates for now? User might want 2 of same char for testing? 
      // Usually not allowed in game, but maybe for sim it's fine.
      // Let's create unique runtime ID based on timestamp
      const uniqueId = `${charData.id}_${Date.now()}`;
      const newChar = new Character(uniqueId, charData.name, charData.element as ElementType, 80, charData);
      
      characters.push(newChar);
      selectedCharIndex.value = characters.length - 1;
      showAddCharDialog.value = false;
    } else {
      console.error(`Character data not found for ID: ${selectedNewCharId.value}`);
    }
  } catch (error) {
    console.error('Error adding character:', error);
  }
};

const removeCharacter = (index) => {
  if (characters.length > 1) {
    characters.splice(index, 1);
    if (selectedCharIndex.value >= characters.length) {
      selectedCharIndex.value = characters.length - 1;
    }
  }
};

const getElementColor = (element) => {
  switch (element) {
    case 'Fire': return '#ff4d4f';
    case 'Ice': return '#1890ff';
    case 'Wind': return '#52c41a';
    case 'Lightning': return '#722ed1';
    case 'Physical': return '#8c8c8c';
    case 'Quantum': return '#13c2c2';
    case 'Imaginary': return '#faad14';
    default: return '#8c8c8c';
  }
};

const getPathName = (path: string) => {
  const pathMap: Record<string, string> = {
    'Warrior': '毁灭',
    'Rogue': '巡猎',
    'Mage': '智识',
    'Shaman': '同谐',
    'Warlock': '虚无',
    'Knight': '存护',
    'Priest': '丰饶',
    'Memory': '记忆',
    'Elation': '欢愉'
  };
  return pathMap[path] || path;
};

const updateKey = ref(0);

// Simulation Config
const simConfig = reactive({
  cycles: 10,
  maxAV: 0
});

// Cycle AV Configuration
const cycleAVs = ref<number[]>([150, 100, 100, 100, 100, 100, 100, 100, 100, 100]);

const handleCycleUpdate = (newAVs: number[]) => {
  cycleAVs.value = newAVs;
  if (simulator.value) {
    simulator.value.setCycleAVs(newAVs);
    runSimulation(); // Re-run simulation with new cycle settings
  }
};

// Storage Key
const STORAGE_KEY = 'hsr-sim-config-v1';

// Reset Config
const resetConfig = () => {
  localStorage.removeItem(STORAGE_KEY);
  window.location.reload();
};

// Save Config to LocalStorage
const saveConfig = () => {
  try {
    const data = {
      characters: characters.map(c => ({
        ...c,
        // Ensure we save skill levels and stats
        stats: c.stats,
        skillLevels: c.skillLevels,
        activeSkills: c.activeSkills, // Might be large but necessary for now
        buffs: c.buffs,
        activeEidolons: c.activeEidolons
      })),
      enemies: enemies,
      simConfig: simConfig,
      cycleAVs: cycleAVs.value,
      isDark: isDark.value
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save config:', e);
  }
};

// Load Config from LocalStorage
const loadConfig = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      isRestoringConfig.value = true;
      const data = JSON.parse(saved);
      
      // Restore Theme
      if (data.isDark) {
        isDark.value = true;
        document.documentElement.classList.add('dark');
      }

      // Restore Sim Config
      if (data.simConfig) {
        Object.assign(simConfig, data.simConfig);
      }

      // Restore Cycle AVs
      if (data.cycleAVs) {
        cycleAVs.value = data.cycleAVs;
      }
      
      // Restore Enemies
      if (data.enemies && Array.isArray(data.enemies)) {
        enemies.splice(0, enemies.length); // Clear existing
        data.enemies.forEach((e: any) => {
          const enemy = new Enemy(e.id, e.name, e.level);
          // Restore properties
          Object.assign(enemy, e);
          enemies.push(enemy);
        });
        if (enemies.length === 0) {
           enemies.push(new Enemy('enemy_1', '末日兽', 90));
        }
      }

      // Restore Characters
      if (data.characters && Array.isArray(data.characters)) {
        characters.splice(0, characters.length); // Clear existing
        data.characters.forEach((c: any) => {
          // Reconstruct Character object
          // We need base data if possible, or just reconstruct with saved data
          // If we have ID, we can try to get base data from DataManager to ensure methods work
          const baseData = DataManager.getCharacter(c.id) || DataManager.getCharacter('1001');
          
          if (baseData) {
            const char = new Character(c.id, c.name, c.element as ElementType, c.level, baseData);
            // Restore dynamic properties
            char.stats = { ...char.stats, ...c.stats };
            char.skillLevels = { ...char.skillLevels, ...c.skillLevels };
            char.buffs = c.buffs || [];
            if (c.damageConfig) {
              Object.assign(char.damageConfig, c.damageConfig);
              // Ensure critRate has a default if missing from saved config
              if (char.damageConfig.critRate === undefined) {
                 char.damageConfig.critRate = (char.stats.critRate || 0.05) * 100;
              }
            }
            
            // Restore manual props if they exist on the object
            if (c.critRate !== undefined) char.stats.critRate = c.critRate;
            if (c.critDmg !== undefined) char.stats.critDmg = c.critDmg;
            
            characters.push(char);
          }
        });
        
        if (characters.length === 0) {
             characters.push(initialChar);
        }
      }
      
      // Allow watchers to resume after a short delay
      setTimeout(() => {
        isRestoringConfig.value = false;
      }, 100);
    }
  } catch (e) {
    console.error('Failed to load config:', e);
    isRestoringConfig.value = false;
  }
};

// Watch for changes to save
watch(
  [() => characters, () => enemies, () => simConfig, cycleAVs, isDark], 
  () => {
    if (!isRestoringConfig.value) {
       saveConfig();
    }
  },
  { deep: true }
);

// Manual update trigger
const runSimulation = () => {
  selectedActionEvent.value = null;
  errorMessage.value = ''; // Clear previous error
  try {
    const sim = new BattleSimulator(characters, enemies);
    
    // Run loop until max cycles or max actions
    let actionCount = 0;
    const maxActions = 200; // Safety limit
    const maxCycle = Math.max(0, simConfig.cycles); // 0-based cycle index
    
    // Set Cycle AVs from config
    sim.setCycleAVs(cycleAVs.value);

    // Cycle 0 ends at 150 AV. Cycle 1 ends at 250 AV.
    // Cycle N ends at 150 + N * 100.
    // We need to calculate maxAV based on configured cycleAVs
    let maxAV = 0;
    for (let i = 0; i < maxCycle && i < cycleAVs.value.length; i++) {
        maxAV += cycleAVs.value[i];
    }
    // If maxCycle exceeds configured array, add default 100 for remaining
    if (maxCycle > cycleAVs.value.length) {
        maxAV += (maxCycle - cycleAVs.value.length) * 100;
    }
    // If maxCycle is 0 (should show at least 1st cycle?), usually config.cycles is e.g. 5
    if (maxAV === 0 && cycleAVs.value.length > 0) maxAV = cycleAVs.value[0]; 
    
    // More robust loop condition
    while (actionCount < maxActions) {
      if (sim.currentTotalAV >= maxAV * 2) break; // Double safety margin for AV
      
      const event = sim.nextStep();
      if (!event) break;
      
      // Stop if cycle limit reached
      if (event.cycle >= maxCycle) break; 
      
      actionCount++;
    }
    
    simulator.value = sim;
    updateKey.value++; // Force update UI components
  } catch (e: any) {
    console.error("Simulation Error:", e);
    errorMessage.value = `模拟运行错误: ${e.message || e}`;
    
    // Fallback: Create empty simulator to prevent UI crash
    if (!simulator.value) {
       simulator.value = new BattleSimulator([], []);
    }
  }
};

// Removed automatic watcher for characters/enemy to prevent lag
// watch([characters, enemy], () => { ... });
// Initialize simulation on mount
onMounted(() => {
  console.log("SimulatorPanel mounted.");
  loadConfig(); // Load saved config
  
  // Ensure we have at least defaults if load failed or was empty
  if (characters.length === 0) characters.push(initialChar);
  if (enemies.length === 0) enemies.push(new Enemy('enemy_1', '末日兽', 90));
  
  runSimulation();
});
</script>

<style scoped>
.app-container {
  height: 100vh;
  background-color: var(--hsr-bg);
  overflow: hidden;
}

.app-header {
  background: #1d1d1f; /* Dark theme header */
  color: #fff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  z-index: 100;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon-wrapper {
  background: linear-gradient(135deg, #337ecc, #6a4c9c);
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(51, 126, 204, 0.4);
}


.sim-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.1);
  padding: 4px 12px;
  border-radius: 4px;
}

.control-group .label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.9);
}

.title {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.subtitle {
  font-size: 11px;
  opacity: 0.7;
  font-weight: 300;
}

.main-content {
  height: calc(100vh - 64px);
  overflow: hidden;
}

.config-panel {
  background-color: var(--hsr-card-bg);
  border-right: 1px solid var(--hsr-border);
  display: flex;
  flex-direction: column;
  box-shadow: 2px 0 8px rgba(0,0,0,0.02);
  z-index: 10;
}

.panel-header {
  padding: 16px 24px;
  border-bottom: 1px solid var(--hsr-border);
}

.panel-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--hsr-text-main);
}

.panel-body {
  padding: 24px;
}

.config-tabs :deep(.el-tabs__nav-wrap::after) {
  height: 1px;
  background-color: var(--hsr-border);
}

.config-tabs :deep(.el-tabs__item) {
  font-weight: 600;
  font-size: 15px;
}

.config-tabs :deep(.el-tabs__item.is-active) {
  color: var(--hsr-primary);
}

.char-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

.element-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.char-path {
  font-size: 12px;
  color: #909399;
  margin-left: auto;
}

.info-alert {
  margin-top: 24px;
  border: 1px solid #e1f3d8; /* Light green border for info */
}

.char-management {
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px dashed var(--hsr-border);
}

.char-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.char-tag {
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}

.char-tag:hover {
  transform: translateY(-1px);
}

.add-char-btn {
  margin-left: 4px;
}

.info-content p {
  margin: 4px 0;
  font-size: 12px;
  color: var(--hsr-text-secondary);
}

.result-panel {
  padding: 24px;
  background-color: var(--hsr-bg);
  overflow: hidden;
}

.result-grid {
  display: grid;
  grid-template-columns: 1.2fr 1fr; /* Action order gets a bit more space or less depending on preference */
  gap: 24px;
  height: 100%;
}

.result-column {
  min-height: 0; /* Prevent grid item expansion */
  overflow: hidden; /* Ensure content stays within column */
}

.full-height-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* Adjust grid for smaller screens if needed, though this is desktop focused */
@media (max-width: 1200px) {
  .result-grid {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr 1fr;
    overflow-y: auto;
  }
}
</style>
