import PDFDocument from "pdfkit";
import type { ExportMeta, ReportPayload, ReportRow } from "./dtos";

function csvEscape(value: string | number | null): string {
  if (value === null || value === undefined) {
    return "";
  }

  const asString = String(value);
  if (/[",\n]/.test(asString)) {
    return `"${asString.replace(/"/g, '""')}"`;
  }

  return asString;
}

export function buildCsv(reportPayload: ReportPayload): Buffer {
  const header = [
    "Username",
    "Full Name",
    "Date",
    "Check In",
    "Check Out",
    "Hours",
  ];

  const lines = [header.join(",")];

  for (const row of reportPayload.rows) {
    lines.push(
      [
        csvEscape(row.username),
        csvEscape(row.fullName),
        csvEscape(row.date),
        csvEscape(row.checkIn),
        csvEscape(row.checkOut),
        csvEscape(row.hours),
      ].join(","),
    );
  }

  lines.push("");
  lines.push(`Total Hours,${csvEscape(reportPayload.totals.hours)}`);
  lines.push(`Total Records,${csvEscape(reportPayload.totals.records)}`);
  lines.push(`Total Users,${csvEscape(reportPayload.totals.users)}`);

  return Buffer.from(lines.join("\n"), "utf8");
}

function drawPdfTableHeader(
  doc: PDFKit.PDFDocument,
  columns: Array<{ label: string; width: number }>,
  startX: number,
  startY: number,
): void {
  let x = startX;
  doc.rect(startX, startY - 2, 520, 20).fill("#F58321");
  doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(9);

  for (const column of columns) {
    doc.text(column.label, x + 4, startY + 3, {
      width: column.width - 8,
      align: "left",
    });
    x += column.width;
  }

  doc.fillColor("#111111").font("Helvetica");
}

function drawPdfRow(
  doc: PDFKit.PDFDocument,
  row: ReportRow,
  columns: Array<{ key: keyof ReportRow | "hoursLabel"; width: number }>,
  startX: number,
  startY: number,
): void {
  const rowHeight = 20;
  doc.rect(startX, startY, 520, rowHeight).strokeColor("#E5E7EB").lineWidth(0.5).stroke();

  let x = startX;
  for (const column of columns) {
    const value =
      column.key === "hoursLabel"
        ? row.hours.toFixed(2)
        : ((row[column.key] ?? "") as string | number);

    doc.text(String(value), x + 4, startY + 5, {
      width: column.width - 8,
      align: "left",
      ellipsis: true,
    });

    x += column.width;
  }
}

export async function buildPdf(
  reportPayload: ReportPayload,
  meta: ExportMeta,
): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "A4",
    margin: 36,
    compress: true,
  });

  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", (error) => reject(error));
  });

  doc.rect(0, 0, doc.page.width, 70).fill("#F58321");
  doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(18).text(meta.title, 36, 24);

  doc.fillColor("#0B1523").font("Helvetica").fontSize(10);
  doc.text(`Date Range: ${meta.from} to ${meta.to}`, 36, 88);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 36, 102);

  doc.moveTo(36, 122).lineTo(doc.page.width - 36, 122).strokeColor("#D1D5DB").lineWidth(1).stroke();

  const headerColumns = [
    { label: "Date", width: 84 },
    { label: "Username", width: 82 },
    { label: "Full Name", width: 140 },
    { label: "Check In", width: 70 },
    { label: "Check Out", width: 70 },
    { label: "Hours", width: 74 },
  ];

  const rowColumns: Array<{ key: keyof ReportRow | "hoursLabel"; width: number }> = [
    { key: "date", width: 84 },
    { key: "username", width: 82 },
    { key: "fullName", width: 140 },
    { key: "checkIn", width: 70 },
    { key: "checkOut", width: 70 },
    { key: "hoursLabel", width: 74 },
  ];

  let y = 140;
  drawPdfTableHeader(doc, headerColumns, 36, y);
  y += 24;

  for (const row of reportPayload.rows) {
    if (y > doc.page.height - 80) {
      doc.addPage();
      y = 50;
      drawPdfTableHeader(doc, headerColumns, 36, y);
      y += 24;
    }

    drawPdfRow(doc, row, rowColumns, 36, y);
    y += 22;
  }

  if (y > doc.page.height - 110) {
    doc.addPage();
    y = 50;
  }

  doc.font("Helvetica-Bold").fontSize(11).fillColor("#09A752").text("Totals", 36, y + 12);
  doc.font("Helvetica").fillColor("#111111").fontSize(10);
  doc.text(`Hours: ${reportPayload.totals.hours.toFixed(2)}`, 36, y + 30);
  doc.text(`Records: ${reportPayload.totals.records}`, 36, y + 44);
  doc.text(`Users: ${reportPayload.totals.users}`, 36, y + 58);

  doc.fontSize(9).fillColor("#6B7280").text(
    `Clockwork OrangeHRM Desktop | ${new Date().toISOString()}`,
    36,
    doc.page.height - 36,
    {
      width: doc.page.width - 72,
      align: "center",
    },
  );

  doc.end();
  return done;
}
