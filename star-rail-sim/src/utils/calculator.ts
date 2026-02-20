
import { Character } from '../models/Character';
import { Enemy } from '../models/Enemy';
import { ElementType, DamageType } from '../models/types';

export interface DamageBreakdown {
  baseDmg: number;
  defMult: number;
  resMult: number;
  vulnMult: number;
  dmgRedMult: number;
  brokenMult: number;
  critMult?: number;
  dmgBoost?: number; // (1 + boost)
  final: number;
  
  // Elation specific fields for display
  humorMult?: number;
  elationMult?: number;
  amusementMult?: number;
  trueDmgMult?: number;
}

export interface DamageResult {
  direct: DamageBreakdown;
  break: DamageBreakdown;
  dot: DamageBreakdown;
  followUp: DamageBreakdown;
}

export class DamageCalculator {
  
  // 1. 防御区
  static calculateDefMultiplier(charLevel: number, enemyLevel: number, defReduction: number, defIgnore: number): number {
    // 防御减免公式
    // DefMult = (200 + 10 * charLevel) / (200 + 10 * charLevel + (200 + 10 * enemyLevel) * (1 - defReduction - defIgnore))
    
    const charFactor = 200 + 10 * charLevel;
    const enemyFactor = 200 + 10 * enemyLevel;
    
    // 减防上限 100%
    let totalDefReduction = defReduction + defIgnore;
    if (totalDefReduction > 1) totalDefReduction = 1;
    
    const defMult = charFactor / (charFactor + enemyFactor * (1 - totalDefReduction));
    return defMult;
  }

  // 2. 抗性区
  static calculateResMultiplier(enemyRes: number, resPen: number): number {
    // ResMult = 1 - (Res - ResPen)
    // 基础抗性：有弱点 0%，无弱点 20%
    
    let finalRes = enemyRes - resPen;
    
    // 最终抗性区系数
    let resMult = 1 - finalRes;
    if (resMult > 2.0) resMult = 2.0; // Cap at 200% damage (Res = -100%)
    if (resMult < 0.1) resMult = 0.1; // Cap at 10% damage (Res = 90%)
    
    return resMult;
  }

  // 3. 易伤区
  static calculateVulnMultiplier(vuln: number): number {
    return 1 + vuln;
  }

  // 4. 减伤区
  static calculateDmgRedMultiplier(dmgRed: number): number {
    return 1 - dmgRed;
  }

  // 5. 韧性减伤 (未击破时有10%减伤，即系数0.9)
  static calculateBrokenMultiplier(isBroken: boolean): number {
    return isBroken ? 1.0 : 0.9;
  }

  // 6. 击破特攻基数 (Level 80)
  static getLevelMultiplier(level: number): number {
    // Simplified lookup table or formula
    // At level 80, approx 3767.55
    if (level >= 80) return 3767.55;
    // Linear approximation for now
    return 3767.55 * (level / 80); 
  }

  // 综合计算直伤
  static calculateDirectDamage(
    character: Character, 
    enemy: Enemy, 
    skillMultiplier: number, // 技能倍率 (e.g. 2.5 for 250%)
    bonusDmg: number, // 额外增伤 (e.g. 0.5 for 50%)
    extraDmg: number, // 附加伤害 (固定值/真实伤害附加)
    config: any // Manual config overrides
  ): DamageBreakdown {
    // 基础伤害区
    const atk = character.totalAtk || character.stats.atk;
    // 假设都是攻击力倍率，实际可能有生命值/防御力倍率，这里简化，或者从 config 传入
    // 如果 config 有 skillAtk/skillHp/skillDef，使用 config
    let baseDmg = 0;
    if (config.skillAtk || config.skillHp || config.skillDef || config.skillFlat) {
        baseDmg = (atk * (config.skillAtk || 0) / 100) + 
                  (character.stats.hp * (config.skillHp || 0) / 100) +
                  (character.stats.def * (config.skillDef || 0) / 100) +
                  (config.skillFlat || 0);
    } else {
        baseDmg = atk * skillMultiplier;
    }
    
    if (extraDmg) baseDmg += extraDmg;
    
    // 增伤区
    let dmgBoost = 1 + character.dmgBoost + bonusDmg;
    if (config.dmgBoost !== undefined) dmgBoost = 1 + (config.dmgBoost / 100);
    
    // 双爆区
    let critMult = 1.0;
    const critRate = config.critRate !== undefined ? config.critRate / 100 : character.stats.critRate;
    const critDmg = config.critDmg !== undefined ? config.critDmg / 100 : character.stats.critDmg;
    
    // Config option to calculate expected damage (average) or crit damage
    // Usually show Expected
    critMult = 1 + (Math.min(1.0, critRate) * critDmg);
    
    // 防御区
    const defReduction = config.defReduction !== undefined ? config.defReduction / 100 : enemy.defReduction;
    const defIgnore = config.defIgnore !== undefined ? config.defIgnore / 100 : 0;
    const defMult = this.calculateDefMultiplier(character.level, config.enemyLevel || enemy.level, defReduction, defIgnore);
    
    // 抗性区
    const enemyRes = config.enemyRes !== undefined ? config.enemyRes / 100 : (enemy.res[character.element] || 0.2);
    const resPen = config.resPen !== undefined ? config.resPen / 100 : character.stats.resPen;
    const resMult = this.calculateResMultiplier(enemyRes, resPen);
    
    // 易伤区
    const vuln = config.vuln !== undefined ? config.vuln / 100 : enemy.vuln;
    const vulnMult = this.calculateVulnMultiplier(vuln);
    
    // 减伤区
    const dmgRed = config.dmgRed !== undefined ? config.dmgRed / 100 : enemy.dmgRed;
    const dmgRedMult = this.calculateDmgRedMultiplier(dmgRed);
    
    // 韧性条减伤
    const isBroken = config.isBroken !== undefined ? config.isBroken : enemy.isBroken;
    const brokenMult = this.calculateBrokenMultiplier(isBroken);
    
    // 真伤乘区 (New request)
    const trueDmgMult = config.trueDmgMult !== undefined ? config.trueDmgMult : 1.0;
    
    const final = baseDmg * dmgBoost * critMult * defMult * resMult * vulnMult * dmgRedMult * brokenMult * trueDmgMult;
    
    return {
      baseDmg,
      defMult,
      resMult,
      vulnMult,
      dmgRedMult,
      brokenMult,
      critMult,
      dmgBoost,
      final,
      trueDmgMult
    };
  }

