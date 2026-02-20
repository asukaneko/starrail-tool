<template>
  <el-card class="action-detail-card" :body-style="{ padding: '0px', display: 'flex', flexDirection: 'column', height: '100%' }">
    <template #header>
      <div class="card-header">
        <div class="header-title">
          <el-icon class="header-icon"><DataAnalysis /></el-icon>
          <span>行动详情</span>
        </div>
        <el-tag v-if="event" size="small" :type="getActionTypeColor(event.actionType)">{{ getActionTypeName(event.actionType) }}</el-tag>
      </div>
    </template>
    
    <div v-if="event" class="detail-content">
      <el-scrollbar>
        <div class="detail-container">
          <div class="detail-header-info">
            <div class="actor-info">
              <el-avatar 
                :size="48" 
                :src="getAvatarUrl(event)"
                :style="{ backgroundColor: event.isEnemy ? '#ff7875' : '#409eff' }"
              >
                <span v-if="!getAvatarUrl(event)">{{ event.actorName[0] }}</span>
              </el-avatar>
              <div class="actor-text">
                <span class="actor-name">{{ event.actorName }}</span>
                <span class="action-info">回合: {{ event.characterTurn || event.turn }} | 轮次: {{ event.cycle }}</span>
              </div>
            </div>
            <div class="av-stat">
              <span class="label">当前AV</span>
              <span class="value">{{ Math.floor(event.totalAV) }}</span>
            </div>
          </div>
          
          <div v-if="event.actorSnapshot" class="actor-snapshot">
            <el-divider content-position="left">角色属性</el-divider>
            <el-descriptions :column="3" border size="small">
              <el-descriptions-item label="生命值">{{ event.actorSnapshot.hp }} / {{ event.actorSnapshot.maxHp }}</el-descriptions-item>
              <el-descriptions-item label="攻击力">{{ event.actorSnapshot.atk }}</el-descriptions-item>
              <el-descriptions-item label="防御力">{{ event.actorSnapshot.def }}</el-descriptions-item>
              <el-descriptions-item label="速度">{{ event.actorSnapshot.speed }}</el-descriptions-item>
              <el-descriptions-item label="能量" v-if="event.actorSnapshot.maxEnergy">{{ event.actorSnapshot.energy }} / {{ event.actorSnapshot.maxEnergy }}</el-descriptions-item>
              <el-descriptions-item label="护盾">{{ event.actorSnapshot.shields }}</el-descriptions-item>
              <el-descriptions-item label="韧性" v-if="event.actorSnapshot.maxToughness">{{ event.actorSnapshot.toughness }} / {{ event.actorSnapshot.maxToughness }}</el-descriptions-item>
            </el-descriptions>
          </div>

          <el-divider content-position="left">数据统计</el-divider>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="伤害">{{ Math.floor(event.damage || 0) }}</el-descriptions-item>
            <el-descriptions-item label="削韧">{{ Math.floor(event.toughnessDamage || 0) }}</el-descriptions-item>
            <el-descriptions-item label="治疗">{{ Math.floor(event.heal || 0) }}</el-descriptions-item>
            <el-descriptions-item label="护盾">{{ Math.floor(event.shieldGain || 0) }}</el-descriptions-item>
            <el-descriptions-item label="战技点变化">{{ event.spChange }}</el-descriptions-item>
            <el-descriptions-item label="能量">
              {{ Math.floor(event.currentEnergy || 0) }}
              <span v-if="event.energyChange" style="margin-left: 4px; color: #67C23A; font-weight: bold;">
                ({{ event.energyChange > 0 ? '+' : '' }}{{ event.energyChange }})
              </span>
            </el-descriptions-item>
          </el-descriptions>

          <div v-if="event.damageDetails && event.damageDetails.length > 0" class="damage-breakdown">
             <el-divider content-position="left">伤害构成</el-divider>
             <el-table :data="event.damageDetails" size="small" stripe border style="width: 100%">
               <el-table-column prop="target" label="目标" />
               <el-table-column prop="damage" label="数值" width="80">
                 <template #default="scope">
                   {{ Math.floor(scope.row.damage) }}
                 </template>
               </el-table-column>
               <el-table-column prop="element" label="属性" width="80" />
               <el-table-column label="类型" width="100">
                  <template #default="scope">
                     {{ getActionTypeName(scope.row.type) }}
                     <el-tag v-if="scope.row.isCrit" type="danger" size="small" effect="plain" style="margin-left: 4px">暴击</el-tag>
                  </template>
               </el-table-column>
             </el-table>
          </div>

          <el-divider content-position="left">效果日志</el-divider>
          <ul class="log-list">
            <li v-for="(log, idx) in event.effectLog" :key="idx">{{ log }}</li>
            <li v-if="!event.effectLog || event.effectLog.length === 0" class="empty-log">无效果记录</li>
          </ul>

          <el-divider content-position="left">当前Buff</el-divider>
          <div class="buff-tags">
            <el-tag v-for="buff in event.buffs" :key="buff.id" class="buff-tag" size="small">
              {{ buff.name }} ({{ buff.duration }}回合)
            </el-tag>
            <span v-if="!event.buffs || event.buffs.length === 0" class="empty-buff">无生效Buff</span>
          </div>
        </div>
      </el-scrollbar>
    </div>
    <div v-else class="empty-state">
      <el-empty description="请选择左侧行动序列查看详情" />
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { DataAnalysis } from '@element-plus/icons-vue';
import type { BattleEvent } from '../utils/simulator';

