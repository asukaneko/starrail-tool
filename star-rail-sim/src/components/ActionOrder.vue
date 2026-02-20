<template>
  <el-card class="action-order-card" :body-style="{ padding: '0px', display: 'flex', flexDirection: 'column', height: '100%' }">
    <template #header>
      <div class="card-header">
        <div class="header-title">
          <el-icon class="header-icon"><Timer /></el-icon>
          <span>行动序列</span>
          <el-button 
            type="info" 
            link 
            size="small" 
            @click="openSettings"
            style="margin-left: 8px"
          >
            <el-icon><Setting /></el-icon>
          </el-button>
        </div>
        <el-tag size="small" type="info">{{ events.length }} 行动</el-tag>
      </div>
    </template>
    
    <div class="action-list-container">
      <el-scrollbar ref="scrollbarRef">
        <div class="timeline-wrapper">
          <div v-for="(event, index) in events" :key="event.turn + '_' + event.actorId + '_' + index">
            <!-- Cycle Divider -->
            <div v-if="shouldShowCycleDivider(event, index)" class="cycle-divider">
              <div class="cycle-badge">
                <span class="cycle-num">第 {{ event.cycle }} 轮</span>
              </div>
              <div class="cycle-line"></div>
              <span class="cycle-desc">{{ formatAV(event.avInCycle) }} / {{ getCycleLength(event.cycle) }} AV</span>
            </div>

            <!-- Action Item -->
            <div class="action-item" :class="{ 'is-selected': selectedEventId === (event.turn + '_' + event.actorId), 'is-dead': ['Dead', 'DoT Death'].includes(event.actionType) }" @click="selectEvent(event)">
              <!-- Left: AV -->
              <div class="av-info">
                <span class="av-val">{{ formatAV(event.totalAV) }}</span>
                <span class="av-label">AV</span>
              </div>

              <!-- Center: Avatar/Icon -->
              <div class="avatar-section">
                <el-avatar 
                  :size="40" 
                  :src="getAvatarUrl(event)"
                  :style="{ backgroundColor: event.isEnemy ? '#ff7875' : '#409eff' }"
                >
                  <span v-if="!getAvatarUrl(event)">{{ event.actorName[0] }}</span>
                </el-avatar>
              </div>

              <!-- Right: Details -->
              <div class="action-content">
                <div class="action-header">
                  <span class="actor-name" :class="{ 'is-enemy': event.isEnemy }">{{ event.actorName }}</span>
                  <el-tag size="small" :type="getActionTypeColor(event.actionType)" effect="dark">{{ getActionTypeName(event.actionType) }}</el-tag>
                </div>
                
                <div class="action-stats" v-if="event.damage || event.heal || event.shieldGain || event.actionType === 'Dead' || event.actionType === 'DoT Death' || (event.killedUnits && event.killedUnits.length > 0)">
             <span v-if="event.damage" class="stat-item damage">
               <el-icon><Aim /></el-icon> {{ event.damage }}
             </span>
             <span v-if="event.heal" class="stat-item heal">
               <el-icon><FirstAidKit /></el-icon> {{ event.heal }}
             </span>
             <span v-if="event.shieldGain" class="stat-item shield">
                <el-icon><Lock /></el-icon> {{ event.shieldGain }}
              </span>
             <span v-if="event.actionType === 'Dead' || event.actionType === 'DoT Death'" class="stat-item dead-info">
               (已阵亡)
             </span>
             <span v-if="event.killedUnits && event.killedUnits.length > 0" class="stat-item killed-info">
               ☠️ {{ event.killedUnits.join(', ') }}
             </span>
          </div>
              </div>
            </div>
          </div>
        </div>
      </el-scrollbar>
    </div>

    <!-- Cycle Settings Dialog -->
    <el-dialog v-model="showSettings" title="轮次行动值配置" width="400px" append-to-body>
      <div class="settings-content">
        <p class="settings-tip">设置每一轮的行动值上限 (Action Value Limit)</p>
        <div class="cycle-list">
          <div v-for="(av, index) in localCycleAVs" :key="index" class="cycle-setting-item">
            <span class="cycle-label">第 {{ index }} 轮 (Cycle {{ index }})</span>
            <el-input-number v-model="localCycleAVs[index]" :min="50" :max="300" controls-position="right" size="small" />
          </div>
          <el-button type="primary" link @click="addCycleConfig" size="small" style="margin-top: 8px">
             <el-icon><Plus /></el-icon> 添加轮次配置
          </el-button>
        </div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showSettings = false">取消</el-button>
          <el-button type="primary" @click="saveSettings">确认</el-button>
        </span>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue';
