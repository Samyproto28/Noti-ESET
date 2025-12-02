import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { ChevronDown, ChevronUp, Calendar, User } from "lucide-react"

import { cn } from "@/lib/utils"

const filterVariants = cva(
  "space-y-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800",
  {
    variants: {
      variant: {
        default: "",
        compact: "p-3",
        minimal: "p-2 border-0",
      },
      size: {
        default: "w-full",
        sm: "w-80",
        lg: "w-96",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const filterSectionVariants = cva(
  "space-y-2",
  {
    variants: {
      variant: {
        default: "",
        compact: "space-y-1",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

interface FilterOption {
  value: string
  label: string
  count?: number
}

interface SearchFiltersProps {
  className?: string
  categories?: FilterOption[]
  authors?: FilterOption[]
  onCategoryChange?: (category: string | null) => void
  onAuthorChange?: (author: string | null) => void
  onDateRangeChange?: (startDate: string | null, endDate: string | null) => void
  selectedCategory?: string | null
  selectedAuthor?: string | null
  dateRange?: { startDate: string | null; endDate: string | null }
  variant?: VariantProps<typeof filterVariants>["variant"]
  size?: VariantProps<typeof filterVariants>["size"]
  collapsible?: boolean
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
}

const SearchFilters = React.forwardRef<HTMLDivElement, SearchFiltersProps>(
  ({
    className,
    categories = [
      { value: "national", label: "Nacional", count: 45 },
      { value: "international", label: "Internacional", count: 32 },
      { value: "technology", label: "Tecnología", count: 67 },
      { value: "sports", label: "Deportes", count: 23 },
      { value: "culture", label: "Cultura", count: 18 },
    ],
    authors = [],
    onCategoryChange,
    onAuthorChange,
    onDateRangeChange,
    selectedCategory,
    selectedAuthor,
    dateRange = { startDate: null, endDate: null },
    variant = "default",
    size = "default",
    collapsible = true,
    collapsed = false,
    onCollapsedChange,
    ...props
  }, ref) => {
    const [isCollapsed, setIsCollapsed] = React.useState(collapsed)

    React.useEffect(() => {
      setIsCollapsed(collapsed)
    }, [collapsed])

    const toggleCollapsed = () => {
      const newCollapsed = !isCollapsed
      setIsCollapsed(newCollapsed)
      if (onCollapsedChange) {
        onCollapsedChange(newCollapsed)
      }
    }

    const handleCategoryChange = (value: string) => {
      const newValue = selectedCategory === value ? null : value
      onCategoryChange?.(newValue)
    }

    const handleAuthorChange = (value: string) => {
      const newValue = selectedAuthor === value ? null : value
      onAuthorChange?.(newValue)
    }

    const handleDateChange = (type: 'start' | 'end', value: string) => {
      const newDateRange = {
        ...dateRange,
        [`${type}Date`]: value || null
      }
      onDateRangeChange?.(newDateRange.startDate, newDateRange.endDate)
    }

    return (
      <div
        ref={ref}
        className={cn(filterVariants({ variant, size }), className)}
        {...props}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Filtros de Búsqueda
          </h3>
          {collapsible && (
            <button
              type="button"
              onClick={toggleCollapsed}
              className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-gray-700 dark:hover:text-gray-300"
              aria-label={isCollapsed ? "Expandir filtros" : "Colapsar filtros"}
            >
              {isCollapsed ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </button>
          )}
        </div>

        {/* Filter sections */}
        {!isCollapsed && (
          <div className="space-y-4">
            {/* Category filter */}
            <div className={cn(filterSectionVariants({ variant }))}>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Categoría
              </label>
              <div className="space-y-1">
                {categories.map((category) => (
                  <div key={category.value} className="flex items-center">
                    <input
                      type="radio"
                      id={`category-${category.value}`}
                      name="category"
                      value={category.value}
                      checked={selectedCategory === category.value}
                      onChange={() => handleCategoryChange(category.value)}
                      className="h-4 w-4 border-gray-300 text-eset-red focus:ring-eset-red"
                    />
                    <label
                      htmlFor={`category-${category.value}`}
                      className="ml-2 flex-1 text-sm text-gray-700 dark:text-gray-300"
                    >
                      {category.label}
                      {category.count !== undefined && (
                        <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
                          ({category.count})
                        </span>
                      )}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Author filter */}
            {authors.length > 0 && (
              <div className={cn(filterSectionVariants({ variant }))}>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Autor
                </label>
                <select
                  value={selectedAuthor || ""}
                  onChange={(e) => handleAuthorChange(e.target.value || null)}
                  className="block w-full rounded-md border-gray-300 bg-white py-2 pl-3 pr-10 text-sm focus:border-eset-red focus:outline-none focus:ring-eset-red dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Todos los autores</option>
                  {authors.map((author) => (
                    <option key={author.value} value={author.value}>
                      {author.label}
                      {author.count !== undefined && (
                        <span className="text-xs text-gray-500">
                          ({author.count})
                        </span>
                      )}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Date range filter */}
            <div className={cn(filterSectionVariants({ variant }))}>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                <Calendar className="mr-2 h-4 w-4" />
                Rango de Fechas
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="start-date" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Desde
                  </label>
                  <input
                    type="date"
                    id="start-date"
                    value={dateRange.startDate || ""}
                    onChange={(e) => handleDateChange('start', e.target.value)}
                    className="block w-full rounded-md border-gray-300 bg-white py-2 px-3 text-sm focus:border-eset-red focus:outline-none focus:ring-eset-red dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label htmlFor="end-date" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Hasta
                  </label>
                  <input
                    type="date"
                    id="end-date"
                    value={dateRange.endDate || ""}
                    onChange={(e) => handleDateChange('end', e.target.value)}
                    className="block w-full rounded-md border-gray-300 bg-white py-2 px-3 text-sm focus:border-eset-red focus:outline-none focus:ring-eset-red dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Clear filters button */}
            <div className="flex justify-end pt-2 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => {
                  onCategoryChange?.(null)
                  onAuthorChange?.(null)
                  onDateRangeChange?.(null, null)
                }}
                className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                Limpiar todos los filtros
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }
)

SearchFilters.displayName = "SearchFilters"

export { SearchFilters, filterVariants }