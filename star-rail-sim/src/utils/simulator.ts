﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿
import { Character } from '../models/Character';
import { Enemy } from '../models/Enemy';
import { Summon } from '../models/Summon';
import { ActionUnit, ActionOutput, Buff, ActionEffect, ElementType, DamageDetail, SummonConfig } from '../models/types';

export interface ActorSnapshot {
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  speed: number;
  sp?: number;
  energy?: number;
  maxEnergy?: number;
  shields?: number;
  toughness?: number;
  maxToughness?: number;
  weaknesses?: ElementType[];
}

export interface BattleEvent {
  turn: number;       // Global turn counter (action count)
  actorName: string;
  actorId: string;
  avCost: number;     // 本次行动消耗的AV (即上一轮的最小AV)
  totalAV: number;    // 当前累计总AV (Action end time)
  isEnemy: boolean;
  cycle: number;      // The cycle this action falls into
  avInCycle: number;  // AV elapsed within the current cycle
  avatarId?: string;  // Original ID for avatar/icon lookup
  
  // New fields for action details
  actionType?: string; // Basic, Skill, Ultimate
  damage?: number;
  damageDetails?: DamageDetail[]; // Breakdown of damage
  targetName?: string;
  toughnessDamage?: number;
  spChange?: number;
  currentSp?: number;
  currentEnergy?: number;
  energyChange?: number;
  buffs?: Buff[];      // Snapshot of buffs at the time of action
  
  // Actor Snapshot
  actorSnapshot?: ActorSnapshot;

  // Extended details
  dotDamage?: number;
  shieldGain?: number;
  heal?: number;
  effectLog?: string[];
  actionAdvance?: number;
  killedUnits?: string[];
  characterTurn?: number; // The Nth turn for this character
}

export class BattleSimulator {
  units: ActionUnit[] = [];
  unitMap: Map<string, Character | Enemy | Summon> = new Map();
  currentTotalAV: number = 0;
  events: BattleEvent[] = [];
  maxActions: number = 50; // Limit total actions simulated
  skillPoints: number = 3;
  
  // Track turn count per unit
  unitTurnCounts: Map<string, number> = new Map();
  
  // Cycle Configuration
  cycleAVs: number[] = [150, 100, 100, 100, 100, 100, 100, 100, 100, 100]; // Default values

  constructor(characters: Character[], enemies: Enemy[]) {
    this.reset(characters, enemies);
  }

  setCycleAVs(avs: number[]) {
    this.cycleAVs = [...avs];
  }

  reset(characters: Character[], enemies: Enemy[]) {
    this.units = [];
    this.unitMap.clear();
    this.currentTotalAV = 0;
    this.events = [];
    this.skillPoints = 3;
    this.unitTurnCounts.clear();

    // 鍒濆鍖栬鑹插崟浣?
    characters.forEach((char, index) => {
      // Reset character state before simulation
      char.resetState();
      
      const id = char.id || `char_${index}`;
      this.unitMap.set(id, char);
      
      const speed = char.totalSpeed;
      const baseAV = 10000 / speed;
      this.units.push({
        id: id,
        name: char.name,
        isEnemy: false,
        speed: speed,
        baseAV: baseAV,
        currentAV: baseAV, // 鍒濆AV
        color: this.getCharacterColor(index)
      });
    });

    // 鍒濆鍖栨晫浜哄崟浣?
    enemies.forEach((enemy, index) => {
      const id = enemy.id || `enemy_${index}`;
      this.unitMap.set(id, enemy);
      
      const speed = enemy.speed;
      const baseAV = 10000 / speed;
      this.units.push({
        id: id,
        name: enemy.name,
        isEnemy: true,
        speed: speed,
        baseAV: baseAV,
        currentAV: baseAV,
        color: '#ff4d4f' // 绾㈣壊
      });
    });

    // 鍒濆鎺掑簭
    this.sortUnits();

    // Trigger BattleStart (Techniques, Talents, etc.)
    characters.forEach(char => {
        // Use the character's internal method to gather all start-of-battle actions
        const startActions = char.onBattleStart(characters, enemies);
        
        if (startActions && startActions.length > 0) {
            startActions.forEach(action => {
                let targetUnit: Character | Enemy | null = null;
                if (action.targetId) {
                    targetUnit = this.unitMap.get(action.targetId) as Character | Enemy;
                }
                
                // Process effects
                // Note: actionType is passed as 'BattleStart' generally, but individual actions might be 'Technique'
                // The onBattleStart combines them. We can infer type if needed, but 'BattleStart' covers the phase.
                const result = this.processActionEffects(char, action.effects || [], targetUnit, { actionType: 'BattleStart' });
                
                // Record logs
                if (result.logs.length > 0) {
                    this.events.push({
                        turn: 0,
                        actorName: char.name,
                        actorId: char.id,
                        avatarId: char.data ? char.data.id : undefined,
                        avCost: 0,
                        totalAV: 0,
                        isEnemy: false,
                        cycle: 0,
                        avInCycle: 0,
                        actionType: 'BattleStart',
                        effectLog: result.logs,
                        actionAdvance: result.actionAdvance,
                        damage: result.damage,
                        toughnessDamage: result.toughness,
                        shieldGain: result.shield,
                        heal: result.heal,
                        damageDetails: result.damageDetails,
                        killedUnits: result.killedUnits
                    });
                }
            });
        }
    });
  }

  getCharacterColor(index: number): string {
    const colors = ['#337ecc', '#52c41a', '#faad14', '#722ed1'];
    return colors[index % colors.length];
  }

  sortUnits() {
    // Sort by currentAV ascending
    this.units.sort((a, b) => {
      if (Math.abs(a.currentAV - b.currentAV) < 0.0001) {
        // If AV is equal, player characters prioritize over enemies
        if (a.isEnemy !== b.isEnemy) return a.isEnemy ? 1 : -1;
        // If same type, sort by ID for stability
        return a.id.localeCompare(b.id);
      }
      return a.currentAV - b.currentAV;
    });
  }

  handleUnitDeath(unitId: string) {
    const idx = this.units.findIndex(u => u.id === unitId);
    if (idx !== -1) {
      this.units[idx].isDead = true;
      // Remove from action queue to prevent further turns
      this.units.splice(idx, 1);
    }
  }

  // Calculate which cycle a given AV belongs to
  getCycleInfo(av: number): { cycle: number, avInCycle: number, cycleEndAV: number } {
    let accumulatedAV = 0;
    
    for (let i = 0; i < this.cycleAVs.length; i++) {
        const cycleDuration = this.cycleAVs[i];
        if (av <= accumulatedAV + cycleDuration) {
            return {
                cycle: i,
                avInCycle: av - accumulatedAV,
                cycleEndAV: accumulatedAV + cycleDuration
            };
        }
        accumulatedAV += cycleDuration;
    }
    
    // Fallback if exceeds configured cycles (assume last configured value or 100)
    const lastDuration = this.cycleAVs[this.cycleAVs.length - 1] || 100;
    const remainingAV = av - accumulatedAV;
    const extraCycles = Math.floor(remainingAV / lastDuration);
    
    return {
        cycle: this.cycleAVs.length + extraCycles,
        avInCycle: remainingAV % lastDuration,
        cycleEndAV: accumulatedAV + (extraCycles + 1) * lastDuration
    };
  }

