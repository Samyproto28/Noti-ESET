require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTables() {
  console.log('🔍 Verificando tablas existentes...');

  try {
    // Intentar obtener posts para ver la estructura
    const { data: posts, error: postsError } = await supabase
      .from('forum_posts')
      .select('*')
      .limit(1);

    if (postsError) {
      console.log('❌ Error obteniendo posts:', postsError);
    } else {
      console.log('✅ forum_posts existe');
      if (posts.length > 0) {
        console.log('📋 Estructura de posts:', Object.keys(posts[0]));
      }
    }

    // Intentar ver si user_profiles existe
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(1);

    if (profilesError) {
      console.log('❌ user_profiles no existe:', profilesError.message);
    } else {
      console.log('✅ user_profiles existe');
      if (profiles.length > 0) {
        console.log('📋 Estructura de profiles:', Object.keys(profiles[0]));
      }
    }

    // Verificar auth.users
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.log('❌ Error obteniendo auth.users:', usersError);
    } else {
      console.log(`✅ auth.users existe con ${users.users.length} usuarios`);
    }

    // Intentar crear un post sin usuario para ver el error específico
    console.log('\n🧪 Probando crear post sin usuario...');
    const { data: testPost, error: testError } = await supabase
      .from('forum_posts')
      .insert([
        {
          title: 'Test Post',
          content: 'Contenido de prueba',
          user_id: '00000000-0000-0000-0000-000000000000'
        }
      ])
      .select();

    if (testError) {
      console.log('❌ Error creando post de prueba:', testError);
    } else {
      console.log('✅ Post de prueba creado:', testPost);
    }

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

checkTables().then(() => {
  console.log('🏁 Verificación terminada');
  process.exit(0);
});