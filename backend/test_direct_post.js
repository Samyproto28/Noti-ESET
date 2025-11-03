require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testDirectPost() {
  console.log('🧪 Probando crear post directamente...');

  try {
    // Crear post sin relaciones
    console.log('📝 Creando post sin relaciones...');
    const { data, error } = await supabase
      .from('forum_posts')
      .insert([
        {
          title: 'Test Post Directo',
          content: 'Post creado sin relaciones',
          user_id: '00000000-0000-0000-0000-000000000000'
        }
      ])
      .select('*')
      .single();

    if (error) {
      console.error('❌ Error creando post directo:', error);
      return;
    }

    console.log('✅ Post creado exitosamente:', data);

    // Ahora probar obtenerlo con relaciones
    console.log('\n🔍 Obteniendo post con relaciones...');
    const { data: postWithRels, error: relError } = await supabase
      .from('forum_posts')
      .select(`
        *,
        forum_categories(id, name, color, icon),
        user_profiles(username, display_name, avatar_url)
      `)
      .eq('id', data.id)
      .single();

    if (relError) {
      console.error('❌ Error obteniendo con relaciones:', relError);
      
      // Intentar sin user_profiles
      console.log('🔄 Intentando sin user_profiles...');
      const { data: postSimple, error: simpleError } = await supabase
        .from('forum_posts')
        .select(`
          *,
          forum_categories(id, name, color, icon)
        `)
        .eq('id', data.id)
        .single();

      if (simpleError) {
        console.error('❌ Error sin user_profiles:', simpleError);
      } else {
        console.log('✅ Post con categorías (sin user_profiles):', postSimple);
      }
    } else {
      console.log('✅ Post con relaciones:', postWithRels);
    }

    // Limpiar
    await supabase.from('forum_posts').delete().eq('id', data.id);
    console.log('🧹 Post limpiado');

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

testDirectPost().then(() => {
  console.log('🏁 Test terminado');
  process.exit(0);
});