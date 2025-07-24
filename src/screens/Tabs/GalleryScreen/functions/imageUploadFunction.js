// ~/DUOGRAM/src/screens/Tabs/GalleryScreen/functions/imageUploadFunction.js
import {launchImageLibrary} from 'react-native-image-picker';
import { Alert } from 'react-native';

export async function pickImageFromDevice() {
  try {
    const options = {
      mediaType: 'photo',
      quality: 1,
      selectionLimit: 1,
    };

    const result = await launchImageLibrary(options);

    if (result.didCancel) {
      // User cancelled the picker
      return null;
    } else if (result.errorCode) {
      Alert.alert('Image Picker Error', result.errorMessage || 'Unknown error');
      return null;
    } else if (result.assets && result.assets.length > 0) {
      // Return first selected image URI
      return result.assets[0].uri;
    } else {
      Alert.alert('No image selected');
      return null;
    }
  } catch (error) {
    Alert.alert('Error', 'An unexpected error occurred while picking the image');
    console.error('pickImageFromDevice error:', error);
    return null;
  }
}
