import { Stats, ElementType, ActionOutput, Buff, Debuff, ActionEffect, TriggerCondition, TriggerConfig } from './types';
import { CharacterData, SkillData, EidolonData } from '../types/HonkaiData';
import { DataManager } from '../utils/DataManager';
import { CharacterSkills, CharacterTriggers } from '../data/characters';

export interface DamageConfig {
  skillAtk: number;
  skillHp: number;
  skillDef: number;
  skillFlat: number;
  dmgBoost: number;
  critDmg: number;
  defReduction: number;
  resPen: number;
  vuln: number;
  dmgRed: number;
  enemyLevel: number;
  enemyRes: number;
  isBroken: boolean;
  activeCollapse: string[];
}

export class Character {
  id: string;
  name: string;
  level: number;
  element: ElementType;
  stats: Stats;
  
  // New runtime properties
  currentHp: number;
  currentEnergy: number;
  useTechnique: boolean = true; // Whether to use technique on entry
  data?: CharacterData;
  activeSkills: SkillData[] = [];
  activeEidolons: EidolonData[] = [];
  skillLevels: Record<string, number> = {};
  buffs: Buff[] = [];
  debuffs: Debuff[] = [];
  shields: { id: string, value: number, max: number, duration: number, source: string }[] = [];
  
  // Damage Calculator Config
  damageConfig: DamageConfig;

  // Runtime State for Talents
  talentCooldowns: Record<string, number> = {};
  talentCounters: Record<string, number> = {};
  talentUsageCount: Record<string, number> = {};
  
  // Taunt value
  baseTaunt: number = 100;

  constructor(id: string, name: string, element: ElementType, level: number = 80, data?: CharacterData) {
    this.id = id;
    this.name = name;
    this.level = level;
    
    // Normalize element
    this.element = this.normalizeElement(element);
    
    this.data = data;
    
    // Initialize default stats
    this.stats = {
      level: level,
      hp: 1000,
      atk: 1000,
      def: 500,
      speed: 100,
      critRate: 0.05,
      critDmg: 0.50,
      breakEffect: 0,
      outgoingHealing: 0,
      maxEnergy: data?.max_sp || 100,
      energyRegen: 1.0,
      effectHitRate: 0,
      effectRes: 0,
      joy: 0,
      dmgBoost: 0,
      resPen: 0
    };
    
    // Apply base stats from data if available
    if (data && data.base_stats) {
      this.stats.hp = data.base_stats.hp * (1 + (level - 1) * 0.05); // Approx scaling
      this.stats.atk = data.base_stats.atk * (1 + (level - 1) * 0.05);
      this.stats.def = data.base_stats.def * (1 + (level - 1) * 0.05);
      this.stats.speed = data.base_stats.speed;
      this.stats.critRate = data.base_stats.crit_rate || 0.05;
      this.stats.critDmg = data.base_stats.crit_dmg || 0.50;
    }
    
    this.currentHp = this.stats.hp;
    this.currentEnergy = this.stats.maxEnergy / 2; // Start with 50% energy
    this.shields = [];

    // Default taunt by path
    if (data && data.path) {
        if (data.path === 'Preservation') this.baseTaunt = 150;
        else if (data.path === 'Destruction') this.baseTaunt = 125;
        else if (data.path === 'Hunt' || data.path === 'Erudition') this.baseTaunt = 75;
        else this.baseTaunt = 100; // Harmony, Abundance, Nihility
    }

    // Load skills
    if (data && data.skills) {
      data.skills.forEach(skillId => {
        const skill = DataManager.getSkill(skillId);
        if (skill) {
          this.activeSkills.push(skill);
          
          // Default max level
          let defaultLevel = 1;
          if (skill.type === 'Normal') defaultLevel = 6;
          else if (['BPSkill', 'Ultra', 'Talent'].includes(skill.type)) defaultLevel = 10;
          else if (['ServantSkill', 'ServantTalent'].includes(skill.type)) defaultLevel = 6;
          
          this.skillLevels[skillId] = defaultLevel;
        }
      });
    }

    // Initialize Damage Config
    this.damageConfig = {
      skillAtk: 250,
      skillHp: 0,
      skillDef: 0,
      skillFlat: 0,
      dmgBoost: this.stats.dmgBoost * 100,
      critRate: this.stats.critRate * 100,
      critDmg: this.stats.critDmg * 100,
      defReduction: 0,
      resPen: this.stats.resPen * 100,
      vuln: 0,
      dmgRed: 0,
      enemyLevel: 90,
      enemyRes: 20,
      isBroken: false,
      activeCollapse: ['1', '2']
    };
  }

