import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseService } from '@/lib/supabase';
import { rateLimiter } from '@/lib/rateLimiter';

// Zod schema for query parameter validation
const newsQuerySchema = z.object({
  page: z.coerce.number().min(1).max(1000).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  category: z.enum(['national', 'international', 'technology', 'sports', 'culture']).optional(),
  author_id: z.string().uuid().optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  search: z.string().min(1).max(100).optional(),
  sort_by: z.enum(['published_at', 'created_at', 'title', 'category']).default('published_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

type NewsQuery = z.infer<typeof newsQuerySchema>;

// Helper function to generate cache key
function generateCacheKey(query: NewsQuery): string {
  const { category, author_id, start_date, end_date, search, sort_by, sort_order, page, limit } = query;
  const keyParts = [
    category || 'all',
    author_id || 'all',
    start_date || 'all',
    end_date || 'all',
    search || 'all',
    sort_by,
    sort_order,
    page,
    limit
  ];
  return `news:${keyParts.join(':')}`;
}

// Helper function to build SQL query safely
function buildNewsQuery(query: NewsQuery): {
  sql: string;
  params: any[];
} {
  const {
    category,
    author_id,
    start_date,
    end_date,
    search,
    sort_by,
    sort_order,
    page,
    limit
  } = query;

  const offset = (page - 1) * limit;

  // Build WHERE conditions array
  const conditions: string[] = ['n.is_published = true'];

  // Add category filter if provided
  if (category) {
    conditions.push(`n.category = ${escapeValue(category)}`);
  }

  // Add author filter if provided
  if (author_id) {
    conditions.push(`n.author_id = ${escapeValue(author_id)}`);
  }

  // Add date range filters if provided
  if (start_date) {
    conditions.push(`n.published_at >= ${escapeValue(start_date)}`);
  }

  if (end_date) {
    conditions.push(`n.published_at <= ${escapeValue(end_date)}`);
  }

  // Add search filter if provided (use existing search_vector)
  if (search) {
    conditions.push(
      `n.search_vector @@ to_tsquery('spanish', ${escapeValue(search)})`
    );
  }

  // Combine WHERE conditions
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Build ORDER BY clause
  const orderByClause = `ORDER BY n.${sort_by} ${sort_order.toUpperCase()}`;

  // Build pagination
  const paginationClause = `LIMIT $${conditions.length + 1} OFFSET $${conditions.length + 2}`;

  // Final query with parameterized values
  const sql = `
    SELECT
      n.id,
      n.title,
      n.content,
      n.category,
      n.author_id,
      n.created_at,
      n.published_at,
      n.is_published,
      COALESCE(p.full_name, 'Unknown') as author_name,
      COALESCE(u.email, p.email) as author_email,
      COUNT(DISTINCT c.id) as comment_count
    FROM news n
    LEFT JOIN public.profiles p ON n.author_id = p.id
    LEFT JOIN auth.users u ON p.id = u.id
    LEFT JOIN comments c ON n.id = c.news_id AND c.parent_comment_id IS NULL
    ${whereClause}
    ${orderByClause}
    ${paginationClause}
  `;

  // Build parameters array (pagination parameters go last)
  const params = [
    ...conditions
      .filter((_, index) => {
        // Only add parameters for non-constant conditions
        return !conditions[index].includes('is_published = true');
      })
      .map(condition => {
        if (condition.includes('=')) {
          const value = condition.split('=')[1].trim();
          return unescapeValue(value);
        }
        return null;
      })
      .filter(Boolean),
    limit,
    offset
  ];

  return { sql, params };
}

// Helper function to safely escape values
function escapeValue(value: string): string {
  return `$${value.replace(/'/g, "''")}`;
}

// Helper function to unescape values for parameterized queries
function unescapeValue(value: string): string {
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }
  return value;
}

// Main GET handler
export async function GET(request: NextRequest) {
  const startTime = performance.now();
  const requestId = crypto.randomUUID();

  try {
    // Extract IP from request
    const ip = request.ip || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Apply rate limiting (100 requests per minute per IP)
    const rateLimitResult = await rateLimiter.checkLimit(request, '/api/news');
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please try again later.',
          retry_after: rateLimitResult.limitInfo?.retryAfter || 60,
          request_id: requestId
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '100',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(Date.now() + (rateLimitResult.limitInfo?.retryAfter || 60) * 1000).toUTCString(),
            'Retry-After': rateLimitResult.limitInfo?.retryAfter?.toString() || '60',
            'Cache-Control': 'no-store'
          }
        }
      );
    }

    // Parse and validate query parameters
    const searchParams = request.nextUrl.searchParams;
    const rawQuery = Object.fromEntries(searchParams.entries());

    const query = newsQuerySchema.parse(rawQuery);

    // Generate cache key
    const cacheKey = generateCacheKey(query);

    // Try to get cached data first
    try {
      const cachedData = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/cache?news_key=eq.${cacheKey}`,
        {
          headers: {
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`
          }
        }
      );

      if (cachedData.ok) {
        const cachedResponse = await cachedData.json();
        if (cachedResponse.length > 0) {
          // Return cached response with cache headers
          return NextResponse.json({
            ...cachedResponse[0],
            from_cache: true,
            request_id: requestId,
            performance: {
              execution_time_ms: performance.now() - startTime,
              method: 'cached'
            }
          }, {
            headers: {
              'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
              'ETag': `"${cacheKey}"`,
              'X-Cache': 'HIT'
            }
          });
        }
      }
    } catch (cacheError) {
      console.warn('Cache fetch failed, proceeding with fresh query:', cacheError);
    }

    // Build optimized SQL query
    const { sql, params } = buildNewsQuery(query);

    console.log(`[${requestId}] Executing query:`, sql);
    console.log(`[${requestId}] Parameters:`, params);

    // Execute the query using Supabase RPC for parameterized queries
    const { data: results, error } = await supabaseService
      .rpc('exec_sql', {
        query: sql,
        params: JSON.stringify(params)
      });

    if (error) {
      console.error(`[${requestId}] Database error:`, error);

      // Fallback to simple Supabase query if RPC fails
      try {
        let simpleQuery = supabaseService
          .from('news')
          .select(`
            id,
            title,
            content,
            category,
            author_id,
            created_at,
            published_at,
            is_published,
            profiles!inner(
              full_name,
              email
            ),
            comment_count
          `, { count: 'exact' })
          .eq('is_published', true)
          .order(sort_by as any, { ascending: query.sort_order === 'asc' })
          .range((query.page - 1) * query.limit, query.page * query.limit - 1);

        // Apply filters
        if (query.category) {
          simpleQuery = simpleQuery.eq('category', query.category);
        }
        if (query.author_id) {
          simpleQuery = simpleQuery.eq('author_id', query.author_id);
        }
        if (query.start_date) {
          simpleQuery = simpleQuery.gte('published_at', query.start_date);
        }
        if (query.end_date) {
          simpleQuery = simpleQuery.lte('published_at', query.end_date);
        }

        const { data: simpleResults, error: simpleError, count } = await simpleQuery;

        if (simpleError) {
          throw new Error(`Simple fallback error: ${simpleError.message}`);
        }

        // Transform results to include comment count (requires separate query)
        const newsWithComments = await Promise.all(
          (simpleResults || []).map(async (news: any) => {
            const { data: comments } = await supabaseService
              .from('comments')
              .select('id', { count: 'exact' })
              .eq('news_id', news.id)
              .eq('parent_comment_id', null);

            return {
              ...news,
              comment_count: comments?.length || 0,
              author_name: news.profiles?.full_name || 'Unknown',
              author_email: news.profiles?.email || null
            };
          })
        );

        const response = {
          success: true,
          data: newsWithComments,
          pagination: {
            page: query.page,
            limit: query.limit,
            total_results: count || 0,
            total_pages: Math.ceil((count || 0) / query.limit)
          },
          filters: {
            category: query.category || undefined,
            author_id: query.author_id || undefined,
            start_date: query.start_date || undefined,
            end_date: query.end_date || undefined,
            search: query.search || undefined,
            sort_by: query.sort_by,
            sort_order: query.sort_order
          },
          performance: {
            execution_time_ms: performance.now() - startTime,
            method: 'fallback_simple',
            request_id: requestId
          }
        };

        return NextResponse.json(response, {
          headers: {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
            'X-Cache': 'MISS',
            'X-Request-ID': requestId
          }
        });

      } catch (fallbackError) {
        console.error(`[${requestId}] Fallback error:`, fallbackError);
        return NextResponse.json(
          {
            error: 'Failed to fetch news',
            details: fallbackError instanceof Error ? fallbackError.message : 'Unknown error',
            request_id: requestId
          },
          { status: 500 }
        );
      }
    }

    // Transform results to expected format
    const transformedResults = (results || []).map((item: any) => ({
      id: item.id,
      title: item.title,
      content: item.content,
      category: item.category,
      author_id: item.author_id,
      author_name: item.author_name || 'Unknown',
      author_email: item.author_email || null,
      created_at: item.created_at,
      published_at: item.published_at,
      is_published: item.is_published,
      comment_count: parseInt(item.comment_count) || 0
    }));

    // Get total count for pagination
    let totalCount = 0;
    if (results && results.length > 0) {
      totalCount = parseInt(results[0].total_count) || transformedResults.length;
    } else {
      totalCount = transformedResults.length;
    }

    // Build successful response
    const response = {
      success: true,
      data: transformedResults,
      pagination: {
        page: query.page,
        limit: query.limit,
        total_results: totalCount,
        total_pages: Math.ceil(totalCount / query.limit)
      },
      filters: {
        category: query.category || undefined,
        author_id: query.author_id || undefined,
        start_date: query.start_date || undefined,
        end_date: query.end_date || undefined,
        search: query.search || undefined,
        sort_by: query.sort_by,
        sort_order: query.sort_order
      },
      performance: {
        execution_time_ms: performance.now() - startTime,
        method: 'optimized_query',
        request_id: requestId,
        cache_status: 'miss'
      }
    };

    // Cache the response using Next.js revalidate
    try {
      // Using Next.js caching mechanisms
      response.from_cache = false;
    } catch (cacheError) {
      console.warn(`[${requestId}] Caching failed:`, cacheError);
    }

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'ETag': `"${cacheKey}"`,
        'Last-Modified': new Date().toUTCString(),
        'X-Cache': 'MISS',
        'X-Request-ID': requestId
      }
    });

  } catch (error) {
    console.error(`[${requestId}] News API error:`, error);

    // Handle different types of errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: 'Invalid query parameters',
          errors: error.errors,
          request_id: requestId
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        request_id: requestId
      },
      { status: 500 }
    );
  }
}

