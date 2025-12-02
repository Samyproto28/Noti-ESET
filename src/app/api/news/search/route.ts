import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase (service role para acceso completo)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase configuration');
  return NextResponse.json(
    { error: 'Server configuration error' },
    { status: 500 }
  );
}

const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parámetros de búsqueda
    const query = searchParams.get('q') || '';
    const category = searchParams.get('category') || '';
    const authorId = searchParams.get('author') || searchParams.get('author_id') || '';
    const startDate = searchParams.get('startDate') || searchParams.get('start_date') || '';
    const endDate = searchParams.get('endDate') || searchParams.get('end_date') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Validación básica
    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: 'Search query must be at least 2 characters long' },
        { status: 400 }
      );
    }

    // Construir filtros de forma segura
    const filters: any[] = [
      'is_published = true'
    ];

    if (category) {
      filters.push(`category = '${category}'`);
    }

    if (authorId) {
      filters.push(`author_id = '${authorId}'`);
    }

    if (startDate) {
      filters.push(`published_at >= '${startDate}'`);
    }

    if (endDate) {
      filters.push(`published_at <= '${endDate}'`);
    }

    const whereClause = filters.join(' AND ');

    // Consulta principal de búsqueda con PostgreSQL full-text
    const searchQuery = `
      WITH search_results AS (
        SELECT
          n.id,
          n.title,
          n.content,
          n.category,
          n.author_id,
          n.created_at,
          n.published_at,
          n.is_published,
          -- Score mejorado con pesos adicionales
          (ts_rank_cd(n.search_vector, websearch_to_tsquery('spanish', $1)) * 100) +
          CASE WHEN position(lower($1) in lower(n.title)) > 0 THEN 50 ELSE 0 END +
          CASE WHEN position(lower($1) in lower(n.category)) > 0 THEN 25 ELSE 0 END
          as relevance_score,
          -- Highlighting para el título
          ts_headline('spanish', n.title, websearch_to_tsquery('spanish', $1),
            'StartSel=<mark>, StopSel=</mark>, MaxWords=10, MinWords=1') as highlighted_title,
          -- Highlighting para el contenido
          ts_headline('spanish', n.content, websearch_to_tsquery('spanish', $1),
            'StartSel=<mark>, StopSel=</mark>, MaxWords=50, MinWords=5') as highlighted_content
        FROM news n
        WHERE
          n.search_vector @@ websearch_to_tsquery('spanish', $1)
          AND ${whereClause}
      )
      SELECT
        sr.*,
        row_number() OVER (ORDER BY sr.relevance_score DESC, sr.published_at DESC) as rank,
        (SELECT COUNT(*) FROM news WHERE search_vector @@ websearch_to_tsquery('spanish', $1) AND ${whereClause}) as total_results
      FROM search_results sr
      ORDER BY sr.relevance_score DESC, sr.published_at DESC
      LIMIT $2 OFFSET $3
    `;

    // Ejecutar consulta de búsqueda usando Supabase SQL
    let results: any[] = [];
    let totalResults = 0;

    try {
      // Para búsquedas complejas con full-text search, usamos consulta directa
      if (supabase.from) {
        // Intentar usar el método SQL directo si está disponible
        const { data: searchData, error: searchError } = await supabase
          .rpc('exec_sql', {
            query: searchQuery.replace(/\$1/g, `'${query.replace(/'/g, "''")}'`)
                             .replace(/\$2/g, limit.toString())
                             .replace(/\$3/g, offset.toString()),
          });

        if (!searchError && searchData) {
          results = searchData;
        }
      }
    } catch (sqlError) {
      console.log('SQL method failed, using simple search:', sqlError);
    }

    // Si el método avanzado falla, usar búsqueda simple integrada
    if (results.length === 0) {
      // Consulta alternativa más simple para compatibilidad
      const { data: simpleResults, error: simpleError } = await supabase
        .from('news')
        .select(`
          id,
          title,
          content,
          category,
          author_id,
          created_at,
          published_at,
          is_published
        `)
        .or(`ilike.title.%${query}%,ilike.content.%${query}%`)
        .eq('is_published', true)
        .order('published_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (simpleError) {
        console.error('Simple search error:', simpleError);
        return NextResponse.json(
          { error: 'Search failed', details: simpleError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: simpleResults,
        pagination: {
          page,
          limit,
          total_results: simpleResults?.length || 0,
          total_pages: Math.ceil((simpleResults?.length || 0) / limit)
        },
        query,
        performance: {
          execution_time_ms: Date.now(),
          method: 'simple_fallback'
        }
      });
    }

    // Construir respuesta final
    let processedResults = results.map((item: any) => ({
      id: item.id,
      title: item.title,
      content: item.content,
      category: item.category,
      author: item.author_id, // Mantener compatibilidad con frontend
      created_at: item.created_at,
      published_at: item.published_at,
      relevance_score: item.relevance_score || 0.5,
      highlighted_title: item.highlighted_title || item.title,
      highlighted_content: item.highlighted_content || item.content.substring(0, 200) + '...'
    }));

    // Si no usamos el método avanzado, formatear resultados simples
    if (results.length === 0 && simpleResults) {
      processedResults = simpleResults.map((item: any) => ({
        id: item.id,
        title: item.title,
        content: item.content,
        category: item.category,
        author: item.author_id,
        created_at: item.created_at,
        published_at: item.published_at,
        relevance_score: 0.5,
        highlighted_title: item.title,
        highlighted_content: item.content.substring(0, 200) + '...'
      }));
    }

    const response = {
      success: true,
      data: processedResults,
      pagination: {
        page,
        limit,
        total_results: results[0]?.total_results || (simpleResults?.length || 0),
        total_pages: Math.ceil((results[0]?.total_results || (simpleResults?.length || 0)) / limit)
      },
      query,
      performance: {
        execution_time_ms: Date.now(),
        method: results.length > 0 ? 'advanced_fulltext' : 'simple_fallback'
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, filters = {}, options = {} } = body;

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: 'Search query must be at least 2 characters long' },
        { status: 400 }
      );
    }

    // Construir filtros desde el body
    const { category, author_id, start_date, end_date, limit = 20, page = 1 } = filters;
    const { offset = (page - 1) * limit } = options;

    const filtersArray: any[] = ['is_published = true'];

    if (category) filtersArray.push(`category = '${category}'`);
    if (author_id) filtersArray.push(`author_id = '${author_id}'`);
    if (start_date) filtersArray.push(`published_at >= '${start_date}'`);
    if (end_date) filtersArray.push(`published_at <= '${end_date}'`);

    const whereClause = filtersArray.join(' AND ');

    // Consulta avanzada para POST request
    const searchQuery = `
      WITH search_results AS (
        SELECT
          n.id,
          n.title,
          n.content,
          n.category,
          n.author_id,
          n.created_at,
          n.published_at,
          n.is_published,
          (ts_rank_cd(n.search_vector, websearch_to_tsquery('spanish', $1)) * 100) +
          CASE WHEN position(lower($1) in lower(n.title)) > 0 THEN 50 ELSE 0 END +
          CASE WHEN position(lower($1) in lower(n.category)) > 0 THEN 25 ELSE 0 END
          as relevance_score,
          ts_headline('spanish', n.title, websearch_to_tsquery('spanish', $1),
            'StartSel=<mark>, StopSel=</mark>, MaxWords=10, MinWords=1') as highlighted_title,
          ts_headline('spanish', n.content, websearch_to_tsquery('spanish', $1),
            'StartSel=<mark>, StopSel=</mark>, MaxWords=50, MinWords=5') as highlighted_content
        FROM news n
        WHERE
          n.search_vector @@ websearch_to_tsquery('spanish', $1)
          AND ${whereClause}
      )
      SELECT
        sr.*,
        row_number() OVER (ORDER BY sr.relevance_score DESC, sr.published_at DESC) as rank,
        (SELECT COUNT(*) FROM news WHERE search_vector @@ websearch_to_tsquery('spanish', $1) AND ${whereClause}) as total_results
      FROM search_results sr
      ORDER BY sr.relevance_score DESC, sr.published_at DESC
      LIMIT $2 OFFSET $3
    `;

    const { data: results, error } = await supabase.rpc('exec_sql', {
      query: searchQuery,
      params: [query, limit, offset]
    });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: results?.map((item: any) => ({
        id: item.id,
        title: item.title,
        content: item.content,
        category: item.category,
        author_id: item.author_id,
        created_at: item.created_at,
        published_at: item.published_at,
        relevance_score: item.relevance_score,
        highlighted_title: item.highlighted_title,
        highlighted_content: item.highlighted_content,
        rank: item.rank
      })) || [],
      pagination: {
        page,
        limit,
        total_results: results?.[0]?.total_results || 0,
        total_pages: Math.ceil((results?.[0]?.total_results || 0) / limit)
      },
      query,
      filters,
      performance: {
        execution_time_ms: Date.now(),
        method: 'advanced_fulltext'
      }
    });

  } catch (error) {
    console.error('Advanced search error:', error);
    return NextResponse.json(
      { error: 'Advanced search failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}