  // 计算击破伤害
  static calculateBreakDamage(
      character: Character, 
      enemy: Enemy, 
      config: any
  ): DamageBreakdown {
      // Break Damage = Base (Level) * Element Mult * MaxToughness Mult * (1 + Break Effect) * Def * Res * Vuln * Broken (1.0)
      
      const levelMult = this.getLevelMultiplier(character.level);
      
      // Element Multiplier
      let elementMult = 1.0;
      switch (character.element) {
          case ElementType.Physical: elementMult = 2.0; break;
          case ElementType.Fire: elementMult = 2.0; break;
          case ElementType.Ice: elementMult = 1.0; break;
          case ElementType.Lightning: elementMult = 1.0; break;
          case ElementType.Wind: elementMult = 1.5; break;
          case ElementType.Quantum: elementMult = 0.5; break;
          case ElementType.Imaginary: elementMult = 0.5; break;
      }
      
      // Max Toughness Multiplier
      // Standard enemy max toughness ~300 (boss) to ~30 (minion).
      // Formula: 0.5 + (MaxToughness / 120)
      // Note: Enemy max toughness is usually stored as integer (e.g. 100 = 3 bars?)
      // In this sim, 300 = 3 bars (standard boss).
      const maxToughness = config.maxToughness || enemy.maxToughness;
      const maxToughnessMult = 0.5 + (maxToughness / 120);
      
      const breakEffect = config.breakEffect !== undefined ? config.breakEffect / 100 : character.stats.breakEffect;
      
      const baseDmg = levelMult * elementMult * maxToughnessMult * (1 + breakEffect);
      
      // Def
      const defReduction = config.defReduction !== undefined ? config.defReduction / 100 : enemy.defReduction;
      // Break damage ignores some def? No.
      const defMult = this.calculateDefMultiplier(character.level, config.enemyLevel || enemy.level, defReduction, 0);
      
      // Res
      const enemyRes = config.enemyRes !== undefined ? config.enemyRes / 100 : (enemy.res[character.element] || 0.2);
      const resPen = config.resPen !== undefined ? config.resPen / 100 : character.stats.resPen;
      const resMult = this.calculateResMultiplier(enemyRes, resPen); 
      
      // Vuln
      const vuln = config.vuln !== undefined ? config.vuln / 100 : enemy.vuln;
      const vulnMult = this.calculateVulnMultiplier(vuln);
      
      // Dmg Red
      const dmgRed = config.dmgRed !== undefined ? config.dmgRed / 100 : enemy.dmgRed;
      const dmgRedMult = this.calculateDmgRedMultiplier(dmgRed); 

      // Broken Mult - Always 1.0 for Break DMG
      const brokenMult = 1.0;
      
      const final = baseDmg * defMult * resMult * vulnMult * dmgRedMult * brokenMult;
      
      return {
          baseDmg,
          defMult,
          resMult,
          vulnMult,
          dmgRedMult,
          brokenMult,
          dmgBoost: 1 + breakEffect, // Reuse field for Break Effect display
          final
      };
  }

