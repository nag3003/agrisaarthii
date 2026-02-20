import { Audio } from 'expo-av';

export const AVService = {
    requestPermissionsAsync: async () => {
        return Audio.requestPermissionsAsync();
    },
    setAudioModeAsync: async (mode: any) => {
        return Audio.setAudioModeAsync(mode);
    },
    Recording: Audio.Recording,
    RecordingOptionsPresets: Audio.RecordingOptionsPresets,
    Sound: Audio.Sound,
};
