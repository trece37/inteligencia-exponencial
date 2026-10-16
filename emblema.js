import * as motion from './avatar-motion-v1.js';

const BASE=new URL('./',import.meta.url);
const ICONS=motion.ORDER.slice(1,-1);
const LABEL='Avatar de Manel. Recargar la página';

function imageAt(src,signal){
 return new Promise((resolve,reject)=>{
  const image=new Image();
  const clear=()=>{image.onload=null;image.onerror=null;signal.removeEventListener('abort',cancel)};
  const cancel=()=>{clear();image.removeAttribute('src');reject(new DOMException('Carga cancelada','AbortError'))};
  image.onload=()=>{clear();resolve(image)};
  image.onerror=()=>{clear();reject(new Error('Avatar asset unavailable'))};
  if(signal.aborted){cancel();return}
  signal.addEventListener('abort',cancel,{once:true});image.src=src;
 });
}

export class ManelEmblem extends HTMLElement{
 static observedAttributes=['avatar-src','size','autoplay'];
 constructor(){
  super();this.attachShadow({mode:'open'});
  this._running=false;this._ready=false;this._failed=false;this._loading=false;
  this._autoConsumed=false;this._inView=false;this._raf=0;this._generation=0;this._pendingPlay=null;
  this._reduced=matchMedia('(prefers-reduced-motion: reduce)');
  this.shadowRoot.innerHTML=`<style>:host{display:inline-block;inline-size:var(--emblem-size,64px);block-size:var(--emblem-size,64px);flex:none}.emblem-button{position:relative;display:block;inline-size:100%;block-size:100%;padding:0;border:0;border-radius:50%;background:transparent}canvas{display:block;width:100%;height:100%;opacity:0;pointer-events:none}.avatar-fallback{position:absolute;inset:6.83594%;width:86.32812%;height:86.32812%;border-radius:50%;pointer-events:none}.description{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}</style><link rel="stylesheet" href="${new URL('emblema.css?v=avatar-vivo-1',BASE)}">
   <button class="emblem-button" type="button" aria-label="${LABEL}" aria-describedby="description">
    <img class="avatar-fallback" alt="" decoding="async" aria-hidden="true">
    <canvas width="512" height="512" aria-hidden="true"></canvas>
   </button>
   <span class="description" id="description">Una figura de luz azul abre y cierra una secuencia de conectividad, inteligencia, código, mundo conectado, voz y visión. Pasa el ratón para repetirla. Haz clic o toca el avatar para recargar la página. Pulsa Escape para detener la animación.</span>`;
  this._button=this.shadowRoot.querySelector('button');
  this._canvas=this.shadowRoot.querySelector('canvas');
  this._fallback=this.shadowRoot.querySelector('img');
  this._tick=this._tick.bind(this);
 }
 connectedCallback(){
  this._abort?.abort();this._abort=new AbortController();const signal=this._abort.signal;
  this._setSize();this._fallback.src=this._avatarURL();
  this._button.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse')this.play('hover')},{signal});
  this._button.addEventListener('click',()=>location.reload(),{signal});
  this._button.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();this.reset()}},{signal});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)this.reset();else this._maybeAuto()},{signal});
  this._reduced.addEventListener('change',()=>this.reset(),{signal});
  if('IntersectionObserver'in globalThis){
   this._observer=new IntersectionObserver(entries=>{this._inView=entries[0].isIntersecting;if(!this._inView)this.reset();else this._maybeAuto()},{threshold:0});
   this._observer.observe(this);
  }else{this._inView=true}
  if(this._ready){this._draw(0);this._maybeAuto()}else this._loadAssets();
 }
 disconnectedCallback(){
  this.reset();this._abort?.abort();this._assetAbort?.abort();this._observer?.disconnect();
  this._generation++;this._loading=false;this._pendingPlay=null;
 }
 attributeChangedCallback(name,oldValue,value){
  if(oldValue===value)return;
  if(name==='size')this._setSize();
  if(name==='autoplay'&&value==='false')this.reset();
  if(name==='avatar-src'){
   this.reset();this._ready=false;this.removeAttribute('data-ready');
   if(this._fallback)this._fallback.src=this._avatarURL();
   if(this.isConnected)this._loadAssets();
  }
 }
 _avatarURL(){return this.getAttribute('avatar-src')||new URL('assets/avatar-manel.webp',BASE).href}
 _setSize(){this.style.setProperty('--emblem-size',`${Math.max(44,Math.min(96,Number(this.getAttribute('size'))||64))}px`)}
 async _loadAssets(){
  this._assetAbort?.abort();this._assetAbort=new AbortController();const signal=this._assetAbort.signal,generation=++this._generation;
  this._loading=true;this._failed=false;
  try{
   const files=[['avatar',this._avatarURL()],...ICONS.map(name=>[name,new URL('assets/avatar-icons/'+name+'.svg',BASE).href])];
   const loaded=await Promise.all(files.map(async([name,url])=>[name,await imageAt(url,signal)]));
   if(!this.isConnected||generation!==this._generation||signal.aborted)return;
   const sprites={};
   for(const [name,image] of loaded){const canvas=document.createElement('canvas');canvas.width=canvas.height=512;sprites[name]=motion.texture(canvas,image,name==='avatar')}
   this._sprites=sprites;this._ready=true;this._loading=false;this._draw(0);this.setAttribute('data-ready','');
   const pending=this._pendingPlay;this._pendingPlay=null;
   if(pending)this.play(pending);else this._maybeAuto();
  }catch(error){
   if(generation!==this._generation||signal.aborted)return;
   this._loading=false;this._ready=false;this._failed=true;this.removeAttribute('data-ready');
   this._pendingPlay=null;this.reset();
  }
 }
 _maybeAuto(){
  if(this._ready&&!this._autoConsumed&&this.getAttribute('autoplay')!=='false'&&!this._reduced.matches&&!document.hidden&&this._inView&&this.isConnected)this.play('automatic');
 }
 play(reason='user'){
  if(!this.isConnected||document.hidden||!this._inView)return false;
  if(reason==='automatic'&&(this._autoConsumed||this.getAttribute('autoplay')==='false'||this._reduced.matches))return false;
  if(!this._ready){this._pendingPlay=reason;if(!this._loading)this._loadAssets();return false}
  cancelAnimationFrame(this._raf);this._autoConsumed=true;this._running=true;this._reason=reason;
  this._start=performance.now();this._elapsed=0;this.setAttribute('data-running','');this._draw(0);
  this.dispatchEvent(new CustomEvent('emblemstart',{detail:{reason},bubbles:true}));
  this._raf=requestAnimationFrame(this._tick);return true;
 }
 _draw(time){if(this._ready)motion.draw(this._canvas,this._sprites,time,{reduced:this._reduced.matches})}
 _tick(now){
  if(!this._running)return;
  if(!this.isConnected||document.hidden||!this._inView){this.reset();return}
  this._elapsed=now-this._start;this._draw(this._elapsed);
  if(this._elapsed>=motion.TOTAL){this._running=false;this._raf=0;this.removeAttribute('data-running');this.dispatchEvent(new CustomEvent('emblemend',{detail:{reason:this._reason},bubbles:true}));return}
  this._raf=requestAnimationFrame(this._tick);
 }
 reset(){
  cancelAnimationFrame(this._raf);this._raf=0;this._running=false;this._elapsed=0;this._pendingPlay=null;
  this.removeAttribute('data-running');if(this._ready)this._draw(0);
 }
}
if(!customElements.get('manel-emblem'))customElements.define('manel-emblem',ManelEmblem);
