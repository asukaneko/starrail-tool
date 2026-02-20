import { Character } from './Character';
import { SummonConfig, ActionOutput, ElementType, ActionEffect, SkillConfig, Stats, Buff } from './types';

export class Summon {
  id: string;
  name: string;
  summoner: Character;
  speed: number;
  currentAV: number;
  baseAV: number;
  config: SummonConfig;
  isDead: boolean = false;
  buffs: Buff[] = []; // Buffs applied to the summon
  
  // Stats for Remembrance Summons
  currentHp: number = 0;
  maxHp: number = 0;
  baseTaunt: number = 0;
  canBeTargeted: boolean = false;
  zone: 'Field' | 'OffField' = 'Field';

  // For compatibility with ActionUnit
  isEnemy: boolean = false;
  isSummon: boolean = true;
  color: string = '#be2ed1'; // Purple/Pink for summon

  constructor(id: string, config: SummonConfig, summoner: Character) {
    this.id = id;
    this.name = config.name;
    this.config = config;
    this.summoner = summoner;
    
    // Initial speed calculation
    this.speed = this.calculateSpeed();
    this.baseAV = 10000 / this.speed;
    
    // Initial AV logic
    if (config.initialAV !== undefined) {
      this.currentAV = config.initialAV;
    } else {
      this.currentAV = this.baseAV;
    }
    
    // Initialize HP and Taunt
    if (config.hasHp) {
        this.maxHp = Math.floor(summoner.stats.hp * (config.hpRatio || 0.5)); // Default 50%
        this.currentHp = this.maxHp;
        this.canBeTargeted = true;
    } else {
        this.maxHp = 0;
        this.currentHp = 0;
        this.canBeTargeted = false;
    }
    
    if (config.baseTaunt !== undefined) {
        this.baseTaunt = config.baseTaunt;
    } else {
        // If has HP, give it some default taunt? Or 0?
        // Default standard taunt is usually 100 for path
        this.baseTaunt = config.hasHp ? 100 : 0;
    }

    if (config.canBeTargeted !== undefined) {
        this.canBeTargeted = config.canBeTargeted;
    }
    
    if (config.initialZone) {
        this.zone = config.initialZone;
    }
  }

  calculateSpeed(): number {
    let speed = this.config.baseSpeed;
    if (this.config.inheritSpeed) {
      speed = this.summoner.totalSpeed;
    }
    
    // Dynamic Speed from Talent Counters (e.g. Jing Yuan's Lightning-Lord)
    if (this.config.speedScaling && this.config.speedPerStack && this.config.stackSource) {
        const stacks = this.summoner.talentCounters[this.config.stackSource] || 0;
        speed += this.config.speedPerStack * stacks;
    }

    return Math.max(1, speed);
  }

  // Called by Simulator when it's this unit's turn
  takeAction(): ActionOutput {
    // Recalculate speed in case summoner's speed changed (if inherited)
    const newSpeed = this.calculateSpeed();
    if (Math.abs(newSpeed - this.speed) > 0.1) {
        this.speed = newSpeed;
        this.baseAV = 10000 / this.speed;
    }

    // Execute the skill defined in config
    const skill = this.config.skill;
    
    // Calculate dynamic hits if applicable
    let hits = 1;
    if (this.config.stackSource && this.summoner.talentCounters[this.config.stackSource]) {
        hits = this.summoner.talentCounters[this.config.stackSource];
        console.log(`[Summon] ${this.name} taking action with ${hits} hits. (Counter: ${this.config.stackSource})`);
    }
    
    // Reset stacks if needed
    if (this.config.resetStacksAfterAction && this.config.stackSource) {
        const oldVal = this.summoner.talentCounters[this.config.stackSource];
        this.summoner.talentCounters[this.config.stackSource] = this.config.resetStacksTo || 0;
        console.log(`[Summon] Resetting stacks for ${this.config.stackSource}: ${oldVal} -> ${this.summoner.talentCounters[this.config.stackSource]}`);
        
        // Also update speed immediately for next turn AV calculation
        // Note: The Simulator will read the new speed after this action completes
    }

    return {
      damage: 0, // Will be calculated by simulator based on effects
      toughness: skill.toughnessDamage * hits, // Toughness scales with hits usually? For LL yes.
      element: this.summoner.element,
      spChange: skill.spChange,
      energyChange: skill.energyGain,
      hits: hits,
      isAoE: skill.targetType === 'AoE',
      effects: skill.effects,
      resPen: this.summoner.stats.resPen // Inherit ResPen from summoner?
    };
  }

