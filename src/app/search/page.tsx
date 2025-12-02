'use client'

import * as React from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"

import { SearchInput } from "@/components/search/SearchInput"
import { SearchFilters } from "@/components/search/SearchFilters"
import { SearchResults } from "@/components/search/SearchResults"
import { useDebouncedSearch } from "@/hooks/useDebounce"

interface NewsResult {
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

interface SearchPagination {
  page: number
  limit: number
  total_results: number
  total_pages: number
}

export default function SearchPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  // Initialize URL params
  const initialQuery = searchParams.get('query') || ''
  const initialCategory = searchParams.get('category') || ''
  const initialAuthor = searchParams.get('author') || ''
  const initialStartDate = searchParams.get('startDate') || ''
  const initialEndDate = searchParams.get('endDate') || ''
  const initialPage = parseInt(searchParams.get('page') || '1')

  // State management
  const [searchQuery, setSearchQuery] = React.useState(initialQuery)
  const [selectedCategory, setSelectedCategory] = React.useState(initialCategory || null)
  const [selectedAuthor, setSelectedAuthor] = React.useState(initialAuthor || null)
  const [dateRange, setDateRange] = React.useState({
    startDate: initialStartDate || null,
    endDate: initialEndDate || null
  })
  const [currentPage, setCurrentPage] = React.useState(initialPage)
  const [sortBy, setSortBy] = React.useState('relevance')

  // Debounced search hook
  const {
    searchQuery: debouncedQuery,
    isLoading,
    error,
    isSearchReady,
    clearSearch
  } = useDebouncedSearch(300, 2)

  // Search results state
  const [results, setResults] = React.useState<NewsResult[]>([])
  const [pagination, setPagination] = React.useState<SearchPagination | null>(null)

  // Available categories and authors (would come from API in real implementation)
  const categories = [
    { value: "national", label: "Nacional", count: 45 },
    { value: "international", label: "Internacional", count: 32 },
    { value: "technology", label: "Tecnología", count: 67 },
    { value: "sports", label: "Deportes", count: 23 },
    { value: "culture", label: "Cultura", count: 18 },
  ]

  const authors = [
    { value: "author1", label: "Juan Pérez", count: 25 },
    { value: "author2", label: "María García", count: 18 },
    { value: "author3", label: "Carlos López", count: 12 },
  ]

  // Update URL when parameters change
  React.useEffect(() => {
    const params = new URLSearchParams()

    if (searchQuery) params.set('query', searchQuery)
    if (selectedCategory) params.set('category', selectedCategory)
    if (selectedAuthor) params.set('author', selectedAuthor)
    if (dateRange.startDate) params.set('startDate', dateRange.startDate)
    if (dateRange.endDate) params.set('endDate', dateRange.endDate)
    if (currentPage > 1) params.set('page', currentPage.toString())

    const queryString = params.toString()
    const newUrl = pathname + (queryString ? `?${queryString}` : '')
    router.replace(newUrl)
  }, [searchQuery, selectedCategory, selectedAuthor, dateRange, currentPage, pathname, router])

  // Fetch search results when debounced query or filters change
  React.useEffect(() => {
    if (!isSearchReady && debouncedQuery.length > 0) {
      fetchSearchResults()
    } else if (debouncedQuery.length === 0) {
      // Clear results when query is empty
      setResults([])
      setPagination(null)
    }
  }, [debouncedQuery, selectedCategory, selectedAuthor, dateRange, sortBy, currentPage])

