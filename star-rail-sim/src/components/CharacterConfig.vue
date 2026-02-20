
<template>
  <div class="character-config">
    <el-form :model="character" label-position="top" size="default" class="config-form">
      
      <!-- Identity Section -->
      <div class="form-section">
        <div class="section-header">
          <div class="section-icon"><el-icon><User /></el-icon></div>
          <span class="section-label">基础信息 (Basic Info)</span>
        </div>
        <div class="form-grid">
          <el-form-item label="名称 (Name)">
            <el-input v-model="character.name" placeholder="角色名" />
          </el-form-item>
          <el-form-item label="等级 (Level)">
            <el-input-number v-model="character.stats.level" :min="1" :max="80" controls-position="right" style="width: 100%" />
          </el-form-item>
          <el-form-item label="使用秘技 (Use Technique)">
             <el-switch v-model="character.useTechnique" active-text="ON" inactive-text="OFF" />
          </el-form-item>
        </div>
      </div>

      <!-- Stats Section (Moved here) -->
      <div class="form-section">
        <div class="section-header">
          <div class="section-icon"><el-icon><Histogram /></el-icon></div>
          <span class="section-label">基础属性 (Basic Stats)</span>
        </div>
        <div class="form-grid">
          <el-form-item label="生命值 (HP)">
            <el-input-number v-model="character.stats.hp" :min="1" :step="100" :precision="1" controls-position="right" style="width: 100%" />
          </el-form-item>
          <el-form-item label="防御力 (DEF)">
            <el-input-number v-model="character.stats.def" :min="0" :step="10" :precision="1" controls-position="right" style="width: 100%" />
          </el-form-item>
        </div>
        <div class="form-grid">
          <el-form-item>
            <template #label>
              <div class="stat-label">
                <span>攻击力 (ATK)</span>
                <span class="stat-total" v-if="character.totalAtk">Total: {{ character.totalAtk.toFixed(1) }}</span>
              </div>
            </template>
            <el-input-number v-model="character.stats.atk" :min="0" :step="10" :precision="1" controls-position="right" style="width: 100%" />
          </el-form-item>
          <el-form-item>
            <template #label>
              <div class="stat-label">
                <span>速度 (SPD)</span>
                <span class="stat-total" v-if="character.totalSpeed">Total: {{ character.totalSpeed.toFixed(1) }}</span>
              </div>
            </template>
            <el-input-number v-model="character.stats.speed" :min="0" :step="1" :precision="1" controls-position="right" style="width: 100%" />
          </el-form-item>
        </div>
      </div>

      <!-- Skill Levels Section -->
      <div class="form-section">
        <div class="section-header">
          <div class="section-icon"><el-icon><Reading /></el-icon></div>
          <span class="section-label">技能等级 (Skill Levels)</span>
        </div>
        <div class="form-grid">
          <div v-for="skill in character.activeSkills" :key="skill.id" class="skill-level-item">
            <el-form-item :label="getSkillLabel(skill)">
              <el-input-number 
                v-model="character.skillLevels[skill.id]" 
                :min="1" 
                :max="getMaxLevel(skill)" 
                controls-position="right"
                style="width: 100%" 
              />
            </el-form-item>
          </div>
        </div>
      </div>

      <!-- Advanced Stats Section -->
      <div class="form-section">
        <div class="section-header">
          <div class="section-icon"><el-icon><TrendCharts /></el-icon></div>
          <span class="section-label">进阶属性 (Advanced Stats)</span>
        </div>
        <div class="form-grid">
          <el-form-item label="击破特攻 (Break Effect)">
            <el-input-number v-model="character.stats.breakEffect" :step="0.05" :min="0" controls-position="right" style="width: 100%" :precision="2" />
          </el-form-item>
          <el-form-item label="欢愉度 (Joy)">
             <el-input-number v-model="character.stats.joy" :step="1" :min="0" controls-position="right" style="width: 100%" />
          </el-form-item>
        </div>
        <div class="form-grid">
          <el-form-item label="治疗加成 (Healing)">
            <el-input-number v-model="character.stats.outgoingHealing" :step="0.05" :min="0" controls-position="right" style="width: 100%" :precision="2" />
          </el-form-item>
          <el-form-item label="能量恢复 (ERR)">
            <el-input-number v-model="character.stats.energyRegen" :step="0.01" :min="0" controls-position="right" style="width: 100%" :precision="2" />
          </el-form-item>
        </div>
        <div class="form-grid">
          <el-form-item label="效果命中 (EHR)">
            <el-input-number v-model="character.stats.effectHitRate" :step="0.05" :min="0" controls-position="right" style="width: 100%" :precision="2" />
          </el-form-item>
          <el-form-item label="效果抵抗 (Effect RES)">
            <el-input-number v-model="character.stats.effectRes" :step="0.05" :min="0" controls-position="right" style="width: 100%" :precision="2" />
          </el-form-item>
        </div>
      </div>

      <!-- Crit Section -->
      <div class="form-section">
        <div class="section-header">
          <div class="section-icon"><el-icon><Aim /></el-icon></div>
          <span class="section-label">双暴配置 (Crit Stats)</span>
        </div>
        <div class="form-grid">
          <el-form-item>
            <template #label>
              <div class="stat-label">
                <span>暴击率 (Crit Rate)</span>
                <span class="stat-total" v-if="character.critRate">Total: {{ (character.critRate * 100).toFixed(1) }}%</span>
              </div>
            </template>
            <el-input-number 
              v-model="character.stats.critRate" 
              :step="0.01" :min="0" :max="1" 
              controls-position="right"
              style="width: 100%" 
              :precision="2"
            />
          </el-form-item>
          <el-form-item>
            <template #label>
              <div class="stat-label">
                <span>暴击伤害 (Crit Dmg)</span>
                <span class="stat-total" v-if="character.critDmg">Total: {{ (character.critDmg * 100).toFixed(1) }}%</span>
              </div>
            </template>
            <el-input-number 
              v-model="character.stats.critDmg" 
              :step="0.1" :min="0" 
              controls-position="right"
              style="width: 100%" 
              :precision="2"
            />
          </el-form-item>
        </div>
      </div>

      <!-- Eidolons Section -->
      <div class="form-section">
        <div class="section-header">
          <div class="section-icon"><el-icon><Star /></el-icon></div>
          <span class="section-label">星魂 (Eidolons)</span>
        </div>
        <div class="form-grid">
          <el-form-item label="星魂等级 (Rank)">
             <el-radio-group v-model="eidolonRank" @change="handleEidolonChange" size="small">
                <el-radio-button :label="0">0</el-radio-button>
                <el-radio-button :label="1">1</el-radio-button>
                <el-radio-button :label="2">2</el-radio-button>
                <el-radio-button :label="3">3</el-radio-button>
                <el-radio-button :label="4">4</el-radio-button>
                <el-radio-button :label="5">5</el-radio-button>
                <el-radio-button :label="6">6</el-radio-button>
             </el-radio-group>
          </el-form-item>
        </div>
      </div>

      <!-- Bonus Section -->
      <div class="form-section">
        <div class="section-header">
          <div class="section-icon"><el-icon><TrendCharts /></el-icon></div>
          <span class="section-label">增益乘区 (Bonus Multipliers)</span>
        </div>
        <div class="form-grid col-1">
          <el-form-item label="增伤区 (Damage Boost)">
            <el-input-number 
              v-model="character.stats.dmgBoost" 
              :step="0.1" :min="0" 
              controls-position="right"
              style="width: 100%" 
              :precision="2"
            />
            <div class="form-tip">Sum of Elemental Dmg + All Dmg Bonus</div>
          </el-form-item>
          <el-form-item label="抗性穿透 (Res PEN)">
            <el-input-number 
              v-model="character.stats.resPen" 
              :step="0.05" :min="0" :max="1" 
              controls-position="right"
              style="width: 100%" 
              :precision="2"
            />
          </el-form-item>
        </div>
      </div>

      <!-- Buffs Section -->
      <div class="form-section">
        <div class="section-header">
          <div class="section-icon"><el-icon><MagicStick /></el-icon></div>
          <span class="section-label">增益效果 (Buffs)</span>
          <el-button 
            type="primary" 
            link 
            size="small" 
            style="margin-left: auto;"
            @click="openBuffDialog"
          >
            <el-icon><Plus /></el-icon> Add
          </el-button>
        </div>
        
        <div v-if="character.buffs.length === 0" class="empty-buffs">
          暂无增益 (No active buffs)
        </div>
        
        <div v-else class="buff-list">
          <div v-for="(buff, index) in character.buffs" :key="buff.id" class="buff-item">
            <div class="buff-info">
              <span class="buff-name">{{ buff.name }}</span>
              <span class="buff-val">
                {{ buff.type }}: +{{ buff.isPercentage ? (buff.value * 100).toFixed(1) + '%' : buff.value }}
              </span>
            </div>
            <el-button 
              type="danger" 
              link 
              size="small" 
              @click="removeBuff(index)"
            >
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
        </div>
      </div>

    </el-form>

    <!-- Add Buff Dialog -->
    <el-dialog v-model="showBuffDialog" title="添加增益 (Add Buff)" width="30%" append-to-body>
      <el-form :model="newBuff" label-position="top">
        <el-form-item label="名称 (Name)">
          <el-input v-model="newBuff.name" placeholder="Optional" />
        </el-form-item>
        <el-form-item label="类型 (Type)">
          <el-select v-model="newBuff.type" style="width: 100%">
            <el-option 
              v-for="type in buffTypes" 
              :key="type.value" 
              :label="type.label" 
              :value="type.value" 
              />
          </el-select>
        </el-form-item>
        <el-form-item label="数值 (Value)">
          <div style="display: flex; gap: 10px; align-items: center;">
            <el-input-number 
              v-model="newBuff.value" 
              :step="newBuff.isPercentage ? 0.01 : 1" 
              style="flex: 1" 
            />
            <el-switch 
              v-model="newBuff.isPercentage" 
              active-text="%" 
              inactive-text="Flat" 
            />
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showBuffDialog = false">取消 (Cancel)</el-button>
          <el-button type="primary" @click="addBuff">确认 (Add)</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue';