import { Timer, Aim, FirstAidKit, Lock, Setting, Plus } from '@element-plus/icons-vue';
import type { BattleEvent } from '../utils/simulator';

const props = defineProps<{
  events: BattleEvent[];
  cycleAVs?: number[];
}>();

const emit = defineEmits<{
  (e: 'select-event', event: BattleEvent): void;
  (e: 'update-cycles', avs: number[]): void;
}>();

const scrollbarRef = ref<any>(null);
const selectedEventId = ref<string>('');

const showSettings = ref(false);
const localCycleAVs = ref<number[]>([]);

const openSettings = () => {
  localCycleAVs.value = props.cycleAVs ? [...props.cycleAVs] : [150, 100, 100, 100, 100];
  showSettings.value = true;
};

const addCycleConfig = () => {
    localCycleAVs.value.push(100);
};

const saveSettings = () => {
    emit('update-cycles', localCycleAVs.value);
    showSettings.value = false;
};

// Auto-scroll to bottom when events update
watch(() => props.events.length, () => {
  nextTick(() => {
    try {
      if (scrollbarRef.value) {
        const wrap = scrollbarRef.value.wrapRef;
        if (wrap) {
          wrap.scrollTop = wrap.scrollHeight;
        }
      }
    } catch (e) {
      console.warn('Auto-scroll failed:', e);
    }
  });
});

function shouldShowCycleDivider(event: BattleEvent, index: number): boolean {
  if (index === 0) return true;
  const prev = props.events[index - 1];
  return event.cycle !== prev.cycle;
}

function getCycleLength(cycle: number): number {
  if (props.cycleAVs && props.cycleAVs[cycle]) {
      return props.cycleAVs[cycle];
  }
  // Fallback if not configured
  if (props.cycleAVs && props.cycleAVs.length > 0) {
      return props.cycleAVs[props.cycleAVs.length - 1];
  }
  return cycle === 0 ? 150 : 100;
}

function getActionTypeName(type: string): string {
  const map: Record<string, string> = {
    'Basic': '普攻',
    'Basic Attack': '普攻',
    'Skill': '战技',
    'Ultimate': '终结技',
    'Talent': '天赋',
    'Technique': '秘技',
    'FollowUp': '追加攻击',
    'Counter': '反击',
    'BattleStart': '战斗开始',
    'TurnStart': '回合开始',
    'Attack': '攻击',
    'Trigger': '触发',
    'Kill': '击杀',
    'Break': '击破',
    'DoT': '持续伤害',
    'Dead': '已倒下',
    'DoT Death': '持续伤害倒下'
  };
  return map[type] || type;
}

function getActionTypeColor(type: string): string {
  switch (type) {
    case 'Ultimate': return 'danger';
    case 'Skill': return 'warning';
    case 'Basic': return 'info';
    case 'Basic Attack': return 'info';
    case 'Counter': return 'success';
    case 'FollowUp': return 'success';
    case 'BattleStart': return '';
    case 'Dead': return 'info';
    case 'DoT Death': return 'info';
    default: return '';
  }
}

function formatAV(av: number): string {
  return Math.floor(av).toString();
}

