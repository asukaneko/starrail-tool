import { TriggerConfig, ActionEffect } from '../models/types';

export const CharacterSkills: Record<string, any> = {
  '1001': { // March 7th
    'Normal': [
      {
        type: 'Damage',
        targetType: 'Target',
        scaling: 'Atk',
        value: 1.0, // Lv 6 (approx 100% usually)
        element: 'Ice',
        toughnessDamage: 30
      }
    ],
    'BPSkill': [
      {
        type: 'Shield',
        targetType: 'Ally', // Defaults to selected ally
        scaling: 'Def',
        value: 0.38, // Lv 1
        flatValue: 190,
        duration: 3,
        source: '三月七战技'
      },
      {
        type: 'Buff',
        targetType: 'Ally',
        buff: {
          id: 'mar7_skill_taunt',
          name: '嘲讽',
          type: 'Taunt', 
          value: 1, // Logic needs to handle taunt value
          isPercentage: false,
          duration: 3,
          source: '三月七战技'
        },
        conditionType: 'TargetHpGreaterThan',
        conditionValue: 0.3
      }
    ],
    'Ultra': [
      {
        type: 'Damage',
        targetType: 'AllEnemies',
        scaling: 'Atk',
        value: 0.9, // Lv 1
        element: 'Ice',
        toughnessDamage: 60
      },
      {
        type: 'Debuff',
        targetType: 'AllEnemies',
        chance: 0.5, // Lv 1
        debuff: {
          id: 'freeze_mar7_ult',
          name: '冻结',
          type: 'Freeze',
          value: 0,
          isPercentage: false,
          duration: 1,
          source: '三月七终结技',
          isDoT: true,
          dotDamage: 0.3 // Based on Atk
        }
      }
    ]
  },
  '1002': { // Dan Heng
    'Normal': [
      {
        type: 'Damage',
        targetType: 'Target',
        scaling: 'Atk',
        value: 1.0, // Lv 6
        element: 'Wind',
        toughnessDamage: 30
      },
      // Trace: High Gale (Basic ATK deals 40% more DMG to Slowed enemies)
      {
        type: 'Damage',
        targetType: 'Target',
        scaling: 'Atk',
        value: 0.4,
        element: 'Wind',
        conditionType: 'TargetHasDebuffType',
        conditionValue: 'Speed' // Slow
      }
    ],
    'BPSkill': [
      {
        type: 'Damage',
        targetType: 'Target',
        scaling: 'Atk',
        value: 1.3, // Lv 1
        element: 'Wind',
        toughnessDamage: 60
      },
      {
        type: 'Debuff',
        targetType: 'Target',
        chance: 1.0,
        conditionType: 'SourceLastAttackCrit', // Only if crit
        debuff: {
          id: 'slow_danheng',
          name: '减速',
          type: 'Speed',
          value: -0.12,
          isPercentage: true,
          duration: 2,
          source: '丹恒战技'
        }
      }
    ],
    'Ultra': [
      {
        type: 'Damage',
        targetType: 'Target',
        scaling: 'Atk',
        value: 2.4, // Lv 1
        element: 'Wind',
        toughnessDamage: 90
      },
      // Bonus damage if slowed - handled by damage formula or extra effect?
      // Simulator simple logic doesn't support conditional damage multiplier easily yet.
      // We can add a second damage effect with condition.
      {
        type: 'Damage',
        targetType: 'Target',
        scaling: 'Atk',
        value: 0.72, // Bonus multiplier
        element: 'Wind',
        conditionType: 'TargetHasDebuffType',
        conditionValue: 'Speed' // Slowed
      }
    ]
  },
  '1204': { // Jing Yuan
    'Normal': [
      {
        type: 'Damage',
        targetType: 'Target',
        scaling: 'Atk',
        value: 1.0, // Lv 6
        element: 'Lightning',
        toughnessDamage: 30
      }
    ],
    'BPSkill': [
      {
        type: 'Damage',
        targetType: 'AllEnemies',
        scaling: 'Atk',
        value: 1.0, // Lv 10
        element: 'Lightning',
        toughnessDamage: 30
      },
      {
        type: 'UpdateTalentCounter',
        targetType: 'Self',
        counterKey: 'll_hits',
        counterValue: 2
      },
      // A6: War Marshal (Crit Rate +10% for 2 turns)
      {
        type: 'Buff',
        targetType: 'Self',
        buff: {
          id: 'jy_a6_crit',
          name: '遣将 (暴击率)',
          type: 'CritRate',
          value: 0.10,
          isPercentage: true,
          duration: 2,
          source: '遣将'
        }
      }
    ],
    'Ultra': [
      {
        type: 'Damage',
        targetType: 'AllEnemies',
        scaling: 'Atk',
        value: 2.0, // Lv 10
        element: 'Lightning',
        toughnessDamage: 60
      },
      {
        type: 'UpdateTalentCounter',
        targetType: 'Self',
        counterKey: 'll_hits',
        counterValue: 3
      }
    ]
  }
};

