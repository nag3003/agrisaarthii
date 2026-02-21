import AsyncStorage from "@react-native-async-storage/async-storage";

const USER_KEY = "AGRI_USER";

export const saveUser = async (user: any) => {
  try {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (e) {
    console.error("❌ Failed to save user", e);
  }
};

export const getUser = async () => {
  try {
    const data = await AsyncStorage.getItem(USER_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error("❌ Failed to get user", e);
    return null;
  }
};

export const clearUser = async () => {
  await AsyncStorage.removeItem(USER_KEY);
};

// Keep existing methods but update to use new functions if needed
export const Storage = {
  saveUser,
  getUser,
  clearUser,
  
  // --- Redirect Intent (Deep Linking) ---
  saveRedirectIntent: async (intent: { path: string; params?: any }) => {
    try {
      await AsyncStorage.setItem('agrisarathi_redirect_intent', JSON.stringify(intent));
    } catch (e) {
      console.error('Error saving redirect intent', e);
    }
  },

  getRedirectIntent: async (): Promise<{ path: string; params?: any } | null> => {
    try {
      const intent = await AsyncStorage.getItem('agrisarathi_redirect_intent');
      return intent ? JSON.parse(intent) : null;
    } catch (e) {
      return null;
    }
  },

  clearRedirectIntent: async () => {
    try {
      await AsyncStorage.removeItem('agrisarathi_redirect_intent');
    } catch (e) {
      console.error('Error clearing redirect intent', e);
    }
  },

  // --- Calendars ---
  saveCalendar: async (crop: string, data: any) => {
    const data_str = await AsyncStorage.getItem('agrisarathi_calendars');
    const existing = data_str ? JSON.parse(data_str) : {};
    existing[crop] = { data, savedAt: new Date().toISOString() };
    await AsyncStorage.setItem('agrisarathi_calendars', JSON.stringify(existing));
  },
  getCalendars: async () => {
    const data = await AsyncStorage.getItem('agrisarathi_calendars');
    return data ? JSON.parse(data) : {};
  },

  // --- Advice Cache ---
  cacheAdvice: async (query: string, response: string) => {
    const existing = await AsyncStorage.getItem('agrisarathi_advice_cache');
    const cache = existing ? JSON.parse(existing) : [];
    cache.unshift({ query, response, timestamp: new Date().toISOString() });
    await AsyncStorage.setItem('agrisarathi_advice_cache', JSON.stringify(cache.slice(0, 10)));
  },
  getCachedAdvice: async () => {
    const data = await AsyncStorage.getItem('agrisarathi_advice_cache');
    return data ? JSON.parse(data) : [];
  },

  // --- Feedback Sync (Offline) ---
  queueFeedback: async (feedback: any) => {
    const existing = await AsyncStorage.getItem('agrisarathi_pending_feedback');
    const queue = existing ? JSON.parse(existing) : [];
    queue.push({ ...feedback, timestamp: new Date().toISOString() });
    await AsyncStorage.setItem('agrisarathi_pending_feedback', JSON.stringify(queue));
  },
  
  getQueuedFeedback: async () => {
    const existing = await AsyncStorage.getItem('agrisarathi_pending_feedback');
    return existing ? JSON.parse(existing) : [];
  },

  clearQueuedFeedback: async () => {
    await AsyncStorage.removeItem('agrisarathi_pending_feedback');
  },

  // --- General Item Storage ---
  setItem: async (key: string, value: string) => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (e) {
      console.error(`Error saving ${key}`, e);
    }
  },
  
  getItem: async (key: string) => {
    try {
      return await AsyncStorage.getItem(key);
    } catch (e) {
      console.error(`Error getting ${key}`, e);
      return null;
    }
  },

  clearAll: async () => {
    try {
      const keys = [
        USER_KEY,
        'agrisarathi_redirect_intent',
        'agrisarathi_calendars',
        'agrisarathi_advice_cache',
        'agrisarathi_pending_feedback',
        'user_todos',
        'calc_memory'
      ];
      await AsyncStorage.multiRemove(keys);
    } catch (e) {
      console.error('Error clearing storage', e);
    }
  }
};
