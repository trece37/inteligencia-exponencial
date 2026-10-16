/* Cabecera y navegación propias de Nodo. No lee ni escribe profesor-mirada. */
(()=>{'use strict';
 const root=document.documentElement;
 if(!root.hasAttribute('data-nodo-theme'))return;
 root.classList.add('js');
 const mast=document.querySelector('.nodo-mast');
 if(mast){
  const measure=()=>root.style.setProperty('--nodo-mast-height',Math.ceil(mast.getBoundingClientRect().height)+'px');
  measure();
  if('ResizeObserver'in window)new ResizeObserver(measure).observe(mast);else window.addEventListener('resize',measure);
  document.fonts?.ready.then(measure);
  let frame=0;
  const paint=()=>{frame=0;const y=Math.max(0,window.scrollY||root.scrollTop||0);mast.classList.toggle('is-scrolled',y>(mast.classList.contains('is-scrolled')?8:20))};
  const queue=()=>{if(!frame)frame=requestAnimationFrame(paint)};
  paint();window.addEventListener('scroll',queue,{passive:true});window.addEventListener('pageshow',queue);
 }
 const format=matchMedia('(max-width:760px)'),emblem=document.querySelector('#emblema-host manel-emblem');
 const sizeEmblem=()=>emblem?.setAttribute('size',format.matches?(innerWidth<=380?'44':'48'):'60');
 sizeEmblem();format.addEventListener('change',sizeEmblem);
 document.querySelector('[data-nodo-theme-link]')?.addEventListener('click',event=>{
  const target=new URL(event.currentTarget.dataset.nodoThemeLink,location.href);
  if(location.hash&&document.getElementById(location.hash.slice(1)))target.hash=location.hash;
  location.assign(target.href);
 });
 const menu=document.querySelector('#section-menu'),toggle=document.querySelector('[data-nodo-menu-toggle]');
 if(menu&&toggle){
  const nativeModal=typeof menu.showModal==='function';let previousFocus=null,isolated=[];
  const focusables=()=>[...menu.querySelectorAll('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(element=>!element.hidden);
  const closed=()=>{toggle.setAttribute('aria-expanded','false');root.classList.remove('nodo-menu-is-open');isolated.forEach(element=>element.removeAttribute('inert'));isolated=[];menu.removeAttribute('aria-modal');if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});previousFocus=null};
  const close=()=>{if(typeof menu.close==='function')menu.close();else menu.removeAttribute('open');closed()};
  toggle.addEventListener('click',()=>{
   if(menu.hasAttribute('open')){close();return}
   previousFocus=document.activeElement;
   if(nativeModal)menu.showModal();else{menu.setAttribute('open','');menu.setAttribute('role','dialog');menu.setAttribute('aria-modal','true');for(const element of document.body.children){if(element!==menu&&!element.contains(menu)&&!element.hasAttribute('inert')){element.setAttribute('inert','');isolated.push(element)}}}
   toggle.setAttribute('aria-expanded','true');root.classList.add('nodo-menu-is-open');
   if(!nativeModal)focusables()[0]?.focus();
  });
  menu.querySelector('[data-nodo-menu-close]')?.addEventListener('click',close);
  menu.addEventListener('close',closed);menu.addEventListener('cancel',closed);
  menu.addEventListener('keydown',event=>{if(nativeModal||!menu.hasAttribute('open'))return;if(event.key==='Escape'){event.preventDefault();close();return}if(event.key==='Tab'){const items=focusables(),first=items[0],last=items.at(-1);if(!first){event.preventDefault();return}if(event.shiftKey&&(document.activeElement===first||!menu.contains(document.activeElement))){event.preventDefault();last.focus()}else if(!event.shiftKey&&(document.activeElement===last||!menu.contains(document.activeElement))){event.preventDefault();first.focus()}}});
  menu.addEventListener('click',event=>{
   if(event.target.closest('a'))close();
   else if(event.target===menu){const r=menu.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close()}
  });
 }
})();