  // 计算 DoT 伤害
  static calculateDoTDamage(
      character: Character,
      enemy: Enemy,
      skillMultiplier: number, // DoT 倍率
      config: any
  ): DamageBreakdown {
      // DoT = Atk * Multiplier * (1 + DmgBoost) * Def * Res * Vuln * DmgRed * Broken
      
      const atk = character.totalAtk || character.stats.atk;
      let baseDmg = atk * skillMultiplier;
      if (config.dotAtk) {
          baseDmg = (atk * config.dotAtk / 100);
      }

      // Dmg Boost
      let dmgBoost = 1 + character.stats.dmgBoost;
      if (config.dmgBoost !== undefined) dmgBoost = 1 + (config.dmgBoost / 100);
      
      // Def
      const defMult = this.calculateDefMultiplier(
        character.level, 
        config.enemyLevel || enemy.level, 
        (config.defReduction !== undefined ? config.defReduction / 100 : enemy.defReduction), 
        0
      );
      
      // Res
      const enemyRes = config.enemyRes !== undefined ? config.enemyRes / 100 : (enemy.res[character.element] || 0.2);
      const resPen = config.resPen !== undefined ? config.resPen / 100 : character.stats.resPen;
      const resMult = this.calculateResMultiplier(enemyRes, resPen);
      
      // Vuln
      const vuln = config.vuln !== undefined ? config.vuln / 100 : enemy.vuln;
      const vulnMult = this.calculateVulnMultiplier(vuln);
      
      // Dmg Red
      const dmgRed = config.dmgRed !== undefined ? config.dmgRed / 100 : enemy.dmgRed;
      const dmgRedMult = this.calculateDmgRedMultiplier(dmgRed);
      
      // Broken
      const isBroken = config.isBroken !== undefined ? config.isBroken : enemy.isBroken;
      const brokenMult = this.calculateBrokenMultiplier(isBroken);
      
      const final = baseDmg * dmgBoost * defMult * resMult * vulnMult * dmgRedMult * brokenMult;
      
      return {
          baseDmg,
          defMult,
          resMult,
          vulnMult,
          dmgRedMult,
          brokenMult,
          dmgBoost,
          final
      };
  }

  // 计算欢愉伤害 (Elation)
  // Formula: Base (7535) * MotionValue * Crit * (1+Humor) * (1+Elation) * (1+Amusement) * Res * Def * Vuln * TrueDmg
  static calculateElationDamage(
    character: Character, 
    enemy: Enemy, 
    config: any
  ): DamageBreakdown {
      // 1. 基础乘区 (Base) ~7535 at Level 80
      const baseValue = 7535 * (character.level / 80); // Linear approximation
      
      // 2. 倍率区 (Motion Value)
      const motionValue = (config.elationMotionValue || 0) / 100; // e.g. 200% -> 2.0
      
      // 3. 双爆区 (Crit)
      const critRate = config.critRate !== undefined ? config.critRate / 100 : character.stats.critRate;
      const critDmg = config.critDmg !== undefined ? config.critDmg / 100 : character.stats.critDmg;
      const critMult = 1 + (Math.min(1.0, critRate) * critDmg); // Average Crit Multiplier
      
      // 4. 笑点区 (Humor) - (1 + humor)
      const humor = (config.humor || 0) / 100; // e.g. 50% -> 0.5
      const humorMult = 1 + humor;
      
      // 5. 欢愉度 (Elation) - (1 + elation)
      const elation = (config.elation || 0) / 100;
      const elationMult = 1 + elation;
      
      // 6. 增笑度 (Amusement) - (1 + amusement)
      const amusement = (config.amusement || 0) / 100;
      const amusementMult = 1 + amusement;
      
      // 7. 抗性区 (Res)
      const enemyRes = config.enemyRes !== undefined ? config.enemyRes / 100 : (enemy.res[character.element] || 0.2);
      const resPen = (config.resPen !== undefined ? config.resPen / 100 : character.stats.resPen) + (config.elationResPen !== undefined ? config.elationResPen / 100 : 0);
      const resMult = this.calculateResMultiplier(enemyRes, resPen);
      
      // 8. 防御区 (Def)
      const defReduction = (config.defReduction !== undefined ? config.defReduction / 100 : enemy.defReduction);
      const defIgnore = (config.elationDefIgnore !== undefined ? config.elationDefIgnore / 100 : 0);
      const defMult = this.calculateDefMultiplier(character.level, config.enemyLevel || enemy.level, defReduction, defIgnore);
      
      // 9. 易伤区 (Vuln)
      const vuln = config.vuln !== undefined ? config.vuln / 100 : enemy.vuln;
      const vulnMult = this.calculateVulnMultiplier(vuln);
      
      // 10. 真伤 (True Dmg) - Assumed 1.0 if not specified
      const trueDmgMult = config.trueDmgMult !== undefined ? config.trueDmgMult : 1.0;
      
      const totalDmg = baseValue * motionValue * critMult * humorMult * elationMult * amusementMult * resMult * defMult * vulnMult * trueDmgMult;
      
      return {
          baseDmg: baseValue * motionValue,
          defMult,
          resMult,
          vulnMult,
          dmgRedMult: 1, // Elation ignores dmg reduction
          brokenMult: 1, // Elation ignores toughness reduction
          critMult,
          dmgBoost: 1, // Not used in this formula (replaced by Humor/Elation/Amusement)
          final: totalDmg,
          humorMult,
          elationMult,
          amusementMult,
          trueDmgMult
      };
  }
}