  private normalizeElement(el: string): ElementType {
    if (el === 'Thunder') return ElementType.Lightning;
    return el as ElementType;
  }

  resetState() {
    this.currentHp = this.stats.hp;
    this.currentEnergy = this.stats.maxEnergy / 2; // Default 50% energy
    this.buffs = []; // Clear buffs
    this.shields = [];
    this.talentCooldowns = {};
    this.talentUsageCount = {};
    this.talentCounters = {};
  }

  onBattleStart(allies: Character[], enemies?: any[]): ActionOutput[] | null {
    const actions: ActionOutput[] = [];
    
    // 1. Battle Start Passive Effects
    const battleStartActions = this.onTrigger('BattleStart', { allies, enemies });
    if (battleStartActions) actions.push(...battleStartActions);

    // 2. Technique (if enabled)
    if (this.useTechnique) {
        const techActions = this.onTrigger('Technique', { allies, enemies });
        if (techActions) {
            actions.push(...techActions);
        }
    }

    return actions.length > 0 ? actions : null;
  }

  // Stat Getters with Buffs
  get totalAtk(): number {
    return this.calculateStat('Atk', this.stats?.atk || 0);
  }

  get totalHp(): number {
    return this.calculateStat('Hp', this.stats?.hp || 0);
  }

  get totalHp(): number {
    return this.calculateStat('Hp', this.stats?.hp || 0);
  }

  get totalDef(): number {
    return this.calculateStat('Def', this.stats?.def || 0);
  }

  get totalSpeed(): number {
    return Math.max(1, this.calculateStat('Speed', this.stats?.speed || 1));
  }

  get critRate(): number {
    let rate = this.calculateStat('CritRate', this.stats?.critRate || 0, true); // additive
    
    // Dan Heng E1: When HP >= 50%, Crit Rate +12%
    if (this.id === '1002' && this.stats && this.stats.hp > 0 && this.currentHp / this.stats.hp >= 0.5) {
        if (this.activeEidolons && this.activeEidolons.some(e => e.rank === 1)) {
            rate += 0.12;
        }
    }
    
    return rate;
  }

  get critDmg(): number {
    return this.calculateStat('CritDmg', this.stats?.critDmg || 0, true); // additive
  }

  get dmgBoost(): number {
    return this.calculateStat('DmgBoost', this.stats?.dmgBoost || 0, true); // additive
  }

  get resPen(): number {
    return this.calculateStat('ResPen', this.stats?.resPen || 0, true); // additive
  }

  private calculateStat(type: string, base: number, isAdditiveRate: boolean = false): number {
    let percent = 0;
    let flat = 0;

    if (this.buffs) {
      this.buffs.forEach(buff => {
        if (buff.type === type) {
          if (buff.isPercentage) percent += buff.value;
          else flat += buff.value;
        }
      });
    }

    if (isAdditiveRate) {
        // For rates like CritRate, base is 0.05, buff is 0.1 (10%)
        // Result should be 0.15
        // If buff value is 0.1 (10%), just add it.
        return base + percent + flat; // flat usually 0 for rates
    }

    // For absolute stats like Atk
    return base * (1 + percent) + flat;
  }

  addBuff(buff: Buff) {
    const existing = this.buffs.find(b => b.id === buff.id);
    if (existing) {
        existing.duration = buff.duration;
        // If value is different, update it? Usually yes.
        if (buff.value !== undefined) existing.value = buff.value;
    } else {
        this.buffs.push(buff);
    }
    // console.log(`[Buff] ${this.name} gained buff: ${buff.name} (${buff.type} +${buff.value})`);
  }