/* Una fuente activa: formato de pantalla actual, sin duplicar la descarga. */
(()=>{'use strict';
 const area=document.querySelector('[data-nodo-film]');
 if(!area)return;
 const video=area.querySelector('[data-nodo-video]'),root=area.closest('.nodo-cinema');
 if(!video||!root)return;
 const controls=root.querySelector('[data-nodo-controls]'),toggle=root.querySelector('[data-nodo-toggle]'),repeat=root.querySelector('[data-nodo-replay]'),fixed=root.querySelector('[data-nodo-fixed]'),status=root.querySelector('[data-nodo-status]');
 const title=root.querySelector('[data-nodo-caption-title]'),detail=root.querySelector('[data-nodo-caption-detail]'),captionBox=root.querySelector('[data-nodo-caption]');
 let scenes=[];try{scenes=JSON.parse(root.querySelector('#nodo-scenes').textContent)}catch{return}
 if(!video||!controls||!toggle||!repeat||!fixed||!scenes.length)return;
 const tall=matchMedia('(max-width:760px)'),reduced=matchMedia('(prefers-reduced-motion:reduce)'),connection=navigator.connection;
 const pref='nodo-humano-video';let off=false;try{off=localStorage.getItem(pref)==='off'}catch{}
 let visible=false,paused=false,blocked=false,finished=false,failed=false,ready=false,preparing=false,cycles=0,fraction=0,selection='',epoch=0,pending=null,attempt=null,armed=false,captionFrame=0;
 video.autoplay=false;video.removeAttribute('autoplay');video.loop=false;video.removeAttribute('loop');video.preload='none';video.defaultMuted=true;video.muted=true;video.volume=0;video.playsInline=true;
 const say=text=>{status.textContent=text};
 const policy=()=>reduced.matches?'motion':connection?.saveData?'data':off?'user':'';
 const capture=()=>{if(ready&&Number.isFinite(video.duration)&&video.duration>0)fraction=finished?1:Math.max(0,Math.min(1,video.currentTime/video.duration))};
 const mayPlay=()=>!policy()&&!document.hidden&&visible&&!paused&&!blocked&&!finished&&!failed&&ready;
 function caption(){
  const time=policy()||!ready||failed?0:video.currentTime;
  const scene=[...scenes].reverse().find(s=>time>=s.start)||scenes[0];
  const text=tall.matches?(scene.portraitTitle||scene.title):scene.title;
  if(title.textContent!==text)title.textContent=text;
  if(detail.textContent!==scene.detail)detail.textContent=scene.detail;
  const live=ready&&!failed&&!policy();let opacity=1;
  if(live){const fade=scene.fade||.32;const incoming=scene.visibleFrom>0?(time-scene.visibleFrom)/fade:1;const outgoing=scene.visibleUntil===null?1:(scene.visibleUntil-time)/fade;opacity=Math.max(0,Math.min(1,incoming,outgoing));}
  captionBox.style.opacity=String(opacity);
 }
 function animateCaption(){captionFrame=0;caption();if(!video.paused&&!video.ended)captionFrame=requestAnimationFrame(animateCaption)}
 function stopCaption(){if(captionFrame){cancelAnimationFrame(captionFrame);captionFrame=0}}
 function render(){
  const p=policy(),forced=Boolean(p&&p!=='user');controls.hidden=forced;
  toggle.hidden=Boolean(p||finished||failed);repeat.hidden=Boolean(p);fixed.hidden=forced;
  toggle.textContent=paused||blocked?'Reanudar vídeo':'Pausar vídeo';
  repeat.textContent=failed?'Volver a intentar':'Repetir vídeo';fixed.textContent=off?'Activar vídeo':'Imagen fija';
  caption();
 }
 function clearMedia(){
  capture();epoch++;pending?.abort();pending=null;video.pause();stopCaption();video.removeAttribute('data-ready');
  video.preload='none';if(video.hasAttribute('src')){video.removeAttribute('src');video.load()}
  ready=false;preparing=false;selection='';failed=false;armed=false;
 }
 function fail(){failed=true;ready=false;preparing=false;video.pause();video.removeAttribute('data-ready');say('Se muestra la imagen fija. Puedes volver a intentar el vídeo.');render()}
 function waitFor(events,test,signal){return new Promise((resolve,reject)=>{
  let timeout;const clean=()=>{clearTimeout(timeout);events.forEach(e=>video.removeEventListener(e,check));video.removeEventListener('error',error);signal.removeEventListener('abort',abort)};
  const done=error=>{clean();error?reject(error):resolve()};const check=()=>{if(test())done()};const error=()=>done(new Error('media-error'));const abort=()=>done(new DOMException('Superseded','AbortError'));
  events.forEach(e=>video.addEventListener(e,check));video.addEventListener('error',error);signal.addEventListener('abort',abort,{once:true});timeout=setTimeout(()=>done(new Error('media-timeout')),15000);if(signal.aborted)abort();else if(video.error)error();else check();
 })}
 async function prepare(source){
  const generation=epoch;preparing=true;pending=new AbortController();const signal=pending.signal;const valid=()=>generation===epoch&&!signal.aborted;
  try{
   video.preload='auto';video.muted=true;video.src=source;video.load();
   await waitFor(['loadedmetadata'],()=>video.readyState>=1&&Number.isFinite(video.duration)&&video.duration>0,signal);if(!valid())return;
   const position=Math.min(Math.max(0,video.duration-.04),fraction*video.duration);if(Math.abs(video.currentTime-position)>.001)video.currentTime=position;
   await waitFor(['seeked','loadeddata','canplay'],()=>!video.seeking&&video.readyState>=2,signal);if(!valid())return;
   preparing=false;ready=true;video.setAttribute('data-ready','');sync();
  }catch(error){if(valid()&&error.name!=='AbortError')fail()}
 }
 function play(){
  if(!mayPlay()||!video.paused||attempt)return;
  const generation=epoch;const current={generation};attempt=current;
  Promise.resolve(video.play()).then(()=>{if(generation!==epoch||!mayPlay())video.pause()}).catch(error=>{
   if(generation!==epoch||!mayPlay())return;
   if(error.name==='NotAllowedError'||error.name==='AbortError'){blocked=true;say('Vídeo en pausa. Puedes pulsar Reanudar vídeo.');render()}else fail();
  }).finally(()=>{if(attempt===current){attempt=null;if(generation!==epoch)sync()}});
 }
 function sync(){
  if(policy()){if(selection||video.hasAttribute('src'))clearMedia();render();return}
  const source=tall.matches?video.dataset.srcTall:video.dataset.srcWide;
  if(source!==selection){capture();clearMedia();selection=source;blocked=false;}
  if(document.hidden||!visible){video.pause();render();return}
  if(!ready&&!preparing&&!failed)prepare(source);else if(mayPlay())play();else video.pause();render();
 }
 toggle.addEventListener('click',()=>{paused=!(paused||blocked);blocked=false;say(paused?'Vídeo en pausa.':'Reanudando vídeo.');sync()});
 repeat.addEventListener('click',()=>{capture();clearMedia();cycles=0;fraction=0;finished=false;paused=false;blocked=false;failed=false;say('Repitiendo vídeo de Nodo Humano.');sync()});
 fixed.addEventListener('click',()=>{off=!off;try{localStorage.setItem(pref,off?'off':'on')}catch{}say(off?'Se muestra la imagen fija.':'Vídeo activado.');sync()});
 video.addEventListener('timeupdate',caption);
 video.addEventListener('playing',()=>{if(!mayPlay()){video.pause();return}armed=true;render();if(!captionFrame)captionFrame=requestAnimationFrame(animateCaption)});
 video.addEventListener('pause',()=>{stopCaption();caption()});
 video.addEventListener('play',()=>{if(!mayPlay())video.pause()});
 video.addEventListener('ended',()=>{if(!ready||!video.ended||!armed||finished)return;armed=false;cycles++;if(cycles>=3){finished=true;fraction=1;video.pause();say('Vídeo terminado. Puedes repetirlo.');render()}else{fraction=0;video.currentTime=0;sync()}});
 video.addEventListener('error',()=>{if(selection&&!preparing&&!policy())fail()});
 document.addEventListener('visibilitychange',sync);window.addEventListener('pagehide',()=>video.pause());window.addEventListener('pageshow',sync);
 tall.addEventListener('change',sync);reduced.addEventListener('change',sync);connection?.addEventListener?.('change',sync);
 if('IntersectionObserver'in window){new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync()},{threshold:0}).observe(area)}else{visible=true;paused=true}
 sync();
})();