  getAndIncrementTurn(unitId: string): number {
    const current = this.unitTurnCounts.get(unitId) || 0;
    this.unitTurnCounts.set(unitId, current + 1);
    return current + 1;
  }

  getAndIncrementTurn(unitId: string): number {
    const current = this.unitTurnCounts.get(unitId) || 0;
    this.unitTurnCounts.set(unitId, current + 1);
    return current + 1;
  }

  createActorSnapshot(unit: Character | Enemy | Summon): ActorSnapshot {
    if (unit instanceof Character) {
      const shieldTotal = unit.shields.reduce((sum, s) => sum + s.value, 0);
      return {
        hp: Math.floor(unit.currentHp),
        maxHp: Math.floor(unit.stats.hp),
        atk: Math.floor(unit.totalAtk),
        def: Math.floor(unit.totalDef),
        speed: Math.floor(unit.totalSpeed),
        sp: this.skillPoints,
        energy: Math.floor(unit.currentEnergy),
        maxEnergy: Math.floor(unit.stats.maxEnergy),
        shields: Math.floor(shieldTotal)
      };
    } else if (unit instanceof Enemy) {
      return {
        hp: Math.floor(unit.currentHp),
        maxHp: Math.floor(unit.maxHp),
        atk: 0,
        def: 0,
        speed: Math.floor(unit.speed),
        toughness: Math.floor(unit.currentToughness),
        maxToughness: Math.floor(unit.maxToughness),
        weaknesses: unit.weaknesses,
        shields: 0
      };
    } else if (unit instanceof Summon) {
        return {
            hp: 0,
            maxHp: 0,
            atk: Math.floor(unit.totalAtk),
            def: Math.floor(unit.totalDef),
            speed: Math.floor(unit.speed),
            sp: this.skillPoints,
            energy: 0,
            maxEnergy: 0,
            shields: 0
        };
    }
    return {} as ActorSnapshot;
  }

  // 模拟下一步行动
  nextStep(): BattleEvent | null {
    if (this.events.length >= this.maxActions) return null;

    // Check if any characters are alive
    const aliveCharacters = this.units.filter(u => !u.isEnemy && !u.isDead);
    if (aliveCharacters.length === 0) {
        return null; // Stop simulation if all characters defeated
    }

    // 1. Check for Ultimates (Insert Action)
    // Find first character with full energy
    const readyUltChar = Array.from(this.unitMap.values()).find(u => 
      u instanceof Character && !u.isDead && u.currentEnergy >= u.stats.maxEnergy
    ) as Character | undefined;

    if (readyUltChar) {
      // Execute Ultimate immediately
      // Do not advance AV, but record event
      const actionResult = this.executeUltimateAction(readyUltChar);
      const actorSnapshot = this.createActorSnapshot(readyUltChar);
      
      const event: BattleEvent = {
        turn: this.events.length + 1,
        characterTurn: this.getAndIncrementTurn(readyUltChar.id),
        actorName: readyUltChar.name,
        actorId: readyUltChar.id,
        avatarId: readyUltChar.data ? readyUltChar.data.id : undefined,
        avCost: 0, // Instant action
        totalAV: this.currentTotalAV,
        isEnemy: false,
        cycle: this.getCycleInfo(this.currentTotalAV).cycle,
        avInCycle: this.getCycleInfo(this.currentTotalAV).avInCycle,
        buffs: JSON.parse(JSON.stringify(readyUltChar.buffs || [])), // Snapshot buffs
        actorSnapshot,
        ...actionResult
      };
      this.events.push(event);
      return event;
    }

    // 2. Normal Turn Logic
    let activeUnit: ActionUnit | undefined;
     while (this.units.length > 0) {
         this.sortUnits();
         activeUnit = this.units[0];
         if (activeUnit.isDead) {
              this.handleUnitDeath(activeUnit.id);
              activeUnit = undefined;
              continue;
         }
         break;
     }
     if (!activeUnit) return null;
    
    // The amount of AV to advance is the currentAV of the first unit
    const deltaAV = activeUnit.currentAV;

    // 3. Time passes
    this.units.forEach(unit => {
      unit.currentAV -= deltaAV;
      if (unit.currentAV < 0) unit.currentAV = 0;
    });

    // 4. Update Total AV
    this.currentTotalAV += deltaAV;

    // Execute Action
    const actor = this.unitMap.get(activeUnit.id);
    if (!actor) {
        console.error(`Unit ${activeUnit.id} not found in unitMap`);
        return null; // Skip this turn or handle error
    }
    
    let actionResult: Partial<BattleEvent> = {};
    let currentBuffs: Buff[] = [];
    
    if (actor instanceof Character) {
      currentBuffs = JSON.parse(JSON.stringify(actor.buffs || []));
      actionResult = this.executeCharacterAction(actor);
    } else if (actor instanceof Enemy) {
      currentBuffs = JSON.parse(JSON.stringify(actor.debuffs || []));
      actionResult = this.executeEnemyAction(actor);
    } else if (actor instanceof Summon) {
      actionResult = this.executeSummonAction(actor);
    }

    const actorSnapshot = this.createActorSnapshot(actor);

    // Calculate Cycle Info
    const { cycle, avInCycle } = this.getCycleInfo(this.currentTotalAV);

    // 5. Record Event
    const event: BattleEvent = {
      turn: this.events.length + 1,
      characterTurn: this.getAndIncrementTurn(activeUnit.id),
      actorName: activeUnit.name,
      actorId: activeUnit.id,
      avatarId: (actor instanceof Character) ? actor.data?.id : undefined,
      avCost: deltaAV,
      totalAV: this.currentTotalAV,
      isEnemy: activeUnit.isEnemy,
      cycle: cycle,
      avInCycle: avInCycle,
      buffs: currentBuffs,
      actorSnapshot,
      ...actionResult
    };
    this.events.push(event);

    // 6. Reset AV
    // Re-fetch speed from actor to account for dynamic buffs
    const currentActor = this.unitMap.get(activeUnit.id);
    let currentSpeed = activeUnit.speed;
    if (currentActor instanceof Character) {
      currentSpeed = currentActor.totalSpeed;
    } else if (currentActor instanceof Enemy) {
      currentSpeed = currentActor.speed;
    } else if (currentActor instanceof Summon) {
      currentSpeed = currentActor.speed;
    }
    
    // Update unit speed for next turn calculation
    activeUnit.speed = Math.max(1, currentSpeed);
    activeUnit.currentAV = 10000 / activeUnit.speed;

    // Apply Action Advance from turn actions
    if (actionResult && actionResult.actionAdvance) {
        const reduction = activeUnit.currentAV * actionResult.actionAdvance;
        activeUnit.currentAV = Math.max(0, activeUnit.currentAV - reduction);
        if (event.effectLog) {
            event.effectLog.push(`行动提前 ${Math.floor(actionResult.actionAdvance * 100)}%. 新 AV: ${Math.floor(activeUnit.currentAV)}`);
        }
    }

    return event;
  }