import { User, Histogram, Aim, TrendCharts, MagicStick, Plus, Delete, Star, Reading } from '@element-plus/icons-vue';

const props = defineProps({
  character: {
    type: Object,
    required: true
  }
});

const getSkillLabel = (skill: any) => {
  return `${skill.type_text} (${skill.name})`;
};

const getMaxLevel = (skill: any) => {
  if (skill.type === 'Normal') return 6;
  if (['BPSkill', 'Ultra', 'Talent'].includes(skill.type)) return 12;
  if (['ServantSkill', 'ServantTalent'].includes(skill.type)) return 7;
  return 10;
};

const eidolonRank = ref(0);

watch(() => props.character, (newVal) => {
    if (newVal) {
        eidolonRank.value = newVal.activeEidolons ? newVal.activeEidolons.length : 0;
    }
}, { immediate: true, deep: true });

const handleEidolonChange = (val: number) => {
    if (props.character && props.character.setEidolonRank) {
        props.character.setEidolonRank(val);
    }
};

// Buff Management
const showBuffDialog = ref(false);
const newBuff = reactive({
  name: '',
  type: 'Atk',
  value: 0,
  isPercentage: true,
  duration: 2
});

const buffTypes = [
  { label: '攻击力 (Atk)', value: 'Atk' },
  { label: '防御力 (Def)', value: 'Def' },
  { label: '速度 (Speed)', value: 'Speed' },
  { label: '暴击率 (CritRate)', value: 'CritRate' },
  { label: '暴击伤害 (CritDmg)', value: 'CritDmg' },
  { label: '增伤 (DmgBoost)', value: 'DmgBoost' },
  { label: '抗性穿透 (ResPen)', value: 'ResPen' }
];

