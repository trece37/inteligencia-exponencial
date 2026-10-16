/* Vídeo decorativo. Un estado compartido, dos paletas, un solo vídeo activo. */
const MAX_PLAYS=3;
const CINEMATIC_COPY=Object.freeze([
  [4,8,'Una idea empieza a moverse'],
  [8,12,'Lo posible cambia de escala'],
  [12,16,'Imágenes. Historias. Mundos.'],
  [16,20,'De una necesidad, una herramienta.'],
  [20,24,'Tu curiosidad. Una dirección.'],
  [24,29,'Comprender. Crear. Elegir tu rumbo.']
]);
const STORAGE_KEY='profesor-intro';
const hasDataSaver=()=>Boolean(navigator.connection?.saveData);
const readOff=()=>{try{return localStorage.getItem(STORAGE_KEY)==='off'}catch{return false}};
const storeOff=value=>{try{localStorage.setItem(STORAGE_KEY,value?'off':'on')}catch{}};

function waitForMedia(video,events,test,signal){
  return new Promise((resolve,reject)=>{
    let timeout;
    const cleanup=()=>{clearTimeout(timeout);for(const event of events)video.removeEventListener(event,check);video.removeEventListener('error',error);signal.removeEventListener('abort',abort)};
    const done=(failure)=>{cleanup();failure?reject(failure):resolve()};
    const check=()=>{if(test())done()};
    const error=()=>done(new Error('media-error'));
    const abort=()=>done(new DOMException('Superseded','AbortError'));
    for(const event of events)video.addEventListener(event,check);
    video.addEventListener('error',error);signal.addEventListener('abort',abort,{once:true});
    timeout=setTimeout(()=>done(new Error('media-timeout')),12000);
    if(signal.aborted)abort();else if(video.error)error();else check();
  });
}

