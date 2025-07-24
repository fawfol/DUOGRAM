// Trash.js

import React from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Dimensions, Modal, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width: screenWidth } = Dimensions.get('window');

export default function Trash({
  trashPictures,
  setTrashPictures,
  pictures, // Passed to restore
  setPictures, // Passed to restore
  selectionMode,
  setSelectionMode,
  selectedImages,
  setSelectedImages,
  handleToggleSelection, // Modified prop name for clarity
  setModalVisible,
  setCurrentImage,
  modalVisible,
  currentImage,
  handleRestoreSelected, // The actual restore function from functions/
  handlePermanentDelete, // The actual permanent delete function from functions/
}) {
  const numColumns = 3;
  const itemPadding = 5;
  const mainContentPaddingHorizontal = 16;
  const effectiveContentWidth = screenWidth - mainContentPaddingHorizontal * 2;
  const itemSize = (effectiveContentWidth - (numColumns - 1) * itemPadding) / numColumns;

  // Local wrappers for the functions to pass necessary args
  const onRestoreSelected = () => {
    handleRestoreSelected(selectedImages, trashPictures, setTrashPictures, pictures, setPictures, setSelectedImages, setSelectionMode);
  };

  const onPermanentDelete = () => {
    handlePermanentDelete(selectedImages, trashPictures, setTrashPictures, setSelectedImages, setSelectionMode);
  };

  const handlePressItem = (item) => {
    // Re-using the handlePress from functions, but pass current component's state
    // Note: handlePress expects toggleImageSelection, setModalVisible, setCurrentImage
    // We are directly calling it with the props from GalleryScreen
    if (selectionMode) {
        handleToggleSelection(item.id); // This already handles selection logic
    } else {
        setCurrentImage(item);
        setModalVisible(true);
    }
  };

  const handleLongPressItem = (item) => {
    // Re-using handleLongPress from functions, but pass current component's state
    // Note: handleLongPress expects setSelectionMode, toggleImageSelection
    // We are directly calling it with the props from GalleryScreen
    setSelectionMode(true); // Ensure selection mode is active
    handleToggleSelection(item.id); // This already handles selection logic
  };


  return (
    <View style={styles.contentSection}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Trash</Text>
        {selectionMode && Object.keys(selectedImages).length > 0 ? (
          <View style={styles.trashActionButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onRestoreSelected}
              activeOpacity={0.7}
            >
              <Icon name="restore" size={25} color="#27ae60" />
              <Text style={styles.actionButtonText}>
                Restore ({Object.keys(selectedImages).length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onPermanentDelete}
              activeOpacity={0.7}
            >
              <Icon name="delete-forever" size={25} color="#e74c3c" />
              <Text style={styles.actionButtonText}>Delete Permanently</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.trashInfo}>
            <Icon name="information-outline" size={20} color="#666" />
            <Text style={styles.trashInfoText}>Items are here for 30 days</Text>
          </View>
        )}
      </View>

      <FlatList
        data={trashPictures}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => handlePressItem(item)} // Use local handler
            onLongPress={() => handleLongPressItem(item)} // Use local handler
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
            <Text style={styles.emptyGalleryText}>Trash is empty.</Text>
            <Text style={styles.emptyGallerySubText}>Deleted items will appear here.</Text>
          </View>
        )}
      />

      {/* Full-screen image modal for trash items */}
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
}

const styles = StyleSheet.create({
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  trashActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  actionButtonText: {
    color: '#e74c3c', // Default red for delete
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 6,
  },
  trashInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 5,
    borderRadius: 5,
    backgroundColor: '#e0e0e0',
  },
  trashInfoText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 5,
  },
  imageGrid: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 20,
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
  imageSelected: {
    borderWidth: 3,
    borderColor: '#3498db',
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
});
