import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Función para ejecutar consultas SQL complejas
export async function executeSql(query: string, params: any[] = []): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .rpc('exec_sql', {
        query,
        params
      });

    if (error) {
      console.error('SQL execution error:', error);
      throw new Error(`SQL execution failed: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  }
}

// Función para obtener configuración de búsqueda
export async function getSearchConfiguration() {
  const { data, error } = await supabase
    .from('search_configuration')
    .select('*')
    .single();

  if (error) {
    console.error('Failed to get search configuration:', error);
    return {
      language: 'spanish',
      min_word_length: 2,
      search_ranking_algorithm: 'ts_rank_cd'
    };
  }

  return data;
}

// Función para contar noticias filtradas
export async function countNews(filters: {
  category?: string;
  authorId?: string;
  startDate?: string;
  endDate?: string;
  published?: boolean;
} = {}): Promise<number> {
  const { category, authorId, startDate, endDate, published = true } = filters;

  let query = 'SELECT COUNT(*) as total FROM news WHERE is_published = $1';
  const params: any[] = [published];

  if (category) {
    query += ' AND category = $' + (params.length + 1);
    params.push(category);
  }

  if (authorId) {
    query += ' AND author_id = $' + (params.length + 1);
    params.push(authorId);
  }

  if (startDate) {
    query += ' AND published_at >= $' + (params.length + 1);
    params.push(startDate);
  }

  if (endDate) {
    query += ' AND published_at <= $' + (params.length + 1);
    params.push(endDate);
  }

  try {
    const results = await executeSql(query, params);
    return results[0]?.total || 0;
  } catch (error) {
    console.error('Count news error:', error);
    return 0;
  }
}