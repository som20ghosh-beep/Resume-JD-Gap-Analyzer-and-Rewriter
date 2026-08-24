"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** Renders `children` live inside an isolated iframe document, styled with `styles` — used
 *  for the template gallery's preview (spec §6 screen 5: "live preview of the user's actual
 *  content, not lorem ipsum"). A portal, not renderToStaticMarkup: this runs entirely in the
 *  browser, so it's genuinely live (re-renders on every keystroke/edit) and never needs
 *  react-dom/server at all — that import is only required, and only blocked by Next's
 *  bundler, on the server-side PDF export path (see lib/export/pdf.tsx). */
export function IframePreview({
  styles,
  children,
  className,
  style,
}: {
  styles: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(`<!DOCTYPE html><html><head><style>${styles}</style></head><body></body></html>`);
    doc.close();
    setMountNode(doc.body);
  }, [styles]);

  return (
    <>
      <iframe ref={iframeRef} title="Resume preview" className={className} style={style} />
      {mountNode && createPortal(children, mountNode)}
    </>
  );
}