  addDebuff(debuff: Debuff) {
    const existing = this.debuffs.find(d => d.id === debuff.id);
    if (existing) {
      existing.duration = debuff.duration;
      if (debuff.value !== undefined) existing.value = debuff.value;
      if (debuff.dotDamage !== undefined) existing.dotDamage = debuff.dotDamage;
    } else {
      this.debuffs.push({ ...debuff });
    }
  }

  addShield(id: string, value: number, duration: number, source: string) {
    const existing = this.shields.find(s => s.id === id);
    if (existing) {
      existing.value = value; 
      existing.max = value;
      existing.duration = duration;
    } else {
      this.shields.push({ id, value, max: value, duration, source });
    }
  }

  heal(amount: number) {
    this.currentHp = Math.min(this.stats.hp, this.currentHp + amount);
  }

  onDamageTaken(amount: number, energyGain: number = 10): number {
    let remainingDmg = amount;
    
    // Apply Defense Mitigation (Simplified)
    const def = this.totalDef;
    const attackerLevel = 80; 
    const defMult = 1 - (def / (def + 200 + 10 * attackerLevel));
    
    remainingDmg = remainingDmg * defMult;

    if (this.shields) {
      this.shields = this.shields.filter(s => {
        if (remainingDmg <= 0) return true;
        if (s.value >= remainingDmg) {
          s.value -= remainingDmg;
          remainingDmg = 0;
          return true;
        } else {
          remainingDmg -= s.value;
          s.value = 0;
          return false;
        }
      });
    }

    let hpLoss = 0;
    if (remainingDmg > 0) {
      const prevHp = this.currentHp;
      this.currentHp = Math.max(0, this.currentHp - remainingDmg);
      hpLoss = prevHp - this.currentHp;
    }

    // Gain Energy from being hit
    if (energyGain > 0 && this.currentHp > 0) {
        this.addEnergy(energyGain);
    }
    
    return hpLoss;
  }
  
  // Trigger System
  onTrigger(triggerType: string, context: any): ActionOutput[] | null {
      const reactions: ActionOutput[] = [];
      
      const triggers = CharacterTriggers[this.id];
      if (triggers) {
          triggers.forEach(trigger => {
              if (trigger.type === triggerType) {
                  // Check conditions
                  let conditionsMet = true;
                  if (trigger.conditions) {
                      for (const condition of trigger.conditions) {
                          if (condition.type === 'EidolonUnlocked') {
                              if (!this.activeEidolons.some(e => e.rank === condition.value)) {
                                  conditionsMet = false;
                                  break;
                              }
                          } else if (condition.type === 'Chance') {
                              if (Math.random() > condition.value!) {
                                  conditionsMet = false;
                                  break;
                              }
                          } else if (condition.type === 'TargetHasShield') {
                              if (context.target && context.target instanceof Character) {
                                  const shield = context.target.shields.reduce((sum: number, s: any) => sum + s.value, 0);
                                  if (shield <= 0) {
                                      conditionsMet = false;
                                      break;
                                  }
                              } else {
                                  conditionsMet = false;
                                  break;
                              }
                          } else if (condition.type === 'SourceIsMySummon') {
                              // Check if source is a summon owned by this character
                              // Avoid importing Summon class to prevent circular dependency
                              if (context.source && (context.source as any).summoner === this) {
                                  // Condition met
                              } else {
                                  conditionsMet = false;
                                  break;
                              }
                          }
                          // Add more condition checks as needed
                      }
                  }
                  
                  if (conditionsMet) {
                      // Clone action to avoid mutating data
                      const action = JSON.parse(JSON.stringify(trigger.action));
                      action.skillName = trigger.id; // Use trigger ID as skill name for logs
                      reactions.push(action);
                  }
              }
          });
      }
      
      return reactions.length > 0 ? reactions : null;
  }

