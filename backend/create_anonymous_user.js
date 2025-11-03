require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createAnonymousUser() {
  console.log('🚀 Creando usuario anónimo para el foro público...');

  const anonymousUserId = '00000000-0000-0000-0000-000000000000';

  try {
    // Verificar si el usuario ya existe
    console.log('🔍 Verificando si el usuario anónimo existe...');
    const { data: existingUser, error: checkError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', anonymousUserId)
      .single();

    if (existingUser) {
      console.log('✅ Usuario anónimo ya existe');
      return;
    }

    // Crear el usuario anónimo con estructura básica
    console.log('📝 Creando usuario anónimo...');
    const { data, error } = await supabase
      .from('user_profiles')
      .insert([
        {
          id: anonymousUserId,
          username: 'anonimo',
          display_name: 'Usuario Anónimo',
          reputation_points: 0,
          posts_count: 0,
          comments_count: 0,
          reactions_given_count: 0,
          bio: 'Usuario anónimo del foro público',
          is_active: true
        }
      ])
      .select();

    if (error) {
      console.error('❌ Error creando usuario anónimo:', error);
      return;
    }

    console.log('✅ Usuario anónimo creado exitosamente');
    console.log('📋 Datos:', data[0]);

  } catch (error) {
    console.error('❌ Error ejecutando script:', error);
  }
}

// Ejecutar el script
createAnonymousUser().then(() => {
  console.log('🏁 Script terminado');
  process.exit(0);
});