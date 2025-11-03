require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createSimpleUser() {
  console.log('🚀 Creando usuario anónimo simple...');

  const anonymousUserId = '00000000-0000-0000-0000-000000000000';

  try {
    // Intentar crear el usuario con campos mínimos
    console.log('📝 Creando usuario anónimo...');
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert([
        {
          id: anonymousUserId,
          username: 'anonimo',
          display_name: 'Usuario Anónimo'
        }
      ])
      .select();

    if (error) {
      console.error('❌ Error creando usuario:', error);
      
      // Intentar sin display_name
      console.log('🔄 Intentando solo con username...');
      const { data: data2, error: error2 } = await supabase
        .from('user_profiles')
        .upsert([
          {
            id: anonymousUserId,
            username: 'anonimo'
          }
        ])
        .select();

      if (error2) {
        console.error('❌ Error en segunda tentativa:', error2);
        return;
      }

      console.log('✅ Usuario creado en segunda tentativa:', data2);
    } else {
      console.log('✅ Usuario creado exitosamente:', data);
    }

    // Ahora probar crear un post
    console.log('\n🧪 Probando crear post con usuario anónimo...');
    const { data: testPost, error: postError } = await supabase
      .from('forum_posts')
      .insert([
        {
          title: 'Post de Prueba Público',
          content: 'Este es un post creado sin autenticación',
          user_id: anonymousUserId
        }
      ])
      .select();

    if (postError) {
      console.error('❌ Error creando post de prueba:', postError);
    } else {
      console.log('✅ Post de prueba creado:', testPost[0]);
      
      // Eliminar el post de prueba
      await supabase
        .from('forum_posts')
        .delete()
        .eq('id', testPost[0].id);
      console.log('🧹 Post de prueba eliminado');
    }

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

createSimpleUser().then(() => {
  console.log('🏁 Script terminado');
  process.exit(0);
});