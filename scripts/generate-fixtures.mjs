// Generates the synthetic resume fixtures under tests/fixtures/ used by the parser unit
// tests. Re-run with `node scripts/generate-fixtures.mjs` if you change a fixture's shape.
// There are no real resumes here (privacy) — each fixture is built to exercise one specific
// parsing challenge called out in the spec (multi-column, tables, unusual headings, a
// scanned/no-text-layer PDF), rather than to look like a realistic resume.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import PDFDocument from "pdfkit";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Header,
  Table,
  TableRow,
  TableCell,
  WidthType,
} from "docx";

const OUT_DIR = path.join(import.meta.dirname, "..", "tests", "fixtures");
await mkdir(OUT_DIR, { recursive: true });

function pdfToBuffer(draw) {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: "LETTER", margin: 50 });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    draw(doc);
    doc.end();
  });
}

// 1. Standard single-column resume: every section, clean structure.
const standardPdf = await pdfToBuffer((doc) => {
  doc.fontSize(18).text("Jane Doe");
  doc.fontSize(10).text("jane.doe@example.com | (512) 555-0182 | Austin, TX");
  doc.text("https://linkedin.com/in/janedoe");
  doc.moveDown();

  doc.fontSize(13).text("Summary");
  doc
    .fontSize(10)
    .text(
      "Results-driven software engineer with 6 years of experience building scalable web applications.",
    );
  doc.moveDown();

  doc.fontSize(13).text("Experience");
  doc.fontSize(10).text("Acme Corp — Senior Software Engineer");
  doc.text("Jan 2021 - Present");
  doc.text("- Led migration of a monolith to microservices, cutting deploy time 40%");
  doc.text("- Mentored 3 junior engineers on system design");
  doc.moveDown(0.5);
  doc.text("Beta Inc — Software Engineer");
  doc.text("Jun 2018 - Dec 2020");
  doc.text("- Built REST APIs serving 2 million requests per day");
  doc.text("- Set up Jenkins pipelines for continuous integration");
  doc.moveDown();

  doc.fontSize(13).text("Education");
  doc.fontSize(10).text("University of Texas");
  doc.text("Bachelor of Science, Computer Science, 2018");
  doc.moveDown();

  doc.fontSize(13).text("Skills");
  doc.fontSize(10).text("Languages: JavaScript, TypeScript, Python");
  doc.text("Cloud: AWS, Docker, Kubernetes");
  doc.moveDown();

  doc.fontSize(13).text("Certifications");
  doc.fontSize(10).text("AWS Certified Solutions Architect, Amazon Web Services, 2022");
});
await writeFile(path.join(OUT_DIR, "resume-standard.pdf"), standardPdf);

// 2. Two-column layout: a left sidebar (contact + skills) running alongside the right
// column (summary + experience) for the same vertical span, so the two overlap in y.
const twoColumnPdf = await pdfToBuffer((doc) => {
  const leftX = 50;
  const rightX = 320;
  let leftY = 50;
  let rightY = 50;

  const left = (t, size = 10) => {
    doc.fontSize(size).text(t, leftX, leftY, { width: 240, lineBreak: false });
    leftY += size + 6;
  };
  const right = (t, size = 10) => {
    doc.fontSize(size).text(t, rightX, rightY, { width: 240, lineBreak: false });
    rightY += size + 6;
  };

  left("John Smith", 16);
  left("john.smith@example.com");
  left("(212) 555-0199");
  left("New York, NY");
  left("Skills");
  left("JavaScript, SQL, AWS");
  left("Docker, React, Node.js");

  right("Summary", 13);
  right("Backend engineer focused on distributed systems and API design.");
  right("Experience", 13);
  right("Globex Corp — Backend Engineer");
  right("Mar 2019 - Present");
  right("- Rebuilt the billing service, cutting latency 25%");
  right("Initech — Junior Developer");
  right("Jul 2016 - Feb 2019");
  right("- Wrote integration tests for the payments team");
});
await writeFile(path.join(OUT_DIR, "resume-two-column.pdf"), twoColumnPdf);

// 3. A skills matrix rendered as a real grid (3 columns x 3 rows at fixed x-positions
// repeated across rows) — the defining signature our table detector looks for.
const tablePdf = await pdfToBuffer((doc) => {
  doc.fontSize(18).text("Alex Rivera");
  doc.fontSize(10).text("alex.rivera@example.com | (303) 555-0147");
  doc.moveDown();

  doc.fontSize(13).text("Skills Matrix");
  doc.fontSize(10);
  const cols = [50, 220, 390];
  const rows = [
    ["JavaScript", "Python", "Go"],
    ["React", "Django", "Docker"],
    ["AWS", "PostgreSQL", "Kubernetes"],
  ];
  let y = doc.y;
  for (const row of rows) {
    row.forEach((cell, i) => doc.text(cell, cols[i], y, { lineBreak: false }));
    y += 18;
  }
  doc.y = y + 10;
  doc.moveDown();

  doc.fontSize(13).text("Experience");
  doc.fontSize(10).text("DataFlow Inc — Data Engineer");
  doc.text("Feb 2020 - Present");
  doc.text("- Built ETL pipelines processing 500GB daily");
});
await writeFile(path.join(OUT_DIR, "resume-table.pdf"), tablePdf);

