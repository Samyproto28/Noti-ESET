import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2, Search, X } from "lucide-react"

import { cn } from "@/lib/utils"

const searchInputVariants = cva(
  "flex w-full items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-eset-red focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400 dark:focus:ring-eset-red",
  {
    variants: {
      variant: {
        default: "",
        search: "pl-10",
        modern: "rounded-lg border-0 shadow-sm focus:ring-2 focus:ring-eset-red",
        compact: "h-9 rounded-md px-2 text-sm",
      },
      size: {
        default: "h-10 px-3 py-2",
        sm: "h-9 px-2 py-1",
        lg: "h-12 px-4 py-3",
      },
      state: {
        default: "",
        loading: "cursor-not-allowed opacity-70",
        error: "border-red-500 focus:ring-red-500 dark:border-red-400 dark:focus:ring-red-400",
        success: "border-green-500 focus:ring-green-500 dark:border-green-400 dark:focus:ring-green-400",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      state: "default",
    },
  }
)

export interface SearchInputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof searchInputVariants> {
  onSearch?: (query: string) => void
  onClear?: () => void
  loading?: boolean
  debounceMs?: number
  debounceEnabled?: boolean
  showClearButton?: boolean
  iconPosition?: "left" | "right"
  helperText?: string
  errorText?: string
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({
    className,
    variant,
    size,
    state,
    onSearch,
    onClear,
    loading = false,
    debounceMs = 300,
    debounceEnabled = true,
    showClearButton = true,
    iconPosition = "left",
    helperText,
    errorText,
    value: controlledValue,
    onChange,
    ...props
  }, ref) => {
    const [value, setValue] = React.useState(controlledValue || "")
    const [isDebouncing, setIsDebouncing] = React.useState(false)

    const isControlled = controlledValue !== undefined
    const currentValue = isControlled ? controlledValue : value

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value
      setValue(newValue)

      if (onChange) {
        onChange(e)
      }

      // Handle search with debounce
      if (debounceEnabled && onSearch) {
        setIsDebouncing(true)
        clearTimeout((window as any).searchTimeout)

        (window as any).searchTimeout = setTimeout(() => {
          setIsDebouncing(false)
          if (newValue.trim()) {
            onSearch(newValue.trim())
          }
        }, debounceMs)
      }
    }

    const handleClear = () => {
      setValue("")
      if (onChange) {
        const e = {
          target: { value: "" }
        } as React.ChangeEvent<HTMLInputElement>
        onChange(e)
      }
      if (onClear) {
        onClear()
      }
    }

    const handleSearch = () => {
      if (currentValue.trim() && onSearch) {
        onSearch(currentValue.trim())
      }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && onSearch) {
        e.preventDefault()
        handleSearch()
      }
      if (e.key === "Escape") {
        handleClear()
      }
    }

    // Apply loading state to debouncing
    const finalState = isDebouncing ? "loading" : state

    return (
      <div className="flex flex-col space-y-1">
        <div className="relative flex items-center">
          {/* Left icon */}
          {iconPosition === "left" && (
            <div className="absolute left-3 text-gray-400">
              {isDebouncing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </div>
          )}

          {/* Main input */}
          <input
            ref={ref}
            type="text"
            value={currentValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={props.placeholder || "Buscar artículos..."}
            className={cn(
              searchInputVariants({ variant, size, state: finalState }),
              iconPosition === "left" && variant === "search" && "pl-10",
              iconPosition === "right" && "pr-10"
            )}
            {...props}
          />

          {/* Right side: Clear button or Loading icon */}
          <div className="absolute right-3 flex items-center space-x-1">
            {/* Clear button */}
            {showClearButton && currentValue && (
              <button
                type="button"
                onClick={handleClear}
                className="text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300 dark:focus:text-gray-300"
                aria-label="Limpiar búsqueda"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            {/* Right icon or Loading */}
            {iconPosition === "right" && (
              <>
                {loading && (
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                )}
                {!loading && !currentValue && (
                  <Search className="h-4 w-4 text-gray-400" />
                )}
              </>
            )}
          </div>
        </div>

        {/* Helper text or error */}
        {(helperText || errorText) && (
          <div className="text-sm">
            {errorText ? (
              <p className="text-red-600 dark:text-red-400">{errorText}</p>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">{helperText}</p>
            )}
          </div>
        )}
      </div>
    )
  }
)

SearchInput.displayName = "SearchInput"

export { SearchInput, searchInputVariants }