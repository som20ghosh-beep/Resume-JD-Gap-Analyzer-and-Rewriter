"use client";

import { useRef, useState } from "react";
import { FileText, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = [".pdf", ".docx"];

function isAccepted(file: File): boolean {
  const name = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

export function ResumeDropzone({
  file,
  onFileSelected,
  error,
}: {
  file: File | null;
  onFileSelected: (file: File | null, error?: string) => void;
  error?: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = (files: FileList | null) => {
    const picked = files?.[0];
    if (!picked) return;
    if (!isAccepted(picked)) {
      onFileSelected(null, "Only PDF and DOCX files are supported.");
      return;
    }
    if (picked.size > MAX_BYTES) {
      onFileSelected(null, "File exceeds the 5 MB limit.");
      return;
    }
    onFileSelected(picked);
  };

  return (
    <div
      className={cn(
        "flex min-h-48 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors",
        isDragging ? "border-primary bg-muted/50" : "border-border",
        error && "border-status-critical/50",
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
        // Chromium sets an internal caret-color style on file inputs before React hydrates,
        // which React then reports as a mismatch — harmless, not app-controlled.
        suppressHydrationWarning
      />
      {file ? (
        <>
          <FileText className="size-8 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm font-medium text-foreground">{file.name}</p>
          <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
          <Button size="sm" variant="ghost" onClick={() => onFileSelected(null)}>
            <X /> Remove
          </Button>
        </>
      ) : (
        <>
          <Upload className="size-8 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-foreground">Drag & drop your resume here</p>
          <p className="text-xs text-muted-foreground">PDF or DOCX, up to 5 MB</p>
          <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()}>
            Choose file
          </Button>
        </>
      )}
      {error && (
        <p role="alert" className="text-xs text-status-critical">
          {error}
        </p>
      )}
    </div>
  );
}
