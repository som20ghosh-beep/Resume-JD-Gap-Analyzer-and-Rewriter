import { describe, expect, it } from "vitest";
import { extractArticleText } from "@/lib/jd/fetch-url";
import { ParseError } from "@/lib/parsers/errors";

const ARTICLE_HTML = `
<!doctype html>
<html>
  <head><title>Senior Backend Engineer</title></head>
  <body>
    <nav><a href="/">Home</a><a href="/jobs">Jobs</a></nav>
    <article>
      <h1>Senior Backend Engineer</h1>
      <p>We are looking for a Senior Backend Engineer to join Acme Corp. You will design and
      build scalable APIs used by millions of customers every day, working closely with the
      platform team to improve reliability and performance across our services.</p>
      <h2>Requirements</h2>
      <ul>
        <li>5+ years of experience with Node.js or Go</li>
        <li>Strong knowledge of PostgreSQL and distributed systems</li>
        <li>Experience with Kubernetes and Docker in production</li>
      </ul>
      <h2>Nice to have</h2>
      <ul>
        <li>Experience with Kafka or other streaming systems</li>
      </ul>
    </article>
    <footer>&copy; 2026 Acme Corp. All rights reserved. Privacy policy. Terms of service.</footer>
  </body>
</html>
`;

const NON_ARTICLE_HTML = `
<!doctype html>
<html>
  <head><title>Job Posting</title></head>
  <body>
    <script>console.log("tracking pixel init");</script>
    <div class="posting-widget">
      <div class="posting-header">Product Manager at Globex</div>
      <div class="posting-body">
        Globex is hiring a Product Manager to own our checkout experience end to end.
        You will partner with design and engineering to ship features that move key
        metrics, and you will own the roadmap for the payments team for the next year.
        Three or more years of B2C product management experience required.
      </div>
    </div>
  </body>
</html>
`;

const EMPTY_HTML = `<!doctype html><html><head><title>Untitled</title></head><body></body></html>`;

describe("extractArticleText", () => {
  it("extracts clean article text via Readability, stripping nav/footer chrome", () => {
    const text = extractArticleText(ARTICLE_HTML, "https://example.com/jobs/1");
    expect(text).toMatch(/Senior Backend Engineer/);
    expect(text).toMatch(/Kubernetes and Docker/);
    expect(text).not.toMatch(/Privacy policy/);
    expect(text).not.toMatch(/Home[\s\S]*Jobs/);
  });

  it("falls back to stripped body text when the page has no article-shaped markup", () => {
    const text = extractArticleText(NON_ARTICLE_HTML, "https://example.com/jobs/2");
    expect(text).toMatch(/Product Manager at Globex/);
    expect(text).toMatch(/checkout experience/);
    expect(text).not.toMatch(/tracking pixel/);
  });

  it("throws a typed error when the page has no meaningful content", () => {
    expect(() => extractArticleText(EMPTY_HTML, "https://example.com/empty")).toThrow(
      ParseError,
    );
  });
});