  const fetchSearchResults = async () => {
    try {
      const params = new URLSearchParams({
        q: debouncedQuery,
        page: currentPage.toString(),
        limit: '12',
      })

      if (selectedCategory) params.set('category', selectedCategory)
      if (selectedAuthor) params.set('author', selectedAuthor)
      if (dateRange.startDate) params.set('startDate', dateRange.startDate)
      if (dateRange.endDate) params.set('endDate', dateRange.endDate)
      if (sortBy) params.set('sort', sortBy)

      const response = await fetch(`/api/news/search?${params}`)

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        setResults(data.data)
        setPagination(data.pagination)
      } else {
        throw new Error(data.error || 'Failed to fetch results')
      }
    } catch (err) {
      console.error('Search error:', err)
      error instanceof Error || new Error('Error fetching search results')
    }
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setCurrentPage(1) // Reset to first page on new search
  }

  const handleCategoryChange = (category: string | null) => {
    setSelectedCategory(category)
    setCurrentPage(1) // Reset to first page when filter changes
  }

  const handleAuthorChange = (author: string | null) => {
    setSelectedAuthor(author)
    setCurrentPage(1) // Reset to first page when filter changes
  }

  const handleDateRangeChange = (startDate: string | null, endDate: string | null) => {
    setDateRange({ startDate, endDate })
    setCurrentPage(1) // Reset to first page when filter changes
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    // Scroll to top of page
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSortChange = (sort: string) => {
    setSortBy(sort)
  }

  const handleClearFilters = () => {
    setSelectedCategory(null)
    setSelectedAuthor(null)
    setDateRange({ startDate: null, endDate: null })
    setCurrentPage(1)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Búsqueda Avanzada
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Encuentre artículos relevantes con nuestro sistema de búsqueda full-text
          </p>
        </div>

        {/* Search Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <SearchFilters
              categories={categories}
              authors={authors}
              onCategoryChange={handleCategoryChange}
              onAuthorChange={handleAuthorChange}
              onDateRangeChange={handleDateRangeChange}
              selectedCategory={selectedCategory}
              selectedAuthor={selectedAuthor}
              dateRange={dateRange}
              collapsible={true}
              collapsed={false}
            />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Search Input */}
            <SearchInput
              onSearch={handleSearch}
              placeholder="Buscar noticias, tecnología, ciencia..."
              value={searchQuery}
              loading={isLoading}
              debounceMs={300}
              showClearButton={true}
              className="w-full"
            />

            {/* Clear Filters Button */}
            {(selectedCategory || selectedAuthor || dateRange.startDate || dateRange.endDate) && (
              <div className="flex justify-end">
                <button
                  onClick={handleClearFilters}
                  className="text-sm text-eset-red hover:text-red-700 font-medium"
                >
                  Limpiar todos los filtros
                </button>
              </div>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-eset-red"></div>
                <span className="ml-3 text-gray-600 dark:text-gray-400">Buscando...</span>
              </div>
            )}

            {/* Error State */}
            {error && !isLoading && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 dark:bg-red-900 dark:border-red-700">
                <h3 className="text-red-800 dark:text-red-200 font-medium">
                  Error en la búsqueda
                </h3>
                <p className="text-red-600 dark:text-red-400 text-sm mt-1">
                  {error.message}
                </p>
                <button
                  onClick={clearSearch}
                  className="mt-2 text-sm text-red-800 hover:text-red-900 font-medium dark:text-red-300 dark:hover:text-red-200"
                >
                  Limpiar búsqueda
                </button>
              </div>
            )}

            {/* Results */}
            {!isLoading && !error && (
              <SearchResults
                results={results}
                query={debouncedQuery}
                isLoading={isLoading}
                error={error}
                pagination={pagination}
                currentSort={sortBy}
                onSortChange={handleSortChange}
                onPageChange={handlePageChange}
                availableSorts={[
                  { value: 'relevance', label: 'Relevancia' },
                  { value: 'date', label: 'Fecha' },
                  { value: 'title', label: 'Título' },
                ]}
              />
            )}

            {/* Empty State */}
            {!isLoading && !error && debouncedQuery.length === 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-8 text-center dark:bg-gray-800 dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  ¿Qué busca hoy?
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Empiece a escribir para encontrar noticias relevantes sobre temas de su interés.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}