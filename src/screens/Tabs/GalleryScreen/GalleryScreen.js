// src/screens/Tabs/GalleryScreen/GalleryScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  TouchableOpacity,
  FlatList,
  Image,
  Platform,
  Modal,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';

import { auth, db } from '../../../firebase';
import { doc, getDoc } from 'firebase/firestore';

import {
  subscribeToGallery,
  uploadImageToFirebase,
  downloadPartnerImageIfNeeded,
} from './functions/galleryFunctions';

// Image picker and file system imports
import { launchImageLibrary } from 'react-native-image-picker';
import RNFS from 'react-native-fs';

// Import your dedicated screens
import AlbumScreen from './Album';
import StoriesScreen from './Stories';
import TrashScreen from './Trash';

const { width: screenWidth } = Dimensions.get('window');

export default function GalleryScreen() {
  const [activeScreen, setActiveScreen] = useState('pictures');
  const [pairCode, setPairCode] = useState(null);
  const [galleryPhotos, setGalleryPhotos] = useState([])
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedImages, setSelectedImages] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [currentImage, setCurrentImage] = useState(null);
  const [errorImages, setErrorImages] = useState({});

  const user = auth.currentUser;
  const navItems = [
    { name: 'pictures', label: 'Pictures', icon: 'image' },
    { name: 'albums', label: 'Albums', icon: 'folder-multiple-image' },
    { name: 'stories', label: 'Stories', icon: 'book-open' },
    { name: 'trash', label: 'Trash', icon: 'delete' },
  ];

  // Fetch pair code for current user on mount
  useEffect(() => {
    async function fetchPairCode() {
      if (!user) return;
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        setPairCode(userDoc.data().pairCode);
      L} else {
        setPairCode(null);
      }
    }
    fetchPairCode();
  }, [user]);

  // Subscribe to Firestore gallery updates
  useEffect(() => {
    if (!pairCode) return;
    const unsubscribe = subscribeToGallery(pairCode, setGalleryPhotos);
    return () => unsubscribe();
  }, [pairCode]);

  // Automatically download partner images if needed
  useEffect(() => {
    if (!pairCode || !user) return;

    galleryPhotos.forEach(photo => {
      if (photo.uploadedBy !== user.uid) {
        downloadPartnerImageIfNeeded(photo, pairCode, user.uid).catch(err => {
          console.warn('Error downloading partner image:', err);
        });
      }
    });
  }, [galleryPhotos, pairCode, user]);

  // Utility: Get local uri or fallback to cloud URL for image source
  const getImageUri = (photo) => {
    const localPath = `${RNFS.DocumentDirectoryPath}/${photo.imageId}.jpg`;
    return `file://${localPath}`;
  };

  // Toggle selection for multi-select mode
  const toggleImageSelection = useCallback((imageId) => {
    setSelectedImages(prev => {
      const newSelection = { ...prev };
      if (newSelection[imageId]) {
        delete newSelection[imageId];
      } else {
        newSelection[imageId] = true;
      }
      if (Object.keys(newSelection).length === 0) setSelectionMode(false);
      else setSelectionMode(true);
      return newSelection;
    });
  }, []);

  // Handle image press (select or modal)
  const handleImagePress = useCallback((item) => {
    if (selectionMode) {
      toggleImageSelection(item.id);
    } else {
      setCurrentImage(item);
      setModalVisible(true);
    }
  }, [selectionMode, toggleImageSelection]);

  // Handle long press (enable selection mode)
  const handleImageLongPress = useCallback((item) => {
    if (!selectedImages[item.id]) {
      setSelectionMode(true);
      setSelectedImages(prev => ({ ...prev, [item.id]: true }));
    }
  }, [selectedImages]);

  // Handle add photo button press - pick and upload
  const handleAddPhoto = async () => {
    if (!pairCode || !user) {
      Alert.alert('Pair Code Missing', 'Please connect with your partner to use the gallery.');
      return;
    }

    try {
      const res = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
      });

      if (res.didCancel) return;

      if (res.assets && res.assets.length > 0) {
        const { uri } = res.assets[0];
        if (!uri) {
          Alert.alert('Error', 'Failed to get image URI');
          return;
        }
        await uploadImageToFirebase(uri, pairCode, user.uid);
      }
    } catch (error) {
      console.error('Add photo error:', error);
      Alert.alert('Error', 'Failed to add photo. Please try again.');
    }
  };

  // Render single photo square for FlatList (only for Pictures tab)
  const renderPhotoItem = ({ item }) => {
    const localURI = getImageUri(item);
    const isError = errorImages[item.id];
    const numColumns = 3;
    const itemPadding = 5;
    const mainContentPaddingHorizontal = 16;
    const effectiveContentWidth = screenWidth - mainContentPaddingHorizontal * 2;
    const itemSize = (effectiveContentWidth - (numColumns - 1) * itemPadding) / numColumns;

    return (
      <TouchableOpacity
        onPress={() => handleImagePress(item)}
        onLongPress={() => handleImageLongPress(item)}
        activeOpacity={0.7}
        style={[
          styles.imageWrapper,
          {
            width: itemSize,
            height: itemSize,
            margin: itemPadding / 2,
          },
          selectedImages[item.id] && styles.imageSelected,
        ]}
      >
        {isError ? (
          <LinearGradient
            colors={['#d3d3d3', '#a1a1a1']}
            style={[styles.image, styles.fallbackGradient]}
          >
            <Icon name="image-off" size={40} color="#fff" />
            <Text style={{ color: '#fff', marginTop: 5, fontWeight: 'bold' }}>
              Failed
            </Text>
          </LinearGradient>
        ) : (
          <Image
            source={{ uri: localURI }}
            style={styles.image}
            onError={() =>
              setErrorImages((prev) => ({ ...prev, [item.id]: true }))
            }
          />
        )}

        {selectionMode && selectedImages[item.id] && (
          <View style={styles.selectionOverlay}>
            <Icon name="check-circle" size={30} color="#3498db" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const keyExtractor = (item) => item.id;

  const renderMainContent = () => {
    switch (activeScreen) {
      case 'pictures':
        return (
          <View style={styles.contentSection}>
            <View style={styles.headerRow}>
              <Text style={styles.sectionTitle}>All Pictures</Text>
              {!selectionMode ? (
                <TouchableOpacity style={styles.uploadButton} onPress={handleAddPhoto} activeOpacity={0.7}>
                  <Icon name="plus-circle" size={25} color="#3498db" />
                  <Text style={styles.uploadButtonText}>Add Photo</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.deleteContainer}>
                  <TouchableOpacity
                    disabled={Object.keys(selectedImages).length === 0}
                    style={styles.actionButton}
                    onPress={() => {
                      Alert.alert(
                        'Delete Photos',
                        `Are you sure you want to delete ${Object.keys(selectedImages).length} photo(s)?`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Delete',
                            style: 'destructive',
                            onPress: () => {
                              Alert.alert('Delete', 'Feature to delete photos coming soon');
                              setSelectedImages({});
                              setSelectionMode(false);
                            },
                          },
                        ]
                      );
                    }}
                  >
                    <Icon name="delete" size={25} color="#e74c3c" />
                    <Text style={styles.actionButtonText}>
                      Delete ({Object.keys(selectedImages).length})
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <FlatList
              data={galleryPhotos}
              keyExtractor={keyExtractor}
              numColumns={3}
              contentContainerStyle={styles.imageGrid}
              renderItem={renderPhotoItem}
              ListEmptyComponent={
                <View style={styles.emptyGalleryContainer}>
                  <Icon name="image-off" size={60} color="#999" />
                  <Text style={styles.emptyGalleryText}>No pictures found.</Text>
                  <Text style={styles.emptyGallerySubText}>
                    Tap "Add Photo" to get started!
                  </Text>
                </View>
              }
            />
          </View>
        );
      case 'albums':
        return <AlbumScreen />; // Render the dedicated AlbumScreen
      case 'stories':
        return <StoriesScreen />; // Render the dedicated StoriesScreen
      case 'trash':
        return <TrashScreen />;   // Render the dedicated TrashScreen
      default:
        return (
          <View style={styles.contentSection}>
            <Text style={styles.sectionTitle}>Welcome to Gallery!</Text>
            <Text style={styles.placeholderText}>
              Select an option from the navigation bar.
            </Text>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Main Content Area */}
        <View style={styles.mainContentArea}>{renderMainContent()}</View>

        {/* Modal for full screen image preview */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.fullScreenImageContainer}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Icon name="close-circle" size={30} color="#fff" />
            </TouchableOpacity>
            {currentImage && (
              <Image
                source={{ uri: getImageUri(currentImage) }}
                style={styles.fullScreenImage}
                resizeMode="contain"
              />
            )}
            {currentImage && (
              <Text style={styles.fullScreenImageTitle}>{currentImage.imageId}</Text>
            )}
          </View>
        </Modal>

        {/* Bottom Navigation Bar */}
        <View style={styles.bottomNavContainer}>
          {navItems.map(item => (
            <TouchableOpacity
              key={item.name}
              style={[
                styles.bottomNavItem,
                activeScreen === item.name && styles.bottomNavItemActive,
              ]}
              onPress={() => setActiveScreen(item.name)}
              activeOpacity={0.8}
            >
              <Icon
                name={item.icon}
                size={24}
                color={activeScreen === item.name ? '#3498db' : '#606060'}
              />
              <Text
                style={[
                  styles.bottomNavText,
                  activeScreen === item.name && styles.bottomNavTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    paddingBottom: 70,
  },
  mainContentArea: {
    flex: 1,
    backgroundColor: '#f2f2f2',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  contentSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333'
  },
  placeholderText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
  imageGrid: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 20,
  },
  imageWrapper: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  selectionOverlay: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageSelected: {
    borderWidth: 2,
    borderColor: '#3498db',
  },
  bottomNavContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 5,
    height: 60,
    borderRadius: 32,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 22,
    zIndex: 99,
    paddingHorizontal: 16,
  },
  bottomNavItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomNavText: {
    fontSize: 12,
    color: '#606060',
    marginTop: 2,
    fontWeight: '500',
  },
  bottomNavTextActive: {
    color: '#3498db',
    fontWeight: 'bold',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  uploadButtonText: {
    color: '#3498db',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 6,
  },
  deleteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#e74c3c',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 6,
  },
  emptyGalleryContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  emptyGalleryText: {
    fontSize: 20,
    color: '#666',
    fontWeight: 'bold',
    marginTop: 10,
  },
  emptyGallerySubText: {
    fontSize: 14,
    color: '#888',
    marginTop: 5,
  },
  fullScreenImageContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: '100%',
    height: '80%',
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 20,
    zIndex: 100,
  },
  fullScreenImageTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
  },
  fallbackGradient: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
