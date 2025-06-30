'use client';

import type React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { X, Upload, AlertCircle, MinusCircle, Check, ChevronsUpDown, Save, Pencil, Trash2 } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Alert,
  AlertDescription,
  AlertTitle,
  Progress,
  toast,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@lorrigo/ui/components';
import { cn } from '@lorrigo/ui/lib/utils';
import { useCSVUpload, type MappingPreference, type CSVUploadStatus } from '../providers/csv-upload-provider';

// Types
export interface CSVField {
  key: string;
  label: string;
  required?: boolean;
  description?: string;
}

export interface HeaderMapping {
  [expectedHeader: string]: string;
}

export interface CSVUploadResult {
  success: boolean;
  processedRows?: number;
  errors?: string[];
  data?: any[];
}

export interface CSVUploadProps {
  // Required props
  fields: CSVField[];
  onSubmit: (file: File, mapping: HeaderMapping) => Promise<CSVUploadResult>;

  // Optional props
  title?: string;
  description?: string;
  buttonLabel?: string;
  acceptedFileTypes?: string[];
  maxFileSize?: number; // in MB
  validateFile?: (file: File) => Promise<string | null>;

  // Mapping preferences
  enableMappingPreferences?: boolean;
  preferenceKey?: string;

  // UI customization
  className?: string;
  dialogClassName?: string;
  showMinimize?: boolean;

  // Callbacks
  onFileSelect?: (file: File) => void;
  onMappingChange?: (mapping: HeaderMapping) => void;
  onComplete?: (result: CSVUploadResult) => void;
  onError?: (error: string) => void;
}

export interface CSVUploadState {
  step: 'upload' | 'mapping' | 'processing';
  file: File | null;
  csvHeaders: string[];
  headerMapping: HeaderMapping;
  validationError: string | null;
  minimized: boolean;
  progress: number;
  isUploading: boolean;
  openComboboxes: Record<string, boolean>;
}

