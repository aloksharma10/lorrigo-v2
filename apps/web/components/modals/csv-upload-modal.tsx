"use client"

import type React from "react"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"

import {
  Upload,
  Check,
  ChevronsUpDown,
  Save,
  Pencil,
  Trash2,
  FileText,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Settings,
  X,
} from "lucide-react"

import {
  Button,
  Input,
  Label,
  Alert,
  AlertDescription,
  AlertTitle,
  Progress,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ScrollArea,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Modal,
} from "@lorrigo/ui/components"

import { cn } from "@lorrigo/ui/lib/utils"

import { useCSVUpload, type MappingPreference } from "../providers/csv-upload-provider"

// Enhanced Types with better structure

export interface CSVField {
  key: string
  label: string
  required?: boolean
  description?: string
  type?: "string" | "number" | "date" | "email" | "phone"
  validation?: (value: string) => string | null
}

export interface HeaderMapping {
  [expectedHeader: string]: string
}

export interface CSVUploadResult {
  success: boolean
  processedRows?: number
  errors?: string[]
  warnings?: string[]
  data?: any[]
  summary?: {
    total: number
    successful: number
    failed: number
    skipped: number
  }
}

export interface CSVUploadProps {
  fields: CSVField[]
  onSubmit: (file: File, mapping: HeaderMapping) => Promise<CSVUploadResult>
  title?: string
  description?: string
  buttonLabel?: string
  acceptedFileTypes?: string[]
  maxFileSize?: number
  validateFile?: (file: File) => Promise<string | null>
  enableMappingPreferences?: boolean
  preferenceKey?: string
  className?: string
  dialogClassName?: string
  showMinimize?: boolean
  enableDragDrop?: boolean
  onFileSelect?: (file: File) => void
  onMappingChange?: (mapping: HeaderMapping) => void
  onError?: (error: string) => void
}

// Enhanced state management

interface CSVUploadState {
  step: "upload" | "mapping" | "processing" | "completed"
  file: File | null
  csvHeaders: string[]
  headerMapping: HeaderMapping
  validationErrors: Record<string, string>
  globalError: string | null
  minimized: boolean
  progress: number
  isUploading: boolean
  openComboboxes: Record<string, boolean>
  dragActive: boolean
  previewData: string[][] | null
  mappingStats: {
    mapped: number
    required: number
    total: number
  }
  uploadResult: CSVUploadResult | null
}

// Enhanced validation utilities

const ValidationUtils = {
  validateFileType: (file: File, acceptedTypes: string[]): boolean => {
    return acceptedTypes.some((type) => file.name.toLowerCase().endsWith(type.toLowerCase().replace(".", "")))
  },

  validateFileSize: (file: File, maxSizeMB: number): boolean => {
    return file.size <= maxSizeMB * 1024 * 1024
  },

  parseCSVSafely: async (file: File): Promise<{ headers: string[]; preview: string[][] }> => {
    const text = await file.text()
    const lines = text.split("\n").filter((line) => line.trim())

    if (lines.length < 2) {
      throw new Error("CSV file must contain at least 2 rows (headers and data).")
    }

    const parseCSVLine = (line: string): string[] => {
      const result: string[] = []
      let current = ""
      let inQuotes = false

      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === "," && !inQuotes) {
          result.push(current.trim())
          current = ""
        } else {
          current += char
        }
      }

      result.push(current.trim())
      return result.map((cell) => cell.replace(/^"|"$/g, ""))
    }

    const headers = parseCSVLine(lines[0] || "")
    const preview = lines.slice(1, 6).map(parseCSVLine) // First 5 data rows for preview

    return { headers, preview }
  },

  calculateMappingStats: (mapping: HeaderMapping, fields: CSVField[]) => {
    const mapped = Object.values(mapping).filter(Boolean).length
    const required = fields.filter((f) => f.required !== false).length
    const total = fields.length

    return { mapped, required, total }
  },

  autoMapHeaders: (csvHeaders: string[], fields: CSVField[]): HeaderMapping => {
    const mapping: HeaderMapping = {}
    const usedHeaders = new Set<string>()

    // Exact matches first
    fields.forEach((field) => {
      const exactMatch = csvHeaders.find(
        (header) =>
          header.toLowerCase() === field.key.toLowerCase() || header.toLowerCase() === field.label.toLowerCase(),
      )

      if (exactMatch && !usedHeaders.has(exactMatch)) {
        mapping[field.key] = exactMatch
        usedHeaders.add(exactMatch)
      }
    })

    // Fuzzy matches for unmapped fields
    fields.forEach((field) => {
      if (mapping[field.key]) return

      const fuzzyMatch = csvHeaders.find((header) => {
        if (usedHeaders.has(header)) return false

        const normalizedHeader = header.toLowerCase().replace(/[_\s-]/g, "")
        const normalizedField = field.key.toLowerCase().replace(/[_\s-]/g, "")
        const normalizedLabel = field.label.toLowerCase().replace(/[_\s-]/g, "")

        return (
          normalizedHeader.includes(normalizedField) ||
          normalizedField.includes(normalizedHeader) ||
          normalizedHeader.includes(normalizedLabel) ||
          normalizedLabel.includes(normalizedHeader)
        )
      })

      if (fuzzyMatch) {
        mapping[field.key] = fuzzyMatch
        usedHeaders.add(fuzzyMatch)
      }
    })

    return mapping
  },
}