function getAvatarUrl(event: BattleEvent): string {
  if (event) {
    if (event.avatarId) {
      return `/StarRailRes/icon/avatar/${event.avatarId}.png`;
    }
    if (event.actorId) {
      // Basic fallback
      return `/StarRailRes/icon/avatar/${event.actorId}.png`;
    }
  }
  return '';
}

function selectEvent(event: BattleEvent) {
  selectedEventId.value = event.turn + '_' + event.actorId;
  emit('select-event', event);
}
</script>

<style scoped>
.action-order-card {
  height: 100%;
  display: flex;
  flex-direction: column;
  border: none;
  background: var(--hsr-card-bg);
  border-radius: var(--hsr-radius);
  box-shadow: var(--hsr-shadow);
}

:deep(.el-card__header) {
  padding: 16px 20px;
  border-bottom: 1px solid var(--hsr-border);
}

:deep(.el-card__body) {
  flex: 1;
  overflow: hidden;
  padding: 0;
  min-height: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 16px;
  color: var(--hsr-text-main);
}

.header-icon {
  color: var(--hsr-primary);
}

.action-list-container {
  height: 100%;
}

.timeline-wrapper {
  padding: 10px 16px;
  display: flex;
  flex-direction: column;
}

.cycle-divider {
  display: flex;
  align-items: center;
  margin: 16px 0 12px;
  gap: 12px;
}

.cycle-badge {
  display: flex;
  flex-direction: column;
  background: var(--hsr-primary-dim);
  border: 1px solid var(--hsr-primary);
  border-radius: 4px;
  padding: 2px 8px;
  text-align: center;
  min-width: 80px;
}

.cycle-num {
  font-weight: 700;
  color: var(--hsr-primary);
  font-size: 13px;
}

.cycle-desc {
  font-size: 11px;
  color: var(--hsr-text-light);
}

.cycle-line {
  flex: 1;
  height: 1px;
  background: var(--hsr-border);
}

.action-item {
  display: flex;
  margin-bottom: 8px;
  padding: 8px;
  background: var(--hsr-bg-light);
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.action-item:hover {
  background: var(--hsr-bg-hover);
}

.action-item.is-dead {
  background: var(--hsr-item-bg);
  opacity: 0.6;
  filter: grayscale(1);
}

.av-info {
  width: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  color: var(--hsr-text-light);
}

.av-val {
  font-weight: 700;
  font-size: 14px;
}

.av-label {
  font-size: 10px;
}

.avatar-section {
  margin-right: 12px;
  display: flex;
  align-items: center;
}

.action-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.action-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.actor-name {
  font-weight: 600;
  font-size: 14px;
  color: var(--hsr-text-main);
}

.actor-name.is-enemy {
  color: var(--hsr-danger);
}

.action-stats {
  display: flex;
  gap: 8px;
  font-size: 12px;
}

.stat-item {
  display: flex;
  gap: 4px;
}

.stat-item.damage { color: var(--hsr-danger); }
.stat-item.heal { color: var(--hsr-success); }
.stat-item.shield { color: var(--hsr-primary); }
.stat-item.dead-info { color: var(--hsr-text-light); font-style: italic; }
.stat-item.killed-info { color: var(--hsr-text-main); font-weight: bold; }

.mini-log {
  margin-top: 4px;
  font-size: 11px;
  color: var(--hsr-text-light);
  display: flex;
  flex-direction: column;
}

.details-container {
  padding: 10px;
}

.log-list {
  padding-left: 20px;
  margin: 0;
}

.buff-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.settings-content {
  padding: 10px 0;
}

.settings-tip {
    font-size: 12px;
    color: var(--hsr-text-secondary);
    margin-bottom: 12px;
}

.cycle-list {
    max-height: 300px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.cycle-setting-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 8px;
    background: var(--hsr-bg);
    border-radius: 4px;
}

.cycle-label {
    font-size: 13px;
    color: var(--hsr-text-main);
}
</style>