// 4. Unusual section headings: "Career Journey" isn't in the experience synonym list, and
// "What I Bring" has no synonym at all — both should surface as parseWarnings rather than
// silently vanishing into the wrong section or getting dropped.
const unusualHeadingsPdf = await pdfToBuffer((doc) => {
  doc.fontSize(18).text("Morgan Lee");
  doc.fontSize(10).text("morgan.lee@example.com | (415) 555-0133");
  doc.moveDown();

  doc.fontSize(13).text("What I Bring");
  doc
    .fontSize(10)
    .text("A pragmatic engineer who ships reliable software and communicates clearly.");
  doc.moveDown();

  doc.fontSize(13).text("Career Journey");
  doc.fontSize(10).text("Nimbus Systems — Product Engineer");
  doc.text("Aug 2017 - Present");
  doc.text("- Owns the notifications platform end to end");
  doc.moveDown();

  doc.fontSize(13).text("Skills");
  doc.fontSize(10).text("TypeScript, GraphQL, PostgreSQL");
});
await writeFile(path.join(OUT_DIR, "resume-unusual-headings.pdf"), unusualHeadingsPdf);

// 5. A "scanned" PDF: vector drawing only, zero text operators. A real scanned resume is a
// rasterized image with no text layer; drawn shapes with no text produce the same signal our
// detector relies on (near-zero extractable text items despite the page having content),
// without needing to hand-roll binary image data just for a fixture.
const scannedPdf = await pdfToBuffer((doc) => {
  doc.rect(50, 50, 400, 20).fill("#333333");
  doc.rect(50, 100, 500, 300).stroke("#999999");
  doc.circle(300, 500, 40).fill("#cccccc");
});
await writeFile(path.join(OUT_DIR, "resume-scanned.pdf"), scannedPdf);

// 6. Standard DOCX: mirrors the standard PDF, using real Word heading styles + bold runs.
function docxHeading(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_2 });
}
function docxBody(text) {
  return new Paragraph({ children: [new TextRun(text)] });
}

const standardDocx = new Document({
  sections: [
    {
      children: [
        new Paragraph({ text: "Priya Nair", heading: HeadingLevel.HEADING_1 }),
        docxBody("priya.nair@example.com | (617) 555-0111 | Boston, MA"),
        docxHeading("Summary"),
        docxBody(
          "Full-stack engineer with a focus on developer tooling and internal platforms.",
        ),
        docxHeading("Experience"),
        docxBody("Vertex Labs — Platform Engineer"),
        docxBody("May 2019 - Present"),
        new Paragraph({ text: "Built the internal deploy CLI used by 40 engineers", bullet: { level: 0 } }),
        new Paragraph({ text: "Reduced CI time from 18 to 6 minutes", bullet: { level: 0 } }),
        docxHeading("Education"),
        docxBody("Boston University"),
        docxBody("Bachelor of Science, Computer Science, 2019"),
        docxHeading("Skills"),
        docxBody("Languages: Go, TypeScript, SQL"),
      ],
    },
  ],
});
await writeFile(path.join(OUT_DIR, "resume-standard.docx"), await Packer.toBuffer(standardDocx));

// 7. Messy DOCX: contact info stuffed in the header (ignored by mammoth, so it should
// surface as a warning), a real Word table, and a two-column section.
const messyDocx = new Document({
  sections: [
    {
      headers: {
        default: new Header({
          children: [new Paragraph("sam.okafor@example.com | (720) 555-0166")],
        }),
      },
      properties: { column: { count: 2 } },
      children: [
        new Paragraph({ text: "Sam Okafor", heading: HeadingLevel.HEADING_1 }),
        docxHeading("Experience"),
        docxBody("Hollow Peak — Support Engineer"),
        docxBody("Oct 2020 - Present"),
        new Paragraph({ text: "Resolved over 1,000 customer tickets", bullet: { level: 0 } }),
        docxHeading("Skills Matrix"),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph("Zendesk")] }),
                new TableCell({ children: [new Paragraph("SQL")] }),
                new TableCell({ children: [new Paragraph("Jira")] }),
              ],
            }),
          ],
        }),
      ],
    },
  ],
});
await writeFile(path.join(OUT_DIR, "resume-docx-messy.docx"), await Packer.toBuffer(messyDocx));

console.log("Fixtures written to", OUT_DIR);
