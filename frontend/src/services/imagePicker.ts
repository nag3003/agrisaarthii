import * as ImagePicker from 'expo-image-picker';
import { Platform, Alert } from 'react-native';

export const ImagePickerService = {
    requestMediaLibraryPermissionsAsync: async () => {
        return ImagePicker.requestMediaLibraryPermissionsAsync();
    },
    requestCameraPermissionsAsync: async () => {
        return ImagePicker.requestCameraPermissionsAsync();
    },
    launchImageLibraryAsync: async (options: ImagePicker.ImagePickerOptions) => {
        return ImagePicker.launchImageLibraryAsync(options);
    },
    launchCameraAsync: async (options: ImagePicker.ImagePickerOptions) => {
        return ImagePicker.launchCameraAsync(options);
    },
    MediaTypeOptions: ImagePicker.MediaTypeOptions,
};
