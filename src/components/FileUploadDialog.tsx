
import { useState, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Upload, File, Image, FileText } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { toast } from '@/hooks/use-toast'
import * as XLSX from 'xlsx'

interface FileUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUploadComplete: () => void
}

export function FileUploadDialog({ open, onOpenChange, onUploadComplete }: FileUploadDialogProps) {
  const { profile } = useAuth()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const supportedTypes = {
    'text/csv': { icon: FileText, label: 'CSV', color: 'text-green-600' },
    'application/pdf': { icon: FileText, label: 'PDF', color: 'text-red-600' },
    'image/png': { icon: Image, label: 'PNG', color: 'text-purple-600' },
    'image/jpeg': { icon: Image, label: 'JPEG', color: 'text-purple-600' },
    'image/jpg': { icon: Image, label: 'JPG', color: 'text-purple-600' }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Check if file type is supported
      if (!supportedTypes[file.type as keyof typeof supportedTypes]) {
        toast({
          title: 'Unsupported File Type',
          description: 'Please upload only CSV, PDF, PNG, or JPEG files.',
          variant: 'destructive',
        })
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        return
      }

      setSelectedFile(file)
      if (!name) {
        setName(file.name.split('.')[0])
      }
    }
  }

  const processCSVFile = async (file: File): Promise<{ data: any[], columns: string[] }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string
          const lines = text.split('\n').filter(line => line.trim())
          
          if (lines.length === 0) {
            resolve({ data: [], columns: [] })
            return
          }

          const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
          const rows = lines.slice(1)
          
          const processedData = rows.map(row => {
            const cells = row.split(',').map(cell => cell.trim().replace(/"/g, ''))
            const obj: any = {}
            headers.forEach((header, index) => {
              obj[header] = cells[index] || ''
            })
            return obj
          })

          resolve({ data: processedData, columns: headers })
        } catch (error) {
          reject(error)
        }
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    })
  }

  const handleUpload = async () => {
    if (!selectedFile || !name.trim() || !profile) return

    setUploading(true)
    setProgress(0)

    try {
      // Upload file to storage
      const fileExt = selectedFile.name.split('.').pop()
      const fileName = `${profile.id}/${Date.now()}-${selectedFile.name}`
      
      setProgress(10)
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('sheet-files')
        .upload(fileName, selectedFile)

      if (uploadError) throw uploadError

      setProgress(60)

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('sheet-files')
        .getPublicUrl(fileName)

      setProgress(70)

      // Process data based on file type
      let sheetData: any = null
      let columns: string[] = []

      if (selectedFile.type === 'text/csv') {
        const processed = await processCSVFile(selectedFile)
        sheetData = processed.data
        columns = processed.columns
      }

      setProgress(90)

      // Create sheet record
      const { error: insertError } = await supabase
        .from('sheets')
        .insert([{
          name: name.trim(),
          description: description.trim() || null,
          data: sheetData,
          columns: columns,
          file_type: selectedFile.type,
          file_url: publicUrl,
          file_size: selectedFile.size,
          created_by: profile.id
        }])

      if (insertError) throw insertError

      // Log the activity
      await supabase
        .from('activity_logs')
        .insert([{
          user_id: profile.id,
          user_name: profile.full_name || profile.email,
          user_email: profile.email,
          action_type: 'upload',
          sheet_name: name.trim(),
          details: `Uploaded ${supportedTypes[selectedFile.type as keyof typeof supportedTypes]?.label || 'file'} (${(selectedFile.size / 1024).toFixed(1)} KB)`
        }])

      setProgress(100)

      toast({
        title: 'Success',
        description: 'File uploaded successfully!',
      })

      // Reset form
      setName('')
      setDescription('')
      setSelectedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      
      onUploadComplete()
      onOpenChange(false)
    } catch (error) {
      console.error('Error uploading file:', error)
      toast({
        title: 'Error',
        description: 'Failed to upload file. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  const getFileIcon = () => {
    if (!selectedFile) return File
    const type = supportedTypes[selectedFile.type as keyof typeof supportedTypes]
    return type?.icon || File
  }

  const getFileTypeLabel = () => {
    if (!selectedFile) return 'Unknown'
    const type = supportedTypes[selectedFile.type as keyof typeof supportedTypes]
    return type?.label || 'Unknown'
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-red-700 flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload File
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="file">Select File</Label>
            <Input
              id="file"
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".csv,.pdf,.png,.jpg,.jpeg"
              className="border-red-200 focus:border-red-400"
            />
            <p className="text-xs text-gray-500 mt-1">
              Supported: CSV, PDF, PNG, JPEG files only
            </p>
          </div>

          {selectedFile && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center gap-3">
                {(() => {
                  const IconComponent = getFileIcon()
                  return <IconComponent className="h-8 w-8 text-red-600" />
                })()}
                <div className="flex-1">
                  <p className="font-medium text-red-900">{selectedFile.name}</p>
                  <p className="text-sm text-red-700">
                    {getFileTypeLabel()} • {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter file name..."
              className="border-red-200 focus:border-red-400"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter description (optional)..."
              className="border-red-200 focus:border-red-400"
            />
          </div>

          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={uploading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || !name.trim() || uploading}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
