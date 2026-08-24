import puppeteer from "puppeteer";
import type { Resume } from "@/lib/types";
import { AtsSafeTemplate } from "@/components/templates/ats-safe";

/** React template → HTML → puppeteer print-to-PDF (spec §2 stack table). A fresh browser is
 *  launched per export rather than pooled — simplicity over throughput for a single-user
 *  local app; revisit only if export volume ever makes launch overhead matter.
 *
 *  react-dom/server is imported dynamically, not statically: Next's bundler hard-blocks any
 *  module in an API route's import graph that statically imports it ("You're importing a
 *  component that imports react-dom/server"), since normally only Next's own rendering
 *  pipeline is supposed to touch it. A dynamic import happens at runtime, after bundling, so
 *  it isn't caught by that static analysis. */
export async function renderResumeAsPdf(resume: Resume): Promise<Buffer> {
  const { renderToStaticMarkup } = await import("react-dom/server");
  const html = "<!DOCTYPE html>" + renderToStaticMarkup(<AtsSafeTemplate resume={resume} />);

  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    // No external resources in this self-contained, inline-styled document — domcontentloaded
    // is sufficient and this puppeteer version's setContent no longer accepts networkidle*.
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    const pdf = await page.pdf({
      format: "letter",
      printBackground: true,
      margin: { top: "0", bottom: "0", left: "0", right: "0" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
