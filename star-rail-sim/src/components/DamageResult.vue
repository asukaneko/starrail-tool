<template>
  <el-card class="damage-result-card" shadow="never">
    <template #header>
      <div class="card-header">
        <div class="header-title">
          <el-icon class="header-icon"><DataAnalysis /></el-icon>
          <span>伤害计算器 (Damage Calculator)</span>
        </div>
      </div>
    </template>
    
    <div class="result-content">
      <!-- Manual Input Section -->
      <div class="input-section">
        <el-collapse v-model="activeCollapse">
          <el-collapse-item title="基础倍率配置 (Base Multipliers)" name="1">
            <el-alert title="提示：若角色技能为多段或对多目标，请将倍率加和后填入" type="info" show-icon :closable="false" style="margin-bottom: 12px" />
            <div class="input-grid">
              <div class="input-item">
                <span class="label">攻击倍率 (ATK%)</span>
                <el-input-number v-model="config.skillAtk" :step="10" :precision="0" size="small" controls-position="right" />
              </div>
              <div class="input-item">
                <span class="label">生命倍率 (HP%)</span>
                <el-input-number v-model="config.skillHp" :step="10" :precision="0" size="small" controls-position="right" />
              </div>
              <div class="input-item">
                <span class="label">防御倍率 (DEF%)</span>
                <el-input-number v-model="config.skillDef" :step="10" :precision="0" size="small" controls-position="right" />
              </div>
              <div class="input-item">
                <span class="label">固定伤害 (Flat)</span>
                <el-input-number v-model="config.skillFlat" :step="100" :precision="0" size="small" controls-position="right" />
              </div>
            </div>
          </el-collapse-item>
          <el-collapse-item title="通用乘区配置 (General Multipliers)" name="2">
            <div class="input-grid">
              <div class="input-item">
                <span class="label">增伤区 (Dmg Boost %)</span>
                <el-input-number v-model="config.dmgBoost" :step="0.1" :precision="1" size="small" controls-position="right" />
              </div>
              <div class="input-item">
                <span class="label">暴击率 (Crit Rate %)</span>
                <el-input-number v-model="config.critRate" :step="0.1" :precision="1" size="small" controls-position="right" />
              </div>
              <div class="input-item">
                <span class="label">暴伤区 (Crit Dmg %)</span>
                <el-input-number v-model="config.critDmg" :step="0.1" :precision="1" size="small" controls-position="right" />
              </div>
              <div class="input-item">
                <span class="label">减防区 (Def Red %)</span>
                <el-input-number v-model="config.defReduction" :step="0.1" :precision="1" size="small" controls-position="right" />
              </div>
              <div class="input-item">
                <span class="label">抗性穿透 (Res Pen %)</span>
                <el-input-number v-model="config.resPen" :step="0.1" :precision="1" size="small" controls-position="right" />
              </div>
               <div class="input-item">
                <span class="label">易伤区 (Vuln %)</span>
                <el-input-number v-model="config.vuln" :step="0.1" :precision="1" size="small" controls-position="right" />
              </div>
               <div class="input-item">
                <span class="label">减伤区 (Dmg Red %)</span>
                <el-input-number v-model="config.dmgRed" :step="0.1" :precision="1" size="small" controls-position="right" />
              </div>
              <div class="input-item">
                <span class="label">附加真伤 (True Dmg %)</span>
                <el-input-number v-model="config.trueDmg" :step="10" :precision="0" size="small" controls-position="right" />
              </div>
            </div>
          </el-collapse-item>
          <el-collapse-item title="特殊乘区配置 (Special Multipliers)" name="4">
            <div class="input-grid">
               <div class="input-item">
                <span class="label">击破特攻 (Break Effect %)</span>
                <el-input-number v-model="config.breakEffect" :step="0.1" :precision="1" size="small" controls-position="right" />
              </div>
              <div class="input-item">
                <span class="label">DoT 倍率 (DoT ATK%)</span>
                <el-input-number v-model="config.dotAtk" :step="10" :precision="0" size="small" controls-position="right" />
              </div>
            </div>
          </el-collapse-item>
          <el-collapse-item title="欢愉配置 (Elation Config)" name="5">
            <div class="input-grid">
               <div class="input-item">
                <span class="label">欢愉倍率 (Motion Value %)</span>
                <el-input-number v-model="config.elationMotionValue" :step="10" :precision="0" size="small" controls-position="right" />
              </div>
              <div class="input-item">
                <span class="label">笑点 (Humor %)</span>
                <el-input-number v-model="config.humor" :step="10" :precision="0" size="small" controls-position="right" />
              </div>
              <div class="input-item">
                <span class="label">欢愉度 (Elation %)</span>
                <el-input-number v-model="config.elation" :step="10" :precision="0" size="small" controls-position="right" />
              </div>
              <div class="input-item">
                <span class="label">增笑度 (Amusement %)</span>
                <el-input-number v-model="config.amusement" :step="5" :precision="0" size="small" controls-position="right" />
              </div>
               <div class="input-item">
                <span class="label">欢愉穿透 (Res Pen %)</span>
                <el-input-number v-model="config.elationResPen" :step="5" :precision="0" size="small" controls-position="right" />
              </div>
               <div class="input-item">
                <span class="label">欢愉无视防御 (Def Ignore %)</span>
                <el-input-number v-model="config.elationDefIgnore" :step="5" :precision="0" size="small" controls-position="right" />
              </div>
            </div>
          </el-collapse-item>
          <el-collapse-item title="敌人配置 (Enemy Config)" name="3">
            <div class="input-grid">
              <div class="input-item">
                <span class="label">敌人等级 (Level)</span>
                <el-input-number v-model="config.enemyLevel" :min="1" :max="100" size="small" controls-position="right" />
              </div>
              <div class="input-item">
                <span class="label">敌人抗性 (Res %)</span>
                <el-input-number v-model="config.enemyRes" :step="10" size="small" controls-position="right" />
              </div>
              <div class="input-item">
                <span class="label">是否击破 (Broken)</span>
                <el-switch v-model="config.isBroken" active-text="是" inactive-text="否" size="small" />
              </div>
            </div>
          </el-collapse-item>
        </el-collapse>
      </div>

      <el-divider content-position="center">伤害计算结果</el-divider>

      <el-tabs v-model="activeResultTab" type="border-card" class="result-tabs">
        <!-- 1. 直伤计算 -->
        <el-tab-pane label="直伤 (Direct)" name="direct">
            <div class="formula-container">
                <!-- Base DMG -->
                <div class="formula-group">
                  <div class="formula-term base">
                    <div class="term-value">{{ formatNumber(results.direct.baseDmg) }}</div>
                    <div class="term-label">基础伤害</div>
                    <div class="term-desc">ATK*{{ config.skillAtk || 0 }}% + HP*{{ config.skillHp || 0 }}% + ...</div>
                  </div>
                </div>

                <div class="operator">×</div>

                <!-- Dmg Boost -->
                <div class="formula-group">
                  <div class="formula-term">
                    <div class="term-value">{{ results.direct.dmgBoost?.toFixed(2) }}</div>
                    <div class="term-label">增伤区</div>
                  </div>
                </div>

                <div class="operator">×</div>

                <!-- Crit Mult -->
                <div class="formula-group">
                  <div class="formula-term">
                    <div class="term-value crit-highlight">{{ results.direct.critMult?.toFixed(2) }}</div>
                    <div class="term-label">双爆区 (期望)</div>
                  </div>
                </div>

                <div class="operator">×</div>

                <!-- Def Mult -->
                <div class="formula-group">
                  <div class="formula-term">
                    <div class="term-value">{{ results.direct.defMult.toFixed(2) }}</div>
                    <div class="term-label">防御区</div>
                  </div>
                </div>
                
                <div class="operator">×</div>

                <!-- Res Mult -->
                <div class="formula-group">
                  <div class="formula-term">
                    <div class="term-value">{{ results.direct.resMult.toFixed(2) }}</div>
                    <div class="term-label">抗性区</div>
                  </div>
                </div>

                <div class="operator">×</div>
                
                <!-- Vuln Mult -->
                <div class="formula-group">
                  <div class="formula-term">
                    <div class="term-value">{{ results.direct.vulnMult.toFixed(2) }}</div>
                    <div class="term-label">易伤区</div>
                  </div>
                </div>

                <div class="operator">×</div>

                <!-- True Dmg Mult -->
                <div class="formula-group">
                  <div class="formula-term">
                    <div class="term-value">{{ results.direct.trueDmgMult?.toFixed(2) }}</div>
                    <div class="term-label">真伤区</div>
                  </div>
                </div>

                <div class="operator">=</div>

                <!-- Result -->
                <div class="formula-group result">
                     <div class="term-value highlight">{{ formatNumber(results.direct.final) }}</div>
                     <div class="term-label">期望伤害</div>
                </div>
            </div>
             <div style="text-align: center; color: var(--hsr-text-secondary); margin-top: 10px;">
                * 假设满爆伤害: {{ formatNumber(results.direct.final / (results.direct.critMult || 1) * (1 + (config.critDmg || character.stats.critDmg)/100)) }}
            </div>
        </el-tab-pane>
        
        <!-- 2. 击破伤害 -->
        <el-tab-pane label="击破 (Break)" name="break">
            <div class="formula-container">
                <!-- Base DMG -->
                <div class="formula-group">
                  <div class="formula-term base">
                    <div class="term-value">{{ formatNumber(results.break.baseDmg) }}</div>
                    <div class="term-label">击破基数</div>
                    <div class="term-desc">
                        Lv.{{ character.level }} + {{ character.element }} + MaxToughness
                    </div>
                  </div>
                </div>

                <div class="operator">×</div>

                <!-- Def Mult -->
                <div class="formula-group">
                  <div class="formula-term">
                    <div class="term-value">{{ results.break.defMult.toFixed(2) }}</div>
                    <div class="term-label">防御区</div>
                  </div>
                </div>
                
                <div class="operator">×</div>

                <!-- Res Mult -->
                <div class="formula-group">
                  <div class="formula-term">
                    <div class="term-value">{{ results.break.resMult.toFixed(2) }}</div>
                    <div class="term-label">抗性区</div>
                  </div>
                </div>

                <div class="operator">×</div>
                
                 <!-- Vuln Mult -->
                <div class="formula-group">
                  <div class="formula-term">
                    <div class="term-value">{{ results.break.vulnMult.toFixed(2) }}</div>
                    <div class="term-label">易伤区</div>
                  </div>
                </div>

                <div class="operator">=</div>

                <!-- Result -->
                <div class="formula-group result">
                     <div class="term-value highlight">{{ formatNumber(results.break.final) }}</div>
                     <div class="term-label">击破伤害</div>
                </div>
            </div>
            <div style="text-align: center; color: var(--hsr-text-secondary); margin-top: 10px;">
                * 击破伤害不吃双暴和普通增伤
            </div>
        </el-tab-pane>
        
        <!-- 3. DoT 伤害 -->
        <el-tab-pane label="持续 (DoT)" name="dot">
            <div class="formula-container">
                <!-- Base DMG -->
                <div class="formula-group">
                  <div class="formula-term base">
                    <div class="term-value">{{ formatNumber(results.dot.baseDmg) }}</div>
                    <div class="term-label">基础区</div>
                     <div class="term-desc">
                        ATK*{{ config.dotAtk || 0 }}%
                    </div>
                  </div>
                </div>

                <div class="operator">×</div>
                
                 <!-- Dmg Boost -->
                <div class="formula-group">
                  <div class="formula-term">
                    <div class="term-value">{{ (results.dot.dmgBoost || 1).toFixed(2) }}</div>
                    <div class="term-label">增伤区</div>
                  </div>
                </div>

                <div class="operator">×</div>

                <!-- Def Mult -->
                <div class="formula-group">
                  <div class="formula-term">
                    <div class="term-value">{{ results.dot.defMult.toFixed(2) }}</div>
                    <div class="term-label">防御区</div>
                  </div>
                </div>
                
                <div class="operator">×</div>

                <!-- Res Mult -->
                <div class="formula-group">
                  <div class="formula-term">
                    <div class="term-value">{{ results.dot.resMult.toFixed(2) }}</div>
                    <div class="term-label">抗性区</div>
                  </div>
                </div>

                <div class="operator">×</div>
                
                 <!-- Vuln Mult -->
                <div class="formula-group">
                  <div class="formula-term">
                    <div class="term-value">{{ results.dot.vulnMult.toFixed(2) }}</div>
                    <div class="term-label">易伤区</div>
                  </div>
                </div>

                <div class="operator">=</div>

                <!-- Result -->
                <div class="formula-group result">
                     <div class="term-value highlight">{{ formatNumber(results.dot.final) }}</div>
                     <div class="term-label">DoT 伤害</div>
                </div>
            </div>
             <div style="text-align: center; color: var(--hsr-text-secondary); margin-top: 10px;">
                * DoT 伤害不吃双暴
            </div>
        </el-tab-pane>

        <!-- 4. Elation Damage -->
        <el-tab-pane label="欢愉 (Elation)" name="followUp">
             <div class="formula-container">
                <!-- Base -->
                <div class="formula-group">
                  <div class="formula-term base">
                    <div class="term-value">{{ formatNumber(results.followUp.baseDmg) }}</div>
                    <div class="term-label">基础伤害</div>
                    <div class="term-desc">Lv.Base * MV</div>
                  </div>
                </div>
                
                <div class="operator">×</div>

                <!-- Crit -->
                <div class="formula-group">
                  <div class="formula-term">
                    <div class="term-value">{{ results.followUp.critMult?.toFixed(2) }}</div>
                    <div class="term-label">双爆区</div>
                  </div>
                </div>

                <div class="operator">×</div>

                <!-- Humor -->
                <div class="formula-group">
                  <div class="formula-term">
                    <div class="term-value">{{ results.followUp.humorMult?.toFixed(2) }}</div>
                    <div class="term-label">笑点区</div>
                  </div>
                </div>

                <div class="operator">×</div>

                <!-- Elation -->
                <div class="formula-group">
                  <div class="formula-term">
                    <div class="term-value">{{ results.followUp.elationMult?.toFixed(2) }}</div>
                    <div class="term-label">欢愉度</div>
                  </div>
                </div>

                <div class="operator">×</div>

                <!-- Amusement -->
                 <div class="formula-group">
                  <div class="formula-term">
                    <div class="term-value">{{ results.followUp.amusementMult?.toFixed(2) }}</div>
                    <div class="term-label">增笑度</div>
                  </div>
                </div>
                
                <div class="operator">×</div>

                <!-- Res/Def/Vuln -->
                 <div class="formula-group">
                  <div class="formula-term">
                    <div class="term-value">{{ results.followUp.resMult.toFixed(2) }}</div>
                    <div class="term-label">抗性</div>
                  </div>
                </div>
                
                <div class="operator">×</div>

                 <div class="formula-group">
                  <div class="formula-term">
                    <div class="term-value">{{ results.followUp.defMult.toFixed(2) }}</div>
                    <div class="term-label">防御</div>
                  </div>
                </div>

                 <div class="operator">×</div>

                 <div class="formula-group">
                  <div class="formula-term">
                    <div class="term-value">{{ results.followUp.vulnMult.toFixed(2) }}</div>
                    <div class="term-label">易伤</div>
                  </div>
                </div>

                <div class="operator">×</div>

                 <div class="formula-group">
                  <div class="formula-term">
                    <div class="term-value">{{ results.followUp.trueDmgMult?.toFixed(1) }}</div>
                    <div class="term-label">真伤</div>
                  </div>
                </div>

                <div class="operator">=</div>

                <!-- Result -->
                <div class="formula-group result">
                     <div class="term-value highlight">{{ formatNumber(results.followUp.final) }}</div>
                     <div class="term-label">欢愉伤害</div>
                </div>
             </div>
        </el-tab-pane>

      </el-tabs>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { DataAnalysis } from '@element-plus/icons-vue';