  // Interface compatibility for Simulator
  takeDamage(amount: number, element: ElementType, toughnessDmg: number, resPen: number = 0, energyGain: number = 10): { damage: number, toughness: number, isBroken: boolean, breakDamage?: number, breakActionDelay?: number, energyGain?: number } {
      const hpLoss = this.onDamageTaken(amount, energyGain);
      return {
          damage: hpLoss,
          toughness: 0, // Characters don't have toughness bar in this sim yet
          isBroken: false,
          breakDamage: 0,
          breakActionDelay: 0,
          energyGain: (this.currentHp > 0 && energyGain > 0) ? energyGain : 0
      };
  }

  addEnergy(amount: number) {
      this.currentEnergy = Math.min(this.stats.maxEnergy, this.currentEnergy + amount * this.stats.energyRegen);
  }

  removeBuff(buffId: string) {
    this.buffs = this.buffs.filter(b => b.id !== buffId);
  }

  tickBuffs() {
    if (this.buffs) {
      this.buffs.forEach(b => b.duration--);
      this.buffs = this.buffs.filter(b => b.duration > 0);
      
      // Handle HealOverTime Buffs
      const hotBuffs = this.buffs.filter(b => b.type === 'HealOverTime');
      hotBuffs.forEach(b => {
          this.heal(b.value);
      });
    }
    
    if (this.shields) {
      this.shields.forEach(s => s.duration--);
      this.shields = this.shields.filter(s => s.duration > 0);
    }

    // Tick Talent Cooldowns
    if (this.talentCooldowns) {
      Object.keys(this.talentCooldowns).forEach(k => {
        if (this.talentCooldowns[k] > 0) this.talentCooldowns[k]--;
      });
    }

    // Reset Turn-based counters
    const triggers = CharacterTriggers[this.id];
    if (triggers) {
        triggers.forEach(t => {
            if (t.maxPerTurn && this.talentCounters && this.talentCounters[t.id]) {
                this.talentCounters[t.id] = 0;
            }
        });
    }
  }

  tickDebuffs(): { damage: number, details: string[] } {
    let totalDamage = 0;
    const details: string[] = [];

    if (this.debuffs) {
      this.debuffs.forEach(d => {
        if (d.isDoT && d.dotDamage) {
          let element = ElementType.Physical;
          // Simple element inference based on name
          if (d.name.includes('Freeze') || d.name.includes('Ice') || d.name.includes('冻结') || d.name.includes('冰')) element = ElementType.Ice;
          else if (d.name.includes('Burn') || d.name.includes('Fire') || d.name.includes('灼烧') || d.name.includes('火')) element = ElementType.Fire;
          else if (d.name.includes('Shock') || d.name.includes('Lightning') || d.name.includes('触电') || d.name.includes('雷')) element = ElementType.Lightning;
          else if (d.name.includes('Wind') || d.name.includes('Shear') || d.name.includes('风化') || d.name.includes('风')) element = ElementType.Wind;
          else if (d.name.includes('Quantum') || d.name.includes('Entanglement') || d.name.includes('纠缠') || d.name.includes('量子')) element = ElementType.Quantum;
          else if (d.name.includes('Imaginary') || d.name.includes('Imprisonment') || d.name.includes('禁锢') || d.name.includes('虚数')) element = ElementType.Imaginary;
          
          const hpLoss = this.onDamageTaken(d.dotDamage, 0);
          totalDamage += hpLoss;
          details.push(`${d.name}: ${Math.floor(hpLoss)}`);
        }
        d.duration--;
      });

      this.debuffs = this.debuffs.filter(d => d.duration > 0);
    }
    
    return { damage: totalDamage, details };
  }
  
  unlockEidolon(rank: number) {
    if (!this.data) return;
    
    // Find eidolon with this rank
    const eidolonId = this.data.ranks.find(id => {
       const e = DataManager.getEidolon(id);
       return e && e.rank === rank;
    });
    
    if (eidolonId) {
      const eidolon = DataManager.getEidolon(eidolonId);
      if (eidolon) {
         // Check if already active
         if (!this.activeEidolons.some(e => e.id === eidolon.id)) {
            this.activeEidolons.push(eidolon);
            this.applyEidolonEffects(eidolon);
         }
      }
    }
  }