// Enhanced custom hook with better logic

const useCSVUploadLogic = (props: CSVUploadProps) => {
  const {
    fields,
    validateFile,
    maxFileSize = 10,
    acceptedFileTypes = [".csv"],
    preferenceKey,
    enableDragDrop = true,
  } = props

  const csvUploadContext = useCSVUpload();
  
  if (!csvUploadContext) {
    throw new Error('useCSVUploadLogic must be used within a CSVUploadProvider');
  }

  const {
    uploadStatus,
    mappingPreferences: allMappingPreferences,
    saveMappingPreference,
    updateMappingPreference,
    deleteMappingPreference,
    startUpload,
    toggleMinimized,
    resetUpload,
    completeUpload,
    preferenceKey: globalPreferenceKey,
  } = csvUploadContext

  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragCounterRef = useRef(0)

  const mappingPreferences = useMemo(
    () =>
      allMappingPreferences.filter((pref: MappingPreference) =>
        preferenceKey ? pref.key === `${preferenceKey}_mappingpreferences` : pref.key === globalPreferenceKey,
      ),
    [allMappingPreferences, preferenceKey, globalPreferenceKey],
  )

  const [state, setState] = useState<CSVUploadState>({
    step: "upload",
    file: null,
    csvHeaders: [],
    headerMapping: {},
    validationErrors: {},
    globalError: null,
    minimized: false,
    progress: 0,
    isUploading: false,
    openComboboxes: {},
    dragActive: false,
    previewData: null,
    mappingStats: { mapped: 0, required: 0, total: 0 },
    uploadResult: null,
  })

  const [editingPreference, setEditingPreference] = useState<MappingPreference | null>(null)
  const [newMappingName, setNewMappingName] = useState("")
  const [showSaveMappingDialog, setShowSaveMappingDialog] = useState(false)

  // Enhanced state updater with validation

  const updateState = useCallback(
    (updates: Partial<CSVUploadState>) => {
      setState((prev) => {
        const newState = { ...prev, ...updates }
        // Auto-calculate mapping stats when mapping changes
        if (updates.headerMapping) {
          newState.mappingStats = ValidationUtils.calculateMappingStats(newState.headerMapping, fields)
        }
        return newState
      })
    },
    [fields],
  )

  // Reset to initial state for new upload
  const resetForNewUpload = useCallback(() => {
    updateState({
      step: "upload",
      file: null,
      csvHeaders: [],
      headerMapping: {},
      validationErrors: {},
      globalError: null,
      progress: 0,
      isUploading: false,
      openComboboxes: {},
      dragActive: false,
      previewData: null,
      mappingStats: { mapped: 0, required: 0, total: 0 },
      uploadResult: null,
    })

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }, [updateState])

  // Enhanced file validation

  const validateFileInternal = useCallback(
    async (file: File): Promise<string | null> => {
      try {
        if (!ValidationUtils.validateFileType(file, acceptedFileTypes)) {
          return `Please upload a file with one of these extensions: ${acceptedFileTypes.join(", ")}`
        }

        if (!ValidationUtils.validateFileSize(file, maxFileSize)) {
          return `File size must be less than ${maxFileSize}MB`
        }

        if (validateFile) {
          const customValidation = await validateFile(file)
          if (customValidation) return customValidation
        }

        return null
      } catch (error) {
        return error instanceof Error ? error.message : "File validation failed"
      }
    },
    [acceptedFileTypes, maxFileSize, validateFile],
  )

  // Enhanced drag and drop handlers

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      dragCounterRef.current++

      if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
        updateState({ dragActive: true })
      }
    },
    [updateState],
  )

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      dragCounterRef.current--

      if (dragCounterRef.current === 0) {
        updateState({ dragActive: false })
      }
    },
    [updateState],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      updateState({ dragActive: false })
      dragCounterRef.current = 0

      const files = Array.from(e.dataTransfer.files)
      if (files.length > 0) {
        const file = files[0]
        if (file) {
          await processFile(file)
        }
      }
    },
    [updateState],
  )

  // Enhanced file processing

  const processFile = useCallback(
    async (file: File) => {
      updateState({ globalError: null, validationErrors: {} })

      try {
        const validationError = await validateFileInternal(file)
        if (validationError) {
          updateState({ globalError: validationError })
          return
        }

        const { headers, preview } = await ValidationUtils.parseCSVSafely(file)
        const autoMapping = ValidationUtils.autoMapHeaders(headers, fields)

        updateState({
          file,
          csvHeaders: headers,
          headerMapping: autoMapping,
          previewData: preview,
          step: "mapping",
        })

        props.onFileSelect?.(file)
      } catch (error) {
        updateState({
          globalError: error instanceof Error ? error.message : "Failed to parse CSV file",
        })
      }
    },
    [validateFileInternal, fields, props, updateState],
  )

  // Sync with global upload status

  useEffect(() => {
    if (uploadStatus.isUploading && uploadStatus.step === "processing") {
      updateState({
        step: "processing",
        progress: uploadStatus.progress,
        isUploading: true,
        minimized: uploadStatus.minimized,
      })
    }
  }, [uploadStatus, props, updateState])

  return {
    state,
    updateState,
    mappingPreferences,
    saveMappingPreference,
    updateMappingPreference,
    deleteMappingPreference,
    processFile,
    startUpload,
    toggleMinimized,
    resetUpload,
    completeUpload,
    resetForNewUpload,
    editingPreference,
    setEditingPreference,
    newMappingName,
    setNewMappingName,
    showSaveMappingDialog,
    setShowSaveMappingDialog,
    preferenceKey: preferenceKey || globalPreferenceKey,
    fileInputRef,
    dragHandlers: enableDragDrop
      ? {
        onDragEnter: handleDragEnter,
        onDragLeave: handleDragLeave,
        onDragOver: handleDragOver,
        onDrop: handleDrop,
      }
      : {},
  }
}

