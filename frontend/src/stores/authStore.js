// frontend/src/stores/authStore.js
import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  isAuthenticated: localStorage.getItem('isAuth') === 'true',
  
  login: () => {
    localStorage.setItem('isAuth', 'true');
    set({ isAuthenticated: true });
  },
  
  logout: () => {
    localStorage.removeItem('isAuth');
    set({ isAuthenticated: false });
  },
}));