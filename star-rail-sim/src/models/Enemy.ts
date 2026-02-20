
import { ElementType, Debuff } from './types';

export class Enemy {
  id: string;
  name: string;
  level: number;
  maxHp: number;
  currentHp: number;
  maxToughness: number; // 最大韧性
  currentToughness: number; // 当前韧性
  baseSpeed: number; // Base Speed
  
  // 抗性
  res: Record<ElementType, number>;
  
  // 弱点
  weaknesses: ElementType[];
  
  // 状态
  isBroken: boolean;
  defReduction: number; // 减防
  vuln: number; // 易伤
  dmgRed: number; // 减伤
  
  debuffs: Debuff[];
  effectRes: number; // 效果抵抗

  constructor(id: string, name: string, level: number = 80, stats?: { hp: number, atk: number, def: number, speed: number, toughness: number }) {
    this.id = id;
    this.name = name;
    this.level = level;
    
    if (stats) {
      this.maxHp = stats.hp;
      this.currentHp = stats.hp;
      this.maxToughness = stats.toughness;
      this.currentToughness = stats.toughness;
      this.baseSpeed = stats.speed;
    } else {
      this.maxHp = 100000;
      this.currentHp = 100000;
      this.maxToughness = 300;
      this.currentToughness = 300;
      this.baseSpeed = 100;
    }
    
    this.isBroken = false;
    this.defReduction = 0;
    this.vuln = 0;
    this.dmgRed = 0;
    this.weaknesses = [];
    this.debuffs = [];
    this.effectRes = 0; // Default Effect Res
    
    // 默认抗性 20%
    this.res = {
      [ElementType.Physical]: 0.2,
      [ElementType.Fire]: 0.2,
      [ElementType.Ice]: 0.2,
      [ElementType.Lightning]: 0.2,
      [ElementType.Wind]: 0.2,
      [ElementType.Quantum]: 0.2,
      [ElementType.Imaginary]: 0.2
    };
  }

  get speed(): number {
    let multiplier = 1.0;
    let flat = 0;
    
    if (this.debuffs) {
      this.debuffs.forEach(d => {
          if (d.type === 'Speed') {
              if (d.isPercentage) multiplier += d.value;
              else flat += d.value;
          }
      });
    }
    
    return Math.max(1, this.baseSpeed * multiplier + flat);
  }

