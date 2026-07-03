export const STATUS_LABELS: Record<string, string> = {
  SEARCHING: "מחפש",
  READY_TO_ORDER: "מוכן להזמנה",
  ORDERED: "הוזמן",
  ARRIVED: "הגיע",
  INSTALLED: "הותקן",
  CANCELLED: "בוטל",
};

export const STATUS_COLORS: Record<string, string> = {
  SEARCHING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  READY_TO_ORDER: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  ORDERED: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  ARRIVED: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  INSTALLED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

export const PRIORITY_LABELS: Record<string, string> = {
  LOW: "נמוכה",
  MEDIUM: "בינונית",
  HIGH: "גבוהה",
};
