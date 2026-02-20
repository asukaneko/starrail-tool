
export enum ElementType {
  Physical = 'Physical',
  Fire = 'Fire',
  Ice = 'Ice',
  Lightning = 'Lightning',
  Wind = 'Wind',
  Quantum = 'Quantum',
  Imaginary = 'Imaginary'
}

export enum DamageType {
  Normal = 'Normal', // 直伤
  Break = 'Break',   // 击破
  SuperBreak = 'SuperBreak', // 超击破
  DoT = 'DoT',       // 持续伤害
  Additional = 'Additional' // 附加伤害
}

export interface Stats {
  level: number;
  hp: number;
  atk: number;
  def: number;
  speed: number;
  critRate: number;
  critDmg: number;
  breakEffect: number;
  outgoingHealing: number;
  maxEnergy: number;
  energyRegen: number;
  effectHitRate: number;
  effectRes: number;
  joy: number; // 欢愉度
  dmgBoost: number;
  resPen: number; // Resistance Penetration
}

export interface ActionUnit {
  id: string;
  name: string;
  isEnemy: boolean;
  isSummon?: boolean;
  summonerId?: string;
  speed: number;
  currentAV: number; // 当前剩余行动值
  baseAV: number;    // 基础行动值 (10000/speed)
  color: string;     // UI展示颜色
  avatar?: string;   // Optional avatar/icon identifier
  isDead?: boolean;  // Whether the unit is defeated
}

export interface ActionEffect {
  type: 'Damage' | 'Heal' | 'Shield' | 'Buff' | 'Debuff' | 'ActionAdvance' | 'EnergyRestore' | 'Summon' | 'UpdateTalentCounter';
  targetType: 'Self' | 'Target' | 'AllAllies' | 'AllEnemies' | 'RandomEnemy' | 'Summoner';
  value?: number; // Base value or multiplier
  paramIndex?: number; // Index in SkillConfig.params to override value
  flatParamIndex?: number; // Index in SkillConfig.params to override flatValue
  scaling?: 'Atk' | 'Def' | 'Hp' | 'Speed' | 'Break'; // Scaling stat
  scalingValue?: number; // Multiplier for scaling stat
  flatValue?: number; // Flat addition
  element?: ElementType; // For damage
  buff?: Buff & { scaling?: string, scalingValue?: number, flatValue?: number }; // Extended Buff definition
  debuff?: Debuff; // For debuff application
  summonConfig?: SummonConfig; // Configuration for the summoned unit
  chance?: number; // Base chance to apply (0-1)
  duration?: number;
  conditionType?: 'TargetHasDebuffType' | 'TargetHasDebuffName' | 'TargetHpLessThan' | 'TargetHpGreaterThan' | 'SourceLastAttackCrit' | 'TalentCounterGreaterEqual' | 'Always'; 
  conditionValue?: any;
  requiredEidolon?: number; // Only active if rank >= this value
  toughnessDamage?: number; // Toughness reduction amount
  
  // For UpdateTalentCounter
  counterKey?: string;
  counterValue?: number; // Amount to add
  counterReset?: boolean; // If true, reset to value instead of adding
}

export interface SummonConfig {
  name: string;
  baseSpeed: number; // Base speed of the summon
  inheritSpeed?: boolean; // Whether to inherit summoner's speed
  inheritStats?: boolean; // Whether to inherit other stats
  initialAV?: number; // 0 for immediate action
  skill: SkillConfig; // The action the summon performs
  
  // New fields for Remembrance / Targetable Summons
  hasHp?: boolean; // Whether summon has its own HP
  hpRatio?: number; // Ratio of Summoner's MaxHP (e.g. 0.5 for 50%)
  baseTaunt?: number; // Base Taunt Value (Aggro)
  canBeTargeted?: boolean; // Whether it can be targeted by enemies
  initialZone?: 'Field' | 'OffField'; // Initial zone status
  fixedStats?: Partial<Stats>; // Fixed stats if inheritStats is false
  
  // Dynamic Speed/Stats
  speedScaling?: boolean;
  speedPerStack?: number;
  stackSource?: string; // Key in summoner.talentCounters
  minStacks?: number;
  maxStacks?: number;
  resetStacksAfterAction?: boolean;
  resetStacksTo?: number;
}

export interface DamageDetail {
  target: string;
  damage: number;
  element: string;
  isCrit: boolean;
  type?: string; // 'Damage', 'Break', 'DoT'
}

export interface SkillConfig {
  id: string;
  name: string;
  type: 'Basic' | 'Skill' | 'Ultimate' | 'Talent' | 'Technique' | 'Maze';
  targetType: 'Single' | 'AoE' | 'Bounce' | 'Self' | 'Ally';
  effects: ActionEffect[];
  energyGain: number;
  spChange: number;
  toughnessDamage: number;
}

export interface ActionOutput {
  damage: number;       // Raw outgoing damage (Atk * Multiplier * DmgBoost * Crit)
  toughness: number;    // Toughness reduction
  element: ElementType;
  spChange: number;
  energyChange: number;
  hits: number;         // Number of hits (for animation/mechanics)
  isAoE: boolean;
  targetId?: string;    // If specific target
  applyBuffs?: Buff[];  // Buffs to apply to self/allies
  applyDebuffs?: Debuff[]; // Debuffs to apply to targets
  resPen: number;       // Resistance Penetration to apply
  
  // New structured effects list for simulator to process
  effects?: ActionEffect[]; 
}

export interface TriggerCondition {
  type: 'SelfHasShield' | 'TargetHasShield' | 'TargetHasDebuff' | 'TargetHpLessThan' | 'SourceCrit' | 'EidolonUnlocked' | 'Chance' | 'DebuffType' | 'SourceAbilityType' | 'TechniqueActive' | 'SourceIsMySummon';
  value?: any;
  param?: any; 
}

export interface TriggerAction {
  targetType: 'Self' | 'Target' | 'AllAllies' | 'AllEnemies' | 'Source' | 'RandomEnemy' | 'LowestHpAlly';
  effects: ActionEffect[];
}

export interface TriggerConfig {
  id: string;
  type: 'AllyAttacked' | 'DebuffApplied' | 'BattleStart' | 'TurnStart' | 'Kill' | 'AllyAbilityTarget' | 'AttackEnd';
  conditions?: TriggerCondition[];
  action: TriggerAction;
  maxPerTurn?: number;
  cooldown?: number; // In turns
  requiredEidolon?: number;
  family?: string; // Triggers with same family are mutually exclusive (highest eidolon wins)
}

export interface Buff {
  id: string;
  name: string;
  type: string; // 'Atk', 'Def', 'Speed', 'CritRate', 'CritDmg', 'DmgBoost', 'ResPen'
  value: number; // Percentage (e.g. 0.2 for 20%) or Flat value
  isPercentage: boolean;
  duration: number; // Turns
  source: string; // Character ID or Skill ID
}

export interface Debuff extends Buff {
  isDoT: boolean;
  dotDamage?: number;
}