import { Character } from '../models/Character';
import { Enemy } from '../models/Enemy';
import { DamageCalculator } from '../utils/calculator';

const props = defineProps<{
  character: Character,
  enemy: Enemy,
  skillMultiplier: number,
  config: any
}>();

const emit = defineEmits(['update:config']);

const activeCollapse = computed({
  get: () => props.config.activeCollapse || ['1', '2'],
  set: (val) => emit('update:config', { ...props.config, activeCollapse: val })
});

const activeResultTab = ref('direct');

const results = computed(() => {
  if (!props.character || !props.enemy) return { 
      direct: { final: 0, defMult: 0, resMult: 0, vulnMult: 0, dmgRedMult: 0, brokenMult: 0 },
      break: { final: 0, defMult: 0, resMult: 0, vulnMult: 0, dmgRedMult: 0, brokenMult: 0 },
      dot: { final: 0, defMult: 0, resMult: 0, vulnMult: 0, dmgRedMult: 0, brokenMult: 0 },
      followUp: { final: 0, defMult: 0, resMult: 0, vulnMult: 0, dmgRedMult: 0, brokenMult: 0 },
      directExpected: 0,
      followUpExpected: 0
  };

  // Common True Damage Multiplier (1 + config.trueDmg/100)
  const trueDmgMult = 1 + ((props.config.trueDmg || 0) / 100);
  const configWithTrueDmg = { ...props.config, trueDmgMult };

  // 1. Direct Damage
  const direct = DamageCalculator.calculateDirectDamage(
      props.character,
      props.enemy,
      props.skillMultiplier,
      0, // bonusDmg already in config or character stats
      0, // extraDmg
      configWithTrueDmg
  );

  // 2. Break Damage
  const breakDmg = DamageCalculator.calculateBreakDamage(
      props.character,
      props.enemy,
      props.config
  );

  // 3. DoT Damage
  const dotDmg = DamageCalculator.calculateDoTDamage(
      props.character,
      props.enemy,
      props.config.dotAtk ? props.config.dotAtk / 100 : 1.0, // Default 100% if not set
      props.config
  );

  // 4. Elation Damage
  const followUpDmg = DamageCalculator.calculateElationDamage(
      props.character,
      props.enemy,
      configWithTrueDmg
  );

  // Calculate Expected Values
  const currentCritRate = props.config.critRate !== undefined ? props.config.critRate / 100 : (props.character.critRate !== undefined ? props.character.critRate : props.character.stats.critRate);
  
  const directNormal = direct.final / (direct.critMult || 1);
  const directExpected = directNormal * (1 - currentCritRate) + direct.final * currentCritRate;
  
  // Elation also has Crit, so we can show expected? 
  // calculateElationDamage returns 'final' as expected (crit mult included) if I used (1 + CR*CD).
  // Yes, I used average crit multiplier in calculator.ts. So 'final' is expected.

  return {
    direct,
    break: breakDmg,
    dot: dotDmg,
    followUp: followUpDmg,
    directExpected,
    followUpExpected: followUpDmg.final // It's already expected
  };
});

