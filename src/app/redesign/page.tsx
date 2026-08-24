"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Loader2, TriangleAlert } from "lucide-react";
import { useReviewStore } from "@/store/review-store";
import { downloadExport } from "@/lib/api-client";
import { TEMPLATE_IDS, TEMPLATES, type TemplateId } from "@/components/templates/registry";
import { IframePreview } from "@/components/templates/iframe-preview";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LoadingRedirect } from "@/components/status/loading-redirect";

type ExportFormat = "pdf" | "docx" | "txt";
const EXPORT_FORMATS: { format: ExportFormat; label: string }[] = [
  { format: "pdf", label: "PDF" },
  { format: "docx", label: "DOCX" },
  { format: "txt", label: "TXT" },
];

// The iframe is a real Letter page (8.5x11in at 100px/in) scaled down to fit the preview
// pane — so the preview reflects true page proportions, including how close Compact gets to
// fitting one page, rather than an arbitrary aspect ratio.
const PAGE_WIDTH = 850;
const PAGE_HEIGHT = 1100;
const MAX_PREVIEW_WIDTH = 480;

export default function RedesignPage() {
  const router = useRouter();
  const hasApplied = useReviewStore((s) => s.hasApplied);
  const newResume = useReviewStore((s) => s.newResume);

  const [templateId, setTemplateId] = useState<TemplateId>("ats-safe");
  const [downloading, setDownloading] = useState<ExportFormat | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Measured rather than hardcoded: on a narrow phone viewport a fixed 480px preview would
  // overflow the screen, so the scale is derived from however wide the container actually
  // renders (capped at MAX_PREVIEW_WIDTH on larger screens).
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [previewWidth, setPreviewWidth] = useState(MAX_PREVIEW_WIDTH);

  useEffect(() => {
    const el = previewContainerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setPreviewWidth(width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const previewScale = previewWidth / PAGE_WIDTH;

  useEffect(() => {
    if (!hasApplied) router.replace("/");
  }, [hasApplied, router]);

  if (!hasApplied || !newResume) return <LoadingRedirect />;

  const PreviewBody = TEMPLATES[templateId].body;

  const handleDownload = async (format: ExportFormat) => {
    setError(null);
    setDownloading(format);
    try {
      await downloadExport(newResume.id, format, templateId);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to export as ${format.toUpperCase()}.`);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-4 sm:p-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Redesign</h1>
        <p className="text-sm text-muted-foreground">
          Choose a look — your content stays exactly the same, only presentation changes.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-[260px_1fr]">
        <RadioGroup value={templateId} onValueChange={(v) => setTemplateId(v as TemplateId)}>
          {TEMPLATE_IDS.map((id) => (
            <Label
              key={id}
              htmlFor={`template-${id}`}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4 has-data-checked:border-primary has-data-checked:bg-muted/50"
            >
              <RadioGroupItem value={id} id={`template-${id}`} className="mt-1" />
              <span>
                <span className="block text-sm font-medium text-foreground">{TEMPLATES[id].name}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{TEMPLATES[id].description}</span>
              </span>
            </Label>
          ))}
        </RadioGroup>

        <Card className="flex items-center justify-center bg-muted/30 p-6">
          <div
            ref={previewContainerRef}
            className="w-full max-w-[480px] overflow-hidden rounded border border-border bg-white shadow-sm"
            style={{ height: PAGE_HEIGHT * previewScale }}
          >
            <IframePreview
              styles={TEMPLATES[templateId].styles}
              style={{
                width: PAGE_WIDTH,
                height: PAGE_HEIGHT,
                border: "none",
                transform: `scale(${previewScale})`,
                transformOrigin: "top left",
              }}
            >
              <PreviewBody resume={newResume} />
            </IframePreview>
          </div>
        </Card>
      </div>

      {error && (
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertTitle>Couldn&apos;t export your resume</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap gap-2">
        {EXPORT_FORMATS.map(({ format, label }) => (
          <Button
            key={format}
            variant="outline"
            onClick={() => handleDownload(format)}
            disabled={downloading !== null}
            aria-busy={downloading === format}
          >
            {downloading === format ? <Loader2 className="animate-spin" /> : <Download />}
            {label}
          </Button>
        ))}
      </div>
    </main>
  );
}