  // Helper properties to mimic Character for damage calculation
  // In a real implementation, we might want separate stats for the summon
  get totalAtk() {
    let base = this.config.inheritStats ? this.summoner.totalAtk : (this.config.fixedStats?.atk || 1000);
    // Apply local buffs
    let multiplier = 0;
    let flat = 0;
    this.buffs.forEach(b => {
        if (b.type === 'Atk') {
            if (b.isPercentage) multiplier += b.value;
            else flat += b.value;
        }
    });
    return base * (1 + multiplier) + flat;
  }

  get totalDef() {
    return this.config.inheritStats ? this.summoner.totalDef : (this.config.fixedStats?.def || 500);
  }

  get critRate() {
    let base = this.config.inheritStats ? this.summoner.critRate : (this.config.fixedStats?.critRate || 0.05);
    let val = 0;
    this.buffs.forEach(b => {
        if (b.type === 'CritRate') val += b.value;
    });
    return Math.min(1.0, base + val);
  }

  get critDmg() {
    let base = this.config.inheritStats ? this.summoner.critDmg : (this.config.fixedStats?.critDmg || 0.5);
    let val = 0;
    this.buffs.forEach(b => {
        if (b.type === 'CritDmg') val += b.value;
    });
    return base + val;
  }

  get dmgBoost() {
    let base = this.config.inheritStats ? this.summoner.dmgBoost : (this.config.fixedStats?.dmgBoost || 0);
    let val = 0;
    this.buffs.forEach(b => {
        if (b.type === 'DmgBoost') val += b.value;
    });
    return base + val;
  }
  
  get element() {
      return this.summoner.element;
  }
  
  get level() {
      return this.summoner.level;
  }
  
  // Proxy stats object for Simulator compatibility
  get stats() {
      // Create a proxy that falls back to summoner stats but overrides with local buffs if needed
      // Ideally we should calculate all stats locally, but for now we only care about offensive stats + basic ones
      return {
          hp: this.maxHp || this.summoner.stats.hp,
          atk: this.totalAtk,
          def: this.totalDef,
          speed: this.speed,
          critRate: this.critRate,
          critDmg: this.critDmg,
          breakEffect: this.summoner.stats.breakEffect,
          outgoingHealing: this.summoner.stats.outgoingHealing,
          maxEnergy: 0,
          energyRegen: 0,
          effectHitRate: this.summoner.stats.effectHitRate, // Inherit EHR usually?
          effectRes: this.summoner.stats.effectRes,
          joy: 0,
          dmgBoost: this.dmgBoost,
          resPen: this.summoner.stats.resPen
      };
  }

  addBuff(buff: Buff) {
      this.buffs.push(buff);
  }
  
  removeBuff(id: string) {
      this.buffs = this.buffs.filter(b => b.id !== id);
  }
  
  tickBuffs() {
      // Decrease duration of buffs
      // Summons usually don't have turns in the same way, but if they do:
      this.buffs.forEach(b => {
          if (b.duration > 0) b.duration--;
      });
      this.buffs = this.buffs.filter(b => b.duration > 0);
  }

  // Handle damage taken for Remembrance Summons
  takeDamage(amount: number, element: ElementType, toughnessDmg: number, resPen: number = 0, energyGain: number = 0): { damage: number, toughness: number, isBroken: boolean, breakDamage?: number, breakActionDelay?: number, energyGain?: number } {
      if (!this.config.hasHp) {
          // If no HP, immune to damage (or take 0)
          return {
              damage: 0,
              toughness: 0,
              isBroken: false
          };
      }

      // Simplified damage calculation for Summon
      // Assuming they have summoner's DEF + maybe some mitigation?
      // For now, raw damage or simple mitigation.
      // Use Summoner's DEF for mitigation
      const def = this.totalDef;
      const attackerLevel = 80; 
      const defMult = 1 - (def / (def + 200 + 10 * attackerLevel));
      
      let finalDamage = amount * defMult;
      
      this.currentHp = Math.max(0, this.currentHp - finalDamage);
      
      if (this.currentHp <= 0) {
          this.isDead = true;
      }

      return {
          damage: finalDamage,
          toughness: 0,
          isBroken: false
      };
  }
}
