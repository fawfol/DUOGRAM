// functions/galleryFunctions.js 

//firestore adn be imports
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, updateDoc, arrayUnion } from "firebase/firestore";
import RNFS from 'react-native-fs';
import { storage, db, auth } from '../../../../firebase';

//sort images by dateAdded (newest first)
export const sortImagesByDate = (images) => {
  return [...images].sort((a, b) => {
    const dateA = new Date(a.dateAdded);
    const dateB = new Date(b.dateAdded);
    return dateB.getTime() - dateA.getTime(); //descending order (newest first)
  });
};

export const toggleImageSelection = (imageId, selectedImages, setSelectedImages, setSelectionMode) => {
  setSelectedImages((prevSelectedImages) => {
    const newSelectedImages = { ...prevSelectedImages };
    if (newSelectedImages[imageId]) {
      delete newSelectedImages[imageId];
    } else {
      newSelectedImages[imageId] = true;
    }
    if (Object.keys(newSelectedImages).length === 0) {
      setSelectionMode(false);
    }
    return newSelectedImages;
  });
};

export const handleLongPress = (item, setSelectionMode, selectedImages, setSelectedImages) => {
  if (!selectedImages[item.id]) {
    setSelectionMode(true);
    setSelectedImages(prevSelectedImages => ({
      ...prevSelectedImages,
      [item.id]: true,
    }));
  }
};


export const handlePress = (item, selectionMode, toggleImageSelection, setModalVisible, setCurrentImage, selectedImages, setSelectedImages, setSelectionMode) => {
  if (selectionMode) {
    toggleImageSelection(item.id, selectedImages, setSelectedImages, setSelectionMode);
  } else {
    setCurrentImage(item);
    setModalVisible(true);
  }
};

export const handleDeleteSelected = (selectedImages, pictures, setPictures, trashPictures, setTrashPictures, setSelectedImages, setSelectionMode) => {
  const idsToDelete = Object.keys(selectedImages);
  const picturesToMoveToTrash = pictures.filter(pic => idsToDelete.includes(pic.id));
  const remainingPictures = pictures.filter(pic => !idsToDelete.includes(pic.id));

  setPictures(sortImagesByDate(remainingPictures));
  setTrashPictures(sortImagesByDate([...trashPictures, ...picturesToMoveToTrash]));
  setSelectedImages({});
  setSelectionMode(false);
  console.log('Moved to trash:', idsToDelete);
};

export const handleRestoreSelected = (selectedImages, trashPictures, setTrashPictures, pictures, setPictures, setSelectedImages, setSelectionMode) => {
  const idsToRestore = Object.keys(selectedImages);
  const picturesToRestore = trashPictures.filter(pic => idsToRestore.includes(pic.id));
  const remainingTrashPictures = trashPictures.filter(pic => !idsToRestore.includes(pic.id));

  setPictures(sortImagesByDate([...pictures, ...picturesToRestore]));
  setTrashPictures(sortImagesByDate(remainingTrashPictures));
  setSelectedImages({});
  setSelectionMode(false);
  console.log('Restored from trash:', idsToRestore);
};

export const handlePermanentDelete = (selectedImages, trashPictures, setTrashPictures, setSelectedImages, setSelectionMode) => {
  const idsToDeletePermanently = Object.keys(selectedImages);
  const remainingTrashPictures = trashPictures.filter(pic => !idsToDeletePermanently.includes(pic.id));

  setTrashPictures(sortImagesByDate(remainingTrashPictures));
  setSelectedImages({});
  setSelectionMode(false);
  console.log('Permanently deleted:', idsToDeletePermanently);
};


//backend
export async function uploadImageToFirebase(uri, pairCode, userId) {
  const imageId = `${Date.now()}_${userId}`;
  const storagePath = `gallery_pairs/${pairCode}/${imageId}.jpg`;
  const storageRef = ref(storage, storagePath);

  const response = await fetch(uri);
  const blob = await response.blob();

  await uploadBytes(storageRef, blob);
  const url = await getDownloadURL(storageRef);

  await addDoc(collection(db, 'pairs', pairCode, 'gallery'), {
    imageId,
    url,
    uploadedBy: userId,
    downloadedBy: [],
    createdAt: serverTimestamp(),
  });

  return { imageId, url };
}

export function subscribeToGallery(pairCode, onGalleryUpdate) {
  if (!pairCode) return () => {};
  const galleryRef = collection(db, 'pairs', pairCode, 'gallery');
  const q = query(galleryRef, orderBy('createdAt', 'desc'));
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const photos = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    onGalleryUpdate(photos);
  });
  return unsubscribe;
}

export async function downloadPartnerImageIfNeeded(photoDoc, pairCode, userId) {
  if (!photoDoc || !photoDoc.url || !pairCode || !userId) return;
  if (photoDoc.uploadedBy === userId) return;

  const localPath = `${RNFS.DocumentDirectoryPath}/${photoDoc.imageId}.jpg`;
  const fileExists = await RNFS.exists(localPath);
  if (!fileExists) {
    const downloadResult = await RNFS.downloadFile({
      fromUrl: photoDoc.url,
      toFile: localPath,
    }).promise;
    if (downloadResult.statusCode !== 200) {
      throw new Error(`Failed to download: ${downloadResult.statusCode}`);
    }
  }

  if (!photoDoc.downloadedBy?.includes(userId)) {
    const docRef = doc(db, 'pairs', pairCode, 'gallery', photoDoc.id);
    await updateDoc(docRef, { downloadedBy: arrayUnion(userId) });
    await cleanupImageInCloudIfSynced({ ...photoDoc, downloadedBy: [...(photoDoc.downloadedBy || []), userId] }, pairCode);
  }
}

export async function cleanupImageInCloudIfSynced(photoDoc, pairCode) {
  if (!photoDoc || !photoDoc.imageId) return;
  if (photoDoc.downloadedBy.length === 1 && photoDoc.uploadedBy !== photoDoc.downloadedBy[0]) {
    const storagePath = `gallery_pairs/${pairCode}/${photoDoc.imageId}.jpg`;
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef).catch(err => {
      if (err.code !== 'storage/object-not-found') throw err;
    });
    //maybe delete Firestore doc for full cleanup
    // await deleteDoc(doc(db, 'pairs', pairCode, 'gallery', photoDoc.id));
  }
}
