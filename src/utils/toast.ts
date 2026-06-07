export type ToastType = 'success' | 'error' | 'info';

export const showToast = (message: string, type: ToastType = 'success') => {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('show-toast', { detail: { message, type } });
    window.dispatchEvent(event);
  }
};
