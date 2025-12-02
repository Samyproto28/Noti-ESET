import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SearchPage } from '@/app/search/page'
import { useRouter } from 'next/navigation'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock components
jest.mock('@/components/search/SearchInput', () => ({
  SearchInput: ({ onSearch, ...props }: any) => (
    <input
      data-testid="search-input"
      onChange={(e) => onSearch?.(e.target.value)}
      {...props}
    />
  ),
}))

jest.mock('@/components/search/SearchFilters', () => ({
  SearchFilters: ({ onCategoryChange, onAuthorChange, onDateRangeChange, ...props }: any) => (
    <div data-testid="search-filters">
      <button
        data-testid="category-filter"
        onClick={() => onCategoryChange?.('technology')}
      >
        Category Filter
      </button>
      <button
        data-testid="author-filter"
        onClick={() => onAuthorChange?.('author1')}
      >
        Author Filter
      </button>
      <button
        data-testid="date-filter"
        onClick={() => onDateRangeChange?.('2024-01-01', '2024-01-31')}
      >
        Date Filter
      </button>
    </div>
  ),
}))

jest.mock('@/components/search/SearchResults', () => ({
  SearchResults: ({ results, query, ...props }: any) => (
    <div data-testid="search-results">
      {query && <div data-testid="search-query">{query}</div>}
      {results?.map((result: any) => (
        <div key={result.id} data-testid="search-result">
          <h3>{result.title}</h3>
          <p>{result.content}</p>
        </div>
      ))}
    </div>
  ),
}))

describe('Search Page', () => {
  const mockPush = jest.fn()
  const mockReplace = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      replace: mockReplace,
      pathname: '/search',
      query: {},
    })
  })

  test('debería renderizar componente de búsqueda', () => {
    // Mock data for results
    const mockResults = [
      {
        id: 1,
        title: 'Noticia 1',
        content: 'Contenido 1',
        category: 'technology',
        author: 'author1',
        published_at: '2024-01-01T00:00:00Z',
        relevance_score: 0.95,
        highlighted_title: 'Noticia 1',
        highlighted_content: 'Contenido 1'
      }
    ]

    // Mock the fetch response
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: mockResults,
        pagination: {
          page: 1,
          limit: 12,
          total_results: 1,
          total_pages: 1
        }
      })
    })

    render(<SearchPage />)

    // Initially we should have basic elements
    expect(screen.getByTestId('search-input')).toBeInTheDocument()
    expect(screen.getByTestId('search-filters')).toBeInTheDocument()
  })

  test('debería manejar búsqueda básica', async () => {
    render(<SearchPage />)

    const searchInput = screen.getByTestId('search-input')
    fireEvent.change(searchInput, { target: { value: 'tecnología' } })

    await waitFor(() => {
      expect(screen.getByTestId('search-query')).toHaveTextContent('tecnología')
    })
  })

  test('debería manejo filtros de categoría', async () => {
    render(<SearchPage />)

    const categoryFilter = screen.getByTestId('category-filter')
    fireEvent.click(categoryFilter)

    await waitFor(() => {
      expect(screen.getByTestId('search-query')).toHaveTextContent('category=technology')
    })
  })

  test('debería manejar filtros de autor', async () => {
    render(<SearchPage />)

    const authorFilter = screen.getByTestId('author-filter')
    fireEvent.click(authorFilter)

    await waitFor(() => {
      expect(screen.getByTestId('search-query')).toHaveTextContent('author=author1')
    })
  })

  test('debería manejar filtros de fecha', async () => {
    render(<SearchPage />)

    const dateFilter = screen.getByTestId('date-filter')
    fireEvent.click(dateFilter)

    await waitFor(() => {
      expect(screen.getByTestId('search-query')).toHaveTextContent('startDate=2024-01-01')
      expect(screen.getByTestId('search-query')).toHaveTextContent('endDate=2024-01-31')
    })
  })

  test('debería combinar búsqueda con filtros', async () => {
    render(<SearchPage />)

    const searchInput = screen.getByTestId('search-input')
    fireEvent.change(searchInput, { target: { value: 'innovación' } })

    const categoryFilter = screen.getByTestId('category-filter')
    fireEvent.click(categoryFilter)

    await waitFor(() => {
      expect(screen.getByTestId('search-query')).toHaveTextContent('query=innovación')
      expect(screen.getByTestId('search-query')).toHaveTextContent('category=technology')
    })
  })

  test('debería mostrar resultados con highlighting', async () => {
    render(<SearchPage />)

    const searchInput = screen.getByTestId('search-input')
    fireEvent.change(searchInput, { target: { value: 'tecnología' } })

    await waitFor(() => {
      const results = screen.getAllByTestId('search-result')
      expect(results).toHaveLength(2) // Mocked results count

      // Check if results contain highlighted terms
      results.forEach(result => {
        expect(result.innerHTML).toContain('<mark>')
      })
    })
  })

  test('debería manejar estado de carga', () => {
    // Mock component to show loading state
    jest.mock('@/components/search/SearchResults', () => ({
      SearchResults: ({ isLoading, ...props }: any) => (
        <div data-testid="search-results">
          {isLoading && <div data-testid="loading-indicator">Cargando...</div>}
        </div>
      ),
    }))

    render(<SearchPage />)

    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument()
  })

  test('debería manejar estado vacío', async () => {
    render(<SearchPage />)

    const searchInput = screen.getByTestId('search-input')
    fireEvent.change(searchInput, { target: { value: 'xyz123' } })

    await waitFor(() => {
      expect(screen.getByText('No se encontraron resultados')).toBeInTheDocument()
    })
  })

  test('debería manejar errores de búsqueda', async () => {
    // Mock component to show error state
    jest.mock('@/components/search/SearchResults', () => ({
      SearchResults: ({ error, ...props }: any) => (
        <div data-testid="search-results">
          {error && <div data-testid="error-message">Error: {error.message}</div>}
        </div>
      ),
    }))

    render(<SearchPage />)

    expect(screen.getByTestId('error-message')).toBeInTheDocument()
  })

  test('debería ser accesible con teclado', () => {
    render(<SearchPage />)

    const searchInput = screen.getByTestId('search-input')

    // Test keyboard navigation
    fireEvent.keyDown(searchInput, { key: 'Enter' })
    fireEvent.keyDown(searchInput, { key: 'Escape' })

    // Should not crash
    expect(searchInput).toBeInTheDocument()
  })

  test('debería mantener URL actualizada', async () => {
    render(<SearchPage />)

    const searchInput = screen.getByTestId('search-input')
    fireEvent.change(searchInput, { target: { value: 'seguridad' } })

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(
        expect.stringContaining('query=seguridad')
      )
    })
  })

  test('debería limpiar filtros correctamente', async () => {
    render(<SearchPage />)

    // Set some filters
    const categoryFilter = screen.getByTestId('category-filter')
    fireEvent.click(categoryFilter)

    // Clear filters
    const clearButton = screen.getByText('Limpiar todos los filtros')
    fireEvent.click(clearButton)

    await waitFor(() => {
      expect(screen.getByTestId('search-query')).not.toContain('category=')
    })
  })

  test('debería manejar paginación', async () => {
    render(<SearchPage />)

    const searchInput = screen.getByTestId('search-input')
    fireEvent.change(searchInput, { target: { value: 'prueba' } })

    await waitFor(() => {
      const nextButton = screen.getByText('Siguiente')
      expect(nextButton).toBeInTheDocument()

      fireEvent.click(nextButton)
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining('page=2')
      )
    })
  })
})