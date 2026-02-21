import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';

export const AppleAuthService = {
    isAvailableAsync: async () => {
        if (Platform.OS === 'android') return false;
        return AppleAuthentication.isAvailableAsync();
    },
    signInAsync: async (options: any) => {
        return AppleAuthentication.signInAsync(options);
    },
    Scopes: AppleAuthentication.AppleAuthenticationScope,
};