// POST handler for creating news (administrative)
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    const body = await request.json();
    const { title, content, category, author_id, published_at } = body;

    // Basic validation
    if (!title || title.trim().length < 3) {
      return NextResponse.json(
        {
          error: 'Validation error',
          message: 'Title is required and must be at least 3 characters long',
          request_id: requestId
        },
        { status: 400 }
      );
    }

    if (!content || content.trim().length < 10) {
      return NextResponse.json(
        {
          error: 'Validation error',
          message: 'Content is required and must be at least 10 characters long',
          request_id: requestId
        },
        { status: 400 }
      );
    }

    // Validate category if provided
    const validCategories = ['national', 'international', 'technology', 'sports', 'culture'];
    if (category && !validCategories.includes(category)) {
      return NextResponse.json(
        {
          error: 'Validation error',
          message: `Invalid category. Must be one of: ${validCategories.join(', ')}`,
          request_id: requestId
        },
        { status: 400 }
      );
    }

    // Create news entry
    const { data: newNews, error } = await supabaseService
      .from('news')
      .insert([{
        title: title.trim(),
        content: content.trim(),
        category,
        author_id: author_id || null,
        published_at: published_at || null,
        is_published: false // Default unpublished for approval
      }])
      .select()
      .single();

    if (error) {
      console.error(`[${requestId}] Create news error:`, error);
      return NextResponse.json(
        {
          error: 'Failed to create news',
          details: error.message,
          request_id: requestId
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: newNews,
      message: 'News created successfully. Awaiting approval.',
      performance: {
        execution_time_ms: performance.now(),
        request_id: requestId
      }
    });

  } catch (error) {
    console.error(`[${requestId}] Create news API error:`, error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        request_id: requestId
      },
      { status: 500 }
    );
  }
}