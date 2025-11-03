require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function createAnonymousAuthUser() {
  console.log('🚀 Creando usuario anónimo en auth.users...');

  try {
    // Crear usuario en auth.users
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'anonimo@forum.notieset',
      password: 'anonymous123',
      email_confirm: true,
      user_metadata: {
        username: 'anonimo',
        display_name: 'Usuario Anónimo'
      }
    });

    if (authError) {
      console.error('❌ Error creando usuario auth:', authError);
      
      // Verificar si ya existe
      console.log('🔍 Verificando usuarios existentes...');
      const { data: users, error: listError } = await supabase.auth.admin.listUsers();
      
      if (listError) {
        console.error('❌ Error listando usuarios:', listError);
        return;
      }

      console.log(`📋 Usuarios existentes: ${users.users.length}`);
      const anonUser = users.users.find(u => u.email === 'anonimo@forum.notieset');
      
      if (anonUser) {
        console.log('✅ Usuario anónimo ya existe:', anonUser.id);
        
        // Probar crear un post con este usuario
        await testPostWithUser(anonUser.id);
        return;
      }
      
      return;
    }

    console.log('✅ Usuario auth creado:', authData.user.id);
    
    // Probar crear un post
    await testPostWithUser(authData.user.id);

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

async function testPostWithUser(userId) {
  console.log(`\n🧪 Probando crear post con usuario ${userId}...`);
  
  try {
    const { data, error } = await supabase
      .from('forum_posts')
      .insert([
        {
          title: 'Test Post Auth User',
          content: 'Post creado con usuario auth',
          user_id: userId
        }
      ])
      .select('*')
      .single();

    if (error) {
      console.error('❌ Error creando post:', error);
    } else {
      console.log('✅ Post creado exitosamente:', {
        id: data.id,
        title: data.title,
        user_id: data.user_id
      });

      // Limpiar
      await supabase.from('forum_posts').delete().eq('id', data.id);
      console.log('🧹 Post limpiado');
    }
  } catch (error) {
    console.error('❌ Error en test:', error);
  }
}

createAnonymousAuthUser().then(() => {
  console.log('🏁 Script terminado');
  process.exit(0);
});