  executeSummonAction(summon: Summon): Partial<BattleEvent> {
      const output = summon.takeAction();
      
      const enemies = this.units.filter(u => u.isEnemy && !u.isDead);
      
      let damageDealt = 0;
      let toughnessDealt = 0;
      let targetName = '无';
      let logs: string[] = [];
      let damageDetails: DamageDetail[] = [];
      let killedUnits: string[] = [];
      let actionAdvance = 0;

      const targetType = summon.config.skill.targetType;

      if (targetType === 'Bounce' && enemies.length > 0) {
          targetName = '随机敌人 (弹射)';
          // Bounce Logic: Loop hits times
          // E6 Logic: Track Vulnerability Stacks per target
          const e6Stacks = new Map<string, number>();
          const hasE6 = summon.summoner.id === '1204' && summon.summoner.activeEidolons.some(e => e.rank >= 6);

          // A2 Logic: Battalia Crush
          if (summon.summoner.id === '1204' && output.hits >= 6) {
              logs.push(`(A2) 破阵生效: 暴击伤害提高 25%`);
          }

          for (let i = 0; i < output.hits; i++) {
              const aliveEnemies = this.units.filter(u => u.isEnemy && !u.isDead);
              if (aliveEnemies.length === 0) break;

              const randomEnemy = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
              const target = this.unitMap.get(randomEnemy.id) as Enemy;
              
              if (output.effects && output.effects.length > 0) {
                  // Pass 'hits' in context for A2 logic
                  const result = this.processActionEffects(summon, output.effects, target, { actionType: 'SummonAttack', hits: output.hits });
                  damageDealt += result.damage;
                  toughnessDealt += result.toughness;
                  logs.push(...result.logs);
                  damageDetails.push(...result.damageDetails);
                  killedUnits.push(...result.killedUnits);
                  if (result.actionAdvance) actionAdvance += result.actionAdvance;

                  // Apply E6: Vulnerability (after damage, benefits subsequent hits)
                  if (hasE6 && target) {
                      const currentStack = e6Stacks.get(target.id) || 0;
                      if (currentStack < 3) {
                          target.vuln += 0.12;
                          e6Stacks.set(target.id, currentStack + 1);
                          logs.push(`(E6) ${target.name} 易伤叠加 (+12%, 层数: ${currentStack + 1})`);
                      }
                  }
                  
                  // Handle Blast/Splash (Jing Yuan Passive & E1)
                  if (summon.summoner.id === '1204') {
                      const targetIndex = aliveEnemies.findIndex(e => e.id === target.id);
                      if (targetIndex !== -1) {
                          const adjacentIndices = [targetIndex - 1, targetIndex + 1].filter(i => i >= 0 && i < aliveEnemies.length);
                          
                          // Base splash ratio 25%
                          // E1: +25% ratio -> 50%
                          let splashRatio = 0.25;
                          if (summon.summoner.activeEidolons.some(e => e.rank >= 1)) {
                              splashRatio += 0.25;
                          }
                          
                          adjacentIndices.forEach(idx => {
                              const splashUnit = aliveEnemies[idx];
                              const splashTarget = this.unitMap.get(splashUnit.id) as Enemy;
                              if (splashTarget) {
                                   const splashDamage = result.damage * splashRatio;
                                   const splashRes = splashTarget.takeDamage(splashDamage, summon.summoner.element, 0, summon.summoner.stats.resPen);
                                   damageDealt += splashRes.damage;
                                   logs.push(`(扩散) 对 ${splashTarget.name} 造成 ${Math.floor(splashRes.damage)} 点伤害 (倍率: ${splashRatio * 100}%)`);
                                   damageDetails.push({
                                      target: splashTarget.name,
                                      damage: Math.floor(splashRes.damage),
                                      element: summon.summoner.element,
                                      isCrit: false,
                                      type: 'Splash'
                                   });
                                   
                                   if (splashTarget.currentHp <= 0) {
                                       logs.push(`${splashTarget.name} 被击败!`);
                                       killedUnits.push(splashTarget.name);
                                       this.handleUnitDeath(splashTarget.id);
                                   }
                              }
                          });
                      }
                  }
              }
          }

          // Cleanup E6 Vulnerability Stacks
          if (hasE6) {
              e6Stacks.forEach((stack, id) => {
                  const t = this.unitMap.get(id) as Enemy;
                  if (t) {
                      t.vuln -= stack * 0.12;
                      if (t.vuln < 0.001) t.vuln = 0;
                  }
              });
          }
      } else {
          // Existing Logic for Single / AoE / RandomEnemy (Single)
          let targetUnit = enemies[0];
          
          if (targetType === 'RandomEnemy' && enemies.length > 0) {
             const randomEnemy = enemies[Math.floor(Math.random() * enemies.length)];
             targetUnit = randomEnemy;
          }
          
          const target = targetUnit ? this.unitMap.get(targetUnit.id) as Enemy : null;
          
          if (output.effects && output.effects.length > 0) {
              const result = this.processActionEffects(summon, output.effects, target, { actionType: 'SummonAttack' });
              damageDealt = result.damage;
              toughnessDealt = result.toughness;
              logs = result.logs;
              damageDetails = result.damageDetails;
              killedUnits = result.killedUnits;
              actionAdvance = result.actionAdvance;
              
              if (output.isAoE) targetName = '全体敌人 (召唤物)';
              else if (target) targetName = target.name;
          }
      }
      
      // Trigger 'AttackEnd' for Summoner (Jing Yuan E2/E4)
      if (summon.summoner) {
          const reactions = summon.summoner.onTrigger('AttackEnd', { source: summon, actionType: 'SummonAttack' });
          if (reactions) {
              reactions.forEach(reaction => {
                  if (reaction.effects) {
                      const result = this.processActionEffects(summon.summoner, reaction.effects, null, { actionType: 'Trigger' });
                      damageDealt += result.damage;
                      toughnessDealt += result.toughness;
                      logs.push(...result.logs);
                      damageDetails.push(...result.damageDetails);
                      killedUnits.push(...result.killedUnits);
                      if (result.actionAdvance) actionAdvance += result.actionAdvance;
                  }
              });
          }
      }

      return {
          actionType: 'SummonAttack',
          damage: Math.floor(damageDealt),
          toughnessDamage: toughnessDealt,
          targetName,
          spChange: output.spChange,
          currentSp: this.skillPoints,
          effectLog: logs,
          damageDetails,
          killedUnits,
          actionAdvance
      };
  }

  addSummon(config: SummonConfig, summoner: Character) {
      const summonId = `${summoner.id}_summon_${config.name}`;
      const existingSummon = this.unitMap.get(summonId);
      
      if (existingSummon && existingSummon instanceof Summon) {
          // If summon exists, reset AV if initialAV is 0 (immediate action request)
          if (config.initialAV === 0) {
              existingSummon.currentAV = 0;
              this.events.push({
                  turn: this.events.length,
                  actorName: summoner.name,
                  actorId: summoner.id,
                  avCost: 0,
                  totalAV: this.currentTotalAV,
                  isEnemy: false,
                  cycle: this.getCycleInfo(this.currentTotalAV).cycle,
                  avInCycle: this.getCycleInfo(this.currentTotalAV).avInCycle,
                  effectLog: [`${existingSummon.name} 被再次召唤并立即行动!`]
              });
              // Sort units to reflect AV change
              this.sortUnits();
          }
          return; 
      }
      
      const newSummon = new Summon(summonId, config, summoner);
      this.unitMap.set(summonId, newSummon);
      
      this.units.push({
          id: summonId,
          name: newSummon.name,
          isEnemy: false,
          isSummon: true,
          summonerId: summoner.id,
          speed: newSummon.speed,
          baseAV: newSummon.baseAV,
          currentAV: newSummon.currentAV,
          color: newSummon.color
      });
      
      // Sort to insert into correct position
      this.sortUnits();
      
      this.events.push({
          turn: this.events.length,
          actorName: summoner.name,
          actorId: summoner.id,
          avCost: 0,
          totalAV: this.currentTotalAV,
          isEnemy: false,
          cycle: this.getCycleInfo(this.currentTotalAV).cycle,
          avInCycle: this.getCycleInfo(this.currentTotalAV).avInCycle,
          effectLog: [`${newSummon.name} 加入战斗! 初始AV: ${Math.floor(newSummon.currentAV)}`]
      });
  }

