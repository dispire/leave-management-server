/**
 * Formats a raw business registration number (사업자등록번호) string into 000-00-00000 format.
 */
export function formatBizRegNo(val: string): string {
  const num = val.replace(/[^0-9]/g, '');
  if (num.length <= 3) {
    return num;
  }
  if (num.length <= 5) {
    return `${num.slice(0, 3)}-${num.slice(3)}`;
  }
  return `${num.slice(0, 3)}-${num.slice(3, 5)}-${num.slice(5, 10)}`;
}

/**
 * Formats a raw phone number (mobile or landline) into standard dash-separated patterns.
 * Supports patterns like 010-0000-0000, 02-000-0000, 1588-0000, etc.
 */
export function formatPhone(val: string): string {
  const num = val.replace(/[^0-9]/g, '');
  
  // 1. Short numbers (like 1588-0000)
  if (num.length <= 4) {
    return num;
  }
  if (num.length <= 8 && !num.startsWith('0')) {
    return `${num.slice(0, 4)}-${num.slice(4)}`;
  }
  
  // 2. Numbers starting with 0
  // Seoul area code 02
  if (num.startsWith('02')) {
    if (num.length <= 5) {
      return `${num.slice(0, 2)}-${num.slice(2)}`;
    }
    if (num.length <= 9) {
      // 02-123-4567
      return `${num.slice(0, 2)}-${num.slice(2, 5)}-${num.slice(5)}`;
    }
    // 02-1234-5678 (max 10 chars)
    return `${num.slice(0, 2)}-${num.slice(2, 6)}-${num.slice(6, 10)}`;
  }
  
  // Other numbers starting with 0 (like 010, 031, etc.)
  if (num.length <= 6) {
    return `${num.slice(0, 3)}-${num.slice(3)}`;
  }
  if (num.length <= 10) {
    // 010-123-4567
    return `${num.slice(0, 3)}-${num.slice(3, 6)}-${num.slice(6)}`;
  }
  // 010-1234-5678 (max 11 chars)
  return `${num.slice(0, 3)}-${num.slice(3, 7)}-${num.slice(7, 11)}`;
}
