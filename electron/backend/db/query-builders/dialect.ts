export type DbDialect = "mysql" | "postgres" | "sqlite";

export interface SqlDialectHelpers {
  now: () => string;
  date: (column: string) => string;
  time: (column: string) => string;
  timeDiffSeconds: (startColumn: string, endColumn: string) => string;
  concatSpace: (parts: string[]) => string;
  caseInsensitiveLike: (column: string, placeholder: string) => string;
  limitOffset: (limitPlaceholder: string, offsetPlaceholder?: string) => string;
}

function sqliteConcatSpace(parts: string[]): string {
  if (parts.length === 0) {
    return "''";
  }

  const joined = parts.map((part) => `COALESCE(${part}, '')`).join(" || ' ' || ");
  return `TRIM(REPLACE(REPLACE(${joined}, '  ', ' '), '  ', ' '))`;
}

export function createDialectHelpers(dialect: DbDialect): SqlDialectHelpers {
  if (dialect === "postgres") {
    return {
      now: () => "NOW()",
      date: (column) => `DATE(${column})`,
      time: (column) => `TO_CHAR(${column}, 'HH24:MI:SS')`,
      timeDiffSeconds: (startColumn, endColumn) =>
        `EXTRACT(EPOCH FROM (${endColumn} - ${startColumn}))`,
      concatSpace: (parts) => `TRIM(CONCAT_WS(' ', ${parts.join(", ")}))`,
      caseInsensitiveLike: (column, placeholder) => `${column} ILIKE ${placeholder}`,
      limitOffset: (limitPlaceholder, offsetPlaceholder) =>
        offsetPlaceholder
          ? `LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}`
          : `LIMIT ${limitPlaceholder}`,
    };
  }

  if (dialect === "sqlite") {
    return {
      now: () => "CURRENT_TIMESTAMP",
      date: (column) => `date(${column})`,
      time: (column) => `time(${column})`,
      timeDiffSeconds: (startColumn, endColumn) =>
        `(strftime('%s', ${endColumn}) - strftime('%s', ${startColumn}))`,
      concatSpace: sqliteConcatSpace,
      caseInsensitiveLike: (column, placeholder) =>
        `LOWER(${column}) LIKE LOWER(${placeholder})`,
      limitOffset: (limitPlaceholder, offsetPlaceholder) =>
        offsetPlaceholder
          ? `LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}`
          : `LIMIT ${limitPlaceholder}`,
    };
  }

  return {
    now: () => "NOW()",
    date: (column) => `DATE(${column})`,
    time: (column) => `TIME(${column})`,
    timeDiffSeconds: (startColumn, endColumn) =>
      `TIMESTAMPDIFF(SECOND, ${startColumn}, ${endColumn})`,
    concatSpace: (parts) => `TRIM(CONCAT_WS(' ', ${parts.join(", ")}))`,
    caseInsensitiveLike: (column, placeholder) => `${column} LIKE ${placeholder}`,
    limitOffset: (limitPlaceholder, offsetPlaceholder) =>
      offsetPlaceholder
        ? `LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}`
        : `LIMIT ${limitPlaceholder}`,
  };
}
