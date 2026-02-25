import PDFDocument from "pdfkit";
import { format as formatJalali } from "date-fns-jalali";
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

function parseIsoDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day, 12);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
}

function formatGregorianDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
}

function formatTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function formatGregorianFromIso(value: string): string {
  const parsed = parseIsoDate(value);
  return parsed ? formatGregorianDate(parsed) : value;
}

function formatSolarFromIso(value: string): string {
  const parsed = parseIsoDate(value);
  return parsed ? formatJalali(parsed, "yyyy/MM/dd") : value;
}

interface ExportDateRow extends ReportRow {
  dateGregorian: string;
  dateSolar: string;
}

function withDualDates(rows: ReportRow[]): ExportDateRow[] {
  return rows.map((row) => ({
    ...row,
    dateGregorian: formatGregorianFromIso(row.date),
    dateSolar: formatSolarFromIso(row.date),
  }));
}

export function buildCsv(reportPayload: ReportPayload, meta?: ExportMeta): Buffer {
  const rowsWithDates = withDualDates(reportPayload.rows);
  const header = [
    "Username",
    "Full Name",
    "Date (Gregorian)",
    "Date (Solar)",
    "Check In",
    "Check Out",
    "Hours",
  ];

  const lines = [header.join(",")];

  for (const row of rowsWithDates) {
    lines.push(
      [
        csvEscape(row.username),
        csvEscape(row.fullName),
        csvEscape(row.dateGregorian),
        csvEscape(row.dateSolar),
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

  if (meta) {
    lines.push(`Range (Gregorian),${csvEscape(formatGregorianFromIso(meta.from))},${csvEscape(formatGregorianFromIso(meta.to))}`);
    lines.push(`Range (Solar),${csvEscape(formatSolarFromIso(meta.from))},${csvEscape(formatSolarFromIso(meta.to))}`);
  }

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
  doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(8);

  for (const column of columns) {
    doc.text(column.label, x + 4, startY + 3, {
      width: column.width - 8,
      align: "left",
    });
    x += column.width;
  }

  doc.fillColor("#111111").font("Helvetica");
}

type PdfRowKey =
  | "dateGregorian"
  | "dateSolar"
  | "username"
  | "fullName"
  | "checkIn"
  | "checkOut"
  | "hoursLabel";

function drawPdfRow(
  doc: PDFKit.PDFDocument,
  row: ExportDateRow,
  columns: Array<{ key: PdfRowKey; width: number }>,
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
  const rowsWithDates = withDualDates(reportPayload.rows);

  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", (error) => reject(error));
  });

  doc.rect(0, 0, doc.page.width, 70).fill("#F58321");
  doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(18).text(meta.title, 36, 24);

  const now = new Date();
  doc.fillColor("#0B1523").font("Helvetica").fontSize(10);
  doc.text(
    `Date Range (Gregorian): ${formatGregorianFromIso(meta.from)} to ${formatGregorianFromIso(meta.to)}`,
    36,
    88,
  );
  doc.text(
    `Date Range (Solar): ${formatSolarFromIso(meta.from)} to ${formatSolarFromIso(meta.to)}`,
    36,
    102,
  );
  doc.text(
    `Generated: ${formatGregorianDate(now)} ${formatTime(now)} | ${formatJalali(now, "yyyy/MM/dd HH:mm")}`,
    36,
    116,
  );

  doc.moveTo(36, 136).lineTo(doc.page.width - 36, 136).strokeColor("#D1D5DB").lineWidth(1).stroke();

  const headerColumns = [
    { label: "Date (G)", width: 78 },
    { label: "Date (Sh)", width: 78 },
    { label: "Username", width: 78 },
    { label: "Full Name", width: 120 },
    { label: "Check In", width: 58 },
    { label: "Check Out", width: 58 },
    { label: "Hours", width: 50 },
  ];

  const rowColumns: Array<{ key: PdfRowKey; width: number }> = [
    { key: "dateGregorian", width: 78 },
    { key: "dateSolar", width: 78 },
    { key: "username", width: 78 },
    { key: "fullName", width: 120 },
    { key: "checkIn", width: 58 },
    { key: "checkOut", width: 58 },
    { key: "hoursLabel", width: 50 },
  ];

  let y = 154;
  drawPdfTableHeader(doc, headerColumns, 36, y);
  y += 24;

  for (const row of rowsWithDates) {
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