  executeUltimateAction(char: Character): Partial<BattleEvent> {
     const output = char.useUltimate();
     if (!output) return {}; // Should not happen if check passed

     // Pick target (First alive enemy)
     const enemies = this.units.filter(u => u.isEnemy && !u.isDead);
     const targetUnit = enemies[0];
     const target = targetUnit ? this.unitMap.get(targetUnit.id) as Enemy : null;
     
     let damageDealt = 0;
     let toughnessDealt = 0;
     let targetName = '无';
     let logs: string[] = [];
     let shieldGain = 0;
     let heal = 0;
     let damageDetails: DamageDetail[] = [];
    let killedUnits: string[] = [];
    let actionAdvance = 0;
    
    if (output.effects && output.effects.length > 0) {
        // Use new structured effects
        const result = this.processActionEffects(char, output.effects, target, { actionType: 'Ultimate' });
        damageDealt = result.damage;
        toughnessDealt = result.toughness;
        shieldGain = result.shield;
        heal = result.heal;
        logs = result.logs;
        damageDetails = result.damageDetails;
        killedUnits = result.killedUnits;
        actionAdvance = result.actionAdvance;
        
        if (output.isAoE) targetName = '全体敌人 (终结技)';
        else if (target) targetName = target.name;
        
        if (actionAdvance) {
             const unit = this.units.find(u => u.id === char.id);
             if (unit) {
                 const originalAV = unit.currentAV;
                 unit.currentAV = Math.max(0, unit.currentAV - (unit.baseAV * actionAdvance));
                 logs.push(`行动提前! AV: ${Math.floor(originalAV)} -> ${Math.floor(unit.currentAV)}`);
             }
        }
     } else if (enemies.length > 0 && output) {
        if (output.isAoE) { // Ultimate might be AoE
           targetName = '全体敌人 (终结技)';
           enemies.forEach(u => {
             const e = this.unitMap.get(u.id) as Enemy;
             if (e) {
               const result = e.takeDamage(output.damage, output.element, output.toughness, output.resPen);
               damageDealt += result.damage;
               toughnessDealt += result.toughness;
               // Legacy takeDamage doesn't return details easily without refactor, but we can infer
               damageDetails.push({
                   target: e.name,
                   damage: Math.floor(result.damage),
                   element: output.element,
                   isCrit: false, // Legacy path assumes no crit or handled inside? takeDamage doesn't handle crit.
                   type: 'Ultimate'
               });

               if (e.currentHp <= 0) {
                   logs.push(`${e.name} 被击败!`);
                   killedUnits.push(e.name);
                   this.handleUnitDeath(e.id);
                   char.addEnergy(10);
               }
             }
           });
        } else if (target) {
           targetName = target.name;
           const result = target.takeDamage(output.damage, output.element, output.toughness, output.resPen);
           damageDealt = result.damage;
           toughnessDealt = result.toughness;
           damageDetails.push({
               target: target.name,
               damage: Math.floor(result.damage),
               element: output.element,
               isCrit: false,
               type: 'Ultimate'
           });

           if (target.currentHp <= 0) {
               logs.push(`${target.name} 被击败!`);
               killedUnits.push(target.name);
               this.handleUnitDeath(target.id);
               char.addEnergy(10);
           }
        }
      }

      // Energy is reset inside useUltimate
     
     return {
       actionType: 'Ultimate',
       damage: Math.floor(damageDealt),
       toughnessDamage: toughnessDealt,
       targetName,
       spChange: output.spChange, // 0
       currentSp: this.skillPoints,
       currentEnergy: char.currentEnergy,
       energyChange: output.energyChange,
       effectLog: logs,
       damageDetails,
       shieldGain,
       heal,
       actionAdvance,
       killedUnits
     };
  }

  executeCharacterAction(char: Character): Partial<BattleEvent> {
    // Tick buffs at start of turn
    char.tickBuffs();
    
    // Tick debuffs (DoT)
    const debuffResult = char.tickDebuffs();
    let logs: string[] = [];
    
    // Check if dead from DoT
    if (char.currentHp <= 0) {
        this.handleUnitDeath(char.id);
        
        return {
            actionType: 'DoT Death',
            damage: 0,
            effectLog: [...(debuffResult.details || []), `${char.name} 因持续伤害倒下`],
            killedUnits: [char.name]
        };
    }

    // March 7th E6: Handled by HealOverTime Buff (mar7_e6_hot) applied by Skill


    let actionType = 'Basic Attack';
    let output: ActionOutput;
    
    // Simple AI: Use Skill if SP >= 1.
    // TODO: Implement better AI or Manual Control
    // For now, let's assume if it's a support char (Harmony/Preservation/Abundance), use Skill every 3 turns?
    // Or simpler: Damage dealers use Skill if SP > 0.
    
    const isSupport = ['Harmony', 'Preservation', 'Abundance'].includes(char.data?.path || '');
    
    if (this.skillPoints >= 1 && (!isSupport || Math.random() > 0.5)) {
       actionType = 'Skill';
       output = char.useSkill();
    } else {
       actionType = 'Basic Attack';
       output = char.useBasicAttack();
    }
    
    // Ensure output is valid, otherwise fallback
    if (!output) {
        // Retry with Basic Attack if Skill failed (e.g. not enough SP, though check was made)
        actionType = 'Basic Attack';
        output = char.useBasicAttack();
    }

    if (!output) {
        console.error(`Action output is undefined for ${char.name} using ${actionType}`);
        return {
             actionType: 'Skip',
             effectLog: [`${char.name} 跳过回合 (Action Failed)`]
        };
    }

    // Process Output Effects (Damage, Buffs, etc.)
    const enemies = this.units.filter(u => u.isEnemy && !u.isDead);
    const targetUnit = enemies[0];
    const target = targetUnit ? this.unitMap.get(targetUnit.id) as Enemy : null;
    
    let damageDealt = 0;
    let toughnessDealt = 0;
    let targetName = '无';
    let shieldGain = 0;
    let heal = 0;
    let actionAdvance = 0;
    let damageDetails: DamageDetail[] = [];
    let killedUnits: string[] = [];
    // logs already declared above
    
    if (output.effects && output.effects.length > 0) {
        // Use new structured effects
        const result = this.processActionEffects(char, output.effects, target, { actionType });
        damageDealt = result.damage;
        toughnessDealt = result.toughness;
        shieldGain = result.shield;
        heal = result.heal;
        actionAdvance = result.actionAdvance || 0;
        logs.push(...result.logs);
        damageDetails.push(...result.damageDetails);
        killedUnits.push(...result.killedUnits);
        
        // Also apply 'applyBuffs' if present for backward compatibility
        if (output.applyBuffs) {
           output.applyBuffs.forEach(buff => {
             char.addBuff(buff);
           });
        }
        
        if (result.actionAdvance) {
             // Pass to nextStep
        }
    } else if (enemies.length > 0 && output) {
        // Legacy logic
        // Apply Damage
        if (output.isAoE) {
           targetName = '全体敌人';
           enemies.forEach(u => {
             const e = this.unitMap.get(u.id) as Enemy;
             if (e) {
               const result = e.takeDamage(output.damage, output.element, output.toughness, output.resPen);
               damageDealt += result.damage;
               toughnessDealt += result.toughness;

               if (e.currentHp <= 0) {
                   logs.push(`${e.name} 被击败!`);
                   killedUnits.push(e.name);
                   this.handleUnitDeath(e.id);
                   char.addEnergy(10);
               }
             }
           });
        } else if (target) {
           targetName = target.name;
           const result = target.takeDamage(output.damage, output.element, output.toughness, output.resPen);
           damageDealt = result.damage;
           toughnessDealt = result.toughness;

           if (target.currentHp <= 0) {
               logs.push(`${target.name} 被击败!`);
               killedUnits.push(target.name);
               this.handleUnitDeath(target.id);
               char.addEnergy(10);
           }
        }

        // Apply Buffs/Debuffs from Output
        if (output.applyBuffs) {
           output.applyBuffs.forEach(buff => {
             char.addBuff(buff);
           });
        }
    }

    this.skillPoints = Math.min(5, Math.max(0, this.skillPoints + output.spChange));
    
    char.currentEnergy += output.energyChange;
    if (char.currentEnergy > char.stats.maxEnergy) char.currentEnergy = char.stats.maxEnergy;
    
    if (debuffResult.details.length > 0) {
        logs.push(...debuffResult.details);
    }
    
    return {
      actionType,
      damage: Math.floor(damageDealt),
      damageDetails,
      toughnessDamage: toughnessDealt,
      targetName,
      spChange: output.spChange,
      currentSp: this.skillPoints,
      currentEnergy: char.currentEnergy,
      energyChange: output.energyChange,
      buffs: [...char.buffs],
      shieldGain,
      heal,
      effectLog: logs,
      dotDamage: debuffResult.damage,
      actionAdvance,
      killedUnits
    };
  }