  setEidolonRank(rank: number) {
    // Reset eidolons
    this.activeEidolons = [];
    
    // Reset skill levels to 1
    if (this.data && this.data.skills) {
      this.data.skills.forEach(skillId => {
        const skill = DataManager.getSkill(skillId);
        if (skill) {
          // Default max level
          let defaultLevel = 1;
          if (skill.type === 'Normal') defaultLevel = 6;
          else if (['BPSkill', 'Ultra', 'Talent'].includes(skill.type)) defaultLevel = 10;
          else if (['ServantSkill', 'ServantTalent'].includes(skill.type)) defaultLevel = 6;
          
          this.skillLevels[skillId] = defaultLevel;
        }
      });
    }
    
    // Unlock up to rank
    for (let i = 1; i <= rank; i++) {
        this.unlockEidolon(i);
    }
  }


  private applyEidolonEffects(eidolon: EidolonData) {
      // Parse description for level boosts
      // Common patterns: 
      // "终结技等级+2" (Ult +2)
      // "普攻等级+1" (Basic +1)
      // "战技等级+2" (Skill +2)
      // "天赋等级+2" (Talent +2)
      
      const desc = eidolon.desc;
      
      const ultMatch = desc.match(/终结技等级\+(\d+)/);
      if (ultMatch) this.boostSkillLevel('Ultra', parseInt(ultMatch[1]));
      
      const basicMatch = desc.match(/普攻等级\+(\d+)/);
      if (basicMatch) this.boostSkillLevel('Normal', parseInt(basicMatch[1]));
      
      const skillMatch = desc.match(/战技等级\+(\d+)/);
      if (skillMatch) this.boostSkillLevel('BPSkill', parseInt(skillMatch[1]));
      
      const talentMatch = desc.match(/天赋等级\+(\d+)/);
      if (talentMatch) this.boostSkillLevel('Talent', parseInt(talentMatch[1]));
  }
  
  private boostSkillLevel(type: string, amount: number) {
      const skill = this.getSkillByType(type);
      if (skill) {
          if (!this.skillLevels[skill.id]) this.skillLevels[skill.id] = 1;
          this.skillLevels[skill.id] += amount;
          // Cap at 15 usually, but logic allows more for simplicity
          if (this.skillLevels[skill.id] > 15) this.skillLevels[skill.id] = 15;
      }
  }

  // Helper to calculate damage with stats
  private calculateDamage(multiplier: number): number {
    let damage = this.totalAtk * multiplier;
    
    // Dmg Boost
    damage *= (1 + this.dmgBoost);
    
    // Crit
    if (Math.random() < this.critRate) {
      damage *= (1 + this.critDmg);
    }
    
    return damage;
  }

  getSkillByType(type: string): SkillData | undefined {
    return this.activeSkills.find(s => s.type === type);
  }

  // Calculate damage multiplier based on skill level
  calculateMultiplier(skill: SkillData): number {
    const level = this.skillLevels[skill.id] || 1;
    if (skill.params && skill.params.length > 0) {
        // Ensure we don't go out of bounds (use max level data if level exceeds data)
        const index = Math.min(level - 1, skill.params.length - 1);
        if (skill.params[index] && skill.params[index].length > 0) {
            return skill.params[index][0];
        }
    }
    return 1.0;
  }
  
