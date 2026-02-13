/* ============================================
   KXON LANDING - IMPACTO MUNDIAL
   Loading, Hero Letters, Counters,
   Scroll Reveals, Parallax, Video Speed
   ============================================ */
(function(){
var db=window.db;
var $=function(id){return document.getElementById(id)};
var $$=function(s){return document.querySelectorAll(s)};
var nC=$('noticias-grid'),aC=$('albumes-grid'),hdr=$('header'),prog=$('scrollProgress');
var lN=[],lA=[];

/* ═══ LOADING SCREEN ═══ */
function initLoading(){
    var bar=$('loadingBar'),screen=$('loadingScreen');
    if(!bar||!screen)return;
    var p=0;
    var iv=setInterval(function(){
        p+=Math.random()*15+5;
        if(p>100)p=100;
        bar.style.width=p+'%';
        if(p>=100){
            clearInterval(iv);
            setTimeout(function(){
                screen.classList.add('hidden');
                startHeroAnimation();
            },400);
        }
    },120);
}

/* ═══ HERO ANIMATION ═══ */
function startHeroAnimation(){
    // Letters
    var letters=$$('.hero-letter');
    for(var i=0;i<letters.length;i++){
        (function(el,idx){
            setTimeout(function(){
                el.classList.add('visible');
            },600+idx*180);
        })(letters[i],i);
    }

    // Line
    var line=document.querySelector('.hero-line');
    if(line)setTimeout(function(){line.classList.add('visible')},1400);

    // Other reveals in hero
    var heroReveals=document.querySelectorAll('.hero [data-reveal]');
    for(var j=0;j<heroReveals.length;j++){
        (function(el){
            var d=parseInt(el.getAttribute('data-delay'))||0;
            setTimeout(function(){el.classList.add('revealed')},d);
        })(heroReveals[j]);
    }

    // Counters in hero
    setTimeout(function(){
        var counters=$$('.hero-stat-value[data-count]');
        for(var k=0;k<counters.length;k++)animCount(counters[k]);
    },1800);
}

/* ═══ COUNTER ═══ */
function animCount(el){
    var target=parseInt(el.getAttribute('data-count'))||0;
    var dur=2000,st=null;
    function ease(t){return t===1?1:1-Math.pow(2,-10*t)}
    function step(ts){
        if(!st)st=ts;
        var p=Math.min((ts-st)/dur,1);
        el.textContent=Math.round(target*ease(p));
        if(p<1)requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

/* ═══ SCROLL REVEAL ═══ */
function initReveals(){
    var obs=new IntersectionObserver(function(entries){
        for(var i=0;i<entries.length;i++){
            var e=entries[i];
            if(e.isIntersecting&&!e.target.classList.contains('revealed')){
                var d=parseInt(e.target.getAttribute('data-delay'))||0;
                (function(el,delay){
                    setTimeout(function(){el.classList.add('revealed')},delay);
                })(e.target,d);
            }
        }
    },{rootMargin:'0px 0px -50px 0px',threshold:.1});

    // Don't observe hero elements (handled by startHeroAnimation)
    var els=$$('[data-reveal]');
    for(var i=0;i<els.length;i++){
        if(!els[i].closest('.hero'))obs.observe(els[i]);
    }
    window._revealObs=obs;
}

/* ═══ SCROLL HANDLER ═══ */
var ticking=false;
function onScroll(){
    if(!ticking){requestAnimationFrame(function(){
        // Header
        if(window.scrollY>50)hdr.classList.add('scrolled');
        else hdr.classList.remove('scrolled');

        // Progress
        var sT=window.pageYOffset,dH=document.documentElement.scrollHeight-window.innerHeight;
        if(prog)prog.style.width=(dH>0?(sT/dH)*100:0)+'%';

        // Parallax glows
        var glows=$$('.hero-glow');
        for(var i=0;i<glows.length;i++){
            glows[i].style.transform='translateY('+sT*.05*(i+1)+'px)';
        }

        ticking=false;
    });ticking=true;}
}
window.addEventListener('scroll',onScroll,{passive:true});

/* ═══ SMOOTH SCROLL ═══ */
function initSmooth(){
    var links=$$('a[href^="#"]');
    for(var i=0;i<links.length;i++){
        links[i].addEventListener('click',function(e){
            var h=this.getAttribute('href');if(h==='#')return;
            var t=document.querySelector(h);
            if(t){e.preventDefault();window.scrollTo({top:t.offsetTop-80,behavior:'smooth'})}
        });
    }
}

/* ═══ DYNAMIC CHILDREN ═══ */
function applyReveals(sel){
    var c=document.querySelector(sel);
    if(!c)return;
    var kids=c.children;
    for(var i=0;i<kids.length;i++){
        if(!kids[i].hasAttribute('data-reveal')){
            kids[i].setAttribute('data-reveal','card');
            kids[i].setAttribute('data-delay',String(i*120));
            if(window._revealObs)window._revealObs.observe(kids[i]);
        }
    }
}

/* ═══ SUPABASE ═══ */
async function cargarNoticias(){
    nC.innerHTML=skN(3);
    try{
        var r=await db.from('noticias').select('*').order('created_at',{ascending:false}).limit(6);
        if(r.error)throw r.error;
        if(!r.data||!r.data.length){nC.innerHTML='<div class="empty-state"><div class="empty-state-icon">📰</div><h3 class="empty-state-title">Sin noticias aún</h3></div>';return}
        lN=r.data;var h='';
        for(var i=0;i<r.data.length;i++)h+=mkNoticia(r.data[i],i);
        nC.innerHTML=h;
        setTimeout(function(){applyReveals('#noticias-grid')},50);
    }catch(e){console.error(e);nC.innerHTML='<div class="empty-state"><div class="empty-state-icon">⚠️</div><h3 class="empty-state-title">Error</h3></div>'}
}

async function cargarAlbumes(){
    aC.innerHTML=skA(2);
    try{
        var r=await db.from('albumes').select('*, canciones(id,titulo,duracion)').order('created_at',{ascending:false}).limit(2);
        if(r.error)throw r.error;
        if(!r.data||!r.data.length){aC.innerHTML='<div class="empty-state"><div class="empty-state-icon">💿</div><h3 class="empty-state-title">Sin álbumes</h3></div>';return}
        lA=r.data;var h='';
        for(var i=0;i<r.data.length;i++)h+=mkAlbum(r.data[i],i);
        aC.innerHTML=h;
        setTimeout(function(){applyReveals('#albumes-grid')},50);
    }catch(e){console.error(e);aC.innerHTML='<div class="empty-state"><div class="empty-state-icon">⚠️</div><h3 class="empty-state-title">Error</h3></div>'}
}

function mkNoticia(n,i){
    var f=new Date(n.created_at).toLocaleDateString('es-ES',{day:'numeric',month:'short',year:'numeric'});
    var img=n.imagen_url||'https://placehold.co/600x400/111/333?text=KXON';
    return'<article class="noticia-card" onclick="window._abrirNoticia('+i+')"><div class="noticia-imagen"><img src="'+img+'" alt="" loading="lazy" onerror="this.src=\'https://placehold.co/600x400/111/333?text=KXON\'"><span class="noticia-fecha">'+f+'</span></div><div class="noticia-body"><h3 class="noticia-titulo">'+n.titulo+'</h3><p class="noticia-descripcion">'+n.descripcion+'</p><div class="noticia-read-more">Leer más →</div></div></article>';
}

function mkAlbum(a,i){
    var img=a.imagen_url||'https://placehold.co/400x400/111/333?text=♪';
    var cnt=a.canciones?a.canciones.length:0;
    return'<article class="album-card" onclick="window._abrirAlbum('+i+')"><div class="album-cover"><img src="'+img+'" alt="" loading="lazy" onerror="this.src=\'https://placehold.co/400x400/111/333?text=♪\'"><div class="album-cover-overlay"><div class="album-cover-icon">👁</div></div></div><div class="album-info"><h4 class="album-titulo">'+a.titulo+'</h4><span class="album-canciones">♪ '+cnt+' canciones</span></div></article>';
}

window._abrirNoticia=function(i){
    var n=lN[i];if(!n)return;
    $('noticiaLandingTitulo').textContent=n.titulo;
    $('noticiaLandingDesc').textContent=n.descripcion;
    $('noticiaLandingFecha').textContent=new Date(n.created_at).toLocaleDateString('es-ES',{day:'numeric',month:'long',year:'numeric'});
    var iw=$('noticiaLandingImgWrap'),ie=$('noticiaLandingImg');
    if(n.imagen_url){ie.src=n.imagen_url;iw.style.display='block'}else iw.style.display='none';
    $('modalNoticiaLanding').classList.add('show');
};

window._abrirAlbum=function(i){
    var a=lA[i];if(!a)return;
    $('albumLandingTitulo').textContent=a.titulo;
    $('albumLandingDesc').textContent=a.descripcion||'Sin descripción';
    $('albumLandingCover').src=a.imagen_url||'https://placehold.co/300x300/111/333?text=♪';
    var c=a.canciones||[];
    $('albumLandingMeta').textContent=c.length+' CANCIONES';
    var tc=$('albumLandingTracks');
    if(!c.length){tc.innerHTML='<div style="text-align:center;padding:30px;color:#555">Sin canciones</div>'}
    else{var h='';for(var j=0;j<c.length;j++)h+='<div class="album-landing-track"><span class="album-landing-track-num">'+(j+1)+'</span><div class="album-landing-track-icon">♪</div><span class="album-landing-track-title">'+c[j].titulo+'</span><span class="album-landing-track-duration">'+(c[j].duracion||'--:--')+'</span></div>';
    h+='<div class="album-landing-no-play">🔒 Inicia sesión para reproducir</div>';tc.innerHTML=h}
    $('modalAlbumLanding').classList.add('show');
};

$('modalNoticiaLanding').addEventListener('click',function(e){if(e.target===this)this.classList.remove('show')});
$('modalAlbumLanding').addEventListener('click',function(e){if(e.target===this)this.classList.remove('show')});

function skN(n){var h='';for(var i=0;i<n;i++)h+='<article class="noticia-card"><div class="skeleton skeleton-img"></div><div class="noticia-body"><div class="skeleton skeleton-title"></div><div class="skeleton skeleton-text"></div><div class="skeleton skeleton-text short"></div></div></article>';return h}
function skA(n){var h='';for(var i=0;i<n;i++)h+='<article class="album-card"><div class="skeleton" style="width:100%;aspect-ratio:1"></div><div class="album-info"><div class="skeleton skeleton-title"></div><div class="skeleton skeleton-text short"></div></div></article>';return h}

/* ═══ INIT ═══ */
document.addEventListener('DOMContentLoaded',function(){
    initLoading();
    initReveals();
    initSmooth();
    cargarNoticias();
    cargarAlbumes();
    onScroll();
    console.log('🎵 KXON IMPACTO MUNDIAL loaded');
});

window.addEventListener('resize',function(){});
})();