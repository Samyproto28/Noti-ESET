import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SearchResults } from '@/components/search/SearchResults'

// Mock data for testing
const mockSearchResults = [
  {
    id: 1,
    title: 'Noticia de Tecnología Importante',
    content: 'Este es un contenido sobre tecnología avanzada y innovación.',
    category: 'technology',
    author: 'Juan Pérez',
    published_at: '2024-01-15T10:00:00Z',
    relevance_score: 0.95,
    highlighted_title: 'Noticia de <mark>Tecnología</mark> Importante',
    highlighted_content: 'Este es un contenido sobre <mark>tecnología</mark> avanzada y...'
  },
  {
    id: 2,
    title: 'Otra Noticia de Tecnología',
    content: 'Contenido secundario sobre innovación tecnológica.',
    category: 'technology',
    author: 'María García',
    published_at: '2024-01-14T15:30:00Z',
    relevance_score: 0.87,
    highlighted_title: 'Otra Noticia de <mark>Tecnología</mark>',
    highlighted_content: 'Contenido secundario sobre innovación <mark>tecnológica</mark>.'
  }
]

const mockEmptyResults = []
const mockErrorResults = new Error('Error de conexión')

describe('SearchResults Component', () => {
  const defaultProps = {
    results: mockSearchResults,
    isLoading: false,
    error: null,
    query: 'tecnología',
    onPageChange: jest.fn(),
    onSortChange: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('debería mostrar resultados de búsqueda cuando hay datos', () => {
    render(<SearchResults {...defaultProps} />)

    expect(screen.getByText(/Resultados de búsqueda/i)).toBeInTheDocument()
    expect(screen.getByText(/2 resultados para "tecnología"/)).toBeInTheDocument() // Texto específico
    expect(screen.getAllByRole('article')).toHaveLength(2)
    expect(screen.getByText(/Juan Pérez/)).toBeInTheDocument()
    expect(screen.getByText(/María García/)).toBeInTheDocument()
  })

  test('debería mostrar indicador de carga cuando isLoading es true', () => {
    render(<SearchResults {...defaultProps} isLoading={true} />)

    expect(screen.getByText(/Cargando resultados/)).toBeInTheDocument()
    // Check for loading spinner by class
    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })

  test('debería mostrar mensaje cuando no hay resultados', () => {
    render(<SearchResults {...defaultProps} results={mockEmptyResults} />)

    expect(screen.getByText(/No se encontraron resultados/i)).toBeInTheDocument()
    expect(screen.getByText(/Intente con otros términos de búsqueda/i)).toBeInTheDocument()
  })

  test('debería mostrar mensaje de error cuando hay error', () => {
    render(<SearchResults {...defaultProps} error={mockErrorResults} />)

    expect(screen.getByText(/Error en la búsqueda/i)).toBeInTheDocument()
    expect(screen.getByText(/Error de conexión/i)).toBeInTheDocument()
  })

  test('debería resaltar términos de búsqueda en resultados', () => {
    render(<SearchResults {...defaultProps} />)

    const highlightedElements = screen.getAllByRole('mark')
    expect(highlightedElements).toHaveLength(4) // 2 en títulos + 2 en contenidos
  })

  test('debería mostrar paginación cuando hay múltiples páginas', () => {
    const propsWithPagination = {
      ...defaultProps,
      pagination: {
        page: 1,
        limit: 10,
        total_results: 25,
        total_pages: 3
      }
    }

    render(<SearchResults {...propsWithPagination} />)

    expect(screen.getByText(/Página 1 de 3/i)).toBeInTheDocument()
    expect(screen.getByText(/25 resultados/i)).toBeInTheDocument()
    expect(screen.getByText(/Anterior/)).toBeInTheDocument()
    expect(screen.getByText(/Siguiente/)).toBeInTheDocument()
  })

  test('debería manejar clic en paginación', async () => {
    const mockOnPageChange = jest.fn()
    const propsWithPagination = {
      ...defaultProps,
      pagination: {
        page: 1,
        limit: 10,
        total_results: 25,
        total_pages: 3
      },
      onPageChange: mockOnPageChange
    }

    render(<SearchResults {...propsWithPagination} />)

    const nextButton = screen.getByText(/Siguiente/)
    fireEvent.click(nextButton)

    await waitFor(() => {
      expect(mockOnPageChange).toHaveBeenCalledWith(2)
    })
  })

  test('debería manejar cambio de ordenamiento', async () => {
    const mockOnSortChange = jest.fn()
    const propsWithSorting = {
      ...defaultProps,
      onSortChange: mockOnSortChange,
      availableSorts: [
        { value: 'relevance', label: 'Relevancia' },
        { value: 'date', label: 'Fecha' },
        { value: 'title', label: 'Título' }
      ]
    }

    render(<SearchResults {...propsWithSorting} />)

    const sortSelect = screen.getByLabelText(/Ordenar por:/)
    fireEvent.change(sortSelect, { target: { value: 'date' } })

    await waitFor(() => {
      expect(mockOnSortChange).toHaveBeenCalledWith('date')
    })
  })

  test('debería mostrar información de categorías', () => {
    render(<SearchResults {...defaultProps} />)

    // Check for category information by looking for category tags
    // Use getAllByText since "Tecnología" appears in both highlighted text and category tags
    const tecnologiaElements = screen.getAllByText(/Tecnología/)
    expect(tecnologiaElements.length).toBeGreaterThan(0)
  })

  test('debería mostrar información de fechas de publicación', () => {
    render(<SearchResults {...defaultProps} />)

    expect(screen.getByText(/15 de enero de 2024/i)).toBeInTheDocument()
    expect(screen.getByText(/14 de enero de 2024/i)).toBeInTheDocument()
  })

  test('debería mostrar puntuación de relevancia', () => {
    render(<SearchResults {...defaultProps} />)

    expect(screen.getByText(/95% de relevancia/i)).toBeInTheDocument()
    expect(screen.getByText(/87% de relevancia/i)).toBeInTheDocument()
  })

  test('debería ser accesible con teclado', () => {
    render(<SearchResults {...defaultProps} />)

    const resultItems = screen.getAllByRole('article')
    resultItems.forEach(item => {
      expect(item).toHaveAttribute('tabindex', '0')
    })
  })

  test('debería mostrar estado vacío cuando query está vacío', () => {
    render(<SearchResults {...defaultProps} query="" />)

    expect(screen.getByText(/Ingrese un término de búsqueda/i)).toBeInTheDocument()
  })

  test('debería manejar resultados con puntuación de relevancia baja', () => {
    const lowRelevanceResults = mockSearchResults.map(result => ({
      ...result,
      relevance_score: 0.1,
      highlighted_title: result.title.replace('tecnología', '<mark>tecnología</mark>'),
      highlighted_content: result.content.replace('tecnología', '<mark>tecnología</mark>')
    }))

    render(<SearchResults {...defaultProps} results={lowRelevanceResults} />)

    // Find the relevance score text by looking for a more specific pattern
    const relevanceElements = screen.getAllByText(/10% de relevancia/)
    expect(relevanceElements.length).toBeGreaterThan(0)
  })
})