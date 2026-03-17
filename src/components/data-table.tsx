import { useMemo, useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  type ColumnDef,
  type RowData,
  type SortingState,
  type Table,
  type Cell,
} from '@tanstack/react-table'
import { ChevronLeft, ChevronRight, ChevronsUpDown, ChevronUp, ChevronDown, Download, FileSpreadsheet, Search } from 'lucide-react'
import * as XLSX from 'xlsx'

export { createColumnHelper }
export type { ColumnDef }

// ── Meta type augmentation ─────────────────────────────────────────────
declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Returns plain-text value for export. Required for display/JSX columns. */
    exportValue?: (row: TData) => string
    /** Skip this column in exports entirely (e.g. action buttons). */
    noExport?: boolean
  }
}

// ── Export helpers ─────────────────────────────────────────────────────
function getCellExportText<T extends RowData>(cell: Cell<T, unknown>): string {
  const meta = cell.column.columnDef.meta
  if (meta?.noExport) return ''
  if (meta?.exportValue) return meta.exportValue(cell.row.original)
  const val = cell.getValue()
  if (val === null || val === undefined) return ''
  if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') return String(val)
  return ''
}

function buildExportData<T extends RowData>(table: Table<T>) {
  const visibleCols = table.getAllLeafColumns().filter(
    (col) => col.getIsVisible() && !col.columnDef.meta?.noExport,
  )
  const headers = visibleCols.map((col) => {
    const h = col.columnDef.header
    return typeof h === 'string' ? h : col.id
  })
  const rows = table.getFilteredRowModel().rows.map((row) =>
    row.getVisibleCells()
      .filter((cell) => !cell.column.columnDef.meta?.noExport)
      .map((cell) => getCellExportText(cell)),
  )
  return { headers, rows }
}

function exportCsv<T extends RowData>(table: Table<T>, filename: string) {
  const { headers, rows } = buildExportData(table)
  const lines = [headers, ...rows].map((row) =>
    row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','),
  )
  const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  triggerDownload(blob, `${filename}.csv`)
}

function exportExcel<T extends RowData>(table: Table<T>, filename: string) {
  const { headers, rows } = buildExportData(table)
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Veri')
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ── Component ──────────────────────────────────────────────────────────
interface DataTableProps<T extends RowData> {
  data: T[]
  columns: ColumnDef<T, any>[]
  filename?: string
  searchPlaceholder?: string
  defaultPageSize?: number
  onRowClick?: (row: T) => void
  getRowId?: (row: T, index: number) => string
  selectedRowId?: string | null
  rowClassName?: (row: T) => string
  noDataMessage?: string
}

export function DataTable<T extends RowData>({
  data,
  columns,
  filename = 'export',
  searchPlaceholder = 'Tabloda ara...',
  defaultPageSize = 20,
  onRowClick,
  getRowId,
  selectedRowId,
  rowClassName,
  noDataMessage = 'Kayit bulunamadi.',
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: defaultPageSize })

  const paginationMemo = useMemo(() => pagination, [pagination])

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter, pagination: paginationMemo },
    onSortingChange: setSorting,
    onGlobalFilterChange: (val) => {
      setGlobalFilter(val)
      setPagination((p) => ({ ...p, pageIndex: 0 }))
    },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId,
    autoResetPageIndex: false,
  })

  const totalFiltered = table.getFilteredRowModel().rows.length
  const pageCount = table.getPageCount()
  const currentPage = pagination.pageIndex

  return (
    <div className="dt-root">
      {/* Toolbar */}
      <div className="dt-toolbar">
        <div className="dt-search-wrap">
          <Search size={14} className="dt-search-icon" />
          <input
            className="dt-search-input"
            value={globalFilter}
            onChange={(e) => table.setGlobalFilter(e.target.value)}
            placeholder={searchPlaceholder}
          />
          {globalFilter && (
            <button
              type="button"
              className="dt-search-clear"
              onClick={() => table.setGlobalFilter('')}
              aria-label="Aramayı temizle"
            >
              ×
            </button>
          )}
        </div>
        <div className="dt-toolbar-actions">
          <button
            type="button"
            className="button button--secondary button--sm"
            onClick={() => exportCsv(table, filename)}
            title="CSV olarak indir"
          >
            <Download size={13} />
            CSV
          </button>
          <button
            type="button"
            className="button button--secondary button--sm"
            onClick={() => exportExcel(table, filename)}
            title="Excel olarak indir"
          >
            <FileSpreadsheet size={13} />
            Excel
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="table-shell dt-table-shell">
        <table className="data-table">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => {
                  const canSort = header.column.getCanSort()
                  const sorted = header.column.getIsSorted()
                  return (
                    <th
                      key={header.id}
                      className={canSort ? 'dt-th--sortable' : undefined}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                      aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : undefined}
                    >
                      <span className="dt-th-inner">
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort && (
                          <span className="dt-sort-icon">
                            {sorted === 'asc' ? (
                              <ChevronUp size={11} />
                            ) : sorted === 'desc' ? (
                              <ChevronDown size={11} />
                            ) : (
                              <ChevronsUpDown size={11} className="dt-sort-icon--neutral" />
                            )}
                          </span>
                        )}
                      </span>
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}
                >
                  {globalFilter
                    ? `"${globalFilter}" için sonuç bulunamadi.`
                    : noDataMessage}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => {
                const rowId = row.id
                const isSelected = selectedRowId !== undefined && selectedRowId !== null && selectedRowId === rowId
                const extraClass = rowClassName?.(row.original) ?? ''
                return (
                  <tr
                    key={rowId}
                    className={[
                      'data-table__row',
                      isSelected ? 'data-table__row--selected' : '',
                      extraClass,
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => onRowClick?.(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="dt-footer">
        <span className="dt-count">
          {globalFilter
            ? `${totalFiltered} / ${data.length} kayit`
            : `${totalFiltered} kayit`}
        </span>

        {pageCount > 1 && (
          <div className="dt-pagination">
            <button
              type="button"
              className="dt-page-btn"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
              aria-label="Önceki sayfa"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="dt-page-info">
              {currentPage + 1} / {pageCount}
            </span>
            <button
              type="button"
              className="dt-page-btn"
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
              aria-label="Sonraki sayfa"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}

        <select
          className="dt-page-size-select"
          value={pagination.pageSize}
          onChange={(e) =>
            setPagination({ pageIndex: 0, pageSize: Number(e.target.value) })
          }
          aria-label="Sayfa başı kayıt"
        >
          {[10, 20, 50, 100].map((n) => (
            <option key={n} value={n}>
              {n} / sayfa
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
