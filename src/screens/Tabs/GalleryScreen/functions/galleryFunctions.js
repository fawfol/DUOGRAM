// functions/galleryFunctions.js (No changes needed from previous version)

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
