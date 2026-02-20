import * as Notifications from 'expo-notifications';

export const NotificationService = {
    setNotificationHandler: (handler: any) => {
        Notifications.setNotificationHandler(handler);
    },
    requestPermissionsAsync: async () => {
        return Notifications.requestPermissionsAsync();
    },
    scheduleNotificationAsync: async (request: any) => {
        return Notifications.scheduleNotificationAsync(request);
    },
};