defineProps<{
  event: BattleEvent | null;
}>();

function getActionTypeName(type: string | undefined): string {
  if (!type) return '未知';
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
    'DoT': '持续伤害'
  };
  return map[type] || type;
}

function getActionTypeColor(type: string | undefined): string {
  if (!type) return '';
  switch (type) {
    case 'Ultimate': return 'danger';
    case 'Skill': return 'warning';
    case 'Basic': return 'info';
    case 'Basic Attack': return 'info';
    case 'Counter': return 'success';
    case 'FollowUp': return 'success';
    case 'BattleStart': return '';
    default: return '';
  }
}

function getAvatarUrl(event: BattleEvent): string {
  if (event.isEnemy) return ''; 
  if (event.avatarId) {
    return `/StarRailRes/icon/avatar/${event.avatarId}.png`;
  }
  if (event.actorId) {
    return `/StarRailRes/icon/avatar/${event.actorId}.png`;
  }
  return '';
}
</script>

<style scoped>
.action-detail-card {
  height: 100%;
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
  font-weight: bold;
}

.detail-content {
  flex: 1;
  overflow: hidden;
  background-color: var(--hsr-card-bg);
}

.detail-container {
  padding: 16px;
}

.detail-header-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.actor-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.actor-text {
  display: flex;
  flex-direction: column;
}

.actor-name {
  font-size: 16px;
  font-weight: bold;
  color: var(--hsr-text-main);
}

.action-info {
  font-size: 12px;
  color: var(--hsr-text-secondary);
}

.av-stat {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.av-stat .label {
  font-size: 12px;
  color: var(--hsr-text-secondary);
}

.av-stat .value {
  font-size: 20px;
  font-weight: bold;
  color: #409eff;
}

.damage-breakdown {
  margin-top: 16px;
}

.log-list {
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: 13px;
  color: var(--hsr-text-secondary);
  line-height: 1.6;
}

.log-list li {
  margin-bottom: 4px;
  padding-left: 12px;
  position: relative;
}

.log-list li::before {
  content: "•";
  position: absolute;
  left: 0;
  color: var(--hsr-text-light);
}

.empty-log, .empty-buff {
  color: var(--hsr-text-light);
  font-style: italic;
  font-size: 12px;
  padding-left: 0 !important;
}

.empty-log::before {
  content: none !important;
}

.buff-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: #909399;
}
</style>
