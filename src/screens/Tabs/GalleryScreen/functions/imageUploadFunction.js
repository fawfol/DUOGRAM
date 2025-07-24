// ~/DUOGRAM/src/screens/Tabs/GalleryScreen/functions/imageUploadFunction.js
import { launchImageLibrary } from 'react-native-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { storage, db, auth } from '../../../firebase';

export async function pickAndUploadImage(pairCode) {
  const user = auth.currentUser;
  const res = await launchImageLibrary({ mediaType: 'photo' });

  if (res.didCancel || !res.assets || res.assets.length === 0) return;

  const asset = res.assets[0];
  const imageId = `${Date.now()}_${user.uid}`;
  const storagePath = `gallery_pairs/${pairCode}/${imageId}.jpg`;

  // Upload to Firebase Storage
  const response = await fetch(asset.uri);
  const blob = await response.blob();
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, blob);

  const url = await getDownloadURL(storageRef);

  // Add Firestore entry (downloadedBy is empty—for partner to update)
  await addDoc(collection(db, 'pairs', pairCode, 'gallery'), {
    imageId,
    url,
    uploadedBy: user.uid,
    downloadedBy: [],
    createdAt: serverTimestamp(),
  });
}
