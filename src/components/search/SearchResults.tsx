import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Calendar, User, TrendingUp, Clock } from "lucide-react"

import { cn } from "@/lib/utils"

const searchResultsVariants = cva(
  "space-y-4",
  {
    variants: {
      variant: {
        default: "",
        compact: "space-y-2",
        modern: "space-y-6",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const resultItemVariants = cva(
  "block rounded-lg border border-gray-200 bg-white p-4 transition-all hover:shadow-md hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800",
  {
    variants: {
      variant: {
        default: "",
        compact: "p-3",
        modern: "p-5 shadow-sm",
      },
      size: {
        default: "",
        sm: "text-sm",
        lg: "text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

interface SearchResult {
  id: number
  title: string
  content: string
  category: string
  author: string
  published_at: string
  relevance_score: number
  highlighted_title: string
  highlighted_content: string
}

interface PaginationInfo {
  page: number
  limit: number
  total_results: number
  total_pages: number
}

interface SearchSortOption {
  value: string
  label: string
}

interface SearchResultsProps {
  results: SearchResult[]
  isLoading?: boolean
  error?: Error | null
  query?: string
  pagination?: PaginationInfo
  availableSorts?: SearchSortOption[]
  currentSort?: string
  variant?: VariantProps<typeof searchResultsVariants>["variant"]
  onPageChange?: (page: number) => void
  onSortChange?: (sort: string) => void
  className?: string
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

const formatRelevanceScore = (score: number): string => {
  return `${Math.round(score * 100)}% de relevancia`
}

const getCategoryColor = (category: string): string => {
  const colors: Record<string, string> = {
    national: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    international: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    technology: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    sports: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    culture: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  }
  return colors[category] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
}

const getCategoryLabel = (category: string): string => {
  const labels: Record<string, string> = {
    national: 'Nacional',
    international: 'Internacional',
    technology: 'Tecnología',
    sports: 'Deportes',
    culture: 'Cultura',
  }
  return labels[category] || category
}

const SearchResults = React.forwardRef<HTMLDivElement, SearchResultsProps>(
  ({
    className,
    results = [],
    isLoading = false,
    error = null,
    query = "",
    pagination,
    availableSorts = [
      { value: "relevance", label: "Relevancia" },
      { value: "date", label: "Fecha" },
      { value: "title", label: "Título" },
    ],
    currentSort = "relevance",
    variant = "default",
    onPageChange,
    onSortChange,
    ...props
  }, ref) => {
    const [sortBy, setSortBy] = React.useState(currentSort)

    React.useEffect(() => {
      setSortBy(currentSort)
    }, [currentSort])

    const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newSort = e.target.value
      setSortBy(newSort)
      onSortChange?.(newSort)
    }

    const handlePageChange = (page: number) => {
      if (page >= 1 && page <= (pagination?.total_pages || 1)) {
        onPageChange?.(page)
      }
    }

    const renderContent = () => {
      if (isLoading) {
        return (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-eset-red"></div>
            <p className="text-gray-600 dark:text-gray-400">Cargando resultados...</p>
          </div>
        )
      }

      if (error) {
        return (
          <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
            <div className="rounded-full bg-red-100 p-3 dark:bg-red-900">
              <TrendingUp className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-red-900 dark:text-red-100">
                Error en la búsqueda
              </h3>
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                {error.message}
              </p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 text-sm font-medium text-white bg-eset-red rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-eset-red"
            >
              Reintentar
            </button>
          </div>
        )
      }

      if (!query.trim()) {
        return (
          <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
            <div className="rounded-full bg-gray-100 p-3 dark:bg-gray-700">
              <Search className="h-6 w-6 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                Búsqueda avanzada
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Ingrese un término de búsqueda para comenzar
              </p>
            </div>
          </div>
        )
      }

      if (results.length === 0) {
        return (
          <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
            <div className="rounded-full bg-gray-100 p-3 dark:bg-gray-700">
              <Search className="h-6 w-6 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                No se encontraron resultados
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Intente con otros términos de búsqueda o refine sus filtros
              </p>
            </div>
          </div>
        )
      }

      return (
        <div className="space-y-6">
          {/* Header with query info and sorting */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Resultados de búsqueda
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Encontrados {results.length} resultados para "{query}"
              </p>
            </div>

            {availableSorts.length > 1 && (
              <div className="flex items-center gap-2">
                <label htmlFor="sort" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Ordenar por:
                </label>
                <select
                  id="sort"
                  value={sortBy}
                  onChange={handleSortChange}
                  className="block w-full rounded-md border-gray-300 bg-white py-2 pl-3 pr-10 text-sm focus:border-eset-red focus:outline-none focus:ring-eset-red dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  {availableSorts.map((sort) => (
                    <option key={sort.value} value={sort.value}>
                      {sort.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Results list */}
          <div className={cn(searchResultsVariants({ variant }), className)}>
            {results.map((result) => (
              <article
                key={result.id}
                className={cn(resultItemVariants({ variant, size: "default" }))}
                tabIndex={0}
              >
                {/* Header with title and relevance */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3
                      className="text-lg font-semibold text-gray-900 dark:text-gray-100 leading-tight"
                      dangerouslySetInnerHTML={{ __html: result.highlighted_title }}
                    />
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                        getCategoryColor(result.category)
                      )}>
                        {getCategoryLabel(result.category)}
                      </span>
                      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        {formatRelevanceScore(result.relevance_score)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Content with snippet */}
                <div className="mt-4">
                  <p
                    className="text-gray-700 dark:text-gray-300 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: result.highlighted_content }}
                  />
                </div>

                {/* Meta information */}
                <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <User className="h-4 w-4 mr-2" />
                    {result.author}
                  </div>
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <Calendar className="h-4 w-4 mr-2" />
                    {formatDate(result.published_at)}
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.total_pages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Página {pagination.page} de {pagination.total_pages}
                ({pagination.total_results} resultados)
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className={cn(
                    "px-3 py-2 text-sm font-medium rounded-md border",
                    pagination.page <= 1
                      ? "text-gray-400 border-gray-300 cursor-not-allowed dark:text-gray-500 dark:border-gray-600"
                      : "text-gray-700 border-gray-300 hover:bg-gray-50 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
                  )}
                >
                  Anterior
                </button>
                <span className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  {pagination.page}
                </span>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.total_pages}
                  className={cn(
                    "px-3 py-2 text-sm font-medium rounded-md border",
                    pagination.page >= pagination.total_pages
                      ? "text-gray-400 border-gray-300 cursor-not-allowed dark:text-gray-500 dark:border-gray-600"
                      : "text-gray-700 border-gray-300 hover:bg-gray-50 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
                  )}
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      )
    }

    return (
      <div ref={ref} className="w-full" {...props}>
        {renderContent()}
      </div>
    )
  }
)

SearchResults.displayName = "SearchResults"

export { SearchResults, searchResultsVariants }

// Icon imports that might be missing
import { Search } from "lucide-react"