  processActionEffects(source: Character | Enemy | Summon, effects: ActionEffect[], primaryTarget: Character | Enemy | null, context: { actionType?: string } = {}): { damage: number, toughness: number, heal: number, shield: number, logs: string[], actionAdvance: number, damageDetails: DamageDetail[], killedUnits: string[] } {
      let totalDamage = 0;
      let totalToughness = 0;
      let totalHeal = 0;
      let totalShield = 0;
      let actionAdvance = 0;
      const logs: string[] = [];
      const damageDetails: DamageDetail[] = [];
      const killedUnits: string[] = [];
      let lastAttackCrit = false; // Track if the last damage effect was a crit

      effects.forEach(effect => {
          let targets: (Character | Enemy | Summon)[] = [];
          
          // Determine Targets
          if (effect.targetType === 'Self') {
              targets = [source];
          } else if (effect.targetType === 'Target') {
              if (primaryTarget) {
                  // Ensure primary target is valid and alive
                  const u = this.units.find(unit => unit.id === primaryTarget.id);
                  if (u && !u.isDead) {
                      targets = [primaryTarget];
                  }
              }
          } else if (effect.targetType === 'AllEnemies') {
              targets = this.units.filter(u => u.isEnemy && !u.isDead).map(u => this.unitMap.get(u.id) as Enemy);
          } else if (effect.targetType === 'AllAllies') {
              targets = this.units.filter(u => !u.isEnemy && !u.isDead).map(u => this.unitMap.get(u.id) as Character);
          } else if (effect.targetId) {
              const u = this.units.find(unit => unit.id === effect.targetId);
              if (u && !u.isDead) {
                  const target = this.unitMap.get(u.id);
                  if (target) targets = [target];
              }
          } else if (effect.targetType === 'Ally') {
              // Usually means a specific ally, but if not specified, default to Self or Primary Target if it is an ally
              const sourceIsEnemy = source instanceof Enemy;
              const targetIsEnemy = primaryTarget instanceof Enemy;
              
              if (primaryTarget && sourceIsEnemy === targetIsEnemy) {
                  targets = [primaryTarget];
              } else {
                  targets = [source];
              }
          } else if (effect.targetType === 'RandomEnemy') {
              const enemies = this.units.filter(u => u.isEnemy && !u.isDead);
              if (enemies.length > 0) {
                  const randomEnemy = enemies[Math.floor(Math.random() * enemies.length)];
                  targets = [this.unitMap.get(randomEnemy.id) as Enemy];
              }
          } else if (effect.targetType === 'Summoner') {
              if (source instanceof Summon) {
                  targets = [source.summoner];
              } else if (source instanceof Character) {
                  // If character is the source, Summoner == Self
                   targets = [source];
              }
          }

          // Apply Effect
          targets.forEach(target => {
              // Condition Check
              if (effect.conditionType) {
                  let conditionMet = false;
                  if (effect.conditionType === 'TargetHasDebuffType') {
                      if (target instanceof Enemy) { // Characters don't have debuffs list in same way yet? Actually they do.
                          conditionMet = target.debuffs.some(d => d.type === effect.conditionValue);
                      }
                  } else if (effect.conditionType === 'TargetHasDebuffName') {
                      if (target instanceof Enemy) {
                          conditionMet = target.debuffs.some(d => d.name === effect.conditionValue);
                      }
                  } else if (effect.conditionType === 'TargetHpLessThan') {
                      if (target instanceof Enemy) {
                          conditionMet = (target.currentHp / target.maxHp) < effect.conditionValue!;
                      } else if (target instanceof Character) {
                          conditionMet = (target.currentHp / target.stats.hp) < effect.conditionValue!;
                      }
                  } else if (effect.conditionType === 'TargetHpGreaterThan') {
                      if (target instanceof Enemy) {
                          conditionMet = (target.currentHp / target.maxHp) > effect.conditionValue!;
                      } else if (target instanceof Character) {
                          conditionMet = (target.currentHp / target.stats.hp) > effect.conditionValue!;
                      }
                  } else if (effect.conditionType === 'SourceLastAttackCrit') {
                      conditionMet = lastAttackCrit;
                  } else if (effect.conditionType === 'TalentCounterGreaterEqual') {
                      let counterValue = 0;
                      if (source instanceof Summon && effect.counterKey) {
                          counterValue = source.summoner.talentCounters[effect.counterKey] || 0;
                      } else if (source instanceof Character && effect.counterKey) {
                          counterValue = source.talentCounters[effect.counterKey] || 0;
                      }
                      conditionMet = counterValue >= (effect.conditionValue || 0);
                  } else if (effect.conditionType === 'Always') {
                      conditionMet = true;
                  }
                  
                  if (!conditionMet) return;
              }

              // Trigger 'AllyAbilityTarget' if source is ally and target is ally
              if (source instanceof Character && target instanceof Character && context.actionType !== 'Trigger') {
                  const reactions = target.onTrigger('AllyAbilityTarget', { source });
                  if (reactions) {
                      reactions.forEach(reaction => {
                          if (reaction.effects) {
                              const subResult = this.processActionEffects(source, reaction.effects, null, { actionType: 'Trigger' });
                              if (subResult.actionAdvance) actionAdvance += subResult.actionAdvance;
                              logs.push(...subResult.logs);
                              killedUnits.push(...subResult.killedUnits);
                              damageDetails.push(...subResult.damageDetails);
                              totalDamage += subResult.damage;
                              totalToughness += subResult.toughness;
                              totalShield += subResult.shield;
                              totalHeal += subResult.heal;
                          }
                      });
                  }
              }

              if (effect.type === 'Summon') {
                  if (effect.summonConfig && source instanceof Character) {
                      this.addSummon(effect.summonConfig, source);
                      logs.push(`召唤了 ${effect.summonConfig.name}`);
                  }
              }

              if (effect.type === 'Damage') {
                  let multiplier = effect.value || 0;
                  let base = 0;
                  let isCrit = false;

                  if (source instanceof Character || (source instanceof Summon && source.summoner)) {
                      const charSource = source instanceof Character ? source : (source as Summon).summoner;
                      
                      if (effect.scaling === 'Atk') {
                          base = charSource.totalAtk * multiplier;
                      } else if (effect.scaling === 'Def') {
                          base = charSource.totalDef * multiplier;
                      } else if (effect.scaling === 'Hp') {
                          base = charSource.stats.hp * multiplier;
                      }
                      
                      if (effect.flatValue) {
                          base += effect.flatValue;
                      }
                      
                      isCrit = Math.random() < charSource.stats.critRate;
                      lastAttackCrit = isCrit;
                      
                      let critDmg = charSource.stats.critDmg;
                      // Jing Yuan A2: If LL hits >= 6, Crit DMG +25%
                      if (source instanceof Summon && source.summoner.id === '1204' && (context.hits || 0) >= 6) {
                           critDmg += 0.25;
                      }
                      
                      const critMult = isCrit ? (1 + critDmg) : 1.0;
                      const dmg = base * (1 + charSource.dmgBoost) * critMult;
                      
                      const wasAlive = target.currentHp > 0;
                      // Determine element
                      const element = effect.element || charSource.element;
                      
                      const res = target.takeDamage(dmg, element, effect.toughnessDamage || 0, charSource.stats.resPen);
                      totalDamage += res.damage;
                      totalToughness += res.toughness;
                      logs.push(`对 ${target.name} 造成 ${Math.floor(res.damage)} 点伤害 ${isCrit ? '(暴击)' : ''}`);
                      damageDetails.push({
                        target: target.name,
                        damage: Math.floor(res.damage),
                        element: element,
                        isCrit: isCrit,
                        type: context.actionType
                      });

                      // Handle Break Damage & Delay
                      if (res.breakDamage && res.breakDamage > 0) {
                          totalDamage += res.breakDamage;
                          logs.push(`**击破伤害**! 对 ${target.name} 造成 ${Math.floor(res.breakDamage)} 点击破伤害`);
                          damageDetails.push({
                              target: target.name,
                              damage: Math.floor(res.breakDamage),
                              element: element,
                              isCrit: false,
                              type: 'Break'
                          });
                      }

                      if (res.breakActionDelay && res.breakActionDelay > 0) {
                          const targetUnit = this.units.find(u => u.id === target.id);
                          if (targetUnit) {
                              const delayValue = 10000 / targetUnit.speed * res.breakActionDelay; // Delay is multiplier of baseAV? Usually just Delay %
                              // In SR, "delay 20%" means add 20% of Base AV to current AV.
                              // My Enemy.ts returns breakActionDelay as e.g. 0.25 (25%)
                              const delayAmount = targetUnit.baseAV * res.breakActionDelay;
                              targetUnit.currentAV += delayAmount;
                              logs.push(`击破推条! ${target.name} 行动延后 ${Math.floor(delayAmount)} AV`);
                          }
                      }
                      
                      // Check for Kill
                      if (wasAlive && target.currentHp <= 0) {
                           // 1. Grant Energy to Killer
                           source.addEnergy(10);
                           logs.push(`${source.name} 击败了 ${target.name}! 能量 +10`);
                           killedUnits.push(target.name);

                           // 2. Remove from Action Order
                           const targetIndex = this.units.findIndex(u => u.id === target.id);
                           if (targetIndex !== -1) {
                               this.handleUnitDeath(target.id);
                           }

                           const reactions = source.onTrigger('Kill', { abilityType: context.actionType, target });
                           if (reactions) {
                               reactions.forEach(reaction => {
                                   if (reaction.effects) {
                                       const subResult = this.processActionEffects(source, reaction.effects, null, { actionType: 'Trigger' });
                                       logs.push(...subResult.logs);
                                       killedUnits.push(...subResult.killedUnits);
                                       damageDetails.push(...subResult.damageDetails);
                                       totalDamage += subResult.damage;
                                       totalToughness += subResult.toughness;
                                       totalShield += subResult.shield;
                                       totalHeal += subResult.heal;
                                       if (subResult.actionAdvance) actionAdvance += subResult.actionAdvance;
                                   }
                               });
                           }
                      }
                  } else {
                      // Enemy source
                      base = 1000 * multiplier;
                      // Enemy attacking Character
                      let res: any;
                      if (target instanceof Character) {
                           res = target.takeDamage(base, effect.element || ElementType.Physical, effect.toughnessDamage || 0, 0, 10);
                      } else {
                           res = target.takeDamage(base, effect.element || ElementType.Physical, effect.toughnessDamage || 0, 0);
                      }
                      
                      totalDamage += res.damage;
                      const energyGained = res.energyGain || 0;
                      logs.push(`造成伤害: ${Math.floor(res.damage)}${energyGained > 0 ? ` (能量 +${Math.floor(energyGained)})` : ''}`);
                      damageDetails.push({
                        target: target.name,
                        damage: Math.floor(res.damage),
                        element: effect.element || ElementType.Physical,
                        isCrit: false,
                        type: context.actionType
                      });
                      
                      // Check for Character Death (optional, if we want perma-death)
                      if (target.currentHp <= 0) {
                          logs.push(`${target.name} 被击败!`);
                          killedUnits.push(target.name);
                          const targetIndex = this.units.findIndex(u => u.id === target.id);
                           if (targetIndex !== -1) {
                               this.handleUnitDeath(target.id);
                           }
                      }

                      // Trigger AllyAttacked if target is Character (Enemy -> Character)
                      if (target instanceof Character) {
                            const allies = this.units.filter(u => !u.isEnemy && !u.isDead)
                                .map(u => this.unitMap.get(u.id) as Character)
                                .filter(u => !!u); // Filter out undefined
                            
                            allies.forEach(ally => {
                                const reactions = ally.onTrigger('AllyAttacked', { target, source, characters: allies });
                                if (reactions) {
                                    reactions.forEach(reaction => {
                                        if (reaction.effects) {
                                            const subResult = this.processActionEffects(ally, reaction.effects, source as Enemy, { actionType: 'Counter' });
                                            logs.push(...subResult.logs);
                                            killedUnits.push(...subResult.killedUnits);
                                            damageDetails.push(...subResult.damageDetails);
                                            totalDamage += subResult.damage;
                                            totalToughness += subResult.toughness;
                                            totalShield += subResult.shield;
                                            totalHeal += subResult.heal;
                                            
                                            if (subResult.actionAdvance) {
                                                const unit = this.units.find(u => u.id === ally.id);
                                                if (unit) {
                                                    const originalAV = unit.currentAV;
                                                    unit.currentAV = Math.max(0, unit.currentAV - (unit.baseAV * subResult.actionAdvance));
                                                    logs.push(`(触发反击) ${ally.name} 行动提前! AV: ${Math.floor(originalAV)} -> ${Math.floor(unit.currentAV)}`);
                                                }
                                            }
                                        }
                                    });
                                }
                            });
                      }
                  }
              } else if (effect.type === 'Heal') {
                  // ... implementation of heal ...
                  // Existing implementation was missing in truncated view, adding basic heal logic
                  let amount = 0;
                  if (source instanceof Character) {
                      if (effect.scaling === 'Hp') amount = source.stats.hp * (effect.value || 0);
                      else if (effect.scaling === 'Atk') amount = source.totalAtk * (effect.value || 0);
                      
                      if (effect.flatValue) amount += effect.flatValue;
                      amount *= (1 + source.stats.outgoingHealing);
                  }
                  
                  if (target instanceof Character) {
                      const actualHeal = target.heal(amount);
                      totalHeal += actualHeal;
                      logs.push(`为 ${target.name} 恢复 ${Math.floor(actualHeal)} 点生命值`);
                  }
              } else if (effect.type === 'Shield') {
                  let amount = 0;
                  if (source instanceof Character) {
                      if (effect.scaling === 'Def') amount = source.totalDef * (effect.value || 0);
                      if (effect.flatValue) amount += effect.flatValue;
                  }
                  
                  if (target instanceof Character) {
                      target.addShield({
                          id: `shield_${source.id}`, // Use deterministic ID to allow refreshing/stacking logic
                          value: amount,
                          max: amount,
                          duration: effect.duration || 2,
                          source: source.name
                      });
                      totalShield += amount;
                      logs.push(`为 ${target.name} 提供 ${Math.floor(amount)} 点护盾`);
                  }
              } else if (effect.type === 'Buff') {
                  if (target instanceof Character && effect.buff) {
                      target.addBuff({
                          ...effect.buff,
                          duration: effect.duration || effect.buff.duration || 2,
                          source: source.name
                      });
                      logs.push(`对 ${target.name} 施加增益 ${effect.buff.name}`);
                  }
              } else if (effect.type === 'Debuff') {
                  if (target instanceof Enemy && effect.debuff) {
                      // Check Effect Hit Rate vs Effect Res
                      // Base Chance * (1 + EHR) * (1 - RES) * (1 - Debuff Res)
                      const baseChance = effect.chance !== undefined ? effect.chance : 1.0;
                      let ehr = 0;
                      if (source instanceof Character) ehr = source.stats.effectHitRate;
                      
                      const res = target.effectRes;
                      // Simplified formula
                      const realChance = baseChance * (1 + ehr) * (1 - res);
                      
                      if (Math.random() < realChance) {
                          target.addDebuff({
                              ...effect.debuff,
                              duration: effect.duration || effect.debuff.duration || 2,
                              source: source.name
                          });
                          logs.push(`对 ${target.name} 施加减益 ${effect.debuff.name}`);
                          
                          // Trigger 'DebuffApplied' (e.g. March 7th E1)
                          if (source instanceof Character) {
                              const reactions = source.onTrigger('DebuffApplied', { target, debuff: effect.debuff });
                              if (reactions) {
                                  reactions.forEach(reaction => {
                                      if (reaction.effects) {
                                          const subResult = this.processActionEffects(source, reaction.effects, null, { actionType: 'Trigger' });
                                          if (subResult.actionAdvance) actionAdvance += subResult.actionAdvance;
                                          logs.push(...subResult.logs);
                                          killedUnits.push(...subResult.killedUnits);
                                          damageDetails.push(...subResult.damageDetails);
                                          totalDamage += subResult.damage;
                                      }
                                  });
                              }
                          }
                      } else {
                          logs.push(`未能对 ${target.name} 施加 ${effect.debuff.name}`);
                      }
                  }
              } else if (effect.type === 'ActionAdvance') {
                  if (target instanceof Character) {
                      // This is handled by returning the value, but if multiple targets?
                      // Currently simulator only supports advancing the current actor (or specific logic).
                      // If target is Self, we return it.
                      if (target.id === source.id) {
                          actionAdvance += (effect.value || 0);
                      }
                  }
              } else if (effect.type === 'UpdateTalentCounter') {
                  if (source instanceof Character && effect.counterKey) {
                      const currentVal = source.talentCounters[effect.counterKey] || 0;
                      let newVal = currentVal;
                      
                      if (effect.counterReset) {
                          newVal = effect.counterValue || 0;
                      } else {
                          newVal += (effect.counterValue || 0);
                      }
                      
                      // Max/Min stacks logic (Specific for Jing Yuan for now, can be generalized later)
                      if (effect.counterKey === 'll_hits') {
                          if (newVal > 10) newVal = 10;
                          if (newVal < 3) newVal = 3; // LL hits should not go below 3
                      }
                      
                      source.talentCounters[effect.counterKey] = newVal;
                      logs.push(`天赋计数变更: ${currentVal} -> ${newVal}`);
                      
                      // Check if any summon depends on this counter and update its speed/AV
                      const summons = this.units.filter(u => u.isSummon && u.summonerId === source.id);
                      summons.forEach(u => {
                          const summonInstance = this.unitMap.get(u.id);
                          if (summonInstance instanceof Summon && summonInstance.config.stackSource === effect.counterKey) {
                              const oldSpeed = u.speed;
                              const newSpeed = summonInstance.calculateSpeed();
                              
                              if (Math.abs(newSpeed - oldSpeed) > 0.1) {
                                  // Update Speed
                                  u.speed = newSpeed;
                                  summonInstance.speed = newSpeed;
                                  summonInstance.baseAV = 10000 / newSpeed;
                                  u.baseAV = summonInstance.baseAV;
                                  
                                  // Update AV: NewAV = OldAV * (OldSpeed / NewSpeed)
                                  const oldAV = u.currentAV;
                                  u.currentAV = oldAV * (oldSpeed / newSpeed);
                                  
                                  logs.push(`${u.name} 速度变更: ${Math.floor(oldSpeed)} -> ${Math.floor(newSpeed)}. AV: ${Math.floor(oldAV)} -> ${Math.floor(u.currentAV)}`);
                              }
                          }
                      });
                  }
              } else if (effect.type === 'EnergyRestore') {
                   if (target instanceof Character) {
                       let amount = effect.value || 0;
                       if (effect.flatValue) amount += effect.flatValue;
                       target.addEnergy(amount);
                       logs.push(`为 ${target.name} 恢复 ${amount} 点能量`);
                   }
              }
          });
      });

      return {
          damage: totalDamage,
          toughness: totalToughness,
          heal: totalHeal,
          shield: totalShield,
          logs: logs,
          actionAdvance,
          damageDetails,
          killedUnits
      };
  }
  