  // Basic Attack
  useBasicAttack(): ActionOutput {
    // 1. Try to use Centralized Skill Config
    const skillType = 'Normal';
    const configEffects = CharacterSkills[this.id]?.[skillType];

    if (configEffects) {
      const resolvedEffects = this.resolveEffects(skillType, configEffects);
      const isAoE = resolvedEffects.some(e => e.targetType === 'AllEnemies' || e.targetType === 'AllAllies');
      
      this.currentEnergy = Math.min(this.stats.maxEnergy, this.currentEnergy + 20);

      return {
        damage: 0, 
        toughness: 30, // Default for Basic
        element: this.element,
        spChange: 1,
        energyChange: 20,
        hits: 1,
        isAoE: isAoE, 
        resPen: this.resPen,
        effects: resolvedEffects
      };
    }

    // 2. Legacy / Fallback Logic
    const skill = this.getSkillByType('Normal');
    let damage = 0;
    let toughness = 30; // Standard Basic
    let element = this.element;
    let multiplier = 1.0;
    
    if (skill) {
      multiplier = this.calculateMultiplier(skill);
      damage = this.calculateDamage(multiplier);
      element = this.normalizeElement(skill.element);
    } else {
      damage = this.calculateDamage(1.0); // Fallback
    }

    this.currentEnergy = Math.min(this.stats.maxEnergy, this.currentEnergy + 20);

    return {
      damage: damage,
      toughness: toughness,
      element: element,
      spChange: 1,
      energyChange: 20,
      hits: 1,
      isAoE: false,
      resPen: this.stats.resPen,
      effects: [
        {
          type: 'Damage',
          targetType: 'Target',
          value: multiplier,
          scaling: 'Atk',
          element: element,
          toughnessDamage: toughness
        }
      ]
    };
  }

  // Skill
  useSkill(): ActionOutput {
    // 1. Try to use Centralized Skill Config
    const skillType = 'BPSkill';
    const configEffects = CharacterSkills[this.id]?.[skillType];

    if (configEffects) {
      const resolvedEffects = this.resolveEffects(skillType, configEffects);
      const isAoE = resolvedEffects.some(e => e.targetType === 'AllEnemies' || e.targetType === 'AllAllies');
      
      // Default Skill Costs
      return {
        damage: 0, // Calculated by effects
        toughness: 60, // Default for Skill
        element: this.element,
        spChange: -1,
        energyChange: 30,
        hits: 1,
        isAoE: isAoE, 
        resPen: this.resPen,
        effects: resolvedEffects
      };
    }

    // 2. Legacy / Fallback Logic
    const skill = this.getSkillByType('BPSkill');
    let damage = 0;
    let toughness = 60; // Standard Skill (2 units)
    let element = this.element;
    let isAoE = false;
    let multiplier = 0;
    
    if (skill) {
      // Check if skill deals damage
      const isAttack = ['SingleAttack', 'AoEAttack', 'Blast', 'Bounce'].includes(skill.effect);
      
      if (isAttack) {
          multiplier = this.calculateMultiplier(skill);
          damage = this.calculateDamage(multiplier);
      } else {
          damage = 0;
          toughness = 0; // Non-attacks don't break toughness
      }
      
      element = this.normalizeElement(skill.element);
      isAoE = ['AoEAttack', 'Blast'].includes(skill.effect);
    }
    
    return {
      damage,
      toughness,
      element,
      spChange: -1,
      energyChange: 30,
      hits: 1,
      isAoE,
      resPen: this.resPen,
      effects: [
        {
          type: 'Damage',
          targetType: 'Target',
          value: multiplier,
          scaling: 'Atk',
          element: element,
          toughnessDamage: toughness
        }
      ]
    };
  }

