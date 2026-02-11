/* ============================================
   🎶 DASHBOARD PLAYLISTS - PLAYLISTS PERSONALIZADAS
   Crear, editar, eliminar playlists
   Agregar/quitar canciones, reproducir
   ============================================ */
(function(){
'use strict';

var db=window.supabase.createClient('https://zizbbypwwvugyswjfbxr.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppemJieXB3d3Z1Z3lzd2pmYnhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1OTkyMTQsImV4cCI6MjA4NjE3NTIxNH0.PwTvjIyPkfbnFMFB9k9XPHDxYrKBkkPIslQJ5UcY_9U');

var allPlaylists=[];
var currentPlaylistId=null;
var currentPlaylistData=null;
var playlistCanciones=[];

/* ══════════════════════════════════
   📥 CARGAR PLAYLISTS
   ══════════════════════════════════ */
window._loadPlaylists=async function(){
    var K=window.KXON||{};
    if(!K.currentUser) return;
    var grid=document.getElementById('playlistsGrid');
    if(!grid) return;

    try{
        var r=await db.from('playlists')
            .select('*, playlist_canciones(id)')
            .eq('usuario_id',K.currentUser.id)
            .order('updated_at',{ascending:false});
        if(r.error) throw r.error;
        allPlaylists=r.data||[];
        renderPlaylistsGrid();
    }catch(e){
        console.error('Error playlists:',e);
        grid.innerHTML='<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">Error al cargar playlists</div></div>';
    }
};

/* ── RENDER GRID ── */
function renderPlaylistsGrid(){
    var grid=document.getElementById('playlistsGrid');
    if(!grid) return;

    /* Card "Crear nueva" siempre primero */
    var h='<div class="pl-card pl-card-new" onclick="window._openCreatePlaylist()">' +
        '<div class="pl-card-new-inner">' +
        '<span class="pl-card-new-icon">+</span>' +
        '<span class="pl-card-new-text">Nueva Playlist</span>' +
        '</div></div>';

    if(!allPlaylists.length){
        h+='<div class="empty-state" style="grid-column:2/-1;"><div class="empty-icon">🎶</div><div class="empty-title">Sin playlists</div><div class="empty-text">Crea tu primera playlist personalizada</div></div>';
        grid.innerHTML=h;
        return;
    }

    for(var i=0;i<allPlaylists.length;i++){
        var pl=allPlaylists[i];
        var img=pl.imagen_url||'https://placehold.co/300x300/111/333?text=🎶';
        var numSongs=pl.playlist_canciones?pl.playlist_canciones.length:0;

        h+='<div class="pl-card" onclick="window._openPlaylistDetail(\''+pl.id+'\')">';
        h+='<div class="pl-card-cover">';
        h+='<img src="'+img+'" alt="" onerror="this.src=\'https://placehold.co/300x300/111/333?text=🎶\'">';
        h+='<div class="pl-card-overlay"><div class="pl-card-overlay-icon">▶</div></div>';
        h+='<button class="pl-card-del" onclick="event.stopPropagation();window._deletePlaylist(\''+pl.id+'\')">✕</button>';
        h+='</div>';
        h+='<div class="pl-card-body">';
        h+='<div class="pl-card-title">'+pl.nombre+'</div>';
        h+='<div class="pl-card-meta">'+numSongs+' canciones</div>';
        h+='</div></div>';
    }
    grid.innerHTML=h;
}

/* ══════════════════════════════════
   ➕ CREAR PLAYLIST
   ══════════════════════════════════ */
window._openCreatePlaylist=function(){
    document.getElementById('plModalTitle').textContent='Nueva Playlist';
    document.getElementById('plNombre').value='';
    document.getElementById('plDesc').value='';
    document.getElementById('plPublica').checked=false;
    document.getElementById('plModalEditId').value='';
    document.getElementById('plBtnSubmitText').textContent='🎶 Crear Playlist';
    document.getElementById('modalPlaylist').classList.add('show');
};

/* ── EDITAR PLAYLIST ── */
window._openEditPlaylist=function(){
    if(!currentPlaylistData) return;
    document.getElementById('plModalTitle').textContent='Editar Playlist';
    document.getElementById('plNombre').value=currentPlaylistData.nombre;
    document.getElementById('plDesc').value=currentPlaylistData.descripcion||'';
    document.getElementById('plPublica').checked=currentPlaylistData.publica||false;
    document.getElementById('plModalEditId').value=currentPlaylistData.id;
    document.getElementById('plBtnSubmitText').textContent='💾 Guardar Cambios';
    document.getElementById('modalPlaylist').classList.add('show');
};

/* ── SUBMIT CREAR/EDITAR ── */
window._submitPlaylist=async function(e){
    if(e) e.preventDefault();
    var K=window.KXON||{};
    if(!K.currentUser) return;

    var nombre=document.getElementById('plNombre').value.trim();
    var desc=document.getElementById('plDesc').value.trim();
    var publica=document.getElementById('plPublica').checked;
    var editId=document.getElementById('plModalEditId').value;

    if(!nombre){if(window.showToast) window.showToast('Ingresa un nombre','error');return;}

    var btn=document.getElementById('plBtnSubmit');
    btn.classList.add('loading');btn.disabled=true;

    try{
        if(editId){
            /* Editar */
            var r=await db.from('playlists').update({
                nombre:nombre,descripcion:desc,publica:publica,
                updated_at:new Date().toISOString()
            }).eq('id',editId);
            if(r.error) throw r.error;
            if(window.showToast) window.showToast('Playlist actualizada','success');
            if(currentPlaylistData&&currentPlaylistData.id===editId){
                currentPlaylistData.nombre=nombre;
                currentPlaylistData.descripcion=desc;
                currentPlaylistData.publica=publica;
                document.getElementById('plDetailTitle').textContent=nombre;
                document.getElementById('plDetailDesc').textContent=desc||'Sin descripción';
            }
        }else{
            /* Crear */
            var r=await db.from('playlists').insert({
                usuario_id:K.currentUser.id,nombre:nombre,
                descripcion:desc,publica:publica
            });
            if(r.error) throw r.error;
            if(window.showToast) window.showToast('¡Playlist creada!','success');
        }
        window._closePlaylistModal();
        await window._loadPlaylists();
    }catch(e){
        console.error(e);
        if(window.showToast) window.showToast('Error: '+e.message,'error');
    }
    btn.classList.remove('loading');btn.disabled=false;
};

/* ── CERRAR MODAL ── */
window._closePlaylistModal=function(){
    document.getElementById('modalPlaylist').classList.remove('show');
};

/* ══════════════════════════════════
   🗑️ ELIMINAR PLAYLIST
   ══════════════════════════════════ */
window._deletePlaylist=async function(plId){
    if(!confirm('¿Eliminar esta playlist?')) return;
    try{
        await db.from('playlist_canciones').delete().eq('playlist_id',plId);
        var r=await db.from('playlists').delete().eq('id',plId);
        if(r.error) throw r.error;
        if(window.showToast) window.showToast('Playlist eliminada','success');

        /* Si estaba en detalle, volver */
        if(currentPlaylistId===plId){
            document.getElementById('plListView').style.display='block';
            document.getElementById('plDetailView').classList.remove('show');
            currentPlaylistId=null;
            currentPlaylistData=null;
        }
        await window._loadPlaylists();
    }catch(e){console.error(e);if(window.showToast) window.showToast('Error al eliminar','error');}
};

/* ══════════════════════════════════
   📖 DETALLE PLAYLIST
   ══════════════════════════════════ */
window._openPlaylistDetail=async function(plId){
    currentPlaylistId=plId;
    try{
        var r=await db.from('playlists').select('*').eq('id',plId).single();
        if(r.error) throw r.error;
        currentPlaylistData=r.data;

        document.getElementById('plDetailTitle').textContent=r.data.nombre;
        document.getElementById('plDetailDesc').textContent=r.data.descripcion||'Sin descripción';

        var img=r.data.imagen_url||'https://placehold.co/200x200/111/333?text=🎶';
        document.getElementById('plDetailCover').src=img;

        await loadPlaylistCanciones(plId);

        document.getElementById('plListView').style.display='none';
        document.getElementById('plDetailView').classList.add('show');
    }catch(e){
        console.error(e);
        if(window.showToast) window.showToast('Error al cargar playlist','error');
    }
};

/* ── CARGAR CANCIONES DE PLAYLIST ── */
async function loadPlaylistCanciones(plId){
    try{
        var r=await db.from('playlist_canciones')
            .select('*, canciones(id, titulo, audio_url, duracion, album_id, albumes(titulo, imagen_url))')
            .eq('playlist_id',plId)
            .order('posicion',{ascending:true});
        if(r.error) throw r.error;
        playlistCanciones=r.data||[];
        document.getElementById('plDetailMeta').textContent=playlistCanciones.length+' CANCIONES';
        renderPlaylistTracks();
    }catch(e){
        console.error(e);
        document.getElementById('plTrackList').innerHTML='<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">Error al cargar canciones</div></div>';
    }
}

function renderPlaylistTracks(){
    var c=document.getElementById('plTrackList');
    if(!playlistCanciones.length){
        c.innerHTML='<div class="empty-state"><div class="empty-icon">🎵</div><div class="empty-title">Playlist vacía</div><div class="empty-text">Agrega canciones desde el panel de Canciones o Álbumes</div></div>';
        return;
    }
    var h='';
    for(var i=0;i<playlistCanciones.length;i++){
        var pc=playlistCanciones[i];
        var cancion=pc.canciones;
        if(!cancion) continue;
        var albumImg=(cancion.albumes&&cancion.albumes.imagen_url)||'https://placehold.co/80x80/111/333?text=♪';
        var albumName=(cancion.albumes&&cancion.albumes.titulo)||'';

        h+='<div class="track-item" onclick="window._playPlaylistTrack('+i+')">';
        h+='<span class="track-num">'+(i+1)+'</span>';
        h+='<div class="track-cover"><img src="'+albumImg+'" alt=""></div>';
        h+='<div class="track-info">';
        h+='<div class="track-title">'+cancion.titulo+'</div>';
        if(albumName) h+='<div class="track-album-name">'+albumName+'</div>';
        h+='</div>';
        h+='<span class="track-duration">'+(cancion.duracion||'--:--')+'</span>';
        h+='<button class="track-delete visible" onclick="event.stopPropagation();window._removeFromPlaylist(\''+pc.id+'\')">✕</button>';
        h+='</div>';
    }
    c.innerHTML=h;
}

/* ── VOLVER A GRID ── */
window._backToPlaylists=function(){
    document.getElementById('plListView').style.display='block';
    document.getElementById('plDetailView').classList.remove('show');
    currentPlaylistId=null;
    currentPlaylistData=null;
};

/* ══════════════════════════════════
   ▶️ REPRODUCIR PLAYLIST
   ══════════════════════════════════ */
window._playPlaylistTrack=function(index){
    if(!playlistCanciones.length) return;
    var tracks=[];
    for(var i=0;i<playlistCanciones.length;i++){
        var c=playlistCanciones[i].canciones;
        if(!c||!c.audio_url) continue;
        var albumImg=(c.albumes&&c.albumes.imagen_url)||'https://placehold.co/100x100/111/333?text=♪';
        tracks.push({id:c.id,titulo:c.titulo,audio_url:c.audio_url,cover:albumImg});
    }
    if(!tracks.length){if(window.showToast) window.showToast('Sin canciones reproducibles','error');return;}

    /* Usar player global del dashboard */
    var K=window.KXON||{};
    if(K.playTrackList){
        K.playTrackList(tracks,index);
    }else{
        /* Fallback: reproducir directamente */
        var audioEl=document.getElementById('audioPlayer');
        var t=tracks[index>=tracks.length?0:index];
        if(!t) return;
        audioEl.src=t.audio_url;
        audioEl.play();
        document.getElementById('playerTitle').textContent=t.titulo;
        document.getElementById('playerCover').src=t.cover;
        document.getElementById('playerBar').classList.add('show');
        document.getElementById('playerPlayPause').textContent='⏸';
        if(window._trackEvent) window._trackEvent('play_cancion',t.id,t.titulo);
    }
};

window._playAllPlaylist=function(){
    window._playPlaylistTrack(0);
};

window._shufflePlaylist=function(){
    if(!playlistCanciones.length) return;
    var idx=Math.floor(Math.random()*playlistCanciones.length);
    window._playPlaylistTrack(idx);
};

/* ══════════════════════════════════
   ➕ AGREGAR CANCIÓN A PLAYLIST
   ══════════════════════════════════ */
window._openAddToPlaylist=function(cancionId,cancionTitulo){
    var K=window.KXON||{};
    if(!K.currentUser){if(window.showToast) window.showToast('Debes iniciar sesión','error');return;}

    /* Guardar datos temporales */
    window._addToPlaylistData={cancionId:cancionId,titulo:cancionTitulo};

    /* Cargar playlists del usuario en el modal */
    renderAddToPlaylistModal();
    document.getElementById('modalAddToPlaylist').classList.add('show');
};

async function renderAddToPlaylistModal(){
    var list=document.getElementById('addToPlList');
    if(!list) return;
    list.innerHTML='<div class="cmt-loading">Cargando playlists...</div>';

    var K=window.KXON||{};
    try{
        var r=await db.from('playlists').select('id,nombre,playlist_canciones(cancion_id)')
            .eq('usuario_id',K.currentUser.id).order('updated_at',{ascending:false});
        if(r.error) throw r.error;
        var pls=r.data||[];

        if(!pls.length){
            list.innerHTML='<div class="cmt-empty">No tienes playlists. <a href="#" onclick="window._closeAddToPlaylist();window._openCreatePlaylist();return false;" style="color:var(--acento-principal);text-decoration:underline;">Crear una</a></div>';
            return;
        }

        var data=window._addToPlaylistData;
        var h='';
        for(var i=0;i<pls.length;i++){
            var pl=pls[i];
            var already=false;
            if(pl.playlist_canciones){
                for(var j=0;j<pl.playlist_canciones.length;j++){
                    if(pl.playlist_canciones[j].cancion_id===data.cancionId){already=true;break;}
                }
            }
            h+='<div class="atp-item'+(already?' atp-added':'')+'" onclick="'+(already?'':'window._addSongToPlaylist(\''+pl.id+'\')')+'">';
            h+='<span class="atp-icon">'+(already?'✅':'🎶')+'</span>';
            h+='<span class="atp-name">'+pl.nombre+'</span>';
            if(already) h+='<span class="atp-badge">Ya agregada</span>';
            h+='</div>';
        }
        list.innerHTML=h;
    }catch(e){
        list.innerHTML='<div class="cmt-empty">Error cargando playlists</div>';
    }
}

window._addSongToPlaylist=async function(playlistId){
    var data=window._addToPlaylistData;
    if(!data) return;

    try{
        /* Obtener posición */
        var countR=await db.from('playlist_canciones').select('id',{count:'exact',head:true}).eq('playlist_id',playlistId);
        var pos=(countR.count||0)+1;

        var r=await db.from('playlist_canciones').insert({
            playlist_id:playlistId,cancion_id:data.cancionId,posicion:pos
        });
        if(r.error){
            if(r.error.message.indexOf('unique')>=0||r.error.message.indexOf('duplicate')>=0){
                if(window.showToast) window.showToast('Ya está en esta playlist','error');
                return;
            }
            throw r.error;
        }

        /* Actualizar updated_at de la playlist */
        await db.from('playlists').update({updated_at:new Date().toISOString()}).eq('id',playlistId);

        if(window.showToast) window.showToast('Agregada a la playlist','success');
        window._closeAddToPlaylist();

        /* Refrescar si estamos viendo esa playlist */
        if(currentPlaylistId===playlistId) await loadPlaylistCanciones(playlistId);
        await window._loadPlaylists();
    }catch(e){
        console.error(e);
        if(window.showToast) window.showToast('Error: '+e.message,'error');
    }
};

window._closeAddToPlaylist=function(){
    document.getElementById('modalAddToPlaylist').classList.remove('show');
    window._addToPlaylistData=null;
};

/* ══════════════════════════════════
   ➖ QUITAR CANCIÓN DE PLAYLIST
   ══════════════════════════════════ */
window._removeFromPlaylist=async function(pcId){
    if(!confirm('¿Quitar esta canción de la playlist?')) return;
    try{
        var r=await db.from('playlist_canciones').delete().eq('id',pcId);
        if(r.error) throw r.error;
        if(window.showToast) window.showToast('Canción removida','success');
        if(currentPlaylistId) await loadPlaylistCanciones(currentPlaylistId);
        await window._loadPlaylists();
    }catch(e){console.error(e);if(window.showToast) window.showToast('Error al remover','error');}
};

})();