  const HOLD=1000, CHANGE=140, COUNT=8, TOTAL=(COUNT-1)*(HOLD+CHANGE);
  const ORDER=['avatar','waypoints','cpu','code-xml','globe-2','audio-lines','scan-eye','avatar'];
  function sample(time){
    const t=Math.max(0,time);
    if(t>=TOTAL)return {index:7,from:7,to:7,progress:0,transition:false,done:true};
    const index=Math.floor(t/(HOLD+CHANGE)),local=t-index*(HOLD+CHANGE);
    return {index,from:index,to:Math.min(7,index+1),progress:Math.max(0,(local-HOLD)/CHANGE),transition:local>=HOLD,done:false};
  }
  function texture(canvas,img,avatar=false){
    const c=canvas.getContext('2d'),W=512;
    c.clearRect(0,0,W,W);
    if(avatar){c.drawImage(img,35,35,442,442);return canvas;}
    const glow=c.createRadialGradient(256,256,70,256,256,239);
    glow.addColorStop(0,'#165dbe50');glow.addColorStop(.64,'#0c53b725');glow.addColorStop(1,'#0788ee00');
    c.fillStyle=glow;c.fillRect(0,0,W,W);
    const sphere=c.createRadialGradient(209,168,5,256,256,205);
    sphere.addColorStop(0,'#08265cef');sphere.addColorStop(.7,'#041333e8');sphere.addColorStop(1,'#06215b20');
    c.beginPath();c.arc(256,256,202,0,Math.PI*2);c.fillStyle=sphere;c.fill();
    c.save();c.shadowColor='#008cff';c.shadowBlur=29;c.globalAlpha=.75;c.drawImage(img,111,111,290,290);
    c.shadowColor='#32e1ff';c.shadowBlur=9;c.globalAlpha=1;c.drawImage(img,111,111,290,290);c.shadowBlur=0;c.drawImage(img,111,111,290,290);c.restore();
    return canvas;
  }
  function draw(canvas,sprites,time,options={}){
    const c=canvas.getContext('2d'),W=canvas.width,s=sample(time);
    const source=sprites[ORDER[s.transition&&s.progress>=.5?s.to:s.from]];
    c.clearRect(0,0,W,W);
    if(!source)return s;
    if(!s.transition||options.reduced){c.drawImage(source,0,0,W,W);return s;}
    const p=s.progress,envelope=Math.sin(Math.PI*p),strength=options.strength??1;
    c.drawImage(source,0,0,W,W);
    // Displace narrow slices of ONE source. Switch sources only at the midpoint.
    for(let n=0;n<11;n++){
      const sy=(45+n*41+Math.sin(n*13+p*19)*12)%490;
      const sh=3+(n%3)*2,dx=Math.sin(n*17+p*53)*16*envelope*strength;
      const y=sy/512*W,h=Math.max(1,sh/512*W);
      c.clearRect(0,y,W,h);
      c.drawImage(source,0,sy,512,sh,dx/512*W,y,W,h);
    }
    c.save();c.globalCompositeOperation='screen';c.globalAlpha=.28*envelope*strength;
    for(let n=0;n<8;n++){
      const y=(95+n*43+Math.sin(p*31+n)*9)/512*W;
      const x=(100+(n*67)%280)/512*W;
      c.fillStyle=n%3===0?'#86e8ff':'#267dff';c.fillRect(x,y,(18+n%4*19)/512*W,Math.max(.5,W/512));
    }
    c.restore();return s;
  }

export {HOLD,CHANGE,TOTAL,ORDER,sample,texture,draw};
