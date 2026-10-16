(()=>{'use strict';
document.documentElement.classList.add('js');
const root=document.documentElement,toggle=document.querySelector('[data-theme-toggle]');
// The URL wins over a remembered palette, so each shared link has a stable look.
const courseBase=new URL('.',document.currentScript?.src||new URL('app.js',location.href));
const coursePages=new Set(["ejercicios/estudio.html","ejercicios/juego.html","ejercicios/servicio.html","historias/agentes-y-limites.html","historias/alphafold.html","historias/ia-y-poder.html","historias/navier-stokes.html","index.html","manifiesto.html","privacidad.html","recursos.html"]);
const requestedTheme=()=>{const value=new URLSearchParams(location.search).get('tema');return value==='mina'||value==='editorial'?value:''};
function syncCourseLinks(theme){
 document.querySelectorAll('a[href]').forEach(link=>{
  const raw=link.getAttribute('href');if(!raw||raw.startsWith('#'))return;
  let target;try{target=new URL(raw,location.href)}catch(e){return}
  if(target.origin!==courseBase.origin||!target.pathname.startsWith(courseBase.pathname))return;
  const page=target.pathname.slice(courseBase.pathname.length)||'index.html';if(!coursePages.has(page))return;
  target.searchParams.set('tema',theme);
  link.setAttribute('href',raw.split(/[?#]/)[0]+target.search+target.hash);
 });
}
function setTheme(theme){
 const current=theme==='mina'?'mina':'editorial';root.dataset.theme=current;
 if(toggle)toggle.setAttribute('aria-checked',String(current==='mina'));
 try{localStorage.setItem('profesor-mirada',current)}catch(e){}
 const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=current==='mina'?'#080f1c':'#0c0d10';
 try{const url=new URL(location.href);url.searchParams.set('tema',current);history.replaceState(history.state,'',url.pathname+url.search+url.hash)}catch(e){}
 syncCourseLinks(current);
}
setTheme(requestedTheme()||root.dataset.theme||'editorial');
if(toggle)toggle.addEventListener('click',()=>setTheme(root.dataset.theme==='mina'?'editorial':'mina'));
window.addEventListener('popstate',()=>setTheme(requestedTheme()||root.dataset.theme||'editorial'));
const mast=document.querySelector('.mast');
if(mast){const measureMast=()=>root.style.setProperty('--mast-height',Math.ceil(mast.getBoundingClientRect().height)+'px');measureMast();if('ResizeObserver'in window){const observer=new ResizeObserver(measureMast);observer.observe(mast)}else window.addEventListener('resize',measureMast);document.fonts?.ready.then(measureMast)}
// Transparent over the cover; a glass surface protects navigation after scrolling.
// Hysteresis avoids flicker around the top, including mobile overscroll/bfcache.
if(mast&&document.body.hasAttribute('data-overlay-mast')){
 let scrollFrame=0;
 const updateMastSurface=()=>{scrollFrame=0;const y=Math.max(0,window.scrollY||root.scrollTop||0);mast.classList.toggle('is-scrolled',y>(mast.classList.contains('is-scrolled')?8:20))};
 const queueMastSurface=()=>{if(!scrollFrame)scrollFrame=requestAnimationFrame(updateMastSurface)};
 updateMastSurface();window.addEventListener('scroll',queueMastSurface,{passive:true});window.addEventListener('pageshow',queueMastSurface);
}
const brand=document.querySelector('#brand-title'),display=document.querySelector('#brand-display');let changed=false,busy=false;
function transformTitle(){if(!brand||changed||busy)return;busy=true;const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;brand.dataset.echo=display.textContent;if(!reduce)brand.classList.add('glitch');setTimeout(()=>{display.textContent='Learning AI';brand.classList.add('is-exponential');brand.dataset.echo=display.textContent;brand.setAttribute('aria-label','Learning AI. Recargar la página');},reduce?0:240);setTimeout(()=>{brand.classList.remove('glitch');changed=true;busy=false;},reduce?0:500);}
if(brand){brand.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse')transformTitle()});brand.addEventListener('focus',transformTitle);brand.addEventListener('click',()=>location.reload());}
const host=document.querySelector('#emblema-host');if(host){customElements.whenDefined('manel-emblem').then(()=>{if(!host.isConnected)return;const prefix=host.dataset.assetPrefix||'';const emblem=document.createElement('manel-emblem');emblem.setAttribute('avatar-src',prefix+'assets/avatar-manel.webp');emblem.setAttribute('size',innerWidth<760?'48':'60');host.replaceChildren(emblem);});}
document.querySelectorAll('audio').forEach(audio=>audio.addEventListener('play',()=>document.querySelectorAll('audio').forEach(other=>{if(other!==audio)other.pause()})));
// Keep the mobile introduction on its own screen, without duplicating any copy.
const hero=document.querySelector('[data-hero-intro]'),followup=hero?.querySelector('.hero-followup'),cinematic=hero?.querySelector('[data-intro-cinematic]'),controls=hero?.querySelector('[data-intro-controls]');
if(hero&&followup&&cinematic&&controls){
 const followAnchor=document.createComment('hero-followup'),captionAnchor=document.createComment('hero-cinematic');
 followup.before(followAnchor);cinematic.before(captionAnchor);const narrow=matchMedia('(max-width:760px)');
 function arrangeIntro(){
  if(narrow.matches){hero.after(followup);followup.classList.add('is-mobile-followup');controls.before(cinematic);hero.classList.add('has-mobile-intro')}
  else{followAnchor.after(followup);followup.classList.remove('is-mobile-followup');captionAnchor.after(cinematic);hero.classList.remove('has-mobile-intro')}
 }
 arrangeIntro();narrow.addEventListener('change',arrangeIntro);
}
const menu=document.querySelector('#section-menu'),menuToggle=document.querySelector('[data-menu-toggle]');
if(menu&&menuToggle){
 const closed=()=>{menuToggle.setAttribute('aria-expanded','false');document.documentElement.classList.remove('menu-is-open')};
 const close=()=>{if(typeof menu.close==='function')menu.close();else menu.removeAttribute('open');closed()};
 menuToggle.addEventListener('click',()=>{if(menu.open){close();return}if(typeof menu.showModal==='function')menu.showModal();else menu.setAttribute('open','');menuToggle.setAttribute('aria-expanded','true');document.documentElement.classList.add('menu-is-open')});
 menu.querySelector('[data-menu-close]')?.addEventListener('click',close);
 menu.addEventListener('close',closed);menu.addEventListener('cancel',closed);
 menu.addEventListener('click',event=>{if(event.target.closest('a'))close();else if(event.target===menu){const r=menu.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close()}});
}
})();
