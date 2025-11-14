// Importación ES6 para consistencia con el resto del proyecto
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validar que las variables de entorno estén definidas
if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Faltan variables de entorno requeridas: SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

export default supabase;