  executeEnemyAction(enemy: Enemy): Partial<BattleEvent> {
    // Tick debuffs (DoT)
    const debuffResult = enemy.tickDebuffs();
    
    // Check if dead from DoT
    if (enemy.currentHp <= 0) {
        this.handleUnitDeath(enemy.id);
        
        return {
            actionType: 'DoT Death',
            dotDamage: debuffResult.damage,
            effectLog: [...(debuffResult.details || []), `${enemy.name} 因持续伤害倒下`],
            killedUnits: [enemy.name]
        };
    }
    
    // Simple Enemy Attack
    // Target Selection based on Taunt (Aggro)
    const validTargets: (Character | Summon)[] = [];
    let totalTaunt = 0;
    
    this.units.forEach(u => {
        if (!u.isEnemy && !u.isDead) {
            const unit = this.unitMap.get(u.id);
            if (unit instanceof Character) {
                // Character always targetable (unless special status like Stealth? Assume targetable for now)
                validTargets.push(unit);
                // Calculate taunt
                let taunt = unit.baseTaunt;
                // Add taunt modifiers from buffs
                unit.buffs.forEach(b => {
                   if (b.type === 'Taunt') taunt += b.value;
                });
                totalTaunt += Math.max(1, taunt);
            } else if (unit instanceof Summon) {
                if (unit.canBeTargeted && unit.zone === 'Field') {
                    validTargets.push(unit);
                    totalTaunt += Math.max(1, unit.baseTaunt);
                }
            }
        }
    });

    let targetName = '无';
    let damage = 500; // Dummy
    let logs: string[] = [];
    const killedUnits: string[] = [];
    let shieldDamaged = false;
    
    if (debuffResult.details.length > 0) {
        logs.push(...debuffResult.details);
    }
    
    if (validTargets.length > 0) {
       // Weighted Random Selection
       let random = Math.random() * totalTaunt;
       let targetUnit: Character | Summon = validTargets[0];
       
       for (const t of validTargets) {
           let tTaunt = 0;
           if (t instanceof Character) {
                tTaunt = t.baseTaunt;
                t.buffs.forEach(b => { if (b.type === 'Taunt') tTaunt += b.value; });
           } else if (t instanceof Summon) {
                tTaunt = t.baseTaunt;
           }
           tTaunt = Math.max(1, tTaunt);
           
           if (random < tTaunt) {
               targetUnit = t;
               break;
           }
           random -= tTaunt;
       }
       
       targetName = targetUnit.name;
       const target = targetUnit;
       
       if (target instanceof Character) {
          // Check Shield before damage
          const initialShield = target.shields.reduce((sum, s) => sum + s.value, 0);
          
          // Use takeDamage with energy gain
          const res = target.takeDamage(damage, ElementType.Physical, 0, 0, 10);
          const hpLoss = res.damage;
          const energyGained = res.energyGain || 0;
          
          // Check Shield after damage
          const finalShield = target.shields.reduce((sum, s) => sum + s.value, 0);
          shieldDamaged = initialShield > 0 && finalShield < initialShield; 
          
          logs.push(`对 ${targetName} 造成 ${damage} 点伤害 (实际扣血: ${Math.floor(hpLoss)})${energyGained > 0 ? ` (能量 +${Math.floor(energyGained)})` : ''}`);

          if (target.currentHp <= 0) {
              logs.push(`${targetName} 被击败!`);
              killedUnits.push(targetName);
              this.handleUnitDeath(target.id);
          } else {
              const allChars = this.units
                  .filter(u => !u.isEnemy && !u.isDead)
                  .map(u => this.unitMap.get(u.id))
                  .filter(u => u instanceof Character) as Character[];
                  
              allChars.forEach(char => {
                  const reactions = char.onTrigger('AllyAttacked', { target, attacker: enemy, shieldDamaged });
                  if (reactions) {
                      reactions.forEach(reaction => {
                          logs.push(`触发了 ${char.name} 的 ${reaction.skillName || '反应'}!`);
                          this.executeReactionAction(char, reaction, enemy);
                      });
                  }
              });
          }
       } else if (target instanceof Summon) {
           // Summon taking damage
           const res = target.takeDamage(damage, ElementType.Physical, 0);
           const hpLoss = res.damage;
           
           logs.push(`对 ${targetName} 造成 ${damage} 点伤害 (实际扣血: ${Math.floor(hpLoss)})`);
           
           if (target.currentHp <= 0) {
               logs.push(`${targetName} 被击败 (消散)!`);
               killedUnits.push(targetName);
               this.handleUnitDeath(target.id);
           }
       }
    }
    
    return {
      actionType: 'Attack',
      damage: damage,
      targetName: targetName,
      toughnessDamage: 0,
      dotDamage: debuffResult.damage,
      effectLog: logs,
      shieldGain: 0,
      heal: 0,
      killedUnits
    };
  }

