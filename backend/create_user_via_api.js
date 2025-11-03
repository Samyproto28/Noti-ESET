require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false }
  }
);

async function createUserViaSQL() {
  console.log('🚀 Ejecutando SQL para crear usuario anónimo...');

  const sql = `
    -- Crear usuario anónimo para el foro público
    INSERT INTO user_profiles (
        id,
        username,
        display_name,
        bio,
        reputation_points,
        posts_count,
        comments_count,
        reactions_given_count,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        'anonimo',
        'Usuario Anónimo',
        'Usuario anónimo del foro público',
        0,
        0,
        0,
        0,
        true,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        updated_at = NOW()
    RETURNING id, username, display_name;
  `;

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error('❌ Error ejecutando SQL:', error);
      
      // Intentar crear directamente
      console.log('🔄 Intentando crear directamente...');
      const { data: userData, error: insertError } = await supabase
        .from('user_profiles')
        .upsert([
          {
            id: '00000000-0000-0000-0000-000000000000',
            username: 'anonimo',
            display_name: 'Usuario Anónimo',
            bio: 'Usuario anónimo del foro público',
            reputation_points: 0,
            posts_count: 0,
            comments_count: 0,
            reactions_given_count: 0,
            is_active: true
          }
        ])
        .select();

      if (insertError) {
        console.error('❌ Error en insert directo:', insertError);
        return;
      }

      console.log('✅ Usuario creado directamente:', userData);
      return;
    }

    console.log('✅ Usuario anónimo creado via SQL:', data);

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Ejecutar el script
createUserViaSQL().then(() => {
  console.log('🏁 Script terminado');
  process.exit(0);
});