  addWeakness(element: ElementType) {
    if (!this.weaknesses.includes(element)) {
      this.weaknesses.push(element);
      this.res[element] = 0; // 有弱点抗性为0 (基础)
    }
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

  tickDebuffs(): { damage: number, details: string[] } {
    let totalDamage = 0;
    const details: string[] = [];

    this.debuffs.forEach(d => {
      if (d.isDoT && d.dotDamage) {
         let element = ElementType.Physical;
         // Simple element inference
         if (d.name.includes('Freeze') || d.name.includes('Ice')) element = ElementType.Ice;
         else if (d.name.includes('Burn') || d.name.includes('Fire')) element = ElementType.Fire;
         else if (d.name.includes('Shock') || d.name.includes('Lightning')) element = ElementType.Lightning;
         else if (d.name.includes('Wind') || d.name.includes('Shear')) element = ElementType.Wind;
         else if (d.name.includes('Quantum') || d.name.includes('Entanglement')) element = ElementType.Quantum;
         else if (d.name.includes('Imaginary') || d.name.includes('Imprisonment')) element = ElementType.Imaginary;
         
         const res = this.takeDamage(d.dotDamage, element, 0);
         totalDamage += res.damage;
         details.push(`${d.name}: ${Math.floor(res.damage)}`);
      }
      d.duration--;
    });

    this.debuffs = this.debuffs.filter(d => d.duration > 0);
    
    return { damage: totalDamage, details };
  }

  takeDamage(amount: number, element: ElementType, toughnessDmg: number, resPen: number = 0, breakEffectStats: number = 0): { damage: number, toughness: number, isBroken: boolean, breakDamage?: number, breakActionDelay?: number } {
    let finalDamage = amount;
    
    // Apply Resistance
    // Formula: 1 - (RES - RES_PEN)
    const baseRes = this.res[element] || 0;
    const effectiveRes = baseRes - resPen;
    
    let resMult = 1 - effectiveRes;
    if (resMult < 0.1) resMult = 0.1; // Max 90% effective RES
    if (resMult > 2.0) resMult = 2.0; 

    // Apply Vulnerability (DmgBoost Debuffs)
    let vulnMult = 1.0 + this.vuln;
    this.debuffs.forEach(d => {
        if (d.type === 'DmgBoost') {
            if (d.isPercentage) vulnMult += d.value;
            else vulnMult += (d.value / 100);
        }
    });
    finalDamage *= vulnMult;

    // Apply Defense/Vuln (Simplified)
    // Defense Multiplier = 100% (assuming same level)
    const defMult = 0.5; // Dummy defense formula (Level based usually)
    finalDamage *= defMult;
    
    // Toughness Reduction
    let toughnessReduced = 0;
    let breakTriggered = false;
    let breakDamage = 0;
    let breakActionDelay = 0;
    
    // Only reduce toughness if not broken and weakness matches (or specific mechanics allow)
    const hasWeakness = this.weaknesses.includes(element);
    
    if (!this.isBroken && hasWeakness) {
       toughnessReduced = toughnessDmg;
       this.currentToughness -= toughnessReduced;
       
       if (this.currentToughness <= 0) {
         this.currentToughness = 0;
         this.isBroken = true;
         breakTriggered = true;
         
         // Calculate Break Damage
         // Base Break DMG at Level 80 approx 3767
         const baseBreakDmg = 3767;
         const maxToughnessMult = 0.5 + (this.maxToughness / 120);
         
         let elementMult = 1.0;
         switch (element) {
             case ElementType.Physical: elementMult = 2.0; break;
             case ElementType.Fire: elementMult = 2.0; break;
             case ElementType.Ice: elementMult = 1.0; break;
             case ElementType.Lightning: elementMult = 1.0; break;
             case ElementType.Wind: elementMult = 1.5; break;
             case ElementType.Quantum: elementMult = 0.5; break;
             case ElementType.Imaginary: elementMult = 0.5; break;
         }
         
         breakDamage = baseBreakDmg * elementMult * maxToughnessMult * (1 + breakEffectStats);
         // Apply defense/res to break damage too? Usually yes.
         // Break DMG ignores damage reduction? No.
         // But let's apply simplified logic: just raw break damage for now, or apply def/res?
         // Break DMG is affected by Def and Res.
         breakDamage = breakDamage * defMult * resMult; 
         
         finalDamage += breakDamage;
         
         // Apply Break Debuffs / Delay
         if (element === ElementType.Quantum) {
             breakActionDelay = 0.2 * (1 + breakEffectStats); // Base 20% + BE
             this.addDebuff({
                 id: `break_entangle_${Date.now()}`,
                 name: 'Entanglement',
                 type: 'Debuff',
                 duration: 1, // 1 turn?
                 isDoT: true,
                 dotDamage: breakDamage * 0.6 * (1 + breakEffectStats), // Simplified
                 isPercentage: false,
                 value: 0
             });
         } else if (element === ElementType.Imaginary) {
             breakActionDelay = 0.3 * (1 + breakEffectStats); // Base 30% + BE
             this.addDebuff({
                 id: `break_imprison_${Date.now()}`,
                 name: 'Imprisonment',
                 type: 'Debuff',
                 duration: 1,
                 isDoT: false, // Speed reduction
                 value: -0.1, // -10% Speed
                 isPercentage: true
             });
         } else if (element === ElementType.Ice) {
             // Freeze
             this.addDebuff({
                 id: `break_freeze_${Date.now()}`,
                 name: 'Freeze',
                 type: 'Debuff',
                 duration: 1,
                 isDoT: true,
                 dotDamage: breakDamage * 1.0, 
                 value: 0
             });
             // Frozen advances forward 50% after turn skip, effectively 50% delay
         } else {
             // Standard 25% delay
             breakActionDelay = 0.25;
             
             // Apply DoTs
             let dotName = 'Break DoT';
             let dotScale = 1.0;
             if (element === ElementType.Physical) { dotName = 'Bleed'; dotScale = 2.0; } // Max HP based usually
             else if (element === ElementType.Fire) { dotName = 'Burn'; dotScale = 1.0; }
             else if (element === ElementType.Wind) { dotName = 'Wind Shear'; dotScale = 1.0; } // Stacks?
             else if (element === ElementType.Lightning) { dotName = 'Shock'; dotScale = 2.0; }
             
             this.addDebuff({
                 id: `break_dot_${Date.now()}`,
                 name: dotName,
                 type: 'Debuff',
                 duration: 2,
                 isDoT: true,
                 dotDamage: baseBreakDmg * dotScale, // Simplified
                 value: 0
             });
         }
       }
    } else if (this.isBroken) {
       // Broken enemies take more damage usually (10% base vuln -> 0.9 multiplier to 1.0 multiplier? No, res is reduced? No, just separate multiplier)
       // Actually 10% damage reduction is removed.
       // Here we just add 10% damage
       finalDamage *= 1.1; 
    }
    
    this.currentHp -= finalDamage;
    if (this.currentHp < 0) this.currentHp = 0;
    
    return {
      damage: finalDamage - breakDamage, // Return Direct Damage only
      toughness: toughnessReduced,
      isBroken: breakTriggered,
      breakDamage: breakDamage,
      breakActionDelay: breakActionDelay
    };
  }
  
  recoverToughness() {
    this.isBroken = false;
    this.currentToughness = this.maxToughness;
  }
}
