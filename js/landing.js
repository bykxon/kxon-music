/* ============================================
   KXON LANDING SUPREMO JS
   Cursor, Spotlight, Ripple, Scramble Text,
   Typewriter, Split, Tilt, Counter, Parallax,
   Aurora scroll, Section Zoom, Video Speed,
   Nav Dots, Spring Physics, Line Draw
   ============================================ */
(function(){
var db=window.db;
var $=function(s){return document.getElementById(s)};
var $$=function(s){return document.querySelectorAll(s)};
var noticiasC=$('noticias-grid'),albumesC=$('albumes-grid'),headerEl=$('header'),progressEl=$('kxProgress');
var landingNoticias=[],landingAlbumes=[];
var isMobile=window.innerWidth<768,isTouch='ontouchstart'in window;
var mouseX=0,mouseY=0;

/* ═══════ CURSOR ═══════ */
function initCursor(){
if(isTouch||isMobile)return;
var c=$('kxCursor');if(!c)return;
var dot=c.querySelector('.kx-cursor-dot'),ring=c.querySelector('.kx-cursor-ring'),glow=c.querySelector('.kx-cursor-glow');
var rx=0,ry=0,gx=0,gy=0;
document.addEventListener('mousemove',function(e){
mouseX=e.clientX;mouseY=e.clientY;
dot.style.transform='translate('+mouseX+'px,'+mouseY+'px)';
});
function anim(){
rx+=(mouseX-rx)*.12;ry+=(mouseY-ry)*.12;
gx+=(mouseX-gx)*.08;gy+=(mouseY-gy)*.08;
ring.style.transform='translate('+rx+'px,'+ry+'px)';
glow.style.transform='translate('+gx+'px,'+gy+'px)';
requestAnimationFrame(anim);
}anim();
function attachHover(){
var els=$$('a,button,.faq-item,.noticia-card,.album-card,.ventaja-card,.plan-landing-card,.app-platform-btn,.magnetic-btn,.kx-tilt');
for(var i=0;i<els.length;i++){
els[i].addEventListener('mouseenter',function(){c.classList.add('hover')});
els[i].addEventListener('mouseleave',function(){c.classList.remove('hover')});
}}
attachHover();
window._kxReattachCursor=attachHover;
document.addEventListener('mousedown',function(){c.classList.add('click')});
document.addEventListener('mouseup',function(){c.classList.remove('click')});
}

/* ═══════ SPOTLIGHT ═══════ */
function initSpotlight(){
if(isTouch||isMobile)return;
var s=$('kxSpotlight');if(!s)return;
document.addEventListener('mousemove',function(e){
s.style.left=(e.clientX-150)+'px';
s.style.top=(e.clientY-150)+'px';
});
var sections=$$('.section,.video-hero-section');
var sObs=new IntersectionObserver(function(entries){
for(var i=0;i<entries.length;i++){
if(entries[i].isIntersecting)s.classList.add('active');
}
},{threshold:.3});
for(var i=0;i<sections.length;i++)sObs.observe(sections[i]);
}

/* ═══════ RIPPLE ═══════ */
function initRipple(){
var container=$('kxRipples');if(!container)return;
document.addEventListener('click',function(e){
var r=document.createElement('div');
r.className='kx-ripple';
r.style.left=e.clientX+'px';
r.style.top=e.clientY+'px';
container.appendChild(r);
setTimeout(function(){r.remove()},800);
});
}

/* ═══════ TEXT SPLIT ═══════ */
function initSplit(){
var els=$$('.kx-split[data-scramble]');
for(var i=0;i<els.length;i++){
var el=els[i],txt=el.textContent.trim();
el.removeAttribute('data-scramble');
el.innerHTML='';
for(var j=0;j<txt.length;j++){
var sp=document.createElement('span');
sp.className='char';
sp.textContent=txt[j]===' '?'\u00A0':txt[j];
el.appendChild(sp);
}
}
}

/* ═══════ SCRAMBLE TEXT ═══════ */
var scrambleChars='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%';
function scrambleReveal(el){
var original=el.textContent;
var iterations=0;
var interval=setInterval(function(){
el.textContent=original.split('').map(function(c,i){
if(i<iterations)return original[i];
return scrambleChars[Math.floor(Math.random()*scrambleChars.length)];
}).join('');
iterations+=1/2;
if(iterations>=original.length){
el.textContent=original;
clearInterval(interval);
}
},30);
}

/* ═══════ TYPEWRITER ═══════ */
function initTypewriter(){
var el=$('heroTypewriter');if(!el)return;
var txt='El nuevo artista digital en un universo sonoro exclusivo. Álbumes, canciones y beats de producción propia en una plataforma diseñada para artistas y fans.';
var i=0,speed=28;
function type(){if(i<txt.length){el.textContent+=txt.charAt(i);i++;setTimeout(type,speed)}}
setTimeout(type,1400);
}

/* ═══════ SCROLL REVEAL ═══════ */
var revObs=null,revealed=new Set();
function initReveal(){
revObs=new IntersectionObserver(function(entries){
for(var i=0;i<entries.length;i++){
var e=entries[i];
if(e.isIntersecting&&!revealed.has(e.target)){
revealed.add(e.target);
var d=parseInt(e.target.getAttribute('data-d'))||0;
var anim=e.target.getAttribute('data-anim')||'';
setTimeout(function(el,a){
return function(){
el.classList.add('is-visible');
if(a==='scramble-text')scrambleReveal(el);
var counters=el.querySelectorAll('.kx-counter');
for(var j=0;j<counters.length;j++)animCounter(counters[j]);
}
}(e.target,anim),d);
}
}
},{rootMargin:'0px 0px -60px 0px',threshold:.1});
var els=$$('.kx-reveal');
for(var i=0;i<els.length;i++)revObs.observe(els[i]);
}

/* ═══════ LINE DRAW ═══════ */
function initLineDraw(){
var lines=$$('[data-line-draw]');
var obs=new IntersectionObserver(function(entries){
for(var i=0;i<entries.length;i++)if(entries[i].isIntersecting)entries[i].target.classList.add('is-drawn');
},{threshold:.5});
for(var i=0;i<lines.length;i++)obs.observe(lines[i]);
}

/* ═══════ SECTION ZOOM ═══════ */
function handleSectionZoom(){
if(isMobile)return;
var sections=$$('.kx-section-zoom');
for(var i=0;i<sections.length;i++){
var rect=sections[i].getBoundingClientRect();
var center=rect.top+rect.height/2;
var vh=window.innerHeight;
var dist=Math.abs(center-vh/2);
var maxDist=vh;
var scale=1-Math.min(dist/maxDist,1)*.03;
var opacity=1-Math.min(dist/maxDist,1)*.15;
sections[i].style.transform='scale('+scale+')';
sections[i].style.opacity=opacity;
}
}

/* ═══════ NAV DOTS ═══════ */
function initNav(){
var dots=$$('.kx-nav-dot'),secs=[];
for(var i=0;i<dots.length;i++){
var sec=$(dots[i].getAttribute('data-section'));
if(sec)secs.push({dot:dots[i],sec:sec});
}
function update(){
var sy=window.pageYOffset+window.innerHeight/3;
var idx=0;
for(var i=0;i<secs.length;i++)if(sy>=secs[i].sec.offsetTop)idx=i;
for(var j=0;j<dots.length;j++)dots[j].classList.remove('active');
if(secs[idx])secs[idx].dot.classList.add('active');
}
window.addEventListener('scroll',update,{passive:true});update();
for(var k=0;k<dots.length;k++){
dots[k].addEventListener('click',function(e){
e.preventDefault();
var t=$(this.getAttribute('data-section'));
if(t)window.scrollTo({top:t.offsetTop-80,behavior:'smooth'});
});
}
}

/* ═══════ COUNTER ═══════ */
var countedEls=new Set();
function initCounters(){
var obs=new IntersectionObserver(function(entries){
for(var i=0;i<entries.length;i++){
if(entries[i].isIntersecting&&!countedEls.has(entries[i].target)){
countedEls.add(entries[i].target);
animCounter(entries[i].target);
}
}
},{threshold:.5});
var els=$$('.kx-counter');
for(var i=0;i<els.length;i++)obs.observe(els[i]);
}
function animCounter(el){
var target=parseInt(el.getAttribute('data-target'))||0;
var suffix=el.getAttribute('data-suffix')||'';
var dur=2000,st=null;
function ease(t){return t===1?1:1-Math.pow(2,-10*t)}
function step(ts){
if(!st)st=ts;
var p=Math.min((ts-st)/dur,1);
el.textContent=Math.round(target*ease(p))+suffix;
if(p<1)requestAnimationFrame(step);
}
requestAnimationFrame(step);
}

/* ═══════ MAGNETIC ═══════ */
function initMagnetic(){
if(isTouch||isMobile)return;
var btns=$$('.magnetic-btn');
for(var i=0;i<btns.length;i++){
(function(b){
b.addEventListener('mousemove',function(e){
var r=b.getBoundingClientRect();
var x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2;
b.style.transform='translate('+(x*.18)+'px,'+(y*.18)+'px)';
});
b.addEventListener('mouseleave',function(){b.style.transform=''});
})(btns[i]);
}
}

/* ═══════ TILT ═══════ */
function initTilt(){
if(isTouch||isMobile)return;
var cards=$$('.kx-tilt');
for(var i=0;i<cards.length;i++)attachTilt(cards[i]);
}
function attachTilt(card){
card.addEventListener('mousemove',function(e){
var r=card.getBoundingClientRect();
var x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;
var tx=(0.5-y)*14,ty=(x-0.5)*14;
card.style.transform='perspective(800px) rotateX('+tx+'deg) rotateY('+ty+'deg) scale(1.02)';
var shine=card.querySelector('.kx-card-shine');
if(shine){shine.style.setProperty('--mx',(x*100)+'%');shine.style.setProperty('--my',(y*100)+'%')}
});
card.addEventListener('mouseleave',function(){
card.style.transform='';
card.style.transition='transform .6s cubic-bezier(.16,1,.3,1)';
setTimeout(function(){card.style.transition=''},600);
});
}

/* ═══════ PARTICLES ═══════ */
function initParticles(){
var c=$('heroParticles');if(!c)return;
var n=isMobile?12:40;
for(var i=0;i<n;i++){
var p=document.createElement('div');
p.className='hero-particle';
var sz=Math.random()*3+1;
p.style.width=sz+'px';p.style.height=sz+'px';
p.style.left=Math.random()*100+'%';
p.style.animationDuration=(Math.random()*15+10)+'s';
p.style.animationDelay=(Math.random()*10)+'s';
p.style.opacity=Math.random()*.5+.1;
c.appendChild(p);
}
}

/* ═══════ PARALLAX ═══════ */
function handleParallax(){
if(isMobile)return;
var sy=window.pageYOffset;
var c2=document.querySelector('.hero-circle-2'),c3=document.querySelector('.hero-circle-3');
if(c2)c2.style.transform='translate(-50%,calc(-50% + '+sy*.1+'px))';
if(c3)c3.style.transform='translate(-50%,calc(-50% + '+sy*.05+'px))';
// Depth layers
var lf=document.querySelector('.layer-far'),lm=document.querySelector('.layer-mid');
if(lf)lf.style.transform='translateY('+sy*.15+'px)';
if(lm)lm.style.transform='translateY('+sy*.08+'px)';
// Video parallax
var vm=document.querySelector('.video-hero-media'),vs=$('video-presentacion');
if(vm&&vs){
var vr=vs.getBoundingClientRect();
if(vr.top<window.innerHeight&&vr.bottom>0){
vm.style.transform='scale(1.05) translateY('+(vr.top/window.innerHeight*30)+'px)';
}
}
}

/* ═══════ VIDEO SPEED ON SCROLL ═══════ */
var lastScrollY=0;
function handleVideoSpeed(){
var video=$('videoHero');if(!video)return;
var velocity=Math.abs(window.pageYOffset-lastScrollY);
lastScrollY=window.pageYOffset;
var speed=Math.min(1+velocity*.01,3);
video.playbackRate=1+(speed-1)*.3;
setTimeout(function(){if(video)video.playbackRate=1},200);
}

/* ═══════ SMOOTH SCROLL ═══════ */
function initSmooth(){
var links=$$('a[href^="#"]');
for(var i=0;i<links.length;i++){
links[i].addEventListener('click',function(e){
var href=this.getAttribute('href');if(href==='#')return;
var t=document.querySelector(href);
if(t){e.preventDefault();window.scrollTo({top:t.offsetTop-80,behavior:'smooth'})}
});
}
}

/* ═══════ CHILDREN REVEAL ═══════ */
function applyChildReveal(sel){
var c=document.querySelector(sel);
if(!c||!c.classList.contains('kx-reveal-children'))return;
var anim=c.getAttribute('data-child-anim')||'scale-rotate';
var stagger=parseInt(c.getAttribute('data-stagger'))||100;
var kids=c.children;
for(var i=0;i<kids.length;i++){
if(!kids[i].classList.contains('kx-reveal')){
kids[i].classList.add('kx-reveal');
kids[i].setAttribute('data-anim',anim);
kids[i].setAttribute('data-d',String(i*stagger));
if(revObs)revObs.observe(kids[i]);
}
}
if(!isTouch&&!isMobile){
var nc=c.querySelectorAll('.noticia-card,.album-card');
for(var j=0;j<nc.length;j++){nc[j].classList.add('kx-tilt');attachTilt(nc[j])}
if(window._kxReattachCursor)window._kxReattachCursor();
}
}

/* ═══════ SCROLL HANDLER ═══════ */
var ticking=false;
function onScroll(){
if(!ticking){requestAnimationFrame(function(){
if(window.scrollY>50)headerEl.classList.add('scrolled');else headerEl.classList.remove('scrolled');
var sTop=window.pageYOffset,dH=document.documentElement.scrollHeight-window.innerHeight;
if(progressEl)progressEl.style.width=(dH>0?(sTop/dH)*100:0)+'%';
handleParallax();
handleSectionZoom();
handleVideoSpeed();
ticking=false;
});ticking=true;}
}
window.addEventListener('scroll',onScroll,{passive:true});

/* ═══════ SUPABASE: NOTICIAS ═══════ */
async function cargarNoticias(){
noticiasC.innerHTML=genSkN(3);
try{
var r=await db.from('noticias').select('*').order('created_at',{ascending:false}).limit(6);
if(r.error)throw r.error;
if(!r.data||!r.data.length){noticiasC.innerHTML='<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon">📰</div><h3 class="empty-state-title">Sin noticias aún</h3></div>';return}
landingNoticias=r.data;var h='';
for(var i=0;i<r.data.length;i++)h+=cardNoticia(r.data[i],i);
noticiasC.innerHTML=h;
setTimeout(function(){applyChildReveal('#noticias-grid')},50);
}catch(e){console.error(e);noticiasC.innerHTML='<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon">⚠️</div><h3 class="empty-state-title">Error</h3></div>'}
}

async function cargarAlbumes(){
albumesC.innerHTML=genSkA(2);
try{
var r=await db.from('albumes').select('*, canciones(id,titulo,duracion)').order('created_at',{ascending:false}).limit(2);
if(r.error)throw r.error;
if(!r.data||!r.data.length){albumesC.innerHTML='<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon">💿</div><h3 class="empty-state-title">Sin álbumes</h3></div>';return}
landingAlbumes=r.data;var h='';
for(var i=0;i<r.data.length;i++)h+=cardAlbum(r.data[i],i);
albumesC.innerHTML=h;
setTimeout(function(){applyChildReveal('#albumes-grid')},50);
}catch(e){console.error(e);albumesC.innerHTML='<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon">⚠️</div><h3 class="empty-state-title">Error</h3></div>'}
}

function cardNoticia(n,i){
var f=new Date(n.created_at).toLocaleDateString('es-ES',{day:'numeric',month:'short',year:'numeric'});
var img=n.imagen_url||'https://placehold.co/600x400/111/333?text=KXON+NEWS';
return'<article class="noticia-card" onclick="window._landingAbrirNoticia('+i+')"><div class="noticia-imagen"><img src="'+img+'" alt="" loading="lazy" onerror="this.src=\'https://placehold.co/600x400/111/333?text=KXON\'"><span class="noticia-fecha">'+f+'</span></div><div class="noticia-body"><h3 class="noticia-titulo">'+n.titulo+'</h3><p class="noticia-descripcion">'+n.descripcion+'</p><div class="noticia-read-more">Leer más →</div></div></article>';
}

function cardAlbum(a,i){
var img=a.imagen_url||'https://placehold.co/400x400/111/333?text=♪';
var cnt=a.canciones?a.canciones.length:0;
return'<article class="album-card" onclick="window._landingAbrirAlbum('+i+')"><div class="album-cover"><img src="'+img+'" alt="" loading="lazy" onerror="this.src=\'https://placehold.co/400x400/111/333?text=♪\'"><div class="album-cover-overlay"><div class="album-cover-icon">👁</div></div></div><div class="album-info"><h4 class="album-titulo">'+a.titulo+'</h4><span class="album-canciones">'+cnt+' canciones</span></div></article>';
}

window._landingAbrirNoticia=function(i){
var n=landingNoticias[i];if(!n)return;
$('noticiaLandingTitulo').textContent=n.titulo;
$('noticiaLandingDesc').textContent=n.descripcion;
$('noticiaLandingFecha').textContent=new Date(n.created_at).toLocaleDateString('es-ES',{day:'numeric',month:'long',year:'numeric'});
var iw=$('noticiaLandingImgWrap'),ie=$('noticiaLandingImg');
if(n.imagen_url){ie.src=n.imagen_url;iw.style.display='block'}else iw.style.display='none';
$('modalNoticiaLanding').classList.add('show');
};

window._landingAbrirAlbum=function(i){
var a=landingAlbumes[i];if(!a)return;
$('albumLandingTitulo').textContent=a.titulo;
$('albumLandingDesc').textContent=a.descripcion||'Sin descripción';
$('albumLandingCover').src=a.imagen_url||'https://placehold.co/300x300/111/333?text=♪';
var c=a.canciones||[];
$('albumLandingMeta').textContent=c.length+' CANCIONES';
var tc=$('albumLandingTracks');
if(!c.length){tc.innerHTML='<div style="text-align:center;padding:30px;color:#555;font-size:.85rem">Sin canciones</div>';
}else{
var h='';for(var j=0;j<c.length;j++)h+='<div class="album-landing-track"><span class="album-landing-track-num">'+(j+1)+'</span><div class="album-landing-track-icon">♪</div><span class="album-landing-track-title">'+c[j].titulo+'</span><span class="album-landing-track-duration">'+(c[j].duracion||'--:--')+'</span></div>';
h+='<div class="album-landing-no-play">🔒 Inicia sesión para reproducir</div>';tc.innerHTML=h;
}
$('modalAlbumLanding').classList.add('show');
};

$('modalNoticiaLanding').addEventListener('click',function(e){if(e.target===this)this.classList.remove('show')});
$('modalAlbumLanding').addEventListener('click',function(e){if(e.target===this)this.classList.remove('show')});

function genSkN(n){var h='';for(var i=0;i<n;i++)h+='<article class="noticia-card"><div class="skeleton skeleton-img"></div><div class="noticia-body"><div class="skeleton skeleton-title"></div><div class="skeleton skeleton-text"></div><div class="skeleton skeleton-text short"></div></div></article>';return h}
function genSkA(n){var h='';for(var i=0;i<n;i++)h+='<article class="album-card"><div class="skeleton" style="width:100%;aspect-ratio:1"></div><div class="album-info"><div class="skeleton skeleton-title"></div><div class="skeleton skeleton-text short"></div></div></article>';return h}

/* ═══════ INIT ═══════ */
document.addEventListener('DOMContentLoaded',function(){
initSplit();
initTypewriter();
initReveal();
initLineDraw();
initNav();
initCounters();
initParticles();
initSmooth();
initCursor();
initSpotlight();
initRipple();
initMagnetic();
initTilt();
cargarNoticias();
cargarAlbumes();
if(window.scrollY>50)headerEl.classList.add('scrolled');
onScroll();
console.log('🎵 KXON SUPREMO initialized');
});
window.addEventListener('resize',function(){isMobile=window.innerWidth<768});
})();