  executeReactionAction(char: Character, output: ActionOutput, target: Enemy) {
      // Execute the reaction action (Counter Attack)
      // This creates a new event inserted immediately
      
      let damageDealt = 0;
      let toughnessDealt = 0;
      let shieldGain = 0;
      let heal = 0;
      let logs: string[] = [];
      let damageDetails: DamageDetail[] = [];
      let killedUnits: string[] = [];
      let targetName = target.name;
      let actionAdvance = 0;
      
      if (output.effects && output.effects.length > 0) {
          const result = this.processActionEffects(char, output.effects, target, { actionType: 'Counter' });
          damageDealt = result.damage;
          toughnessDealt = result.toughness;
          shieldGain = result.shield;
          heal = result.heal;
          logs = result.logs;
          damageDetails = result.damageDetails;
          killedUnits = result.killedUnits;
          actionAdvance = result.actionAdvance;
          
          if (actionAdvance > 0) {
               const unit = this.units.find(u => u.id === char.id);
               if (unit) {
                   const reduction = unit.baseAV * actionAdvance;
                   unit.currentAV = Math.max(0, unit.currentAV - reduction);
                   logs.push(`反击触发行动提前: ${Math.floor(actionAdvance * 100)}%`);
               }
          }
      }
      
      char.currentEnergy += output.energyChange;
      if (char.currentEnergy > char.stats.maxEnergy) char.currentEnergy = char.stats.maxEnergy;

      const event: BattleEvent = {
        turn: this.events.length + 1, // Will be corrected if pushed
        actorName: char.name,
        actorId: char.id,
        avCost: 0, // Counter is instant/follow-up
        totalAV: this.currentTotalAV,
        isEnemy: false,
        cycle: this.getCycleInfo(this.currentTotalAV).cycle,
        avInCycle: this.getCycleInfo(this.currentTotalAV).avInCycle,
        buffs: [...char.buffs],
        actionType: 'Counter',
        damage: Math.floor(damageDealt),
        toughnessDamage: toughnessDealt,
        targetName: targetName,
        spChange: output.spChange,
        currentSp: this.skillPoints,
        currentEnergy: char.currentEnergy,
        energyChange: output.energyChange,
        effectLog: logs,
        actionAdvance,
        shieldGain,
        heal,
        damageDetails,
        killedUnits
      };
      
      this.events.push(event);
  }

  // 妯℃嫙 N 姝ユ垨鐩村埌 AV 闄愬埗
  simulate(steps: number = 20, maxAV: number = 0) {
    this.maxActions = steps;
    // If maxAV is provided, ignore steps limit (or use both as constraints)
    
    // Clear previous events if we want fresh simulation or just continue?
    // Usually simulate() is called after reset() or to continue. 
    // Let's assume reset() was called or we just want more steps.
    // But usually the UI calls simulate() which should probably start from scratch 
    // if the state is "reactive".
    
    // Reset events if we are starting fresh? 
    // Actually the caller should handle reset if they want a fresh sim.
    // Here we just run simulation loop.
    
    const events: BattleEvent[] = [];
    
    while (true) {
      if (maxAV > 0 && this.currentTotalAV >= maxAV) break;
      if (maxAV <= 0 && this.events.length >= this.maxActions) break;
      if (this.events.length >= 500) break; // Hard limit for safety
      
      const event = this.nextStep();
      if (!event) break;
      events.push(event);
    }
    
    return this.events; // Return full history
  }
}