  // Ultimate
  useUltimate(): ActionOutput | null {
    if (this.currentEnergy < this.stats.maxEnergy) return null;

    // 1. Try to use Centralized Skill Config
    const skillType = 'Ultra';
    const configEffects = CharacterSkills[this.id]?.[skillType];

    if (configEffects) {
       const resolvedEffects = this.resolveEffects(skillType, configEffects);
       const isAoE = resolvedEffects.some(e => e.targetType === 'AllEnemies' || e.targetType === 'AllAllies');
       
       this.currentEnergy = 5; // Reset Energy
 
       return {
         damage: 0,
         toughness: 60, // Default for Ult (often 60 AoE or 90 Single)
         element: this.element,
         spChange: 0,
         energyChange: 5,
         hits: 1,
         isAoE: isAoE, 
         resPen: this.resPen,
         effects: resolvedEffects
       };
     }

    // 2. Legacy Logic
    const skill = this.getSkillByType('Ultra');
    let damage = 0;
    let toughness = 60; 
    let element = this.element;
    let isAoE = false;
    let multiplier = 0;

    if (skill) {
      const isAttack = ['SingleAttack', 'AoEAttack', 'Blast', 'Bounce'].includes(skill.effect);
      if (isAttack) {
          multiplier = this.calculateMultiplier(skill);
          damage = this.calculateDamage(multiplier);
      } else {
          damage = 0;
          toughness = 0;
      }
      
      element = this.normalizeElement(skill.element);
      isAoE = ['AoEAttack', 'Blast'].includes(skill.effect);
    }

    // Reset Energy
    this.currentEnergy = 5; 

    return {
      damage,
      toughness,
      element,
      spChange: 0,
      energyChange: 5,
      hits: 1,
      isAoE,
      resPen: this.resPen,
      effects: [
        {
          type: 'Damage',
          targetType: isAoE ? 'AllEnemies' : 'Target',
          value: multiplier,
          scaling: 'Atk',
          element: element,
          toughnessDamage: toughness
        }
      ]
    };
  }

  private resolveEffects(skillType: string, effects: ActionEffect[]): ActionEffect[] {
    const skill = this.getSkillByType(skillType);
    const level = skill ? (this.skillLevels[skill.id] || 1) : 1;
    
    // Filter effects based on Eidolon requirements
    const activeEffects = effects.filter(effect => {
      if (effect.requiredEidolon === undefined) return true;
      return this.activeEidolons.some(e => e.rank === effect.requiredEidolon);
    });

    return activeEffects.map(effect => {
      // Clone effect to avoid mutating source
      const newEffect = { ...effect };
      
      // Resolve paramIndex
      if (newEffect.paramIndex !== undefined && skill && skill.params && skill.params[level - 1]) {
        const val = skill.params[level - 1][newEffect.paramIndex];
        if (val !== undefined) {
           newEffect.value = val;
        }
      }

      // Resolve flatParamIndex
      if (newEffect.flatParamIndex !== undefined && skill && skill.params && skill.params[level - 1]) {
        const val = skill.params[level - 1][newEffect.flatParamIndex];
        if (val !== undefined) {
           newEffect.flatValue = val;
        }
      }
      
      // Default scaling if not set
      if (newEffect.type === 'Damage' && !newEffect.scaling) newEffect.scaling = 'Atk';
      
      // Calculate Buff Value if scaling is present in buff definition
      if (newEffect.type === 'Buff' && newEffect.buff) {
          const buff = newEffect.buff;
          // Check if buff has scaling instructions
          if (buff.scaling) {
             let base = 0;
             if (buff.scaling === 'Def') base = this.totalDef;
             else if (buff.scaling === 'Atk') base = this.totalAtk;
             else if (buff.scaling === 'Hp') base = this.stats.hp; // Max HP
             
             let val = base * (buff.scalingValue || 0);
             if (buff.flatValue) val += buff.flatValue;
             
             newEffect.buff.value = val;
          }
      }
      
      // Ensure element is set
      if (newEffect.type === 'Damage' && !newEffect.element) newEffect.element = this.element;

      return newEffect;
    });
  }

