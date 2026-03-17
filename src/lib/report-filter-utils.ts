import { endOfDay, format, startOfDay } from "date-fns";

export function toDateOnly(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function toTimestampStart(date: Date): string {
  return startOfDay(date).toISOString();
}

export function toTimestampEnd(date: Date): string {
  return endOfDay(date).toISOString();
}

export function getDateRangeLabel(dateFrom?: Date, dateTo?: Date): string {
  const from = dateFrom ? format(dateFrom, "dd/MM/yyyy") : "—";
  const to = dateTo ? format(dateTo, "dd/MM/yyyy") : "—";

  if (dateFrom && dateTo) return `${from} al ${to}`;
  if (dateFrom) return `Desde ${from}`;
  if (dateTo) return `Hasta ${to}`;
  return "Todos los registros";
}
