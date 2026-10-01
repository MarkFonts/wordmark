/* The case-study hero: the Calendso logo heats under a stripe of four notches, the second notch
   swaps in Cal.com, the word cools in the stripe's tail, then blur, grain and colour go to zero. */
(()=>{

(()=>{
const $=id=>document.getElementById(id);
const stage=document.getElementById('hero-thermal');if(!stage)return;
// phones get the piece as a video with alpha, rendered from this same chain at 60fps: the filters are too much for
// a phone live, and the only thing the theme changes is the ink it drains to, so there is one file per theme.
const video=stage.querySelector('.hero-video');
if(video&&window.matchMedia&&window.matchMedia('(pointer: coarse)').matches&&window.__t==null){
  const ua=navigator.userAgent,webkit=/iPhone|iPad|iPod/.test(ua)||(/AppleWebKit/.test(ua)&&!/Chrome|Chromium|Android/.test(ua));
  const ok=webkit?video.canPlayType('video/mp4; codecs="hvc1"'):video.canPlayType('video/webm; codecs="vp9"');
  if(ok){
    const theme=()=>{const t=document.documentElement.dataset.theme;return t==='light'||t==='dark'?t:(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark')};
    let played=false,cur='';
    const load=()=>{const th=theme();if(th===cur)return;cur=th;
      video.poster='img/hero-'+th+'.png';video.src='img/hero-'+th+(webkit?'.mov':'.webm');video.load();
      if(played)video.addEventListener('loadedmetadata',()=>{video.currentTime=Math.max(0,video.duration-0.05)},{once:true});};
    load();stage.classList.add('is-video');
    new MutationObserver(load).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
    matchMedia('(prefers-color-scheme: light)').addEventListener('change',load);
    const play=()=>{played=true;video.currentTime=0;video.play().catch(()=>{})};
    if(!matchMedia('(prefers-reduced-motion: reduce)').matches){
      const io=new IntersectionObserver(es=>{for(const e of es)if(e.isIntersecting){play();io.disconnect()}},{threshold:0.6});io.observe(stage);
    }else video.addEventListener('loadedmetadata',()=>{video.currentTime=Math.max(0,video.duration-0.05)},{once:true});
    stage.addEventListener('click',play);
    return;
  }
}
// the page's text colour, whatever notation the stylesheet uses (the site's is oklch): resolved through a canvas pixel
const rgb=el=>{try{const cv=document.createElement('canvas');cv.width=cv.height=1;const x=cv.getContext('2d',{willReadFrequently:true});x.fillStyle='#000';x.fillStyle=getComputedStyle(el).color;x.fillRect(0,0,1,1);const d=x.getImageData(0,0,1,1).data;return [d[0]/255,d[1]/255,d[2]/255]}catch(e){return [0.9,0.9,0.9]}};
// the table: dark blue, blue, cyan, white, orange, red, magenta
const HOT=[[0.02,0.05,0.1,1,1,0.95,0.9],[0.02,0.2,0.85,1,0.55,0.1,0.1],[0.25,0.75,0.95,1,0.1,0.1,0.6],[0,0.05,0.45,1,1,1,1]];
const BLUE=[Array(7).fill(0.14),Array(7).fill(0.57),Array(7).fill(0.92),Array(7).fill(1)];
const ink=()=>{const c=rgb(stage);return [Array(7).fill(c[0]),Array(7).fill(c[1]),Array(7).fill(c[2]),Array(7).fill(1)]};
const lerpT=(a,b,u)=>a.map((row,i)=>row.map((x,j)=>x+(b[i][j]-x)*u));
function setLut(id,T){const f=$(id).children;for(let i=0;i<4;i++)f[i].setAttribute('tableValues',T[i].map(v=>v.toFixed(3)).join(' '))}
function setColor(side,blur,grain,T,w,h){if(h==null)h=1;$('color'+side+'Halo').setAttribute('values','0.5 0 0 0 0  0 0.5 0 0 0  0 0 0.5 0 0  0 0 0 '+(0.9*h).toFixed(3)+' 0');$('color'+side+'Blur').setAttribute('stdDeviation',blur.toFixed(2));$('color'+side+'Grain').setAttribute('k1',(grain*2).toFixed(3));$('color'+side+'Grain').setAttribute('k3',(1-grain).toFixed(3));
  $('color'+side+'Alpha').setAttribute('values','1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  '+(0.3*w).toFixed(3)+' '+(0.59*w).toFixed(3)+' '+(0.11*w).toFixed(3)+' '+(1-w).toFixed(3)+' 0');   // w=1: alpha from luminance, black is nothing. w=0: alpha from the shape, for ink
  setLut('color'+side+'Lut',T);}
const ease=t=>{t=Math.max(0,Math.min(1,t));return t<0.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2};
const lin=(t,a,b)=>Math.max(0,Math.min(1,(t-a)/(b-a)));
function seam(x){for(const id of ['seamL','seamR'])$(id).setAttribute('gradientTransform','translate('+x.toFixed(1)+' 0)')}
const SPEED=2;
const LEAD=1.2;                                                     // dead space before anything moves on Calendso; it scales with the speed like everything else
const T={holdA:0.8,bloom:1.6,settle:0.9,drain:2.4,hold:2.2};
// the stripe: one period per word, a notch of nothing in each. One speed from the first frame, never stopping.
// notch 1 crosses Calendso. Notch 2 carries the swap. Notches 3 and 4 cross Cal.com. Then no fifth notch: a white fill enters from the left at the same speed and takes the blues with it.
const span=2000,start=-1300,end=3300,v=1320;
const e1=T.holdA,e2=e1+T.bloom;
const FREEZE=end+3*span-640;                                      // the fourth notch has cleared the type and the whole word sits in the stripe's white: the stripe stops here
const e3=e2+(FREEZE-start)/v;
const e4=e3+T.settle;                                             // it holds, uniformly hot
const e5=e4+T.drain;                                              // then every parameter goes to zero in place
const total=e5+T.hold;window.__total=(LEAD+total)/SPEED;
let t0=performance.now(),playing=!matchMedia('(prefers-reduced-motion: reduce)').matches;
// it holds on the plain Calendso until the hero is in view, then plays once
let armed=false;window.__thermal={get armed(){return armed}};
const io=('IntersectionObserver' in window)?new IntersectionObserver(es=>{for(const e of es){if(e.isIntersecting&&!armed){armed=true;t0=performance.now();requestAnimationFrame(frame);io.disconnect();}}},{threshold:0.6}):null;
if(io)io.observe(stage);else armed=true;
const coarse=window.matchMedia&&window.matchMedia('(pointer: coarse)').matches;let skip=0;
if(coarse){                                                            // phones: a lighter chain, one octave of grain, half the halo
  stage.querySelectorAll('feTurbulence').forEach(n=>n.setAttribute('numOctaves','1'));
  stage.querySelectorAll('feGaussianBlur[result="halo0"]').forEach(n=>n.setAttribute('stdDeviation','13'));
  stage.querySelectorAll('#material feGaussianBlur').forEach(n=>n.setAttribute('stdDeviation','18'));
}
function frame(now){
  if(coarse&&window.__t==null&&(skip=(skip+1)%3)){requestAnimationFrame(frame);return;}   // phones: the filters at a third of the rate
  let t=armed?(now-t0)/1000:0;if(!playing)t=(LEAD+total)/SPEED;if(window.__t!=null)t=window.__t;
  t=t*SPEED-LEAD;                                                    // the whole piece, lead-in included, runs at the chosen speed
  const b=ease(lin(t,e1,e2));
  const lead=Math.min(start+(t-e2)*v,FREEZE);
  const mid=lead-span;                               // the notch one period behind the lead carries the seam
  const kx=-600;
  $('stripe').setAttribute('gradientTransform','translate('+(lead-7000).toFixed(1)+' 0)');   // notch 1 sits at gradient x 7000
  seam(mid);
  for(const id of ['seamK','seamKb'])$(id).setAttribute('gradientTransform','translate('+kx.toFixed(1)+' 0)');
  const inkT=ink();
  setColor('A',1+7*b,0.5*b,lerpT(BLUE,HOT,b),b);
  const z=ease(lin(t,e4,e5));                        // the parameters, to zero, in place
  setColor('B',8*(1-z),0.5*(1-z),lerpT(HOT,inkT,z),1-z,1-z);
  const cross=lin(t,e1,e1+0.4);
  $('A').setAttribute('opacity',cross.toFixed(3));$('A0').style.display=t<e3?'':'none';$('A0').setAttribute('opacity',(1-cross).toFixed(3));
  $('B').setAttribute('opacity',(t<e2?0:(t<e5?1:1-lin(t,e5,e5+0.3))).toFixed(3));
  $('F').setAttribute('opacity',0);
  $('B0').style.display=t>=e5-0.3?'':'none';
  if(armed&&(t<total+0.1*SPEED||!playing)||window.__t!=null)requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
stage.addEventListener('click',()=>{armed=true;t0=performance.now();playing=true;requestAnimationFrame(frame)});
})();
})();
