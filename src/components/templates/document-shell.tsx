import type { ReactNode } from "react";

/** The `<html>/<head>/<body>` wrapper every template needs for standalone rendering (fed to
 *  puppeteer via renderToStaticMarkup, or portaled into a preview iframe — never mounted as a
 *  Next.js page, so next/head doesn't apply here). */
export function DocumentShell({
  title,
  styles,
  children,
}: {
  title: string;
  styles: string;
  children: ReactNode;
}) {
  return (
    <html>
      {/* eslint-disable-next-line @next/next/no-head-element -- see the module doc comment
          above: this is never part of the Next.js page-rendering pipeline. */}
      <head>
        <meta charSet="utf-8" />
        <title>{title}</title>
        <style dangerouslySetInnerHTML={{ __html: styles }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
