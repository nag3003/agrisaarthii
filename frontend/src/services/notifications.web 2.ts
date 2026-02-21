export const NotificationService = {
    setNotificationHandler: (handler: any) => {
        // No-op on web
    },
    requestPermissionsAsync: async () => {
        // Always return denied or granted but do nothing
        return { status: 'denied' };
    },
    scheduleNotificationAsync: async (request: any) => {
        console.warn('Notifications not supported on web');
        return null;
    },
};
