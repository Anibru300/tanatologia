import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ReactNode, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { SkeletonRows } from '@/components/ui/Skeleton'

interface Column<T> {
  header: ReactNode
  render: (row: T) => ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  keyOf: (row: T) => string
  loading?: boolean
  pageSize?: number
  emptyMessage?: string
  caption?: string
}

/** Tabla de datos del sistema: estilos consistentes, hover de fila,
 *  estado de carga con skeleton y paginación del lado del cliente. */
export function DataTable<T>({
  columns,
  rows,
  keyOf,
  loading = false,
  pageSize = 10,
  emptyMessage = 'No hay registros.',
  caption,
}: DataTableProps<T>) {
  const [page, setPage] = useState(0)

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize))
  const safePage = Math.min(page, pageCount - 1)

  const pageRows = useMemo(
    () => rows.slice(safePage * pageSize, safePage * pageSize + pageSize),
    [rows, safePage, pageSize]
  )

  if (loading) return <SkeletonRows />

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr className="border-b border-border">
              {columns.map((col, i) => (
                <th key={i} className={cn('text-left py-3 px-4 text-sm font-medium text-text-light', col.className)}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => (
              <tr key={keyOf(row)} className="border-b border-border last:border-0 hover:bg-bg-alt/50 transition-colors">
                {columns.map((col, i) => (
                  <td key={i} className={cn('py-4 px-4', col.className)}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="py-8 px-4 text-center text-text-light">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-between pt-4 px-2">
          <p className="text-sm text-text-light">
            Página {safePage + 1} de {pageCount} · {rows.length} registros
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              aria-label="Página anterior"
              disabled={safePage === 0}
              onClick={() => setPage(safePage - 1)}
            >
              <ChevronLeft size={16} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              aria-label="Página siguiente"
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage(safePage + 1)}
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