const formatNumber = (num: number) => {
  return Math.floor(num || 0).toLocaleString();
};
</script>

<style scoped>
.damage-result-card {
  height: 100%;
  display: flex;
  flex-direction: column;
  border: none;
  background: var(--hsr-card-bg);
  border-radius: var(--hsr-radius);
  box-shadow: var(--hsr-shadow);
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

.result-content {
  padding: 24px;
}

.input-section {
  margin-bottom: 20px;
}

.input-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
}

.input-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.input-item .label {
  font-size: 12px;
  color: var(--hsr-text-secondary);
}

/* Formula Styles */
.formula-container {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
  padding: 16px;
  background: var(--hsr-bg);
  border-radius: 8px;
  justify-content: center;
}

.crit-row {
  background: rgba(245, 108, 108, 0.1);
}

.formula-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 60px;
}

.formula-term {
  text-align: center;
}

.term-value {
  font-family: 'Roboto Mono', monospace;
  font-weight: 700;
  font-size: 18px;
  color: var(--hsr-text-main);
}

.term-value.highlight {
  color: var(--hsr-primary);
  font-size: 24px;
}

.term-value.crit-highlight {
  color: #f56c6c;
  font-size: 24px;
}

.term-label {
  font-size: 12px;
  color: var(--hsr-text-secondary);
  margin-top: 4px;
}

.term-desc {
  font-size: 10px;
  color: var(--hsr-secondary);
}

.operator {
  font-size: 20px;
  color: var(--hsr-text-secondary);
  font-weight: bold;
}

.result-tabs {
  min-height: 200px;
}
</style>
