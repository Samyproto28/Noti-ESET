import { useEffect, useRef, useState } from 'react';

interface DebouncedOptions {
  delay?: number;
  leading?: boolean;
  trailing?: boolean;
}

/**
 * Hook personalizado para manejar debounce en valores
 * @param value El valor a debounce
 * @param options Opciones de configuración
 * @returns El valor debounceado
 */
export function useDebounce<T>(
  value: T,
  { delay = 300, leading = false, trailing = true }: DebouncedOptions = {}
): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const latestValueRef = useRef<T>(value);

  // Actualizar el valor más reciente
  useEffect(() => {
    latestValueRef.current = value;
  }, [value]);

  useEffect(() => {
    // Función para ejecutar el debounced callback
    const execute = () => {
      setDebouncedValue(latestValueRef.current);
    };

    // Si leading está habilitado y no hay timeout, ejecutar inmediatamente
    if (leading && !timeoutRef.current) {
      execute();
    }

    // Limpiar el timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Configurar nuevo timeout si trailing está habilitado
    if (trailing) {
      timeoutRef.current = setTimeout(execute, delay);
    }

    // Limpiar timeout al desmontar o cuando cambie
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay, leading, trailing]);

  return debouncedValue;
}

/**
 * Hook para manejar búsqueda con debouncing y request cancellation
 */
export function useDebouncedSearch(
  initialDelay: number = 300,
  minQueryLength: number = 2
) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Debounced search query
  const debouncedValue = useDebounce(searchQuery, { delay: initialDelay });

  // Effect para manejar el cambio de la query debounceada
  useEffect(() => {
    if (debouncedValue.length >= minQueryLength || debouncedValue.length === 0) {
      setDebouncedQuery(debouncedValue);
    }
  }, [debouncedValue, minQueryLength]);

  // Effect para ejecutar búsqueda cuando la query debounceada cambia
  useEffect(() => {
    // Cancelar búsqueda anterior si existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Limpiar estados de error
    setError(null);

    // Si la consulta es demasiado corta, cancelar y resetear
    if (debouncedQuery.length > 0 && debouncedQuery.length < minQueryLength) {
      return;
    }

    // Ejecutar búsqueda
    const executeSearch = async () => {
      try {
        // Crear nuevo AbortController
        abortControllerRef.current = new AbortController();

        setIsLoading(true);

        // Solo ejecutar si hay una consulta válida
        if (debouncedQuery.length >= minQueryLength) {
          const params = new URLSearchParams({
            q: debouncedQuery,
            limit: '20',
            page: '1'
          });

          const response = await fetch(`/api/news/search?${params}`, {
            signal: abortControllerRef.current.signal
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const result = await response.json();

          if (!result.success) {
            throw new Error(result.error || 'Search failed');
          }

          // Aquí podrías emitir un evento o actualizar un contexto
          // Por ahora, solo actualizaremos el estado global a través del componente padre
          return result;
        }

        return null;
      } catch (err) {
        // Ignorar errores si la solicitud fue cancelada
        if (err instanceof Error && err.name === 'AbortError') {
          return null;
        }

        setError(err instanceof Error ? err.message : 'Search failed');
        return null;
      } finally {
        setIsLoading(false);
      }
    };

    executeSearch();

    // Limpiar al desmontar
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [debouncedQuery, minQueryLength]);

  return {
    searchQuery,
    setSearchQuery,
    debouncedQuery,
    isLoading,
    error,
    isSearchReady: debouncedQuery.length >= minQueryLength,
    clearSearch: () => {
      setSearchQuery('');
      setError(null);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    }
  };
}