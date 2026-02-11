/* ============================================
   🔌 SUPABASE CONFIG - CONEXIÓN A BASE DE DATOS
   Plataforma: KXON
   Archivo compartido por TODAS las páginas
   ============================================ */

const SUPABASE_URL = 'https://zizbbypwwvugyswjfbxr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppemJieXB3d3Z1Z3lzd2pmYnhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1OTkyMTQsImV4cCI6MjA4NjE3NTIxNH0.PwTvjIyPkfbnFMFB9k9XPHDxYrKBkkPIslQJ5UcY_9U';

/* Crear UNA sola instancia y exponerla globalmente */
window.db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* Alias para compatibilidad */
var db = window.db;

/* ──────────────────────────────────
   Función helper para verificar conexión
   ────────────────────────────────── */
async function testConnection() {
    try {
        const { data, error } = await db.from('profiles').select('count', { count: 'exact', head: true });
        if (error) {
            console.warn('⚠️ KXON DB: Tablas aún no creadas o error:', error.message);
        } else {
            console.log('✅ KXON DB: Conexión exitosa');
        }
    } catch (e) {
        console.error('❌ KXON DB: Sin conexión', e);
    }
}

testConnection();