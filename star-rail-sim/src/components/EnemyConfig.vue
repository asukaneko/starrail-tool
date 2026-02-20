
<template>
  <div class="enemy-config">
    <el-form :model="enemy" label-position="top" size="default" class="config-form">
      
      <!-- Basic Info Section -->
      <div class="form-section">
        <div class="section-header">
          <div class="section-icon enemy-icon"><el-icon><WarnTriangleFilled /></el-icon></div>
          <span class="section-label">基础信息 (Basic Info)</span>
        </div>
        <div class="form-grid">
          <el-form-item label="名称 (Name)">
            <el-input v-model="enemy.name" placeholder="敌人名" />
          </el-form-item>
          <el-form-item label="等级 (Level)">
            <el-input-number v-model="enemy.level" :min="1" :max="100" controls-position="right" style="width: 100%" />
          </el-form-item>
        </div>
        <div class="form-grid">
          <el-form-item label="速度 (Speed)">
            <el-input-number v-model="enemy.speed" :min="0" controls-position="right" style="width: 100%" />
          </el-form-item>
          <el-form-item label="最大韧性 (Max Toughness)">
            <el-input-number v-model="enemy.maxToughness" :step="10" :min="0" controls-position="right" style="width: 100%" />
          </el-form-item>
        </div>
      </div>

      <!-- Debuff Section -->
      <div class="form-section">
        <div class="section-header">
          <div class="section-icon debuff-icon"><el-icon><CircleCloseFilled /></el-icon></div>
          <span class="section-label">状态与削弱 (Status & Debuffs)</span>
        </div>
        
        <div class="break-switch-container">
          <el-form-item label="击破状态 (Weakness Break)" style="margin-bottom: 0; flex: 1;">
            <div class="switch-wrapper">
              <el-switch 
                v-model="enemy.isBroken" 
                active-text="已击破 (Broken)" 
                inactive-text="未击破 (Normal)" 
                style="--el-switch-on-color: #f56c6c"
              />
            </div>
          </el-form-item>
        </div>
        
        <div class="form-grid" style="margin-top: 16px;">
          <el-form-item label="减防 (Def Reduct)">
            <el-input-number 
              v-model="enemy.defReduction" 
              :step="0.05" :min="0" :max="1" 
              controls-position="right"
              style="width: 100%" 
              :precision="2"
            />
          </el-form-item>
          <el-form-item label="易伤 (Vuln)">
            <el-input-number 
              v-model="enemy.vuln" 
              :step="0.05" :min="0" 
              controls-position="right"
              style="width: 100%" 
              :precision="2"
            />
          </el-form-item>
        </div>
        
        <div class="form-grid col-1">
          <el-form-item label="减伤 (Dmg Reduct)">
            <el-input-number 
              v-model="enemy.dmgRed" 
              :step="0.05" :min="0" :max="1" 
              controls-position="right"
              style="width: 100%" 
              :precision="2"
            />
            <div class="form-tip">Innate Damage Reduction</div>
          </el-form-item>
        </div>
      </div>

    </el-form>
  </div>
</template>

<script setup lang="ts">

import { WarnTriangleFilled, CircleCloseFilled } from '@element-plus/icons-vue';

const props = defineProps({
  enemy: {
    type: Object,
    required: true
  }
});
</script>

<style scoped>
.enemy-config {
  padding: 0;
}

.form-section {
  background: var(--hsr-bg-light);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  border: 1px solid transparent;
  transition: all 0.2s;
}

.form-section:hover {
  background: var(--hsr-card-bg);
  border-color: var(--hsr-border);
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
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
  background: var(--hsr-secondary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.section-icon.enemy-icon {
  background: #f56c6c;
}

.section-icon.debuff-icon {
  background: #e6a23c;
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
  color: #909399;
  margin-top: 4px;
}

.break-switch-container {
  background: var(--hsr-card-bg);
  padding: 12px;
  border-radius: 6px;
  border: 1px solid var(--hsr-border);
}
</style>