export class HeroIntroController{
  constructor(hero){
    this.hero=hero;this.videos=[...hero.querySelectorAll('video[data-intro-theme]')];
    this.controls=hero.querySelector('[data-intro-controls]');this.toggle=hero.querySelector('[data-intro-toggle]');
    this.replayButton=hero.querySelector('[data-intro-replay]');this.offButton=hero.querySelector('[data-intro-off]');this.status=hero.querySelector('[data-intro-status]');
    this.cinematic=hero.querySelector('[data-intro-cinematic]');
    if(this.videos.length!==2||!this.controls||!this.toggle||!this.replayButton||!this.offButton||!this.status)throw new Error('Hero intro: incomplete markup');
    this.reduced=matchMedia('(prefers-reduced-motion: reduce)');this.tall=matchMedia('(max-width: 760px)');
    this.completed=0;this.fraction=0;this.finished=false;this.userPaused=false;this.manualOff=readOff();this.blocked=false;
    this.inView=false;this.active=null;this.selection='';this.prepared=false;this.preparing=false;this.failed='';this.generation=0;this.cycleArmed=false;this.staticApplied=false;
    this.events=new AbortController();const signal=this.events.signal;
    // Neutraliza autoplay nativo antes de introducir cualquier URL.
    for(const video of this.videos){
      video.autoplay=false;video.removeAttribute('autoplay');video.preload='none';video.loop=false;video.removeAttribute('loop');video.defaultMuted=true;video.muted=true;video.volume=0;video.playsInline=true;
      video.addEventListener('ended',()=>this._ended(video),{signal});
      video.addEventListener('pause',()=>this._render(),{signal});
      video.addEventListener('timeupdate',()=>{if(video===this.active)this._updateCaption()},{signal});
      video.addEventListener('play',()=>{if(video!==this.active||!this._mayPlay())video.pause()},{signal});
      video.addEventListener('playing',()=>{if(video!==this.active||!this._mayPlay()){video.pause();return}this.cycleArmed=true;this._render()},{signal});
      video.addEventListener('error',()=>{if(video===this.active&&!this.preparing)this._fail(this.selection)},{signal});
    }
    this.toggle.addEventListener('click',()=>{if(this.userPaused||this.blocked){this.userPaused=false;this.blocked=false;this._say('Reanudando vídeo de portada.')}else{this.userPaused=true;this._say('Vídeo de portada en pausa.')}this._sync()},{signal});
    this.replayButton.addEventListener('click',()=>this.replay(),{signal});
    this.offButton.addEventListener('click',()=>{this.manualOff=!this.manualOff;storeOff(this.manualOff);this._say(this.manualOff?'Portada con imagen fija.':'Vídeo de portada activado.');this._sync()},{signal});
    document.addEventListener('visibilitychange',()=>this._sync(),{signal});
    this.reduced.addEventListener('change',()=>this._sync(),{signal});this.tall.addEventListener('change',()=>this._sync(),{signal});
    navigator.connection?.addEventListener?.('change',()=>this._sync(),{signal});
    this.themeObserver=new MutationObserver(()=>this._sync());this.themeObserver.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
    // Si falta IntersectionObserver se conserva el póster y puede activarse manualmente.
    if('IntersectionObserver'in window){this.viewObserver=new IntersectionObserver(entries=>{this.inView=entries[0].isIntersecting;this._sync()},{threshold:0});this.viewObserver.observe(hero)}
    else{this.userPaused=true;this.inView=true}
    this._sync();
  }
  _policy(){return this.reduced.matches?'motion':hasDataSaver()?'data':new URL(location.href).searchParams.get('intro')==='off'?'query':this.manualOff?'user':''}
  _theme(){return document.documentElement.dataset.theme==='mina'?'mina':'editorial'}
  _capture(){const v=this.active;if(this.prepared&&v&&Number.isFinite(v.duration)&&v.duration>0)this.fraction=this.finished?1:Math.max(0,Math.min(1,v.currentTime/v.duration))}
  _pauseAll(){for(const v of this.videos){v.autoplay=false;v.removeAttribute('autoplay');v.pause()}}
  _mayPlay(){return !this._policy()&&!document.hidden&&this.inView&&!this.userPaused&&!this.blocked&&!this.finished&&this.prepared&&!this.failed}
  _say(message){this.status.textContent=message}
  _updateCaption(){
    if(!this.cinematic)return;
    const time=this.active?.currentTime||0;
    const phrase=this.prepared&&!this.failed&&!this._policy()?CINEMATIC_COPY.find(([start,end])=>time>=start&&time<end)?.[2]||'':'';
    if(this.cinematic.textContent!==phrase)this.cinematic.textContent=phrase;
    this.cinematic.toggleAttribute('data-copy-visible',Boolean(phrase));
  }
  _clearMedia(){
    this._capture();this.generation++;this.pending?.abort();this._pauseAll();
    for(const v of this.videos){v.removeAttribute('data-intro-active');v.removeAttribute('data-frame-ready');v.preload='none';if(v.hasAttribute('src')){v.removeAttribute('src');v.load()}}
    this.active=null;this.selection='';this.prepared=false;this.preparing=false;this.failed='';
  }
  _sync(){
    if(this.destroyed)return;
    const policy=this._policy();
    if(policy){if(!this.staticApplied){this._clearMedia();this.staticApplied=true}this._render();return}
    this.staticApplied=false;
    const theme=this._theme(),target=this.videos.find(v=>v.dataset.introTheme===theme);
    const source=(this.tall.matches&&target.dataset.srcTall)||target.dataset.srcWide;
    if(!source){this._pauseAll();this.controls.hidden=true;return}
    const key=theme+'|'+source;
    if(key!==this.selection){
      this._capture();this._pauseAll();this.pending?.abort();this.generation++;
      for(const v of this.videos)v.removeAttribute('data-intro-active');
      this.active=target;this.selection=key;this.source=source;this.prepared=false;this.preparing=false;this.failed='';this.blocked=false;this.cycleArmed=false;
    }
    if(document.hidden||!this.inView){this._pauseAll();this._render();return}
    if(!this.prepared&&!this.preparing&&!this.failed)this._prepare();
    else if(this._mayPlay())this._play();else this._pauseAll();
    this._render();
  }
  async _prepare(){
    const video=this.active,key=this.selection,generation=this.generation;
    this.preparing=true;this.pending=new AbortController();const signal=this.pending.signal;
    const valid=()=>!this.destroyed&&generation===this.generation&&video===this.active&&!signal.aborted;
    try{
      // Ya se comprobaron política y viewport: ahora sí se necesitan datos.
      video.autoplay=false;video.preload='auto';video.muted=true;video.removeAttribute('data-frame-ready');
      if(video.getAttribute('src')!==this.source){video.src=this.source;video.load()}
      await waitForMedia(video,['loadedmetadata'],()=>video.readyState>=1&&Number.isFinite(video.duration)&&video.duration>0,signal);
      if(!valid())return;
      const position=Math.min(Math.max(0,video.duration-.001),(this.finished?1:this.fraction)*video.duration);
      if(Math.abs(video.currentTime-position)>.001)video.currentTime=position;
      await waitForMedia(video,['seeked','loadeddata','canplay'],()=>!video.seeking&&video.readyState>=2,signal);
      if(!valid())return;
      this.preparing=false;this.prepared=true;video.setAttribute('data-frame-ready','');video.setAttribute('data-intro-active','');
      this._sync();
    }catch(error){if(valid()&&error.name!=='AbortError')this._fail(key)}
  }
  _play(){
    const video=this.active,generation=this.generation;
    if(!this._mayPlay()||!video.paused||(this.playAttempt?.video===video&&this.playAttempt.generation===generation))return;
    const attempt={video,generation};
    // El inicio automático lo solicita el controlador; nunca el atributo nativo.
    video.muted=true;video.volume=0;video.autoplay=false;video.removeAttribute('autoplay');this.playAttempt=attempt;
    Promise.resolve(video.play()).then(()=>{if(this.destroyed||video!==this.active||!this._mayPlay())video.pause()}).catch(error=>{
      if(this.destroyed||generation!==this.generation||video!==this.active||!this._mayPlay())return;
      if(error.name==='NotAllowedError'){this.blocked=true;this._say('Vídeo en pausa. Puedes pulsar Reanudar vídeo.');this._render()}
      else if(error.name==='AbortError'){this.blocked=true;this._render()}
      else this._fail(this.selection);
    }).finally(()=>{if(this.playAttempt===attempt){this.playAttempt=null;this._sync()}});
  }
  _ended(video){
    if(video!==this.active||!video.ended||!this.prepared||this.preparing||this.finished||!this.cycleArmed)return;
    this.cycleArmed=false;this.completed++;
    if(this.completed>=MAX_PLAYS){this.completed=MAX_PLAYS;this.finished=true;this.fraction=1;this._pauseAll();this._say('Vídeo terminado. Puedes repetirlo.');this._render();return}
    this.fraction=0;video.currentTime=0;this._sync();
  }
  _fail(key){
    if(key!==this.selection)return;
    this._pauseAll();this.preparing=false;this.prepared=false;this.failed=key;
    if(this.active)this.active.removeAttribute('data-intro-active');
    this._say('Se muestra la imagen fija. Puedes volver a intentar el vídeo.');this._render();
  }
  replay(){
    if(this._policy())return;
    const retry=Boolean(this.failed);
    this._pauseAll();this.pending?.abort();this.generation++;
    this.completed=0;this.fraction=0;this.finished=false;this.userPaused=false;this.blocked=false;this.failed='';this.preparing=false;this.prepared=false;this.cycleArmed=false;
    // Reintenta también una URL fallida; nunca intenta reproducir en bucle por error.
    if(this.active&&(retry||this.active.error)){this.active.removeAttribute('src');this.active.load()}
    this._say('Repitiendo vídeo de portada.');this._sync();
  }
  _render(){
    const policy=this._policy(),forced=policy&&policy!=='user';
    this.controls.hidden=Boolean(forced);
    this.toggle.hidden=Boolean(policy||this.finished||this.failed);
    this.replayButton.hidden=Boolean(policy);
    this.offButton.hidden=Boolean(forced);
    this.toggle.textContent=this.userPaused||this.blocked?'Reanudar vídeo':'Pausar vídeo';
    this.replayButton.textContent=this.failed?'Volver a intentar':'Repetir vídeo';
    this.offButton.textContent=this.manualOff?'Activar vídeo':'Imagen fija';
    this._updateCaption();
  }
  destroy(){
    this.destroyed=true;this._clearMedia();this.events.abort();this.themeObserver.disconnect();this.viewObserver?.disconnect();this.controls.hidden=true;
  }
}

// La API queda en el elemento para poder desmontarla en una navegación dinámica.
for(const hero of document.querySelectorAll('[data-hero-intro]')){
  try{hero.heroIntroController=new HeroIntroController(hero)}catch{ /* El HTML conserva ambas imágenes de respaldo. */ }
}