// Custom hook for CSV upload logic
const useCSVUploadLogic = (props: CSVUploadProps) => {
  const {
    fields,
    validateFile,
    maxFileSize = 10, // 10MB default
    acceptedFileTypes = ['.csv'],
    preferenceKey,
  } = props;

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
  } = useCSVUpload();

  // Filter preferences based on the preferenceKey
  const mappingPreferences = allMappingPreferences.filter(
    pref => preferenceKey ? pref.key === `${preferenceKey}_mappingpreferences` : pref.key === globalPreferenceKey
  );

  const [state, setState] = useState<CSVUploadState>({
    step: 'upload',
    file: null,
    csvHeaders: [],
    headerMapping: {},
    validationError: null,
    minimized: false,
    progress: 0,
    isUploading: false,
    openComboboxes: {},
  });

  const [editingPreference, setEditingPreference] = useState<MappingPreference | null>(null);
  const [newMappingName, setNewMappingName] = useState('');
  const [showSaveMappingDialog, setShowSaveMappingDialog] = useState(false);

  // Update state helper
  const updateState = useCallback((updates: Partial<CSVUploadState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // File validation
  const validateFileInternal = useCallback(async (file: File): Promise<string | null> => {
    // Check file type
    const isValidType = acceptedFileTypes.some(type =>
      file.name.toLowerCase().endsWith(type.toLowerCase())
    );
    if (!isValidType) {
      return `Please upload a file with one of these extensions: ${acceptedFileTypes.join(', ')}`;
    }

    // Check file size
    if (file.size > maxFileSize * 1024 * 1024) {
      return `File size must be less than ${maxFileSize}MB`;
    }

    // Custom validation
    if (validateFile) {
      return await validateFile(file);
    }

    return null;
  }, [acceptedFileTypes, maxFileSize, validateFile]);

  // Parse CSV headers
  const parseCSVHeaders = useCallback(async (file: File): Promise<string[]> => {
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());

    if (lines.length < 2) {
      throw new Error('CSV file must contain at least 2 rows (headers and data).');
    }

    // Parse headers more robustly
    const headerLine = lines[0];
    const headers = headerLine?.split(',').map((h: string) => h.trim().replace(/^"|"$/g, ''));

    if (headers?.length === 0) {
      throw new Error('CSV file must contain headers.');
    }

    return headers || [];
  }, []);

  // Auto-map headers based on similarity
  const autoMapHeaders = useCallback((csvHeaders: string[]): HeaderMapping => {
    const mapping: HeaderMapping = {};

    fields.forEach(field => {
      const matchingHeader = csvHeaders.find(header => {
        const normalizedHeader = header.toLowerCase().replace(/[_\s-]/g, '');
        const normalizedField = field.key.toLowerCase().replace(/[_\s-]/g, '');
        return normalizedHeader.includes(normalizedField) ||
          normalizedField.includes(normalizedHeader) ||
          header.toLowerCase().includes(field.key.toLowerCase());
      });

      if (matchingHeader) {
        mapping[field.key] = matchingHeader;
      }
    });

    return mapping;
  }, [fields]);

  // Validate mapping to ensure only valid CSV headers are used
  const validateMappingHeaders = useCallback((mapping: HeaderMapping, csvHeaders: string[]): HeaderMapping => {
    const validMapping: HeaderMapping = {};

    Object.entries(mapping).forEach(([key, value]) => {
      // Only keep mappings where the value exists in csvHeaders
      if (value && csvHeaders.includes(value)) {
        validMapping[key] = value;
      }
    });

    return validMapping;
  }, []);

  // Sync with global upload status
  useEffect(() => {
    if (uploadStatus.isUploading && uploadStatus.step === 'processing') {
      updateState({
        step: 'processing',
        progress: uploadStatus.progress,
        isUploading: true,
        minimized: uploadStatus.minimized,
      });
    } else if (uploadStatus.step === 'complete' && uploadStatus.result) {
      // Handle completion
      props.onComplete?.(uploadStatus.result);
      if (!uploadStatus.minimized) {
        updateState({
          step: 'upload',
          file: null,
          csvHeaders: [],
          headerMapping: {},
          validationError: null,
          progress: 0,
          isUploading: false,
        });
      }
    }
  }, [uploadStatus, props, updateState]);

  // Add an effect to reset the modal state when reopening
  useEffect(() => {
    if (uploadStatus.step === 'complete') {
      // If reopening the modal after a completed upload, reset the state
      resetUpload();
    }
    // Return void or a cleanup function
    return undefined;
  }, [open, uploadStatus.step, resetUpload]);

  return {
    state,
    updateState,
    mappingPreferences,
    saveMappingPreference,
    updateMappingPreference,
    deleteMappingPreference,
    validateFileInternal,
    parseCSVHeaders,
    autoMapHeaders,
    validateMappingHeaders,
    startUpload,
    toggleMinimized,
    resetUpload,
    completeUpload,
    editingPreference,
    setEditingPreference,
    newMappingName,
    setNewMappingName,
    showSaveMappingDialog,
    setShowSaveMappingDialog,
    preferenceKey: preferenceKey || globalPreferenceKey,
  };
};