// Enhanced main component

export function CSVUploadModal(props: CSVUploadProps) {
  const {
    title = "Upload CSV File",
    description = "Upload a CSV file and map the columns to required fields.",
    buttonLabel = "Upload CSV",
    showMinimize = true,
    className,
    dialogClassName,
    onMappingChange,
    fields,
    onSubmit,
    enableMappingPreferences = true,
    enableDragDrop = true,
  } = props

  const {
    state,
    updateState,
    mappingPreferences,
    saveMappingPreference,
    updateMappingPreference,
    deleteMappingPreference,
    processFile,
    startUpload,
    toggleMinimized,
    resetUpload,
    completeUpload,
    resetForNewUpload,
    editingPreference,
    setEditingPreference,
    newMappingName,
    setNewMappingName,
    showSaveMappingDialog,
    setShowSaveMappingDialog,
    preferenceKey: actualPreferenceKey,
    fileInputRef,
    dragHandlers,
  } = useCSVUploadLogic(props)

  const [open, setOpen] = useState(false)
  const csvUploadContext = useCSVUpload()
  
  if (!csvUploadContext) {
    throw new Error('CSVUploadModal must be used within a CSVUploadProvider');
  }
  
  const { uploadStatus } = csvUploadContext

  // Enhanced file change handler

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0]
      if (selectedFile) {
        await processFile(selectedFile)
      }
    },
    [processFile],
  )

  // Enhanced mapping change handler

  const handleMappingChange = useCallback(
    (fieldKey: string, csvHeader: string) => {
    const newMapping = {
      ...state.headerMapping,
      [fieldKey]: csvHeader,
      }

      updateState({ headerMapping: newMapping })
      onMappingChange?.(newMapping)
    },
    [state.headerMapping, updateState, onMappingChange],
  )

  // Apply saved mapping with validation

  const applySavedMapping = useCallback(
    (mapping: HeaderMapping) => {
      const validMapping: HeaderMapping = {}

      Object.entries(mapping).forEach(([key, value]) => {
        if (value && state.csvHeaders.includes(value)) {
          validMapping[key] = value
        }
      })

      updateState({ headerMapping: validMapping })
      onMappingChange?.(validMapping)
    },
    [state.csvHeaders, updateState, onMappingChange],
  )

  // Enhanced mapping validation

  const validateMapping = useCallback((): string[] => {
    const errors: string[] = []
    const requiredFields = fields.filter((f) => f.required !== false)
    const unmappedRequired = requiredFields.filter((field) => !state.headerMapping[field.key])

    if (unmappedRequired.length > 0) {
      errors.push(`Missing required fields: ${unmappedRequired.map((f) => f.label).join(", ")}`)
    }

    // Check for duplicate mappings
    const mappedHeaders = Object.values(state.headerMapping).filter(Boolean)
    const duplicates = mappedHeaders.filter((header, index) => mappedHeaders.indexOf(header) !== index)

    if (duplicates.length > 0) {
      errors.push(`Duplicate column mappings: ${[...new Set(duplicates)].join(", ")}`)
    }

    return errors
  }, [fields, state.headerMapping])

  // Enhanced form submission with completion handling

  const handleSubmit = useCallback(async () => {
    const validationErrors = validateMapping()

    if (validationErrors.length > 0) {
      updateState({ globalError: validationErrors.join("; ") })
      return
    }

    if (!state.file) {
      updateState({ globalError: "Please select a file first." })
      return
    }

    updateState({
      globalError: null,
      step: "processing",
      isUploading: true,
      progress: 0,
    })

    try {
      startUpload(state.file, state.headerMapping)

      const result = await onSubmit(state.file, state.headerMapping)

        if (result.success) {
        completeUpload(result);

        // Close modal and minimize immediately after successful upload
        setTimeout(() => {
          toggleMinimized()
          setOpen(false)
        }, 300)

        // Update state to completed with result
      updateState({ 
          progress: 100,
          isUploading: false,
          step: "completed",
          uploadResult: result,
        })

        // Auto-transition to allow next upload after showing success
        setTimeout(() => {
    updateState({
            step: "completed",
          })
        }, 1000)
      } else {
        updateState({
          globalError: result.errors?.join(", ") || "Upload failed",
          step: "mapping",
      isUploading: false,
        })
        props.onError?.(result.errors?.join(", ") || "Upload failed")
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Upload failed"
      updateState({
        globalError: errorMessage,
        step: "mapping",
        isUploading: false,
      })
      props.onError?.(errorMessage)
    }
  }, [
    validateMapping,
    state.file,
    state.headerMapping,
    updateState,
    startUpload,
    toggleMinimized,
    onSubmit,
    completeUpload,
    props,
  ])

  // Enhanced save mapping handler

  const handleSaveMapping = useCallback(() => {
    if (!newMappingName.trim()) {
      updateState({ globalError: "Please enter a name for the mapping" })
      return
    }

    try {
      if (editingPreference) {
        updateMappingPreference(
          editingPreference.name,
          newMappingName.trim(),
          state.headerMapping,
          `${actualPreferenceKey}_mappingpreferences`,
        )
      } else {
        saveMappingPreference(newMappingName.trim(), state.headerMapping, `${actualPreferenceKey}_mappingpreferences`)
      }

      setNewMappingName("")
      setEditingPreference(null)
      setShowSaveMappingDialog(false)
      updateState({ globalError: null })
    } catch (error) {
      updateState({ globalError: "Failed to save mapping preference" })
    }
  }, [
    newMappingName,
    editingPreference,
    state.headerMapping,
    actualPreferenceKey,
    updateMappingPreference,
    saveMappingPreference,
    updateState,
  ])

  // Step configuration for better organization

  const stepConfig = useMemo(
    () => ({
      upload: {
        title,
        description,
        showBack: false,
        showNext: false,
        nextLabel: "",
      },
      mapping: {
        title: "Map CSV Fields",
        description: "Map your CSV columns to the required fields below.",
        showBack: true,
        showNext: true,
        nextLabel: "Process File",
      },
      processing: {
        title: "Processing CSV File",
        description: "Your file is being processed. This may take a few moments.",
        showBack: false,
        showNext: false,
        nextLabel: "",
      },
      completed: {
        title: "Upload Complete",
        description: "Your file has been processed successfully.",
        showBack: false,
        showNext: false,
        nextLabel: "",
      },
    }),
    [title, description],
  )

  const currentStepConfig = stepConfig[state.step]

  return (
    <TooltipProvider>
      <Button onClick={() => setOpen(true)} className={className}>
        <Upload className="mr-2 h-4 w-4" />
        {buttonLabel}
      </Button>

      <Modal className="max-w-[700px]" showModal={open} setShowModal={setOpen}>
        <div className={cn("flex flex-col", dialogClassName)}>
          {/* Enhanced Header */}
          <div className="border-b p-5 border-border bg-muted/30 sticky top-0">
            <div className="flex items-center justify-between">
              <div>
                <span className="flex text-xl font-semibold items-center gap-2">
                  {state.step === "upload" && <Upload className="h-5 w-5" />}
                  {state.step === "mapping" && <Settings className="h-5 w-5" />}
                  {state.step === "processing" && <Loader2 className="h-5 w-5 animate-spin" />}
                  {state.step === "completed" && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                  {currentStepConfig.title}
                </span>
                <p className="text-base">{currentStepConfig.description}</p>
              </div>

              <Button variant="ghost" onClick={() => setOpen(false)} size="icon">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Enhanced Content with ScrollArea */}
          <ScrollArea className="flex-1 p-6">
            <div className="space-y-6">
              {/* Global Error Alert */}
              {state.globalError && (
            <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{state.globalError}</AlertDescription>
            </Alert>
          )}

          {/* Upload Step */}
              {state.step === "upload" && (
                <div className="space-y-6">
                  {/* File Upload Area */}
                  <Card
                    className={cn(
                      "border-2 border-dashed transition-colors cursor-pointer hover:border-primary/50",
                      state.dragActive && "border-primary bg-primary/5",
                      enableDragDrop && "min-h-[200px]",
                    )}
                    {...dragHandlers}
                  >
                    <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                      <div className="mb-4">
                        <FileText
                          className={cn(
                            "h-12 w-12 transition-colors",
                            state.dragActive ? "text-primary" : "text-muted-foreground",
                          )}
                        />
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold">
                          {state.dragActive ? "Drop your CSV file here" : "Upload CSV File"}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {enableDragDrop
                            ? "Drag and drop your file here, or click to browse"
                            : "Click to browse for your file"}
                        </p>
                      </div>

                      <div className="mt-6 space-y-4">
                        <Button onClick={() => fileInputRef.current?.click()} className="min-w-[120px]">
                          <Upload className="mr-2 h-4 w-4" />
                          Browse Files
                        </Button>

                <Input 
                          ref={fileInputRef}
                  type="file" 
                          accept={props.acceptedFileTypes?.join(",")}
                  onChange={handleFileChange} 
                          className="hidden"
                />
              </div>

                      <div className="mt-4 flex flex-wrap gap-2 justify-center">
                        <Badge variant="secondary" className="text-xs">
                          {props.acceptedFileTypes?.join(", ") || ".csv"}
                        </Badge>
                        {props.maxFileSize && (
                          <Badge variant="secondary" className="text-xs">
                            Max {props.maxFileSize}MB
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
            </div>
          )}

          {/* Mapping Step */}
              {state.step === "mapping" && (
            <div className="space-y-6">
                  {/* File Info */}
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-green-500" />
                          <div>
                            <p className="font-medium">{state.file?.name}</p>
                            <p className="text-sm text-muted-foreground">{state.csvHeaders.length} columns detected</p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {state.mappingStats.mapped}/{state.mappingStats.total} mapped
                          </p>
                          <p className="text-xs text-muted-foreground">{state.mappingStats.required} required</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

              {/* Saved Mappings */}
                  {enableMappingPreferences && mappingPreferences.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Saved Mappings</CardTitle>
                        <CardDescription>Load a previously saved column mapping</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-between bg-transparent">
                              Choose a saved mapping...
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent>
                            <Command>
                              <CommandInput placeholder="Search saved mappings..." />
                              <CommandList>
                                <CommandEmpty>No saved mappings found.</CommandEmpty>
                                <CommandGroup>
                                  {mappingPreferences.map((mapping: MappingPreference) => (
                                    <CommandItem
                                      key={mapping.name}
                                      value={mapping.name}
                                      onSelect={() => applySavedMapping(mapping.mapping)}
                                      className="flex items-center justify-between"
                                    >
                                      <span>{mapping.name}</span>
                                      <div className="flex items-center gap-1">
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              onClick={(e) => {
                                                e.preventDefault()
                                                e.stopPropagation()
                                                setEditingPreference(mapping)
                                                setNewMappingName(mapping.name)
                                                setShowSaveMappingDialog(true)
                                              }}
                                              className="h-6 w-6"
                                            >
                                              <Pencil className="h-3 w-3" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>Edit mapping</TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              onClick={(e) => {
                                                e.preventDefault()
                                                e.stopPropagation()
                                                if (window.confirm(`Delete mapping "${mapping.name}"?`)) {
                                                  deleteMappingPreference(mapping.name, mapping.key)
                                                }
                                              }}
                                              className="h-6 w-6 text-red-500 hover:text-red-700"
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>Delete mapping</TooltipContent>
                                        </Tooltip>
                  </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </CardContent>
                    </Card>
              )}

              {/* Field Mapping */}
                  <Card>
                    <CardHeader>
                <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base">Column Mapping</CardTitle>
                          <CardDescription>Map CSV columns to your data fields</CardDescription>
                        </div>
                        {enableMappingPreferences && (
                    <Button
                      variant="outline"
                      size="sm"
                            onClick={() => {
                              setEditingPreference(null)
                              setNewMappingName("")
                              setShowSaveMappingDialog(true)
                            }}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      Save Mapping
                    </Button>
                  )}
                </div>
                    </CardHeader>
                    <CardContent className="overflow-hidden">
                      <div className="h-[300px] overflow-y-auto">
                        <div className="space-y-4">
                {fields.map((field) => (
                            <div
                              key={field.key}
                              className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg"
                            >
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Label className="font-medium">{field.label}</Label>
                                  {field.required !== false && (
                                    <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                                      Required
                                    </Badge>
                                  )}
                                  {field.type && (
                                    <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                                      {field.type}
                                    </Badge>
                                  )}
                                </div>
                      {field.description && (
                                  <p className="text-sm text-muted-foreground">{field.description}</p>
                      )}
                    </div>
                    
                              <div className="space-y-2">
                      <Popover
                        open={state.openComboboxes[field.key] || false}
                        onOpenChange={(open) =>
                          updateState({
                                      openComboboxes: { ...state.openComboboxes, [field.key]: open },
                          })
                        }
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                                      className={cn(
                                        "w-full justify-between",
                                        !state.headerMapping[field.key] && field.required !== false && "border-red-200",
                                      )}
                          >
                                      {state.headerMapping[field.key] || "Select CSV column..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0">
                          <Command>
                            <CommandInput placeholder="Search columns..." />
                            <CommandList>
                              <CommandEmpty>No column found.</CommandEmpty>
                              <CommandGroup>
                                <CommandItem
                                  onSelect={() => {
                                              handleMappingChange(field.key, "")
                                    updateState({
                                                openComboboxes: { ...state.openComboboxes, [field.key]: false },
                                              })
                                  }}
                                >
                                  <Check
                                    className={cn(
                                                "mr-2 h-4 w-4",
                                                !state.headerMapping[field.key] ? "opacity-100" : "opacity-0",
                                    )}
                                  />
                                            <span className="text-muted-foreground">-- Not mapped --</span>
                                </CommandItem>
                                {state.csvHeaders.map((header) => (
                                  <CommandItem
                                    key={header}
                                    onSelect={() => {
                                                handleMappingChange(field.key, header)
                                      updateState({
                                                  openComboboxes: { ...state.openComboboxes, [field.key]: false },
                                                })
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                                  "mr-2 h-4 w-4",
                                        state.headerMapping[field.key] === header
                                                    ? "opacity-100"
                                                    : "opacity-0",
                                      )}
                                    />
                                    {header}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                ))}
              </div>
                      </div>
                    </CardContent>
                  </Card>
            </div>
          )}

          {/* Processing Step */}
              {state.step === "processing" && (
                <div className="space-y-6 py-8">
                  <div className="text-center space-y-4">
                    <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold">Processing your file...</h3>
                      <p className="text-muted-foreground">This may take a few moments depending on file size</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{Math.round(state.progress)}%</span>
                    </div>
              <Progress value={state.progress} className="h-2" />
                  </div>
                </div>
              )}

              {/* Completed Step */}
              {state.step === "completed" && (
                <div className="space-y-6 py-8">
                  <div className="text-center space-y-4">
                    <CheckCircle2 className="h-12 w-12 mx-auto text-green-500" />
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold">Upload Complete!</h3>
                      <p className="text-muted-foreground">Your CSV file has been processed successfully</p>
                    </div>
                  </div>

                  {/* Upload Another File */}
                  <div className="text-center">
                    <Button onClick={resetForNewUpload} className="min-w-[160px]">
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Another File
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Enhanced Footer */}
          <div className="border-t sticky bottom-0 bg-background p-6">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                {currentStepConfig.showBack && (
                  <Button
                    variant="outline"
                    onClick={() => updateState({ step: "upload" })}
                    disabled={state.isUploading}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
              )}
            </div>

              <div className="flex items-center gap-2">
                {state.step === "upload" && (
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            )}
                {currentStepConfig.showNext && (
                  <Button
                    onClick={handleSubmit}
                    disabled={state.isUploading || state.mappingStats.mapped < state.mappingStats.required}
                  >
                    {state.isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {currentStepConfig.nextLabel}
                </Button>
            )}
                {state.step === "processing" && (
              <Button variant="outline" onClick={resetUpload}>
                Cancel
              </Button>
            )}
                {state.step === "completed" && (
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Close
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Save Mapping Dialog */}
      <Modal showModal={showSaveMappingDialog} setShowModal={setShowSaveMappingDialog}>
        <div className="sm:max-w-[400px] flex flex-col">
          <div className="flex items-center justify-between border-b p-6">
            <h2>{editingPreference ? "Update Mapping" : "Save Mapping"}</h2>
            <p>
              {editingPreference
                ? "Update the name for this mapping configuration."
                : "Give this mapping configuration a name so you can reuse it later."}
            </p>
          </div>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="mapping-name">Mapping Name</Label>
                <Input
                  id="mapping-name"
                  value={newMappingName}
                  onChange={(e) => setNewMappingName(e.target.value)}
                  placeholder="e.g., Order Import Mapping"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSaveMapping()
                  }
                }}
                />
              </div>
            </div>

          <div>
            <Button
              variant="outline"
              onClick={() => {
                setShowSaveMappingDialog(false)
                setEditingPreference(null)
                setNewMappingName("")
              }}
            >
                Cancel
              </Button>
            <Button onClick={handleSaveMapping}>{editingPreference ? "Update" : "Save"} Mapping</Button>
          </div>
        </div>
      </Modal>
    </TooltipProvider>
  )
}
