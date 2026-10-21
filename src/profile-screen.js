import {glyphs} from './voxel-text.js';
import {avatarPortrait} from './avatar-preview.js';
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

export class ProfileScreen{
  constructor(host,{list,onCreate,onLoad,onDelete}){
    this.host=host;this.list=list;this.onCreate=onCreate;this.onLoad=onLoad;this.onDelete=onDelete;this.busy=false;this.deleting=null;this.editing=null;this.pendingName='';
    host.innerHTML=`<div class="profile-home"><h1 aria-label="Lemonomics" class="voxel-title">${titleArt()}</h1><div id="profileSlots" class="profile-slots" aria-label="Choose a game profile"></div><p class="profile-local-note">Five players. Five businesses. Your progress is saved on this device.</p><p id="profileError" class="profile-error" role="alert" hidden></p></div><div class="profile-dialog-scrim" id="avatarPicker" hidden role="dialog" aria-modal="true" aria-labelledby="avatarTitle"><div class="profile-dialog"><h2 id="avatarTitle">Choose your avatar</h2><p id="avatarGreeting"></p><div class="avatar-choices"><button type="button" data-avatar="male">${avatarPortrait('male')}<span>Male</span></button><button type="button" data-avatar="female">${avatarPortrait('female')}<span>Female</span></button></div><button type="button" class="profile-cancel" id="cancelAvatar">Back</button></div></div>`;
    host.insertAdjacentHTML('beforeend','<div class="profile-dialog-scrim" id="deleteProfileDialog" hidden role="dialog" aria-modal="true" aria-labelledby="deleteProfileTitle"><div class="profile-dialog"><h2 id="deleteProfileTitle">Delete saved game?</h2><p id="deleteProfileWarning"></p><p>This permanently erases this business and its progress. This cannot be undone.</p><p id="deleteProfileError" role="alert" hidden></p><div class="delete-profile-actions"><button type="button" id="cancelDeleteProfile">Keep saved game</button><button type="button" id="confirmDeleteProfile">Delete saved game</button></div></div></div>');
    this.deleteDialog=host.querySelector('#deleteProfileDialog');
    this.slots=host.querySelector('#profileSlots');this.picker=host.querySelector('#avatarPicker');
    host.addEventListener('click',async e=>{
      const b=e.target.closest('button');if(!b||this.busy)return;
      if(b.dataset.deleteSlot!==undefined){this.askDelete(Number(b.dataset.deleteSlot));return}
      if(b.id==='cancelDeleteProfile'){this.closeDelete();return}
      if(b.id==='confirmDeleteProfile'){await this.confirmDelete();return}
      if(b.dataset.newSlot!==undefined){this.editing=Number(b.dataset.newSlot);this.render();this.slots.querySelector('input')?.focus()}
      else if(b.dataset.loadSlot!==undefined){try{b.disabled=true;await this.onLoad(Number(b.dataset.loadSlot))}catch(error){this.error(error.message)}finally{b.disabled=false}}
      else if(b.dataset.avatar){try{this.picker.querySelectorAll('button').forEach(b=>b.disabled=true);await this.onCreate(this.editing,this.pendingName,b.dataset.avatar);this.picker.hidden=true;this.editing=null}catch(error){this.picker.hidden=true;this.error(error.message);this.render()}finally{this.picker.querySelectorAll('button').forEach(b=>b.disabled=false)}}
      else if(b.id==='cancelAvatar'){this.picker.hidden=true;this.render();this.slots.querySelector('input')?.focus()}
      else if(b.dataset.submitName!==undefined)this.chooseAvatar();
    });
    host.addEventListener('submit',e=>{if(e.target.getAttribute('action')==='/logout')return;e.preventDefault();this.chooseAvatar()});
    host.addEventListener('input',e=>{if(e.target.id==='profileName')e.target.value=e.target.value.replace(/[^A-Za-z]/g,'').slice(0,16)});
    host.addEventListener('keydown',e=>{
      if(e.key==='Enter'&&e.target.id==='profileName'){e.preventDefault();this.chooseAvatar();return;}
      if(e.key==='Escape'&&!this.busy){if(!this.deleteDialog.hidden){this.closeDelete();return}if(!this.picker.hidden){this.picker.hidden=true;this.render();this.slots.querySelector('input')?.focus()}else if(this.editing!==null){const slot=this.editing;this.editing=null;this.render();this.slots.querySelector(`[data-new-slot="${slot}"]`)?.focus()}}
      if(e.key==='Tab'&&!this.deleteDialog.hidden)trapFocus(e,this.deleteDialog);
      if(e.key==='Tab'&&!this.picker.hidden)trapFocus(e,this.picker);
    });
  }
  askDelete(slot){
    const profile=this.list()[slot];if(!profile)return;
    this.deleting={...profile,slot};
    this.host.querySelector('#deleteProfileWarning').textContent=`Delete ${profile.name}’s saved game (Day ${profile.state.day})?`;
    this.host.querySelector('#deleteProfileError').hidden=true;this.deleteDialog.hidden=false;
    this.host.querySelector('#cancelDeleteProfile').focus();
  }
  closeDelete(){
    const slot=this.deleting?.slot;this.deleteDialog.hidden=true;this.deleting=null;
    this.slots.querySelector(`[data-delete-slot="${slot}"]`)?.focus();
  }
  async confirmDelete(){
    if(!this.deleting||this.busy)return;this.busy=true;
    const {id,revision,slot}=this.deleting;
    this.deleteDialog.querySelectorAll('button').forEach(b=>b.disabled=true);
    try{
      await this.onDelete(id,revision);this.deleteDialog.hidden=true;this.deleting=null;this.error('');this.render();
      this.slots.querySelector(`[data-new-slot="${slot}"]`)?.focus();
    }catch(error){const el=this.host.querySelector('#deleteProfileError');el.textContent=error.message;el.hidden=false;}
    finally{this.busy=false;this.deleteDialog.querySelectorAll('button').forEach(b=>b.disabled=false)}
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
      const portrait=document.createElement('div');portrait.className='profile-avatar';if(profile)portrait.innerHTML=avatarPortrait(profile.avatar,profile.state.avatarAppearance);row.append(portrait);
      if(profile){
        const button=document.createElement('button');button.type='button';button.className='profile-slot';button.dataset.loadSlot=i;
        for(const value of [profile.name,`Day ${profile.state.day}`,formatSavedAt(profile.savedAt)]){const cell=document.createElement('span');cell.textContent=value;button.append(cell)}
        button.setAttribute('aria-label',`Load ${profile.name}, day ${profile.state.day}`);row.append(button);
        const remove=document.createElement('button');remove.type='button';remove.className='profile-delete';remove.dataset.deleteSlot=i;remove.textContent='Delete';remove.setAttribute('aria-label',`Delete ${profile.name}'s saved game`);row.append(remove);
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
