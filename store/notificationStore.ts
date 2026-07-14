import { create } from "zustand";
import {
  fetchNotificationsForUser,
  markNotificationsRead,
} from "@/lib/db/notifications";
import type { Notification } from "@/types";

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  hasFetched: boolean;
  fetchNotifications: (userId: string) => Promise<void>;
  markAllRead: (userId: string) => Promise<void>;
  markOneRead: (userId: string, notifId: string) => Promise<void>;
  clearNotificationState: () => void;
}

function computeUnread(list: Notification[]): number {
  return list.filter((n) => !n.read).length;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  hasFetched: false,

  fetchNotifications: async (userId) => {
    set({ isLoading: true });
    try {
      const notifications = await fetchNotificationsForUser(userId, 50);
      set({
        notifications,
        unreadCount: computeUnread(notifications),
        isLoading: false,
        hasFetched: true,
      });
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      set({ isLoading: false, hasFetched: true });
    }
  },

  markAllRead: async (userId) => {
    const prev = get().notifications;
    if (prev.every((n) => n.read)) return;

    const optimistic = prev.map((n) => ({ ...n, read: true }));
    set({ notifications: optimistic, unreadCount: 0 });

    try {
      await markNotificationsRead(userId);
    } catch (error) {
      console.error("Failed to mark all notifications read:", error);
      set({
        notifications: prev,
        unreadCount: computeUnread(prev),
      });
    }
  },

  markOneRead: async (userId, notifId) => {
    const prev = get().notifications;
    const target = prev.find((n) => n.id === notifId);
    if (!target || target.read) return;

    const optimistic = prev.map((n) =>
      n.id === notifId ? { ...n, read: true } : n
    );
    set({
      notifications: optimistic,
      unreadCount: computeUnread(optimistic),
    });

    try {
      await markNotificationsRead(userId, [notifId]);
    } catch (error) {
      console.error("Failed to mark notification read:", error);
      set({
        notifications: prev,
        unreadCount: computeUnread(prev),
      });
    }
  },

  clearNotificationState: () =>
    set({
      notifications: [],
      unreadCount: 0,
      isLoading: false,
      hasFetched: false,
    }),
}));

export const useNotifications = () =>
  useNotificationStore((s) => s.notifications);

export const useUnreadCount = () =>
  useNotificationStore((s) => s.unreadCount);

export const useNotificationsLoading = () =>
  useNotificationStore((s) => s.isLoading);

export const useNotificationsFetched = () =>
  useNotificationStore((s) => s.hasFetched);
