/* ============================================
   💬 DASHBOARD COMMENTS - SISTEMA DE COMENTARIOS
   Comentarios en noticias, canciones, videos
   ============================================ */
(function(){
'use strict';

var db=window.supabase.createClient('https://zizbbypwwvugyswjfbxr.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppemJieXB3d3Z1Z3lzd2pmYnhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1OTkyMTQsImV4cCI6MjA4NjE3NTIxNH0.PwTvjIyPkfbnFMFB9k9XPHDxYrKBkkPIslQJ5UcY_9U');

/* ── RENDER SECCIÓN COMENTARIOS ── */
window._renderCommentsSection=function(tipo,refId){
    var key=tipo+'-'+refId;
    return '<div class="cmt-section" id="cmt-'+key+'">' +
        '<div class="cmt-header"><h4 class="cmt-title">💬 Comentarios</h4><span class="cmt-count" id="cmt-count-'+key+'">0</span></div>' +
        '<div class="cmt-input-wrap">' +
        '<div class="cmt-input-avatar" id="cmt-av-'+key+'">👤</div>' +
        '<div class="cmt-input-box">' +
        '<textarea class="cmt-textarea" id="cmt-text-'+key+'" placeholder="Escribe un comentario..." rows="2" maxlength="500"></textarea>' +
        '<div class="cmt-input-actions">' +
        '<span class="cmt-chars" id="cmt-chars-'+key+'">0/500</span>' +
        '<button type="button" class="cmt-send-btn" onclick="window._sendComment(\''+tipo+'\',\''+refId+'\')">📤 Enviar</button>' +
        '</div></div></div>' +
        '<div class="cmt-list" id="cmt-list-'+key+'"><div class="cmt-loading">Cargando comentarios...</div></div>' +
        '</div>';
};

/* ── CARGAR COMENTARIOS ── */
window._loadComments=async function(tipo,refId){
    var key=tipo+'-'+refId;
    var listEl=document.getElementById('cmt-list-'+key);
    var countEl=document.getElementById('cmt-count-'+key);
    var avEl=document.getElementById('cmt-av-'+key);
    var textEl=document.getElementById('cmt-text-'+key);
    var charsEl=document.getElementById('cmt-chars-'+key);
    if(!listEl) return;

    var K=window.KXON||{};
    if(avEl&&K.currentProfile){
        var av=K.currentProfile.avatar_url||'';
        if(av) avEl.innerHTML='<img src="'+av+'" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">';
        else avEl.textContent=(K.currentProfile.full_name||'U').charAt(0).toUpperCase();
    }
    if(textEl&&charsEl){textEl.oninput=function(){charsEl.textContent=this.value.length+'/500';};}

    listEl.innerHTML='<div class="cmt-loading">Cargando...</div>';
    try{
        var r=await db.from('comentarios').select('*').eq('tipo',tipo).eq('referencia_id',refId).order('created_at',{ascending:false}).limit(50);
        if(r.error) throw r.error;
        var comments=r.data||[];
        if(countEl) countEl.textContent=comments.length;
        if(!comments.length){listEl.innerHTML='<div class="cmt-empty">Sin comentarios aún. ¡Sé el primero!</div>';return;}
        var h='';
        for(var i=0;i<comments.length;i++) h+=renderCmt(comments[i],tipo,refId);
        listEl.innerHTML=h;
    }catch(e){
        console.error('Error comentarios:',e);
        listEl.innerHTML='<div class="cmt-empty">Error cargando comentarios</div>';
    }
};

function renderCmt(c,tipo,refId){
    var K=window.KXON||{};
    var av=c.usuario_avatar?'<img src="'+c.usuario_avatar+'" alt="">':'<span>'+(c.usuario_nombre||'?').charAt(0).toUpperCase()+'</span>';
    var canDel=K.isAdmin||(K.currentUser&&c.usuario_id===K.currentUser.id);
    var delBtn=canDel?'<button class="cmt-del-btn" onclick="window._deleteComment(\''+c.id+'\',\''+tipo+'\',\''+refId+'\')" title="Eliminar">🗑️</button>':'';
    return '<div class="cmt-item" id="cmt-'+c.id+'">' +
        '<div class="cmt-avatar">'+av+'</div>' +
        '<div class="cmt-content">' +
        '<div class="cmt-item-header">' +
        '<span class="cmt-author">'+(c.usuario_nombre||'Anónimo')+'</span>' +
        '<span class="cmt-time">'+timeAgo(c.created_at)+'</span>'+delBtn+
        '</div>' +
        '<p class="cmt-text">'+escHtml(c.contenido)+'</p>' +
        '</div></div>';
}

/* ── ENVIAR ── */
window._sendComment=async function(tipo,refId){
    var key=tipo+'-'+refId;
    var textEl=document.getElementById('cmt-text-'+key);
    if(!textEl) return;
    var txt=textEl.value.trim();
    if(!txt){if(window.showToast) window.showToast('Escribe un comentario','error');return;}
    if(txt.length>500){if(window.showToast) window.showToast('Máximo 500 caracteres','error');return;}
    var K=window.KXON||{};
    if(!K.currentUser){if(window.showToast) window.showToast('Debes iniciar sesión','error');return;}

    var nombre=K.currentProfile?.full_name||K.currentUser.user_metadata?.full_name||K.currentUser.email.split('@')[0];
    var avatarUrl=K.currentProfile?.avatar_url||K.currentUser.user_metadata?.avatar_url||'';

    try{
        var r=await db.from('comentarios').insert({
            usuario_id:K.currentUser.id,usuario_nombre:nombre,usuario_avatar:avatarUrl,
            tipo:tipo,referencia_id:refId,contenido:txt
        }).select().single();
        if(r.error) throw r.error;
        textEl.value='';
        var charsEl=document.getElementById('cmt-chars-'+key);
        if(charsEl) charsEl.textContent='0/500';
        await window._loadComments(tipo,refId);
        if(window.showToast) window.showToast('Comentario publicado','success');
        if(window._trackEvent) window._trackEvent('comentario',refId,nombre+' comentó');
        if(K.sendNotification&&!K.isAdmin){
            try{var admins=await db.from('profiles').select('id').eq('role','admin');
            if(admins.data){for(var i=0;i<admins.data.length;i++){K.sendNotification(admins.data[i].id,'comentario','Nuevo comentario',nombre+': "'+txt.substring(0,60)+(txt.length>60?'...':'')+'"',{tipo:tipo,referencia_id:refId});}}}catch(e){}
        }
    }catch(e){console.error(e);if(window.showToast) window.showToast('Error al enviar','error');}
};

/* ── ELIMINAR ── */
window._deleteComment=async function(cId,tipo,refId){
    if(!confirm('¿Eliminar este comentario?')) return;
    try{
        var r=await db.from('comentarios').delete().eq('id',cId);
        if(r.error) throw r.error;
        var el=document.getElementById('cmt-'+cId);
        if(el){el.style.opacity='0';el.style.transform='translateX(20px)';el.style.transition='all .3s ease';
        setTimeout(function(){el.remove();var key=tipo+'-'+refId;var ce=document.getElementById('cmt-count-'+key);if(ce){var n=parseInt(ce.textContent)||0;ce.textContent=Math.max(0,n-1);}},300);}
        if(window.showToast) window.showToast('Comentario eliminado','success');
    }catch(e){console.error(e);if(window.showToast) window.showToast('Error al eliminar','error');}
};

/* ── TRACK EVENT (global) ── */
window._trackEvent=async function(tipo,refId,refNombre,meta){
    try{var K=window.KXON||{};await db.from('analytics_events').insert({tipo:tipo,referencia_id:refId||null,referencia_nombre:refNombre||null,usuario_id:K.currentUser?K.currentUser.id:null,metadata:meta||{}});}catch(e){}
};

function escHtml(t){var d=document.createElement('div');d.appendChild(document.createTextNode(t));return d.innerHTML;}
function timeAgo(s){if(!s) return '';var d=Math.floor((new Date()-new Date(s))/1000);if(d<60) return 'Ahora';if(d<3600) return 'Hace '+Math.floor(d/60)+'m';if(d<86400) return 'Hace '+Math.floor(d/3600)+'h';if(d<604800) return 'Hace '+Math.floor(d/86400)+'d';return new Date(s).toLocaleDateString('es-ES',{day:'numeric',month:'short',year:'numeric'});}

})();