export const CharacterTriggers: Record<string, TriggerConfig[]> = {
  '1001': [
    // Technique
    {
      id: 'mar7_technique',
      type: 'Technique',
      conditions: [
        { type: 'Chance', value: 1.0 }
      ],
      action: {
        targetType: 'RandomEnemy',
        effects: [
          {
            type: 'Damage',
            targetType: 'Target',
            scaling: 'Atk',
            value: 0.5,
            element: 'Ice',
            toughnessDamage: 20 // Technique usually deals damage
          },
          {
            type: 'Debuff',
            targetType: 'Target',
            chance: 1.0,
            debuff: {
              id: 'freeze_mar7_tech',
              name: '冻结 (秘技)',
              type: 'Freeze',
              value: 0,
              isPercentage: false,
              duration: 1,
              source: '三月七秘技',
              isDoT: true,
              dotDamage: 0.5
            }
          }
        ]
      }
    },
    // E2: Start battle with shield on lowest HP ally
    {
      id: 'mar7_e2',
      type: 'BattleStart',
      conditions: [{ type: 'EidolonUnlocked', value: 2 }],
      action: {
        targetType: 'LowestHpAlly',
        effects: [
          {
            type: 'Shield',
            targetType: 'Target',
            scaling: 'Def',
            value: 0.24,
            flatValue: 320,
            duration: 3,
            requiredEidolon: 2
          }
        ]
      }
    },
    // Talent: Counter
    {
      id: 'mar7_talent',
      type: 'AllyAttacked',
      maxPerTurn: 2,
      conditions: [
        { type: 'TargetHasShield' } // Target of attack has shield
      ],
      action: {
        targetType: 'Target', // The attacker (source of attack)
        effects: [
          {
            type: 'Damage',
            targetType: 'Target',
            scaling: 'Atk',
            value: 0.5, // Talent Lv 1 value
            element: 'Ice',
            toughnessDamage: 10
          }
        ]
      }
    }
  ],
  '1002': [
    // Technique
    {
      id: 'danheng_technique',
      type: 'Technique',
      conditions: [
      ],
      action: {
        targetType: 'Self',
        effects: [
          {
            type: 'Buff',
            targetType: 'Self',
            buff: {
              id: 'danheng_tech_atk',
              name: '攻击力提升 (秘技)',
              type: 'Atk',
              value: 0.40,
              isPercentage: true,
              duration: 3,
              source: '丹恒秘技'
            }
          }
        ]
      }
    },
    // Talent: Res Pen when targeted
    {
      id: 'danheng_talent',
      type: 'AllyAbilityTarget',
      cooldown: 2,
      conditions: [
      ],
      action: {
        targetType: 'Self',
        effects: [
          {
            type: 'Buff',
            targetType: 'Self',
            buff: {
              id: 'danheng_talent_pen',
              name: '风抗性穿透',
              type: 'ResPen', // Custom type handled in stats
              value: 0.18, // Lv 1
              isPercentage: true,
              duration: 2,
              source: '丹恒天赋'
            }
          }
        ]
      }
    },
    // E4: Ult Kill -> Advance
    {
      id: 'danheng_e4',
      type: 'Kill',
      conditions: [
        { type: 'EidolonUnlocked', value: 4 },
        { type: 'SourceAbilityType', value: 'Ultimate' }
      ],
      action: {
        targetType: 'Self',
        effects: [
          {
            type: 'ActionAdvance',
            targetType: 'Self',
            value: 1.0,
            requiredEidolon: 4
          }
        ]
      }
    }
  ],
  '1204': [
    // BattleStart: Summon Lightning Lord
    {
      id: 'jy_summon_ll',
      type: 'BattleStart',
      conditions: [],
      action: {
        targetType: 'Self',
        effects: [
          {
            type: 'UpdateTalentCounter',
            targetType: 'Self',
            counterKey: 'll_hits',
            counterValue: 3,
            counterReset: true
          },
          {
            type: 'Summon',
            targetType: 'Self',
            summonConfig: {
              name: '神君',
              baseSpeed: 60,
              inheritSpeed: false,
              inheritStats: true, // Inherit Atk/Crit/etc
              speedScaling: true,
              speedPerStack: 10,
              stackSource: 'll_hits',
              resetStacksAfterAction: true,
              resetStacksTo: 3,
              hasHp: false,
              baseTaunt: 0,
              canBeTargeted: false,
              skill: {
                id: 'll_skill',
                name: '神君攻击',
                type: 'Talent',
                targetType: 'Bounce',
                spChange: 0,
                energyGain: 0, // LL itself doesn't give energy directly (except via E4)
                toughnessDamage: 15,
                effects: [
                  // A2: Battalia Crush - If hits >= 6, Crit Dmg +25%
                  // Note: The actual logic is handled in simulator.ts (executeSummonAction and processActionEffects) 
                  // to ensure it applies correctly to the Summon's attack instance.
                  {
                    type: 'Buff',
                    targetType: 'Self', // Apply to Summon
                    conditionType: 'TalentCounterGreaterEqual',
                    conditionValue: 6,
                    counterKey: 'll_hits',
                    buff: {
                        id: 'jy_a2_crit',
                        name: '破阵 (暴伤提高)',
                        type: 'CritDmg',
                        value: 0.25,
                        isPercentage: true,
                        duration: 1, // Will persist for this attack sequence
                        source: '破阵'
                    }
                  },
                  {
                    type: 'Damage',
                    targetType: 'Target', // Each bounce hits a target
                    scaling: 'Atk',
                    value: 0.66, // Lv 10
                    element: 'Lightning',
                    toughnessDamage: 15
                  },
                  // E4: Energy Restore to Summoner
                  {
                    type: 'EnergyRestore',
                    targetType: 'Summoner', // Requires new targetType logic
                    value: 2,
                    requiredEidolon: 4
                  }
                ]
              }
            }
          }
        ]
      }
    },
    // A4: Savant - BattleStart Energy +15
    {
        id: 'jy_a4_energy',
        type: 'BattleStart',
        conditions: [],
        action: {
            targetType: 'Self',
            effects: [
                {
                    type: 'EnergyRestore',
                    targetType: 'Self',
                    value: 15
                }
            ]
        }
    },
    // E2: After LL acts -> Dmg Boost
    {
      id: 'jy_e2_buff',
      type: 'AttackEnd',
      conditions: [
        { type: 'EidolonUnlocked', value: 2 },
        { type: 'SourceIsMySummon' }
      ],
      action: {
        targetType: 'Self',
        effects: [
          {
            type: 'Buff',
            targetType: 'Self',
            buff: {
              id: 'jy_e2_dmg',
              name: '造成的伤害提高 (E2)',
              type: 'DmgBoost',
              value: 0.20,
              isPercentage: true,
              duration: 2,
              source: '景元E2'
            }
          }
        ]
      }
    },
    // Technique: Spirit-Crushing Command - At the start of the next battle, Lightning Lord's Hits per Action increases by 3.
    {
        id: 'jy_technique',
        type: 'Technique',
        conditions: [],
        action: {
            targetType: 'Self',
            effects: [
                {
                    type: 'UpdateTalentCounter',
                    targetType: 'Self',
                    counterKey: 'll_hits',
                    counterValue: 3
                },
                {
                    type: 'Buff',
                    targetType: 'Self',
                    buff: {
                        id: 'jy_tech_status',
                        name: '秘技: 摄神威灵',
                        type: 'Buff', // Just for display
                        value: 0,
                        isPercentage: false,
                        duration: 0,
                        source: '秘技'
                    }
                }
            ]
        }
    }
  ],
  '9999': [
      {
          id: 'summon_on_start',
          type: 'BattleStart',
          conditions: [],
          action: {
              targetType: 'Self',
              effects: [
                  {
                      type: 'Summon',
                      targetType: 'Self',
                      summonConfig: {
                          name: 'Battle Start Summon',
                          baseSpeed: 120,
                          inheritSpeed: false,
                          // No initialAV -> defaults to baseAV (10000/120), so it just runs normally
                          skill: {
                              name: 'Summon Attack',
                              type: 'Normal',
                              targetType: 'RandomEnemy',
                              effects: [{ type: 'Damage', scaling: 'Atk', value: 1.0, element: 'Physical' }]
                          },
                          hasHp: false,
                          baseTaunt: 0,
                          canBeTargeted: false
                      }
                  }
              ]
          }
      }
  ]
};
