// functions/albumFunctions.js

// Reusing pattern for selection, but specific to albums
export const toggleAlbumSelection = (albumId, selectedAlbums, setSelectedAlbums, setSelectionMode) => {
  setSelectedAlbums((prevSelectedAlbums) => {
    const newSelectedAlbums = { ...prevSelectedAlbums };
    if (newSelectedAlbums[albumId]) {
      delete newSelectedAlbums[albumId];
    } else {
      newSelectedAlbums[albumId] = true;
    }
    if (Object.keys(newSelectedAlbums).length === 0) {
      setSelectionMode(false);
    }
    return newSelectedAlbums;
  });
};

export const handleAlbumLongPress = (item, setSelectionMode, toggleAlbumSelection, selectedAlbums, setSelectedAlbums) => {
  if (!selectedAlbums[item.id]) {
    setSelectionMode(true);
  }
  toggleAlbumSelection(item.id, selectedAlbums, setSelectedAlbums, setSelectionMode);
};

// NEW FUNCTION: handleOpenAlbum
export const handleOpenAlbum = (albumId, albumName, navigation) => {
  // In a real app, you would fetch photos for this albumId
  // For now, we'll navigate to a placeholder screen or show a modal.
  // This example assumes you'll set up React Navigation.
  if (navigation) {
    //navigate to a dedicated 'AlbumContentsScreen' and pass album details
    navigation.navigate('AlbumContents', { albumId: albumId, albumName: albumName });
    console.log(`Navigating to AlbumContents for album: ${albumName} (ID: ${albumId})`);
  } else {
    // Fallback if not using navigation or for testing
    console.log(`Attempted to open album: ${albumName} (ID: ${albumId})`);
    alert(`Opening Album: ${albumName}\n(This would show photos in a new screen!)`);
  }
};

//existing create and delete album functions (from Albums.js, moved here)
export const handleCreateAlbum = (newAlbumName, albums, setAlbums, setCreateModalVisible, setNewAlbumName, Alert) => {
    if (newAlbumName.trim() === '') {
      Alert.alert('Error', 'Album name cannot be empty.');
      return;
    }

    const newAlbum = {
      id: String(albums.length + 1 + Math.random()),
      name: newAlbumName.trim(),
      cover: 'https://picsum.photos/seed/' + Math.floor(Math.random() * 1000) + '/200/200',
      count: 0,
      dateCreated: new Date().toISOString(), //add dateCreated for potential future sorting
    };
    setAlbums((prevAlbums) => [...prevAlbums, newAlbum]);
    setNewAlbumName('');
    setCreateModalVisible(false);
    Alert.alert('Success', `Album "${newAlbum.name}" created!`);
};

export const handleDeleteSelectedAlbums = (selectedAlbums, albums, setAlbums, setSelectedAlbums, setSelectionMode, Alert) => {
    Alert.alert(
      'Delete Albums',
      `Are you sure you want to delete ${Object.keys(selectedAlbums).length} selected album(s)?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: () => {
            const idsToDelete = Object.keys(selectedAlbums);
            const remainingAlbums = albums.filter((album) => !idsToDelete.includes(album.id));
            setAlbums(remainingAlbums);
            setSelectedAlbums({});
            setSelectionMode(false);
            console.log('Deleted albums with IDs:', idsToDelete);
            Alert.alert('Deleted', `${idsToDelete.length} album(s) removed.`);
          },
          style: 'destructive',
        },
      ]
    );
};


