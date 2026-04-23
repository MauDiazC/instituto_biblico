/**
 * Utilidades para el manejo de fechas en el frontend.
 * Resuelve problemas de discrepancia entre UTC (servidor) y Local Time (cliente).
 */

export const parseUTC = (dateStr: string | null | undefined): Date => {
  if (!dateStr) return new Date();
  
  // Si la cadena ya tiene información de zona horaria, la usamos tal cual.
  if (dateStr.endsWith('Z') || dateStr.includes('+')) {
    return new Date(dateStr);
  }
  
  // Si no tiene 'Z' ni '+', asumimos que el backend lo envió en UTC
  // (común cuando se usa TIMESTAMP WITHOUT TIME ZONE en PostgreSQL).
  // Reemplazamos el espacio por 'T' si existe para asegurar compatibilidad ISO.
  const isoStr = dateStr.replace(' ', 'T');
  return new Date(isoStr + 'Z');
};

/**
 * Formatea una fecha UTC a una cadena legible en hora local.
 */
export const formatToLocal = (dateStr: string | null | undefined): string => {
  if (!dateStr) return 'N/A';
  return parseUTC(dateStr).toLocaleString();
};
