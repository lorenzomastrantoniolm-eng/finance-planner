export function isValidMonth(value: string) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function getMonthRange(month: string) {
  if (!isValidMonth(month)) {
    return null;
  }

  const [year, monthNumber] = month.split("-").map(Number);

  const start = `${year}-${String(monthNumber).padStart(2, "0")}-01`;

  const nextYear =
    monthNumber === 12 ? year + 1 : year;

  const nextMonth =
    monthNumber === 12 ? 1 : monthNumber + 1;

  const endExclusive =
    `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

  return {
    start,
    end: endExclusive,
    endExclusive,
    year,
    monthNumber,
  };
}
