export const CUSTOMER_KEY = 'hm_customer_id';
export const CUSTOMER_NAME_KEY = 'hm_customer_name';
export const SESSION_KEY = 'hm_session';

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
  localStorage.removeItem('hm_guest');
};

export const isLoggedIn = (): boolean => {
  return !!getStoredCustomerId();
};

export const setGuestMode = () => {
  localStorage.setItem('hm_guest', '1');
};

export const hasVisited = (): boolean => {
  return !!getStoredCustomerId() || localStorage.getItem('hm_guest') === '1';
};
