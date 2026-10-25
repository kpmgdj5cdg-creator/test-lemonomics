import {group,character,disposeGroup,box} from './models.js';

// Versioned appearance data can later come from a wardrobe or avatar picker.
// Meshes, clothing slots and movement state are deliberately kept separate.
export const DEFAULT_APPEARANCE=Object.freeze({version:1,type:'male',skin:'#bd885f',hair:'#483426',hairStyle:'short',clothing:'polo',shirt:'#e96546',pants:'#275b85',shoes:'#fff0cb'});
export const appearanceFor=type=>({...DEFAULT_APPEARANCE,type:type==='female'?'female':'male',...(type==='female'?{shirt:'#9c6bb0',hair:'#543629',hairStyle:'long'}:{})});
const colors=['skin','hair','shirt','pants','shoes'];
export class PlayerAvatar{
  constructor(parent,appearance={}){
    this.group=group(parent);this.group.name='player-avatar';this.appearance={...DEFAULT_APPEARANCE};this.setAppearance(appearance);
  }
  setAppearance(appearance){
    if(['male','female'].includes(appearance.type)){this.appearance.type=appearance.type;if(!appearance.hairStyle)this.appearance.hairStyle=appearance.type==='female'?'long':'short'}
    for(const key of colors)if(/^#[0-9a-f]{6}$/i.test(appearance[key]||''))this.appearance[key]=appearance[key];
    for(const key of ['id','hairStyle','clothing','body','face','accessories','defaultExpression'])if(appearance[key]!==undefined)this.appearance[key]=appearance[key];
    if(this.rig)disposeGroup(this.rig.group);
    this.rig=character(this.group,'player',this.appearance);
    // A small lemon badge distinguishes the playable character from customers.
    box(this.rig.slots.body,0,.79,.15,.13,.12,.04,'#ffe064');
    this.slots=this.rig.slots;
  }
  animate(time,moving,reducedMotion){
    this.rig.update(time,{moving,reducedMotion});
  }
  dispose(){disposeGroup(this.group)}
}
