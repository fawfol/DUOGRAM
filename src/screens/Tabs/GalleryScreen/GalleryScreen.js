// GalleryScreen.js
import React, { useState, useCallback } from 'react';
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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Import the externalized functions
import {
  toggleImageSelection,
  handleLongPress,
  handlePress,
  handleDeleteSelected,
  handleRestoreSelected,
  handlePermanentDelete,
  sortImagesByDate,
} from './functions/galleryFunctions';
import Albums from './Album';
import Stories from './Stories';
import Trash from './Trash'; // Import the Trash component

const { width: screenWidth } = Dimensions.get('window');

// Initial dummy pictures - now includes dateAdded
const initialDummyPictures = Array.from({ length: 30 }, (_, i) => {
  const now = new Date();
  // Generate dates within a reasonable past range (e.g., last 30 days)
  now.setMinutes(now.getMinutes() - Math.floor(Math.random() * 60 * 24 * 30));
  return {
    id: String(i),
    uri: `https://picsum.photos/seed/${i + 100}/200/200`,
    title: `Image ${i + 1}`,
    dateAdded: now.toISOString(), // Store as ISO string for consistent comparison
  };
});

export default function GalleryScreen() {
  const [activeScreen, setActiveScreen] = useState('pictures');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedImages, setSelectedImages] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [currentImage, setCurrentImage] = useState(null);
  //initialize pictures with sorted data
  const [pictures, setPictures] = useState(sortImagesByDate(initialDummyPictures));
  const [trashPictures, setTrashPictures] = useState([]);

  const navItems = [
    { name: 'pictures', label: 'Pictures', icon: 'image' },
    { name: 'albums', label: 'Albums', icon: 'folder-multiple-image' },
    { name: 'stories', label: 'Stories', icon: 'book-open' },
    { name: 'trash', label: 'Trash', icon: 'delete' },
  ];

  //memoized handlers using useCallback to prevent unnecessary re-renders
  //th dependencies ensure the functions are recreated only when the values they close over change

  const handleToggleSelection = useCallback((imageId) =>
    toggleImageSelection(imageId, selectedImages, setSelectedImages, setSelectionMode),
    [selectedImages, setSelectedImages, setSelectionMode]
  );

  const handleImageLongPress = useCallback((item) =>
    handleLongPress(item, setSelectionMode, selectedImages, setSelectedImages),
    [setSelectionMode, selectedImages, setSelectedImages]
  );


  const handleImagePress = useCallback((item) =>
    handlePress(item, selectionMode, handleToggleSelection, setModalVisible, setCurrentImage, selectedImages, setSelectedImages, setSelectionMode),
    [selectionMode, handleToggleSelection, setModalVisible, setCurrentImage, selectedImages, setSelectedImages, setSelectionMode]
  );

  const handleDelete = useCallback(() =>
    handleDeleteSelected(selectedImages, pictures, setPictures, trashPictures, setTrashPictures, setSelectedImages, setSelectionMode),
    [selectedImages, pictures, setPictures, trashPictures, setTrashPictures, setSelectedImages, setSelectionMode]
  );

  //reusable component for rendering the picture grid flatList
  const renderPictureGrid = useCallback((data, emptyMessage) => {
    const numColumns = 3;
    const itemPadding = 5;
    const mainContentPaddingHorizontal = 16;
    const effectiveContentWidth = screenWidth - mainContentPaddingHorizontal * 2;
    const itemSize = (effectiveContentWidth - (numColumns - 1) * itemPadding) / numColumns;

    return (
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => handleImagePress(item)}
            onLongPress={() => handleImageLongPress(item)}
            activeOpacity={0.8}
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
            <Image source={{ uri: item.uri }} style={styles.image} />
            {selectionMode && selectedImages[item.id] && (
              <View style={styles.selectionOverlay}>
                <Icon name="check-circle" size={30} color="#3498db" />
              </View>
            )}
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.imageGrid}
        ListEmptyComponent={() => (
          <View style={styles.emptyGalleryContainer}>
            <Icon name="image-off" size={60} color="#999" />
            <Text style={styles.emptyGalleryText}>{emptyMessage}</Text>
            <Text style={styles.emptyGallerySubText}>
              {/* Conditional sub-text based on whether it's the main gallery or trash */}
              {data === pictures ? 'Tap "Add Photo" to get started!' : 'Deleted items will appear here.'}
            </Text>
          </View>
        )}
      />
    );
  }, [handleImagePress, handleImageLongPress, selectedImages, selectionMode, pictures]); // Include 'pictures' to differentiate empty message logic


  const renderMainContent = () => {
    switch (activeScreen) {
      case 'pictures':
        return (
          <View style={styles.contentSection}>
            <View style={styles.headerRow}>
              <Text style={styles.sectionTitle}>All Pictures</Text>
              {selectionMode && Object.keys(selectedImages).length > 0 ? (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleDelete} //calls the memoized handler
                  activeOpacity={0.7}
                >
                  <Icon name="delete" size={25} color="#e74c3c" />
                  <Text style={styles.actionButtonText}>
                    Delete ({Object.keys(selectedImages).length})
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={() => {
                    console.log('Add Photo button pressed');
                    const newId = String(pictures.length + trashPictures.length + 1);
                    const newImage = {
                      id: newId,
                      uri: `https://picsum.photos/seed/${Math.random()}/200/200`,
                      title: `New Image ${newId}`,
                      dateAdded: new Date().toISOString(), //add dateAdded for sorting
                    };
                    setPictures(prev => sortImagesByDate([...prev, newImage])); //add and sort
                  }}
                  activeOpacity={0.7}
                >
                  <Icon name="plus-circle" size={25} color="#3498db" />
                  <Text style={styles.uploadButtonText}>Add Photo</Text>
                </TouchableOpacity>
              )}
            </View>

            {renderPictureGrid(pictures, 'No pictures found.')}

            {/* Modal for full-screen image view */}
            <Modal
              animationType="fade"
              transparent={true}
              visible={modalVisible}
              onRequestClose={() => {
                setModalVisible(!modalVisible);
                setCurrentImage(null);
              }}
            >
              <View style={styles.fullScreenImageContainer}>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => {
                    setModalVisible(false);
                    setCurrentImage(null);
                  }}
                >
                  <Icon name="close-circle" size={30} color="#fff" />
                </TouchableOpacity>
                {currentImage && (
                  <Image
                    source={{ uri: currentImage.uri }}
                    style={styles.fullScreenImage}
                    resizeMode="contain"
                  />
                )}
                {currentImage && (
                  <Text style={styles.fullScreenImageTitle}>
                    {currentImage.title}
                  </Text>
                )}
              </View>
            </Modal>
          </View>
        );

      case 'albums':
        return <Albums />;
      case 'stories':
        return <Stories />;

      case 'trash':
        // tp pass necessary states and setters as props to Trash.js
        return (
          <Trash
            trashPictures={trashPictures}
            setTrashPictures={setTrashPictures}
            pictures={pictures} //pass main pictures state for restore functionality
            setPictures={setPictures} //pass main pictures setter for restore functionality
            selectionMode={selectionMode}
            setSelectionMode={setSelectionMode}
            selectedImages={selectedImages}
            setSelectedImages={setSelectedImages}
            handleToggleSelection={handleToggleSelection} //pass the memoized handler
            setModalVisible={setModalVisible}
            setCurrentImage={setCurrentImage}
            modalVisible={modalVisible}
            currentImage={currentImage}
            handleRestoreSelected={handleRestoreSelected} //pass the actual function from galleryFunctions
            handlePermanentDelete={handlePermanentDelete} //pass the actual function from galleryFunctions
            //pass the memoized image press handlers to Trash for consistency
            handleImagePress={handleImagePress}
            handleImageLongPress={handleImageLongPress}
          />
        );

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

        {/* Bottom Navigation Bar */}
        <View style={styles.bottomNavContainer}>
          {navItems.map((item) => (
            <TouchableOpacity
              key={item.name}
              style={[
                styles.bottomNavItem,
                activeScreen === item.name && styles.bottomNavItemActive,
              ]}
              //on navigation change, clear selection mode and selected images
              onPress={() => {
                setActiveScreen(item.name);
                setSelectionMode(false);
                setSelectedImages({});
              }}
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
    // The main content area uses absolute positioning, so the container doesn't need flex: 1
    // if its only child is absolutely positioned, but it doesn't hurt
  },
  mainContentArea: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#a0a0a0',
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    backgroundColor: '#f2f2f2',
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingBottom: 75,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1, 
  },
  contentSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholderText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
  //Style for the FlatList content container
  imageGrid: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 15,
    flexGrow: 1,
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
    backgroundColor: 'rgba(255, 255, 255, 0.7)', //semi-transparent white circle
    justifyContent: 'center',
    alignItems: 'center',
  },
  //Styles for the bottom navigation bar
  bottomNavContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 70, // Fixed height for the nav bar
    borderTopWidth: 1,
    borderTopColor: '#ccc',
    backgroundColor: '#f0f0f0',
    paddingBottom: Platform.OS === 'ios' ? 24 : 10, //adjust padding for iOS safe area
    paddingTop: 8,
    position: 'absolute', //positionaing at the bottom
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10, //ensure it's above other content
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000', //subtle shadow for depth
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 8, //android shadow
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
    color: '#3498db', //blue for active tab text
    fontWeight: 'bold',
  },
  //Styles for the header row  "All Pictures" and "Add Photo" buttons
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
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 5, 
  },
  actionButtonText: {
    color: '#e74c3c',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 6,
  },
  //Styles for the full-screen image modal
  fullScreenImageContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)', 
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
  // Styles for empty gallery state
  emptyGalleryContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  emptyGalleryText: {
    fontSize: 20,
    color: '#666',
    marginTop: 10,
    fontWeight: 'bold',
  },
  emptyGallerySubText: {
    fontSize: 14,
    color: '#888',
    marginTop: 5,
  },
});
