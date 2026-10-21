import {glyphs} from './voxel-text.js';
import {appearanceFor} from './avatar.js';
import {formatSavedAt} from './profiles.js';

function titleArt(){
  let cursor=5,blocks='';const unit=8;
  for(const c of 'LEMONOMICS'){
    const glyph=glyphs[c];
    for(let y=0;y<7;y++)for(let x=0;x<glyph[y].length;x++)if(glyph[y][x]==='1'){
      const px=cursor+x*unit,py=8+y*unit;
      blocks+=`<path d="M${px} ${py+8}h8l5 5h-8z" fill="#b58d18"/><path d="M${px+8} ${py}v8l5 5v-8z" fill="#d6a51c"/><rect x="${px}" y="${py}" width="8" height="8" fill="${y<2?'#ffed75':'#ffda39'}"/>`;
    }
    cursor+=(glyph[0].length+1)*unit;
  }
  return `<svg viewBox="0 0 ${cursor+4} 82" aria-hidden="true">${blocks}</svg>`;
}

// Cosmetic portraits share the same appearance data as the playable rigs.
export function avatarPortrait(type){
  const a=appearanceFor(type),female=type==='female';
  return `<svg viewBox="0 0 62 94" aria-hidden="true" class="profile-portrait"><ellipse cx="31" cy="89" rx="20" ry="4" fill="#286036" opacity=".3"/>
    <path d="M13 34h36v28H13z" fill="${a.shirt}"/><path d="M10 39h9v29h-9zM43 39h9v29h-9z" fill="${a.skin}"/>
    <path d="M10 39h9v17h-9zM43 39h9v17h-9z" fill="${a.shirt}"/><path d="M20 60h10v24H20zM33 60h10v24H33z" fill="${a.pants}"/>
    <path d="M18 81h13v7H18zM32 81h13v7H32z" fill="${a.shoes}"/>
    ${female?`<path d="M17 8h28v31H17z" fill="${a.hair}"/>`:''}
    <path d="M20 12h24v24H20z" fill="${a.skin}"/><path d="M18 8h28v10H18z" fill="${a.hair}"/>
    ${female?`<path d="M17 15h5v25h-5zM42 15h5v25h-5z" fill="${a.hair}"/><path d="M46 21h5v6h-5z" fill="#f2cc4d"/>`:''}
    <path d="M25 23h3v3h-3zM36 23h3v3h-3z" fill="#3b4435"/><path d="M28 31h8v2h-8z" fill="#976342"/>
    <path d="M31 44h6v7h-6z" fill="#ffe064"/></svg>`;
}