const openBuffDialog = () => {
  newBuff.name = '';
  newBuff.value = 0;
  newBuff.type = 'Atk';
  newBuff.isPercentage = true;
  showBuffDialog.value = true;
};

const addBuff = () => {
  const buffName = newBuff.name || `${newBuff.type} Buff`;
  
  props.character.buffs.push({
    id: `buff_${Date.now()}`,
    name: buffName,
    type: newBuff.type,
    value: newBuff.value,
    isPercentage: newBuff.isPercentage,
    duration: newBuff.duration,
    source: 'Manual'
  });
  
  showBuffDialog.value = false;
};

const removeBuff = (index) => {
  props.character.buffs.splice(index, 1);
};
</script>

<style scoped>
.character-config {
  padding: 0;
}

.form-section {
  background: var(--hsr-section-bg);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  border: 1px solid transparent;
  transition: all 0.2s;
}

.form-section:hover {
  background: var(--hsr-section-bg-hover);
  border-color: var(--hsr-border);
  box-shadow: var(--hsr-shadow);
}

.section-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.section-icon {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: var(--hsr-primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.section-label {
  font-weight: 600;
  font-size: 14px;
  color: var(--hsr-text-main);
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-grid.col-1 {
  grid-template-columns: 1fr;
}

:deep(.el-form-item__label) {
  font-size: 12px;
  color: var(--hsr-text-secondary);
  padding-bottom: 4px;
  line-height: 1.2;
}

.form-tip {
  font-size: 11px;
  color: var(--hsr-text-secondary);
  margin-top: 4px;
}

.stat-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.stat-total {
  font-size: 12px;
  color: var(--hsr-primary);
  font-weight: 600;
  margin-left: 8px;
}

.empty-buffs {
  font-size: 12px;
  color: var(--hsr-text-secondary);
  text-align: center;
  padding: 8px 0;
}

.buff-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.buff-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--hsr-item-bg);
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 12px;
}

.buff-info {
  display: flex;
  flex-direction: column;
}

.buff-name {
  font-weight: 600;
  color: var(--hsr-text-main);
}

.buff-val {
  color: var(--hsr-text-secondary);
}
</style>
