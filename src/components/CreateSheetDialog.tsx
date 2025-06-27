
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Upload, FileSpreadsheet, Plus } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface CreateSheetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateSheet: (data: { name: string; description: string; data: any[]; columns: string[] }) => void
}

export function CreateSheetDialog({ open, onOpenChange, onCreateSheet }: CreateSheetDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [csvPreview, setCsvPreview] = useState<{ columns: string[]; data: any[]; rowCount: number } | null>(null)

  const handleFileSelect = async (selectedFile: File) => {
    if (selectedFile && (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv'))) {
      setFile(selectedFile)
      if (!name) {
        setName(selectedFile.name.replace('.csv', ''))
      }
      
      // Parse and preview the CSV
      try {
        const fileContent = await selectedFile.text()
        const parsed = parseCSV(fileContent)
        setCsvPreview({
          columns: parsed.columns,
          data: parsed.data.slice(0, 3), // Show first 3 rows as preview
          rowCount: parsed.data.length
        })
      } catch (error) {
        console.error('Error parsing CSV:', error)
        toast({
          title: 'Error',
          description: 'Failed to parse CSV file. Please check the format.',
          variant: 'destructive',
        })
      }
    } else {
      toast({
        title: 'Invalid File',
        description: 'Please select a CSV file.',
        variant: 'destructive',
      })
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files?.[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  const parseCSV = (csv: string): { data: any[]; columns: string[] } => {
    const lines = csv.split('\n').filter(line => line.trim())
    if (lines.length === 0) return { data: [], columns: [] }

    // Parse headers - handle quoted values and commas
    const headerLine = lines[0]
    const columns = parseCSVLine(headerLine)
    
    // Parse data rows
    const data = lines.slice(1).map((line, index) => {
      const values = parseCSVLine(line)
      const row: any = {}
      columns.forEach((col, colIndex) => {
        row[col] = values[colIndex] || ''
      })
      return row
    }).filter(row => {
      // Filter out empty rows
      return Object.values(row).some(value => value && String(value).trim())
    })

    return { data, columns }
  }

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    let i = 0

    while (i < line.length) {
      const char = line[i]
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Handle escaped quotes
          current += '"'
          i += 2
        } else {
          inQuotes = !inQuotes
          i++
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
        i++
      } else if ((char === '\t') && !inQuotes) {
        // Handle TSV files
        result.push(current.trim())
        current = ''
        i++
      } else {
        current += char
        i++
      }
    }
    
    result.push(current.trim())
    return result
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast({
        title: 'Name Required',
        description: 'Please enter a name for the sheet.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)

    try {
      let sheetData: any[] = []
      let columns: string[] = []

      if (file) {
        const fileContent = await file.text()
        const parsed = parseCSV(fileContent)
        sheetData = parsed.data
        columns = parsed.columns
        
        console.log('Parsed CSV:', { columns, dataCount: sheetData.length, sampleData: sheetData.slice(0, 2) })
      } else {
        // Create empty sheet with sample structure
        columns = ['Item', 'Value', 'Date']
        sheetData = [
          { 'Item': 'Sample Item 1', 'Value': '100', 'Date': '2024-01-01' },
          { 'Item': 'Sample Item 2', 'Value': '200', 'Date': '2024-01-02' },
        ]
      }

      await onCreateSheet({
        name: name.trim(),
        description: description.trim(),
        data: sheetData,
        columns,
      })

      // Reset form
      setName('')
      setDescription('')
      setFile(null)
      setCsvPreview(null)
      onOpenChange(false)
    } catch (error) {
      console.error('Error creating sheet:', error)
      toast({
        title: 'Error',
        description: 'Failed to create sheet. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <FileSpreadsheet className="h-5 w-5" />
            <span>Create New Sheet</span>
          </DialogTitle>
          <DialogDescription>
            Add a new data sheet by uploading a CSV file or creating an empty sheet.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Sheet Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter sheet name..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Data Source (Optional)</Label>
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragActive
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {file ? (
                <div className="space-y-2">
                  <FileSpreadsheet className="h-8 w-8 mx-auto text-green-600" />
                  <p className="text-sm font-medium text-green-700">{file.name}</p>
                  <p className="text-xs text-gray-500">CSV file ready to upload</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFile(null)
                      setCsvPreview(null)
                    }}
                  >
                    Remove File
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-8 w-8 mx-auto text-gray-400" />
                  <p className="text-sm text-gray-600">
                    Drop a CSV file here or{' '}
                    <label className="text-blue-600 hover:text-blue-700 cursor-pointer underline">
                      browse
                      <input
                        type="file"
                        accept=".csv"
                        onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                        className="hidden"
                      />
                    </label>
                  </p>
                  <p className="text-xs text-gray-500">
                    Supports CSV and TSV files with headers
                  </p>
                </div>
              )}
            </div>
          </div>

          {csvPreview && (
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="border rounded-lg p-4 bg-gray-50">
                <p className="text-sm text-gray-600 mb-2">
                  {csvPreview.rowCount} rows, {csvPreview.columns.length} columns
                </p>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr className="border-b">
                        {csvPreview.columns.slice(0, 6).map((col, index) => (
                          <th key={index} className="text-left p-1 font-medium">
                            {col.length > 12 ? `${col.substring(0, 12)}...` : col}
                          </th>
                        ))}
                        {csvPreview.columns.length > 6 && (
                          <th className="text-left p-1 font-medium">...</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {csvPreview.data.map((row, rowIndex) => (
                        <tr key={rowIndex} className="border-b">
                          {csvPreview.columns.slice(0, 6).map((col, colIndex) => (
                            <td key={colIndex} className="p-1">
                              {String(row[col] || '').length > 15 
                                ? `${String(row[col] || '').substring(0, 15)}...` 
                                : String(row[col] || '')}
                            </td>
                          ))}
                          {csvPreview.columns.length > 6 && (
                            <td className="p-1">...</td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                'Creating...'
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Sheet
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