export class ProfileScreen{
  constructor(host,{list,onCreate,onLoad}){
    this.host=host;this.list=list;this.onCreate=onCreate;this.onLoad=onLoad;this.editing=null;this.pendingName='';
    host.innerHTML=`<div class="profile-home"><h1 aria-label="Lemonomics" class="voxel-title">${titleArt()}</h1><div id="profileSlots" class="profile-slots" aria-label="Choose a game profile"></div><p class="profile-local-note">Three players. Three businesses. Your progress is saved on this device.</p><p id="profileError" class="profile-error" role="alert" hidden></p></div><div class="profile-dialog-scrim" id="avatarPicker" hidden role="dialog" aria-modal="true" aria-labelledby="avatarTitle"><div class="profile-dialog"><h2 id="avatarTitle">Choose your avatar</h2><p id="avatarGreeting"></p><div class="avatar-choices"><button type="button" data-avatar="male">${avatarPortrait('male')}<span>Male</span></button><button type="button" data-avatar="female">${avatarPortrait('female')}<span>Female</span></button></div><button type="button" class="profile-cancel" id="cancelAvatar">Back</button></div></div>`;
    this.slots=host.querySelector('#profileSlots');this.picker=host.querySelector('#avatarPicker');
    host.addEventListener('click',e=>{
      const b=e.target.closest('button');if(!b)return;
      if(b.dataset.newSlot!==undefined){this.editing=Number(b.dataset.newSlot);this.render();this.slots.querySelector('input')?.focus()}
      else if(b.dataset.loadSlot!==undefined){try{this.onLoad(Number(b.dataset.loadSlot))}catch(error){this.error(error.message)}}
      else if(b.dataset.avatar){try{this.onCreate(this.editing,this.pendingName,b.dataset.avatar);this.picker.hidden=true;this.editing=null}catch(error){this.picker.hidden=true;this.error(error.message);this.render()}}
      else if(b.id==='cancelAvatar'){this.picker.hidden=true;this.render();this.slots.querySelector('input')?.focus()}
      else if(b.dataset.submitName!==undefined)this.chooseAvatar();
    });
    host.addEventListener('submit',e=>{e.preventDefault();this.chooseAvatar()});
    host.addEventListener('input',e=>{if(e.target.id==='profileName')e.target.value=e.target.value.replace(/[^A-Za-z]/g,'').slice(0,16)});
    host.addEventListener('keydown',e=>{
      if(e.key==='Enter'&&e.target.id==='profileName'){e.preventDefault();this.chooseAvatar();return;}
      if(e.key==='Escape'){if(!this.picker.hidden){this.picker.hidden=true;this.render();this.slots.querySelector('input')?.focus()}else if(this.editing!==null){const slot=this.editing;this.editing=null;this.render();this.slots.querySelector(`[data-new-slot="${slot}"]`)?.focus()}}
      if(e.key==='Tab'&&!this.picker.hidden)trapFocus(e,this.picker);
    });
  }
  chooseAvatar(){
    const input=this.slots.querySelector('input');if(!input||!input.reportValidity())return;
    this.pendingName=input.value;this.host.querySelector('#avatarGreeting').textContent=`${this.pendingName}, who will run your stand?`;
    this.picker.hidden=false;this.picker.querySelector('[data-avatar]')?.focus();
  }
  error(message){const el=this.host.querySelector('#profileError');el.textContent=message;el.hidden=!message;}
  render(){
    let profiles;try{profiles=this.list()}catch(error){this.error(error.message);return}
    this.slots.replaceChildren();
    profiles.forEach((profile,i)=>{
      const row=document.createElement('div');row.className='profile-row';row.dataset.profileSlot=i;
      const portrait=document.createElement('div');portrait.className='profile-avatar';if(profile)portrait.innerHTML=avatarPortrait(profile.avatar);row.append(portrait);
      if(profile){
        const button=document.createElement('button');button.type='button';button.className='profile-slot';button.dataset.loadSlot=i;
        for(const value of [profile.name,`Day ${profile.state.day}`,formatSavedAt(profile.savedAt)]){const cell=document.createElement('span');cell.textContent=value;button.append(cell)}
        button.setAttribute('aria-label',`Load ${profile.name}, day ${profile.state.day}`);row.append(button);
      }else{
        const rectangle=document.createElement('div');rectangle.className='profile-slot empty';
        const left=document.createElement('div');left.className='profile-name-cell';
        if(this.editing===i){
          left.innerHTML='<div class="profile-name-form"><input id="profileName" aria-label="Your name" placeholder="Your name" type="text" maxlength="16" pattern="[A-Za-z]{1,16}" title="Use 1–16 letters, A–Z or a–z" autocomplete="off" required><button type="button" data-submit-name="true" aria-label="Choose avatar">→</button></div>';
          left.querySelector('input').value=this.pendingName;
        }else{const b=document.createElement('button');b.type='button';b.textContent='New game';b.dataset.newSlot=i;left.append(b)}
        rectangle.append(left,document.createElement('span'),document.createElement('span'));row.append(rectangle);
      }
      this.slots.append(row);
    });
  }
  show(){this.editing=null;this.pendingName='';this.render();this.host.hidden=false;this.slots.querySelector('button')?.focus()}
}

export function trapFocus(e,dialog){
  const targets=[...dialog.querySelectorAll('button:not(:disabled),input,select,[tabindex="0"]')].filter(el=>el.getClientRects().length);
  const first=targets[0],last=targets.at(-1);if(!first){e.preventDefault();return}
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
}
