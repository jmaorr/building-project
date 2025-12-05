"use client";

import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { 
  ZoomIn, 
  ZoomOut, 
  ChevronLeft, 
  ChevronRight, 
  Download,
  FileText,
  Image as ImageIcon,
  File,
  Loader2,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// Dynamically import react-pdf to avoid SSR issues
const Document = dynamic(
  () => import("react-pdf").then((mod) => mod.Document),
  { ssr: false, loading: () => <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div> }
);

const Page = dynamic(
  () => import("react-pdf").then((mod) => mod.Page),
  { ssr: false }
);

// PDF.js worker setup (will run on client only)
let pdfWorkerInitialized = false;

interface FilePreviewProps {
  file: {
    id: string;
    name: string;
    url: string;
    type?: string | null;
    size?: number | null;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FilePreview({ file, open, onOpenChange }: FilePreviewProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fileType = getFileType(file.type, file.name);

  // Initialize PDF.js worker on client
  useEffect(() => {
    if (!pdfWorkerInitialized && typeof window !== "undefined") {
      import("react-pdf").then((pdfModule) => {
        pdfModule.pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfModule.pdfjs.version}/build/pdf.worker.min.mjs`;
        pdfWorkerInitialized = true;
      });
    }
  }, []);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
    setError(null);
  }, []);

  const onDocumentLoadError = useCallback((error: Error) => {
    console.error("PDF load error:", error);
    setLoading(false);
    setError("Failed to load PDF document");
  }, []);

  const goToPrevPage = () => setPageNumber((prev) => Math.max(prev - 1, 1));
  const goToNextPage = () => setPageNumber((prev) => Math.min(prev + 1, numPages || 1));
  const zoomIn = () => setScale((prev) => Math.min(prev + 0.25, 3));
  const zoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5));
  const resetZoom = () => setScale(1);

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = file.url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={true}>
      <DialogContent className="max-w-4xl w-[95vw] h-[90vh] p-0 gap-0 flex flex-col" showCloseButton={false}>
        <DialogHeader className="px-4 py-3 border-b flex-row items-center justify-between space-y-0 gap-4">
          <DialogTitle className="text-sm font-medium truncate flex-1">
            {file.name}
          </DialogTitle>
          <div className="flex items-center gap-1">
            {fileType === "pdf" && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={zoomOut}
                  disabled={scale <= 0.5}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  onClick={resetZoom}
                >
                  {Math.round(scale * 100)}%
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={zoomIn}
                  disabled={scale >= 3}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleDownload}
              title="Download"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onOpenChange(false)}
              title="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto bg-muted/30 flex items-center justify-center p-4">
          {loading && (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="text-sm">Loading...</span>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <FileText className="h-12 w-12" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {fileType === "pdf" && !error && (
            <div className="flex flex-col items-center">
              <Document
                file={file.url}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={null}
                className="flex justify-center"
              >
                <Page
                  pageNumber={pageNumber}
                  scale={scale}
                  loading={null}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  className="shadow-lg"
                />
              </Document>
            </div>
          )}

          {fileType === "image" && (
            <img
              src={file.url}
              alt={file.name}
              className="max-w-full max-h-full object-contain shadow-lg rounded"
              onLoad={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                setError("Failed to load image");
              }}
            />
          )}

          {fileType === "other" && !loading && (
            <div className="flex flex-col items-center gap-4 text-muted-foreground">
              <File className="h-16 w-16" />
              <div className="text-center">
                <p className="font-medium">{file.name}</p>
                <p className="text-sm">Preview not available for this file type</p>
                <Button className="mt-4" onClick={handleDownload}>
                  <Download className="mr-2 h-4 w-4" />
                  Download File
                </Button>
              </div>
            </div>
          )}
        </div>

        {fileType === "pdf" && numPages && numPages > 1 && (
          <div className="px-4 py-3 border-t flex items-center justify-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={goToPrevPage}
              disabled={pageNumber <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground min-w-[100px] text-center">
              Page {pageNumber} of {numPages}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={goToNextPage}
              disabled={pageNumber >= numPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Helper function to determine file type
function getFileType(mimeType?: string | null, fileName?: string): "pdf" | "image" | "other" {
  if (mimeType) {
    if (mimeType === "application/pdf") return "pdf";
    if (mimeType.startsWith("image/")) return "image";
  }
  
  if (fileName) {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (ext === "pdf") return "pdf";
    if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico"].includes(ext || "")) {
      return "image";
    }
  }
  
  return "other";
}

// File thumbnail component
interface FileThumbnailProps {
  file: {
    id: string;
    name: string;
    url: string;
    type?: string | null;
  };
  className?: string;
  onClick?: () => void;
}

export function FileThumbnail({ file, className, onClick }: FileThumbnailProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const fileType = getFileType(file.type, file.name);

  const getFileIcon = () => {
    switch (fileType) {
      case "pdf":
        return <FileText className="h-6 w-6 text-red-500" />;
      case "image":
        return <ImageIcon className="h-6 w-6 text-blue-500" />;
      default:
        return <File className="h-6 w-6 text-muted-foreground" />;
    }
  };

  if (fileType === "image" && !error) {
    return (
      <div 
        className={cn(
          "relative aspect-square bg-muted rounded overflow-hidden cursor-pointer hover:ring-2 hover:ring-brand/50 transition-all",
          className
        )}
        onClick={onClick}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
        <img
          src={file.url}
          alt={file.name}
          className={cn(
            "w-full h-full object-cover transition-opacity",
            loading ? "opacity-0" : "opacity-100"
          )}
          onLoad={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setError(true);
          }}
        />
      </div>
    );
  }

  // PDF thumbnail - show icon instead of preview for better performance
  if (fileType === "pdf") {
    return (
      <div 
        className={cn(
          "relative aspect-square bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/30 rounded overflow-hidden cursor-pointer hover:ring-2 hover:ring-brand/50 transition-all flex items-center justify-center",
          className
        )}
        onClick={onClick}
      >
        <FileText className="h-8 w-8 text-red-500" />
        <div className="absolute bottom-1 right-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
          PDF
        </div>
      </div>
    );
  }

  // Default icon thumbnail
  return (
    <div 
      className={cn(
        "relative aspect-square bg-muted rounded overflow-hidden cursor-pointer hover:ring-2 hover:ring-brand/50 transition-all flex items-center justify-center",
        className
      )}
      onClick={onClick}
    >
      {getFileIcon()}
      <div className="absolute bottom-1 left-1 right-1">
        <span className="text-[10px] text-muted-foreground truncate block text-center">
          {file.name.split(".").pop()?.toUpperCase()}
        </span>
      </div>
    </div>
  );
}

// Export helper
export { getFileType };

