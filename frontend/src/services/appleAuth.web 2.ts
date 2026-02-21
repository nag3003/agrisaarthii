export const AppleAuthService = {
    isAvailableAsync: async () => {
        return false;
    },
    signInAsync: async (options: any) => {
        throw new Error('Apple Sign-In is not supported on Web.');
    },
    Scopes: {
        FULL_NAME: 0,
        EMAIL: 1,
    },
};
