export const CUSTOMER_KEY = 'hm_customer_id';
export const CUSTOMER_NAME_KEY = 'hm_customer_name';
export const CREDENTIALS_KEY = 'hm_credentials';

// ── Session ──────────────────────────────────────────────────────────────────

export const getStoredCustomerId = (): number | null => {
  const id = localStorage.getItem(CUSTOMER_KEY);
  return id ? parseInt(id, 10) : null;
};

export const getStoredCustomerName = (): string | null => {
  return localStorage.getItem(CUSTOMER_NAME_KEY);
};

export const storeCustomer = (id: number, name: string) => {
  localStorage.setItem(CUSTOMER_KEY, String(id));
  localStorage.setItem(CUSTOMER_NAME_KEY, name);
};

export const clearCustomer = () => {
  localStorage.removeItem(CUSTOMER_KEY);
  localStorage.removeItem(CUSTOMER_NAME_KEY);
};

export const isLoggedIn = (): boolean => !!getStoredCustomerId();

// ── Credential store (email → { passwordHash, customerId, name }) ─────────────

interface Credential {
  passwordHash: string;
  customerId: number;
  name: string;
}

type CredentialStore = Record<string, Credential>;

function loadCredentials(): CredentialStore {
  try {
    return JSON.parse(localStorage.getItem(CREDENTIALS_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveCredentials(store: CredentialStore) {
  localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(store));
}

async function hashPassword(password: string): Promise<string> {
  const encoded = new TextEncoder().encode(password);
  const buf = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export const emailRegistered = (email: string): boolean => {
  return email.toLowerCase() in loadCredentials();
};

export const registerCredential = async (
  email: string,
  password: string,
  customerId: number,
  name: string
): Promise<void> => {
  const store = loadCredentials();
  store[email.toLowerCase()] = {
    passwordHash: await hashPassword(password),
    customerId,
    name,
  };
  saveCredentials(store);
};

export const verifyCredential = async (
  email: string,
  password: string
): Promise<{ customerId: number; name: string } | null> => {
  const store = loadCredentials();
  const cred = store[email.toLowerCase()];
  if (!cred) return null;
  const hash = await hashPassword(password);
  if (hash !== cred.passwordHash) return null;
  return { customerId: cred.customerId, name: cred.name };
};