  // Trigger System
  onTrigger(type: string, context: any): ActionOutput[] | null {
    const triggers = CharacterTriggers[this.id];
    if (!triggers) return null;

    const matchedTriggers = triggers.filter(t => t.type === type);
    if (matchedTriggers.length === 0) return null;

    const outputs: ActionOutput[] = [];

    matchedTriggers.forEach(trigger => {
      // Check conditions
      if (trigger.conditions) {
        const allMet = trigger.conditions.every(c => this.checkCondition(c, context));
        if (!allMet) return;
      }
      
      // Check cooldowns
      if (trigger.cooldown) {
        if (this.talentCooldowns[trigger.id] && this.talentCooldowns[trigger.id] > 0) return;
      }
      
      // Check max activations
      if (trigger.maxActivations) {
        if (!this.talentUsageCount[trigger.id]) this.talentUsageCount[trigger.id] = 0;
        if (this.talentUsageCount[trigger.id] >= trigger.maxActivations) return;
      }

      // Check per-turn count
      if (trigger.maxPerTurn) {
        if (!this.talentCounters[trigger.id]) this.talentCounters[trigger.id] = 0;
        if (this.talentCounters[trigger.id] >= trigger.maxPerTurn) return;
      }

      // Apply costs
      let cooldown = trigger.cooldown;
      // Dan Heng E2: Cooldown -1
      if (this.id === '1002' && trigger.id === 'danheng_talent' && this.activeEidolons.some(e => e.rank === 2)) {
          cooldown = Math.max(0, (cooldown || 0) - 1);
      }
      
      if (cooldown) this.talentCooldowns[trigger.id] = cooldown;
      if (trigger.maxActivations) this.talentUsageCount[trigger.id]++;
      if (trigger.maxPerTurn) this.talentCounters[trigger.id]++;

      // Resolve Action
      const action = trigger.action;
      const targetId = this.resolveTriggerTarget(action.targetType, context);
      
      // Filter effects based on Eidolon requirements
      const validEffects = action.effects.filter(e => {
        if (e.requiredEidolon === undefined) return true;
        // Check if user has this eidolon rank unlocked
        return this.activeEidolons.some(eid => eid.rank >= e.requiredEidolon!);
      });

      outputs.push({
        damage: 0,
        toughness: 0,
        element: this.element,
        spChange: 0,
        energyChange: 0,
        hits: 1,
        isAoE: false,
        resPen: this.stats.resPen,
        targetId: targetId || undefined,
        effects: validEffects
      });
    });

    return outputs.length > 0 ? outputs : null;
  }

  checkCondition(condition: TriggerCondition, context: any): boolean {
    switch (condition.type) {
      case 'SelfHasShield':
        return this.shields.length > 0;
      case 'TargetHasShield':
        return context.target && context.target.shields.length > 0;
      case 'TargetHasDebuff':
        return context.target && context.target.debuffs.length > 0;
      case 'TargetHasDebuffType':
        if (!context.target) return false;
        return context.target.debuffs.some((d: any) => d.type === condition.value);
      case 'TargetHpGreaterThan':
        return context.target && (context.target.currentHp / context.target.stats.hp) > (condition.value || 0);
      case 'TargetHpLessThan':
        return context.target && (context.target.currentHp / context.target.stats.hp) < (condition.value || 1);
      case 'SourceCrit':
      case 'SourceLastAttackCrit':
        return !!context.isCrit;
      case 'EidolonUnlocked':
        return this.activeEidolons.some(e => e.rank >= (condition.value || 0));
      case 'Chance':
        return Math.random() < (condition.value || 0);
      case 'DebuffType':
        return context.debuffType === condition.value;
      case 'SourceAbilityType':
        return context.abilityType === condition.value;
      case 'TechniqueActive':
        return this.useTechnique;
      case 'SourceIsMySummon':
        return context.source && context.source.isSummon && context.source.summoner && context.source.summoner.id === this.id;
      default:
        return false;
    }
  }

  resolveTriggerTarget(targetType: string, context: any): string {
    switch (targetType) {
      case 'Self':
        return this.id;
      case 'Source':
        return context.source ? context.source.id : '';
      case 'Target':
        return context.target ? context.target.id : '';
      case 'RandomEnemy':
        // Needs access to enemy list.
        // We can pass enemies in context.
        if (context.enemies) {
            const enemies = context.enemies as any[];
            if (enemies.length > 0) {
                const rand = enemies[Math.floor(Math.random() * enemies.length)];
                return rand.id;
            }
        }
        return '';
      case 'LowestHpAlly':
        if (context.allies) {
            const allies = context.allies as Character[];
            // Sort by HP %
            const sorted = [...allies].sort((a, b) => (a.currentHp / a.stats.hp) - (b.currentHp / b.stats.hp));
            return sorted[0] ? sorted[0].id : '';
        }
        return '';
      default:
        return '';
    }
  }

}
