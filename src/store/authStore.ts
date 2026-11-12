import { create } from 'zustand';
import { onAuthStateChanged, deleteUser, type User } from 'firebase/auth';
import { auth, signInWithGoogle, logOut } from '../utils/firebase.ts';
import { useCollectionStore } from './collectionStore.ts';
import { useDeckStore } from './deckStore.ts';
import { syncUserProfile, deleteUserCloudData } from '../services/userService.ts';
import { reconcileUserMcpTokens } from '../services/mcpTokenService.ts';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: () => Promise<User | null>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<boolean>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  if (typeof window !== 'undefined') {
    onAuthStateChanged(auth, (user) => {
      set({ user, loading: false, error: null });
      if (user) {
        syncUserProfile(user).catch(console.warn);
        Promise.all([
          useCollectionStore.getState().loadUserFromCloud(user.uid),
          useDeckStore.getState().loadUserDecksFromCloud(user.uid),
        ])
          .then(() => reconcileUserMcpTokens(user.uid))
          .catch(console.warn);
      } else {
        useCollectionStore.getState().resetToGuest();
        useDeckStore.getState().resetToGuestDecks();
      }
    });
  }

  return {
    user: null,
    loading: typeof window !== 'undefined',
    error: null,

    signIn: async () => {
      set({ loading: true, error: null });
      try {
        const user = await signInWithGoogle();
        set({ user, loading: false });
        return user;
      } catch (err: unknown) {
        const errorObj = err as { code?: string; message?: string };
        if (errorObj?.code === 'auth/popup-closed-by-user') {
          set({ loading: false, error: null });
          return null;
        }
        const msg = errorObj?.message || '';
        const code = errorObj?.code || '';
        if (
          code === 'auth/configuration-not-found' ||
          msg.includes('auth/configuration-not-found') ||
          code === 'auth/operation-not-allowed'
        ) {
          set({
            loading: false,
            error:
              'ยังไม่ได้เปิดใช้งาน Google Sign-In ใน Firebase Console (โปรเจกต์ botcounttracker → Authentication → Sign-in method → เปิด Google)',
          });
          return null;
        }
        if (code === 'auth/unauthorized-domain' || msg.includes('auth/unauthorized-domain')) {
          set({
            loading: false,
            error:
              'โดเมนนี้ยังไม่ได้อยู่ใน Authorized domains ของ Firebase Authentication (เพิ่ม localhost หรือ talingchan.tcgcount.com ใน Settings)',
          });
          return null;
        }
        set({ loading: false, error: msg || 'เข้าสู่ระบบไม่สำเร็จ' });
        return null;
      }
    },

    signOut: async () => {
      set({ loading: true });
      try {
        await logOut();
        set({ user: null, loading: false, error: null });
      } catch (err: unknown) {
        const errorObj = err as { message?: string };
        set({ loading: false, error: errorObj?.message || 'ออกจากระบบไม่สำเร็จ' });
      }
    },

    deleteAccount: async () => {
      const currentUser = auth?.currentUser;
      if (!currentUser) return false;
      set({ loading: true, error: null });
      try {
        const uid = currentUser.uid;
        await deleteUserCloudData(uid);
        try {
          await deleteUser(currentUser);
        } catch (authErr: unknown) {
          const code = (authErr as { code?: string })?.code;
          if (code === 'auth/requires-recent-login') {
            await logOut();
          } else {
            throw authErr;
          }
        }
        useCollectionStore.getState().resetToGuest();
        useDeckStore.getState().resetToGuestDecks();
        set({ user: null, loading: false, error: null });
        return true;
      } catch (err: unknown) {
        const errorObj = err as { message?: string };
        set({ loading: false, error: errorObj?.message || 'ไม่สามารถลบบัญชีได้' });
        return false;
      }
    },

    clearError: () => set({ error: null }),
  };
});
