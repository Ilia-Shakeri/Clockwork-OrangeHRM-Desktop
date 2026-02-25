import fs from "node:fs/promises";
import PDFDocument from "pdfkit";
import { format as formatJalali } from "date-fns-jalali";
import type { ExportMeta, ReportPayload, ReportRow } from "./dtos";

interface PdfBuildOptions {
  logoPath?: string;
}

interface UserSection {
  userId: string;
  displayName: string;
  username: string;
  rows: ReportRow[];
}

interface PdfColumn {
  key: "shamsiDate" | "hijriDate" | "checkIn" | "checkOut" | "hours" | "username";
  label: string;
  width: number;
}

const HIJRI_DATE_FORMATTER = new Intl.DateTimeFormat("en-u-ca-islamic", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

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

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateOnly(value: string): string {
  const parsed = parseIsoDate(value);
  return parsed ? toIsoDate(parsed) : value;
}

function formatShamsiDateOnly(value: string): string {
  const parsed = parseIsoDate(value);
  return parsed ? formatJalali(parsed, "yyyy-MM-dd") : value;
}

function formatHijriDateOnly(value: string): string {
  const parsed = parseIsoDate(value);
  if (!parsed) {
    return value;
  }

  try {
    const parts = HIJRI_DATE_FORMATTER.formatToParts(parsed);
    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;

    if (!year || !month || !day) {
      return value;
    }

    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  } catch {
    return value;
  }
}

function formatNow(value: Date): string {
  const date = toIsoDate(value);
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");
  return `${date} ${hours}:${minutes}`;
}

function computeHours(rows: ReportRow[]): number {
  return rows.reduce((sum, row) => sum + row.hours, 0);
}

function resolveDisplayName(
  row: ReportRow | null,
  userId: string,
  userDisplayMap: Record<string, string> | undefined,
): string {
  const mapped = userDisplayMap?.[userId]?.trim();
  if (mapped) {
    return mapped;
  }

  if (row?.fullName?.trim()) {
    return row.fullName.trim();
  }

  if (row?.username?.trim()) {
    return row.username.trim();
  }

  return userId;
}

function createUserSections(rows: ReportRow[], meta?: ExportMeta): UserSection[] {
  const sectionsByUser = new Map<string, UserSection>();

  for (const row of rows) {
    const existing = sectionsByUser.get(row.userId);
    if (existing) {
      existing.rows.push(row);
      continue;
    }

    sectionsByUser.set(row.userId, {
      userId: row.userId,
      displayName: resolveDisplayName(row, row.userId, meta?.userDisplayMap),
      username: row.username,
      rows: [row],
    });
  }

  if (meta?.userDisplayMap) {
    for (const [userId, displayName] of Object.entries(meta.userDisplayMap)) {
      const existing = sectionsByUser.get(userId);
      if (existing) {
        existing.displayName = displayName;
        continue;
      }

      sectionsByUser.set(userId, {
        userId,
        displayName,
        username: "",
        rows: [],
      });
    }
  }

  if (sectionsByUser.size === 0 && meta?.userDisplayName) {
    sectionsByUser.set(meta.userDisplayName, {
      userId: meta.userDisplayName,
      displayName: meta.userDisplayName,
      username: "",
      rows: [],
    });
  }

  return Array.from(sectionsByUser.values());
}

async function loadLogoBuffer(pathToLogo?: string): Promise<Buffer | null> {
  if (!pathToLogo) {
    return null;
  }

  try {
    return await fs.readFile(pathToLogo);
  } catch {
    return null;
  }
}

function drawPdfPageHeader(
  doc: PDFKit.PDFDocument,
  meta: ExportMeta,
  generatedAt: string,
  logoBuffer: Buffer | null,
): number {
  const margin = 40;
  const logoTop = 26;
  let titleX = margin;

  if (logoBuffer) {
    try {
      doc.image(logoBuffer, margin, logoTop, {
        fit: [148, 48],
      });
      titleX = 198;
    } catch {
      titleX = margin;
    }
  }

  doc.fillColor("#0B1523").font("Helvetica-Bold").fontSize(16).text(meta.title, titleX, 32, {
    width: doc.page.width - titleX - margin,
  });

  doc.fillColor("#374151").font("Helvetica").fontSize(10);
  doc.text(`Date Range: ${formatDateOnly(meta.from)} to ${formatDateOnly(meta.to)}`, titleX, 56, {
    width: doc.page.width - titleX - margin,
  });
  doc.text(`Generated: ${generatedAt}`, titleX, 70, {
    width: doc.page.width - titleX - margin,
  });

  doc
    .moveTo(margin, 92)
    .lineTo(doc.page.width - margin, 92)
    .strokeColor("#D1D5DB")
    .lineWidth(1)
    .stroke();

  return 106;
}

function drawPdfTableHeader(
  doc: PDFKit.PDFDocument,
  columns: PdfColumn[],
  startX: number,
  startY: number,
): void {
  const totalWidth = columns.reduce((sum, column) => sum + column.width, 0);
  doc.rect(startX, startY, totalWidth, 22).fill("#F58321");
  doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(9);

  let x = startX;
  for (const column of columns) {
    doc.text(column.label, x + 6, startY + 6, {
      width: column.width - 12,
      align: "left",
    });
    x += column.width;
  }
}

function drawPdfTableRow(
  doc: PDFKit.PDFDocument,
  row: ReportRow,
  columns: PdfColumn[],
  startX: number,
  startY: number,
  zebra: boolean,
): void {
  const totalWidth = columns.reduce((sum, column) => sum + column.width, 0);
  const rowHeight = 22;

  if (zebra) {
    doc.rect(startX, startY, totalWidth, rowHeight).fill("#F9FAFB");
  }

  doc.rect(startX, startY, totalWidth, rowHeight).strokeColor("#E5E7EB").lineWidth(0.6).stroke();
  doc.fillColor("#111827").font("Helvetica").fontSize(9);

  let x = startX;
  for (const column of columns) {
    const value =
      column.key === "shamsiDate"
        ? formatShamsiDateOnly(row.date)
        : column.key === "hijriDate"
          ? formatHijriDateOnly(row.date)
        : column.key === "checkIn"
          ? row.checkIn || "-"
          : column.key === "checkOut"
            ? row.checkOut || "-"
            : column.key === "hours"
              ? row.hours.toFixed(2)
              : row.username;

    doc.text(value, x + 6, startY + 6, {
      width: column.width - 12,
      ellipsis: true,
      align: column.key === "hours" ? "right" : "left",
    });
    x += column.width;
  }
}

export function buildCsv(reportPayload: ReportPayload, meta?: ExportMeta): Buffer {
  const sections = createUserSections(reportPayload.rows, meta);
  const generatedAt = formatNow(new Date());
  const lines: string[] = [];

  lines.push(`Report Title,${csvEscape(meta?.title ?? "Clockwork Attendance Report")}`);
  if (meta) {
    lines.push(`Date Range,${csvEscape(formatDateOnly(meta.from))},${csvEscape(formatDateOnly(meta.to))}`);
  }
  lines.push(`Generated At,${csvEscape(generatedAt)}`);
  lines.push("");

  const header = ["Shamsi Date", "Hijri Date", "User", "Username", "Check In", "Check Out", "Hours"];
  lines.push(header.join(","));

  for (const section of sections) {
    if (section.rows.length === 0) {
      lines.push(
        [
          "",
          "",
          csvEscape(section.displayName),
          csvEscape(section.username),
          "",
          "",
          "",
        ].join(","),
      );
      continue;
    }

    for (const row of section.rows) {
      lines.push(
        [
          csvEscape(formatShamsiDateOnly(row.date)),
          csvEscape(formatHijriDateOnly(row.date)),
          csvEscape(section.displayName),
          csvEscape(row.username),
          csvEscape(row.checkIn),
          csvEscape(row.checkOut),
          csvEscape(row.hours.toFixed(2)),
        ].join(","),
      );
    }
  }

  lines.push("");
  lines.push(`Total Hours,${csvEscape(reportPayload.totals.hours.toFixed(2))}`);
  lines.push(`Total Records,${csvEscape(reportPayload.totals.records)}`);
  lines.push(`Total Users,${csvEscape(reportPayload.totals.users)}`);

  if (sections.length > 1) {
    lines.push("");
    lines.push("Per User Totals");
    for (const section of sections) {
      lines.push(
        [csvEscape(section.displayName), csvEscape(computeHours(section.rows).toFixed(2))].join(","),
      );
    }
  }

  return Buffer.from(lines.join("\n"), "utf8");
}

export async function buildPdf(
  reportPayload: ReportPayload,
  meta: ExportMeta,
  options: PdfBuildOptions = {},
): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "A4",
    margin: 40,
    compress: true,
  });
  const logoBuffer = await loadLogoBuffer(options.logoPath);
  const sections = createUserSections(reportPayload.rows, meta);
  const generatedAt = formatNow(new Date());
  const margin = 40;
  const tableStartX = margin;
  const tableBottomLimit = doc.page.height - margin - 36;
  const columns: PdfColumn[] = [
    { key: "shamsiDate", label: "Shamsi", width: 90 },
    { key: "hijriDate", label: "Hijri", width: 90 },
    { key: "username", label: "Username", width: 95 },
    { key: "checkIn", label: "Check In", width: 80 },
    { key: "checkOut", label: "Check Out", width: 80 },
    { key: "hours", label: "Hours", width: 80 },
  ];

  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", (error) => reject(error));
  });

  let y = drawPdfPageHeader(doc, meta, generatedAt, logoBuffer);

  const startNewPage = () => {
    doc.addPage();
    y = drawPdfPageHeader(doc, meta, generatedAt, logoBuffer);
  };

  if (sections.length === 0) {
    doc.fillColor("#374151").font("Helvetica").fontSize(11);
    doc.text("No attendance records for the selected range.", margin, y + 6);
    y += 36;
  }

  for (const [sectionIndex, section] of sections.entries()) {
    if (y + 40 > tableBottomLimit) {
      startNewPage();
    }

    if (sectionIndex > 0) {
      y += 8;
    }

    doc.fillColor("#0B1523").font("Helvetica-Bold").fontSize(12);
    doc.text(`Report: ${section.displayName}`, margin, y);
    y += 18;

    if (section.username) {
      doc.fillColor("#4B5563").font("Helvetica").fontSize(9);
      doc.text(`Username: ${section.username}`, margin, y);
      y += 14;
    }

    if (y + 26 > tableBottomLimit) {
      startNewPage();
    }

    drawPdfTableHeader(doc, columns, tableStartX, y);
    y += 24;

    if (section.rows.length === 0) {
      if (y + 24 > tableBottomLimit) {
        startNewPage();
        drawPdfTableHeader(doc, columns, tableStartX, y);
        y += 24;
      }

      doc.rect(tableStartX, y, columns.reduce((sum, column) => sum + column.width, 0), 22)
        .strokeColor("#E5E7EB")
        .lineWidth(0.6)
        .stroke();
      doc.fillColor("#6B7280").font("Helvetica").fontSize(9);
      doc.text("No attendance records.", tableStartX + 6, y + 6);
      y += 24;
    } else {
      for (const [rowIndex, row] of section.rows.entries()) {
        if (y + 22 > tableBottomLimit) {
          startNewPage();
          drawPdfTableHeader(doc, columns, tableStartX, y);
          y += 24;
        }

        drawPdfTableRow(doc, row, columns, tableStartX, y, rowIndex % 2 === 1);
        y += 22;
      }
    }

    if (y + 26 > tableBottomLimit) {
      startNewPage();
    }

    const sectionHours = computeHours(section.rows).toFixed(2);
    doc.fillColor("#111827").font("Helvetica-Bold").fontSize(10);
    doc.text(`User Total Hours: ${sectionHours}`, margin, y + 4);
    y += 24;
  }

  if (y + 58 > tableBottomLimit) {
    startNewPage();
  }

  doc.moveTo(margin, y + 6).lineTo(doc.page.width - margin, y + 6).strokeColor("#D1D5DB").stroke();
  doc.fillColor("#0B1523").font("Helvetica-Bold").fontSize(11);
  doc.text("Overall Totals", margin, y + 14);

  doc.fillColor("#111827").font("Helvetica").fontSize(10);
  doc.text(`Hours: ${reportPayload.totals.hours.toFixed(2)}`, margin, y + 30);
  doc.text(`Records: ${reportPayload.totals.records}`, margin + 160, y + 30);
  doc.text(`Users: ${reportPayload.totals.users}`, margin + 300, y + 30);

  doc.end();
  return done;
}
