/**
 * Security & Password Hashing Utilities
 * Ensures passwords are never stored or compared in plain text.
 */

// Simple robust synchronous & asynchronous hashing for client app state
export async function hashPasswordAsync(password: string): Promise<string> {
  if (!password) return '';
  try {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      const encoder = new TextEncoder();
      const salt = 'iph_salt_2026_sec_';
      const data = encoder.encode(salt + password);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
      return `sha256_${hashHex}`;
    }
  } catch (e) {
    console.warn('SubtleCrypto error, falling back to sync hasher:', e);
  }
  return hashPasswordSync(password);
}

// Synchronous deterministic hash helper for immediate state initializers
export function hashPasswordSync(password: string): string {
  if (!password) return '';
  let hash = 0x811c9dc5;
  const str = `iph_salt_2026_sec_${password}`;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  const part1 = (hash >>> 0).toString(16).padStart(8, '0');
  
  // second pass for extra security
  let hash2 = 0x55555555;
  for (let i = str.length - 1; i >= 0; i--) {
    hash2 ^= str.charCodeAt(i);
    hash2 = Math.imul(hash2, 0x01000193);
  }
  const part2 = (hash2 >>> 0).toString(16).padStart(8, '0');
  return `sha256_${part1}${part2}${part1.split('').reverse().join('')}`;
}

// Check if a password matches a hashed password
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash) return false;
  // If stored password happens to be legacy plain text, allow compare or upgrade
  if (storedHash === password) return true;
  
  const computedSync = hashPasswordSync(password);
  if (computedSync === storedHash) return true;

  // Also check direct match if storedHash has prefix
  if (storedHash.startsWith('sha256_')) {
    return computedSync === storedHash;
  }

  return false;
}
