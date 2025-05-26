"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { X, Upload, AlertCircle, MinusCircle, Check, ChevronsUpDown } from "lucide-react"
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
} from "@lorrigo/ui/components"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { uploadCSV } from "@/lib/actions/csv"
import { cn } from "@lorrigo/ui/lib/utils"

// Define the expected headers for our system
const EXPECTED_HEADERS = ["order_id", "customer_name", "product_name", "quantity", "price", "status"]

export function CSVUploadModal() {
   const [open, setOpen] = useState(false)
   const [file, setFile] = useState<File | null>(null)
   const [csvHeaders, setCsvHeaders] = useState<string[]>([])
   const [headerMapping, setHeaderMapping] = useState<Record<string, string>>({})
   const [step, setStep] = useState<"upload" | "mapping" | "processing">("upload")
   const [validationError, setValidationError] = useState<string | null>(null)
   const [minimized, setMinimized] = useState(false)
   const [progress, setProgress] = useState(0)
   const queryClient = useQueryClient()

   // Add this state for managing combobox open states
   const [openComboboxes, setOpenComboboxes] = useState<Record<string, boolean>>({})


   const uploadMutation = useMutation({
      mutationFn: async (data: FormData) => {
         // Save progress state to localStorage
         localStorage.setItem("csvUploadProgress", JSON.stringify({ status: "processing", startTime: Date.now() }))
         return uploadCSV(data)
      },
      onSuccess: (data) => {
         // Set progress to 100% on success
         setProgress(100)

         // Clear progress and reset state after a brief delay to show completion
         setTimeout(() => {
            localStorage.removeItem("csvUploadProgress")
            setStep("upload")
            setFile(null)
            setCsvHeaders([])
            setHeaderMapping({})
            setProgress(0)

               toast.success(`Successfully processed rows.`)
            // if (data.success) {
            //    toast.success(`Successfully processed ${data.processedRows} rows.`)
            //    setOpen(false)
            // } else if (data.errors) {
            //    toast.error("There were errors in your CSV file. See details below.")
            //    handleErrorCSV(data.errors)
            // }
         }, 1000) // 1 second delay to show 100% completion
      },
      onError: (error) => {
         // Clear progress and reset state
         localStorage.removeItem("csvUploadProgress")
         setStep("upload")
         setFile(null)
         setCsvHeaders([])
         setHeaderMapping({})
         setProgress(0)

         toast.error("An unexpected error occurred during upload.")
      },
   })

   const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      setValidationError(null)
      const selectedFile = e.target.files?.[0]
      if (!selectedFile) return

      if (!selectedFile.name.endsWith(".csv")) {
         setValidationError("Please upload a CSV file.")
         return
      }

      setFile(selectedFile)

      try {
         // Parse CSV headers
         const text = await selectedFile.text()
         const lines = text.split("\n")

         if (lines.length < 2) {
            setValidationError("CSV file must contain at least 2 rows (headers and data).")
            return
         }

         const headers = lines[0]?.split(",").map((h) => h.trim()) ?? []
         setCsvHeaders(headers)

         // Initialize mapping with best guesses
         const initialMapping: Record<string, string> = {}
         EXPECTED_HEADERS.forEach((expectedHeader) => {
            const matchingHeader = headers.find((h) => h.toLowerCase().includes(expectedHeader.toLowerCase()))
            if (matchingHeader) {
               initialMapping[expectedHeader] = matchingHeader
            }
         })

         setHeaderMapping(initialMapping)
         setStep("mapping")
      } catch (error) {
         setValidationError("Failed to parse CSV file. Please check the format.")
      }
   }

   const handleErrorCSV = (errorCSV: string) => {
      // Create a download link for the error CSV
      const blob = new Blob([errorCSV], { type: "text/csv" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "upload_errors.csv"
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url) // Clean up the URL object
   }

   const handleSubmit = () => {
      // Validate that all required fields are mapped
      const unmappedFields = EXPECTED_HEADERS.filter((header) => !headerMapping[header])

      if (unmappedFields.length > 0) {
         setValidationError(`Please map all required fields: ${unmappedFields.join(", ")}`)
         return
      }

      if (!file) return

      const formData = new FormData()
      formData.append("file", file)
      formData.append("mapping", JSON.stringify(headerMapping))

      setStep("processing")
      setProgress(0) // Reset progress before starting
      uploadMutation.mutate(formData)
   }

   const handleMappingChange = (expectedHeader: string, csvHeader: string) => {
      setHeaderMapping((prev) => ({
         ...prev,
         [expectedHeader]: csvHeader,
      }))
   }

   const toggleMinimized = () => {
      setMinimized(!minimized)
   }

   const resetUpload = () => {
      if (uploadMutation.isPending) {
         if (confirm("Are you sure you want to cancel the upload?")) {
            // In a real app, you would also need to cancel the server action
            localStorage.removeItem("csvUploadProgress")
            setStep("upload")
            setFile(null)
            setCsvHeaders([])
            setHeaderMapping({})
            setProgress(0)
         }
      } else {
         localStorage.removeItem("csvUploadProgress")
         setStep("upload")
         setFile(null)
         setCsvHeaders([])
         setHeaderMapping({})
         setProgress(0)
      }
   }

   // Render minimized version when minimized
   if (open && minimized && step === "processing") {
      return (
         <div className="fixed bottom-4 right-4 bg-background border rounded-lg shadow-lg p-4 w-64 z-50">
            <div className="flex justify-between items-center mb-2">
               <h3 className="text-sm font-medium">CSV Upload</h3>
               <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={toggleMinimized} className="h-5 w-5">
                     <X className="h-4 w-4" />
                  </Button>
               </div>
            </div>
            <Progress value={progress} className="h-2 mb-2" />
            <p className="text-xs text-muted-foreground">
               {progress < 100 ? `Uploading: ${Math.round(progress)}%` : "Processing complete!"}
            </p>
         </div>
      )
   }


   // Check for existing upload in progress on component mount
   useEffect(() => {
      const savedProgress = localStorage.getItem("csvUploadProgress")
      if (savedProgress) {
         const progress = JSON.parse(savedProgress)
         if (progress.status === "processing") {
            setStep("processing")
            setOpen(true)
            // Reconnect to the upload status
            queryClient.invalidateQueries({ queryKey: ["csvUpload"] })
         }
      }
   }, [queryClient])



   // Progress bar update effect
   useEffect(() => {
      let interval: NodeJS.Timeout | null = null

      if (step === "processing" && uploadMutation.isPending) {
         interval = setInterval(() => {
            setProgress((prev) => {
               // More realistic progress simulation
               const increment = Math.random() * 5 + 2 // Random increment between 2-7%
               const newProgress = prev + increment
               return newProgress > 95 ? 95 : newProgress // Cap at 95% until completion
            })
         }, 500) // Update every 500ms for smoother animation
      } else if (step !== "processing") {
         setProgress(0)
      }

      return () => {
         if (interval) {
            clearInterval(interval)
         }
      }
   }, [step, uploadMutation.isPending])
   return (
      <>
         <Button onClick={() => setOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Upload Orders via CSV
         </Button>

         <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-[600px]">
               <DialogHeader>
                  <DialogTitle>
                     {step === "upload" && "Upload CSV File"}
                     {step === "mapping" && "Map CSV Fields"}
                     {step === "processing" && "Processing CSV File"}
                  </DialogTitle>
                  <DialogDescription>
                     {step === "upload" && "Upload a CSV file containing order data."}
                     {step === "mapping" && "Map your CSV columns to our required fields."}
                     {step === "processing" && "Your file is being processed. This may take a few moments."}
                  </DialogDescription>
               </DialogHeader>

               {validationError && (
                  <Alert variant="destructive">
                     <AlertCircle className="h-4 w-4" />
                     <AlertTitle>Error</AlertTitle>
                     <AlertDescription>{validationError}</AlertDescription>
                  </Alert>
               )}

               {step === "upload" && (
                  <div className="grid w-full max-w-sm items-center gap-1.5">
                     <Label htmlFor="csv-file">CSV File</Label>
                     <Input id="csv-file" type="file" accept=".csv" onChange={handleFileChange} />
                     <p className="text-sm text-muted-foreground mt-2">
                        File must be in CSV format and contain at least 2 rows.
                     </p>
                  </div>
               )}

               {step === "mapping" && (
                  <div className="grid gap-4 py-4">
                     <div className="space-y-4">
                        {EXPECTED_HEADERS.map((expectedHeader) => (
                           <div key={expectedHeader} className="grid grid-cols-2 items-center gap-4">
                              <Label htmlFor={`map-${expectedHeader}`} className="text-right">
                                 {expectedHeader.replace(/_/g, " ")}:
                              </Label>
                              <Popover
                                 open={openComboboxes[expectedHeader] || false}
                                 onOpenChange={(open) => setOpenComboboxes((prev) => ({ ...prev, [expectedHeader]: open }))}
                              >
                                 <PopoverTrigger asChild>
                                    <Button
                                       variant="outline"
                                       role="combobox"
                                       aria-expanded={openComboboxes[expectedHeader] || false}
                                       className="justify-between"
                                    >
                                       {headerMapping[expectedHeader]
                                          ? csvHeaders.find((header) => header === headerMapping[expectedHeader])
                                          : "Select a CSV column..."}
                                       <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                 </PopoverTrigger>
                                 <PopoverContent className="w-[300px] p-0">
                                    <Command>
                                       <CommandInput placeholder="Search columns..." />
                                       <CommandList>
                                          <CommandEmpty>No column found.</CommandEmpty>
                                          <CommandGroup>
                                             <CommandItem
                                                value="no_mapping"
                                                onSelect={() => {
                                                   handleMappingChange(expectedHeader, "")
                                                   setOpenComboboxes((prev) => ({ ...prev, [expectedHeader]: false }))
                                                }}
                                             >
                                                <Check
                                                   className={cn(
                                                      "mr-2 h-4 w-4",
                                                      !headerMapping[expectedHeader] ? "opacity-100" : "opacity-0",
                                                   )}
                                                />
                                                -- Not mapped --
                                             </CommandItem>
                                             {csvHeaders.map((header) => (
                                                <CommandItem
                                                   key={header}
                                                   value={header}
                                                   onSelect={() => {
                                                      handleMappingChange(expectedHeader, header)
                                                      setOpenComboboxes((prev) => ({ ...prev, [expectedHeader]: false }))
                                                   }}
                                                >
                                                   <Check
                                                      className={cn(
                                                         "mr-2 h-4 w-4",
                                                         headerMapping[expectedHeader] === header ? "opacity-100" : "opacity-0",
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
                        ))}
                     </div>
                  </div>
               )}

               {step === "processing" && (
                  <div className="space-y-4 py-4">
                     <Progress value={progress} className="h-2" />
                     <p className="text-center text-sm text-muted-foreground">
                        {progress < 100 ? `Uploading: ${Math.round(progress)}%` : "Processing complete!"}
                     </p>
                     <div className="flex justify-end">
                        <Button variant="outline" size="sm" onClick={toggleMinimized}>
                           <MinusCircle className="mr-2 h-4 w-4" />
                           Minimize
                        </Button>
                     </div>
                  </div>
               )}

               <DialogFooter>
                  {step === "upload" && (
                     <Button variant="outline" onClick={() => setOpen(false)}>
                        Cancel
                     </Button>
                  )}

                  {step === "mapping" && (
                     <>
                        <Button variant="outline" onClick={() => setStep("upload")}>
                           Back
                        </Button>
                        <Button onClick={handleSubmit}>Upload Orders</Button>
                     </>
                  )}

                  {step === "processing" && (
                     <Button variant="outline" onClick={resetUpload}>
                        Cancel Upload
                     </Button>
                  )}
               </DialogFooter>
            </DialogContent>
         </Dialog>
      </>
   )
}