// Main component
export function CSVUploadModal(props: CSVUploadProps) {
  const {
    title = 'Upload CSV File',
    description = 'Upload a CSV file and map the columns to required fields.',
    buttonLabel = 'Upload CSV',
    showMinimize = true,
    className,
    dialogClassName,
    onFileSelect,
    onMappingChange,
    fields,
    onSubmit,
    enableMappingPreferences = true,
    preferenceKey,
  } = props;

  // Use the custom hook
  const {
    state,
    updateState,
    mappingPreferences,
    saveMappingPreference,
    updateMappingPreference,
    deleteMappingPreference,
    validateFileInternal,
    parseCSVHeaders,
    autoMapHeaders,
    validateMappingHeaders,
    startUpload,
    toggleMinimized,
    resetUpload,
    completeUpload,
    editingPreference,
    setEditingPreference,
    newMappingName,
    setNewMappingName,
    showSaveMappingDialog,
    setShowSaveMappingDialog,
    preferenceKey: actualPreferenceKey,
  } = useCSVUploadLogic(props);

  const [open, setOpen] = useState(false);
  const { uploadStatus } = useCSVUpload();

  // Handle file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    updateState({ validationError: null });
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    try {
      // Validate file
      const validationError = await validateFileInternal(selectedFile);
      if (validationError) {
        updateState({ validationError });
        return;
      }

      // Parse headers
      const headers = await parseCSVHeaders(selectedFile);
      const autoMapping = autoMapHeaders(headers);

      updateState({
        file: selectedFile,
        csvHeaders: headers,
        headerMapping: autoMapping,
        step: 'mapping',
      });

      onFileSelect?.(selectedFile);
    } catch (error) {
      updateState({
        validationError: error instanceof Error ? error.message : 'Failed to parse CSV file'
      });
    }
  };

  // Handle mapping change
  const handleMappingChange = (fieldKey: string, csvHeader: string) => {
    const newMapping = {
      ...state.headerMapping,
      [fieldKey]: csvHeader,
    };
    updateState({ headerMapping: newMapping });
    onMappingChange?.(newMapping);
  };

  // Apply saved mapping
  const applySavedMapping = (mapping: HeaderMapping) => {
    // Validate the mapping against current CSV headers
    const validMapping = validateMappingHeaders(mapping, state.csvHeaders);
    updateState({ headerMapping: validMapping });
    onMappingChange?.(validMapping);
  };

  // Save current mapping
  const handleSaveMapping = () => {
    if (!newMappingName.trim()) {
      toast.error('Please enter a name for the mapping');
      return;
    }

    if (editingPreference) {
      updateMappingPreference(
        editingPreference.name,
        newMappingName.trim(),
        state.headerMapping,
        `${actualPreferenceKey}_mappingpreferences`
      );
    } else {
      saveMappingPreference(
        newMappingName.trim(),
        state.headerMapping,
        `${actualPreferenceKey}_mappingpreferences`
      );
    }

    setNewMappingName('');
    setEditingPreference(null);
    setShowSaveMappingDialog(false);
  };

  // Handle edit mapping preference
  const handleEditPreference = (preference: MappingPreference) => {
    setEditingPreference(preference);
    setNewMappingName(preference.name);
    setShowSaveMappingDialog(true);
  };

  // Handle delete mapping preference
  const handleDeletePreference = (preference: MappingPreference) => {
    // Confirm before deleting
    if (window.confirm(`Are you sure you want to delete the mapping "${preference.name}"?`)) {
      deleteMappingPreference(preference.name, preference.key);
    }
  };

  // Validate mapping before submission
  const validateMapping = (): string | null => {
    const requiredFields = fields.filter(f => f.required !== false);
    const unmappedFields = requiredFields.filter(field => !state.headerMapping[field.key]);

    if (unmappedFields.length > 0) {
      return `Please map all required fields: ${unmappedFields.map(f => f.label).join(', ')}`;
    }

    return null;
  };

  // Handle form submission
  const handleSubmit = async () => {
    const validationError = validateMapping();
    if (validationError) {
      updateState({ validationError });
      return;
    }

    if (!state.file) {
      updateState({ validationError: 'Please select a file first.' });
      return;
    }

    updateState({
      validationError: null,
      step: 'processing',
      isUploading: true,
      progress: 0
    });

    try {
      // Start the upload process
      startUpload(state.file, state.headerMapping);

      // Automatically minimize when upload starts
      setTimeout(() => {
        toggleMinimized();
        setOpen(false);
      }, 500); // Small delay to show processing started

      const result = await props.onSubmit(state.file, state.headerMapping);

      if (result.success) {
        completeUpload(result);
        updateState({
          step: 'processing', // Keep in processing state to show progress
          progress: 100,
          isUploading: false
        });
        toast.success('File uploaded successfully! Processing in background.');
        props.onComplete?.(result);
      } else {
        updateState({
          validationError: result.errors?.join(', ') || 'Upload failed',
          step: 'mapping',
          isUploading: false
        });
        toast.error('There were errors processing your file.');
      }
    } catch (error) {
      updateState({
        validationError: error instanceof Error ? error.message : 'Upload failed',
        step: 'mapping',
        isUploading: false
      });
      props.onError?.(error instanceof Error ? error.message : 'Upload failed');
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} className={className}>
        <Upload className="mr-2 h-4 w-4" />
        {buttonLabel}
      </Button>

      <Dialog open={open} onOpenChange={(isOpen) => {
        // If opening the modal, check if we need to reset
        if (isOpen && uploadStatus.step === 'complete') {
          resetUpload();
        }

        // Don't allow closing the dialog during processing unless minimized
        if (state.step === 'processing' && state.isUploading && !isOpen) {
          toggleMinimized();
          setOpen(false); // Close the dialog when minimizing
          return;
        }

        setOpen(isOpen);

        // Only reset upload if user explicitly closes (not minimizing)
        // We detect minimizing by checking if the step is processing
        if (!isOpen && state.step !== 'processing') {
          resetUpload();
        }
      }}>
        <DialogContent className={cn("p-0 sm:max-w-[700px] max-h-[90vh] overflow-y-auto", dialogClassName)}>
          <DialogHeader className='border-b p-4 border-border sticky top-0 bg-background'>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>
                  {state.step === 'upload' && title}
                  {state.step === 'mapping' && 'Map CSV Fields'}
                  {state.step === 'processing' && 'Processing CSV File'}
                </DialogTitle>
                <DialogDescription>
                  {state.step === 'upload' && description}
                  {state.step === 'mapping' && 'Map your CSV columns to the required fields below.'}
                  {state.step === 'processing' && 'Your file is being processed. This may take a few moments.'}
                </DialogDescription>
              </div>
              {(showMinimize || state.step === 'processing') && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    toggleMinimized();
                    setOpen(false);
                  }}
                  className="h-6 w-6"
                >
                  <MinusCircle className="h-4 w-4" />
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className='p-4 h-[calc(100vh-100px)] overflow-y-auto'>
            {state.validationError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{state.validationError}</AlertDescription>
              </Alert>
            )}

            {/* Upload Step */}
            {state.step === 'upload' && (
              <div className="space-y-4">
                <div className="grid w-full items-center gap-2">
                  <Label htmlFor="csv-file">Select CSV File</Label>
                  <Input
                    id="csv-file"
                    type="file"
                    accept={props.acceptedFileTypes?.join(',')}
                    onChange={handleFileChange}
                  />
                  <p className="text-sm text-muted-foreground">
                    Supported formats: {props.acceptedFileTypes?.join(', ') || '.csv'}
                    {props.maxFileSize && ` • Max size: ${props.maxFileSize}MB`}
                  </p>
                </div>
              </div>
            )}

            {/* Mapping Step */}
            {state.step === 'mapping' && (
              <div className="space-y-6">
                {/* Saved Mappings */}
                {enableMappingPreferences && mappingPreferences.length > 0 && (
                  <div className="space-y-2">
                    <Label>Load Saved Mapping</Label>
                    <Popover open={state.openComboboxes['mapping']} onOpenChange={(open) => updateState({ openComboboxes: { ...state.openComboboxes, mapping: open } })}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between"
                        >
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
                              {mappingPreferences.map(mapping => (
                                <CommandItem
                                  key={mapping.name}
                                  value={mapping.name}
                                  onSelect={() => applySavedMapping(mapping.mapping)}
                                  className="flex items-center justify-between w-full"
                                >
                                  <span>{mapping.name}</span>
                                  <div className="flex items-center gap-1 ml-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleEditPreference(mapping);
                                      }}
                                      className="h-6 w-6 opacity-70 hover:opacity-100"
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleDeletePreference(mapping);
                                      }}
                                      className="h-6 w-6 text-red-500 hover:text-red-700 opacity-70 hover:opacity-100"
                                    >
                                      <Trash2 className="h-3 w-3 text-red-500" />
                                    </Button>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                )}

                {/* Field Mapping */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">Field Mapping</h4>
                    {enableMappingPreferences && (
                      <Button
                        variant="default"
                        size="sm"
                        icon={Save}
                        onClick={() => {
                          setEditingPreference(null);
                          setNewMappingName('');
                          setShowSaveMappingDialog(true);
                        }}
                      >
                        Save Mapping
                      </Button>
                    )}
                  </div>

                  {fields.map((field) => (
                    <div key={field.key} className="grid grid-cols-3 items-center gap-4">
                      <div className="space-y-1">
                        <Label className="text-sm font-medium">
                          {field.label}
                          {field.required !== false && <span className="text-red-500">*</span>}
                        </Label>
                        {field.description && (
                          <p className="text-xs text-muted-foreground">{field.description}</p>
                        )}
                      </div>

                      <div className="col-span-2">
                        <Popover
                          open={state.openComboboxes[field.key] || false}
                          onOpenChange={(open) =>
                            updateState({
                              openComboboxes: { ...state.openComboboxes, [field.key]: open }
                            })
                          }
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              className="w-full justify-between"
                            >
                              {state.headerMapping[field.key] || 'Select CSV column...'}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent>
                            <Command>
                              <CommandInput placeholder="Search columns..." />
                              <CommandList>
                                <CommandEmpty>No column found.</CommandEmpty>
                                <CommandGroup>
                                  <CommandItem
                                    onSelect={() => {
                                      handleMappingChange(field.key, '');
                                      updateState({
                                        openComboboxes: { ...state.openComboboxes, [field.key]: false }
                                      });
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        'mr-2 h-4 w-4',
                                        !state.headerMapping[field.key] ? 'opacity-100' : 'opacity-0'
                                      )}
                                    />
                                    -- Not mapped --
                                  </CommandItem>
                                  {state.csvHeaders.map((header) => (
                                    <CommandItem
                                      key={header}
                                      onSelect={() => {
                                        handleMappingChange(field.key, header);
                                        updateState({
                                          openComboboxes: { ...state.openComboboxes, [field.key]: false }
                                        });
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          'mr-2 h-4 w-4',
                                          state.headerMapping[field.key] === header
                                            ? 'opacity-100'
                                            : 'opacity-0'
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
            )}

            {/* Processing Step */}
            {state.step === 'processing' && (
              <div className="space-y-4 py-4">
                <Progress value={state.progress} className="h-2" />
                <p className="text-center text-sm text-muted-foreground">
                  {state.progress < 100 ? `Processing: ${Math.round(state.progress)}%` : 'Complete!'}
                </p>
              </div>
            )}

          </div>
          <DialogFooter className='p-4 border-t border-border sticky bottom-0 bg-background'>
            {state.step === 'upload' && (
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            )}

            {state.step === 'mapping' && (
              <>
                <Button variant="outline" onClick={() => updateState({ step: 'upload' })}>
                  Back
                </Button>
                <Button onClick={handleSubmit}>
                  Process File
                </Button>
              </>
            )}

            {state.step === 'processing' && (
              <Button variant="outline" onClick={resetUpload}>
                Cancel
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Mapping Dialog */}
      {showSaveMappingDialog && (
        <Dialog open={showSaveMappingDialog} onOpenChange={setShowSaveMappingDialog}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>
                {editingPreference ? 'Update Mapping Preference' : 'Save Mapping Preference'}
              </DialogTitle>
              <DialogDescription>
                {editingPreference
                  ? 'Update the name for this mapping configuration.'
                  : 'Give this mapping configuration a name so you can reuse it later.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="mapping-name">Mapping Name</Label>
                <Input
                  id="mapping-name"
                  value={newMappingName}
                  onChange={(e) => setNewMappingName(e.target.value)}
                  placeholder="e.g., Order Import Mapping"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowSaveMappingDialog(false);
                setEditingPreference(null);
              }}>
                Cancel
              </Button>
              <Button onClick={handleSaveMapping}>
                {editingPreference ? 'Update Mapping' : 'Save Mapping'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}