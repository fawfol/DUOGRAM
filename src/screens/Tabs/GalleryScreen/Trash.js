// Trash.js

import React from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Dimensions, Modal, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width: screenWidth } = Dimensions.get('window');

export default function Trash({
  trashPictures,
  setTrashPictures,
  pictures,
  setPictures,
  selectionMode,
  setSelectionMode,
  selectedImages,
  setSelectedImages,
  handleToggleSelection,
  setModalVisible,
  setCurrentImage, 
  modalVisible,
  currentImage,
  handleRestoreSelected,
  handlePermanentDelete,
}) {
  const numColumns = 3;
  const itemPadding = 5;

  const mainContentPaddingHorizontal = 16;
  const effectiveContentWidth = screenWidth - mainContentPaddingHorizontal * 2;
  const itemSize = (effectiveContentWidth - (numColumns - 1) * itemPadding) / numColumns;

  const onRestoreSelected = () => {
    console.log('Attempting to restore selected images...');
    handleRestoreSelected(selectedImages, trashPictures, setTrashPictures, pictures, setPictures, setSelectedImages, setSelectionMode);
  };

  const onPermanentDelete = () => {
    console.log('Attempting permanent delete of selected images...');
    handlePermanentDelete(selectedImages, trashPictures, setTrashPictures, setSelectedImages, setSelectionMode);
  };

  const handlePressItem = (item) => {
    console.log('Item pressed in Trash:', item.id);
    if (selectionMode) {
      handleToggleSelection(item.id);
    } else {
      setCurrentImage(item);
      setModalVisible(true);
      console.log('Modal will open for image:', item.id, 'URI:', item.uri);
    }
  };

  const handleLongPressItem = (item) => {
    console.log('Item long pressed in Trash:', item.id);
    setSelectionMode(true);
    handleToggleSelection(item.id); 
  };

  React.useEffect(() => {
    if (modalVisible) {
      console.log('Modal became visible. currentImage state:', currentImage);
      if (currentImage && !currentImage.uri) {
        console.warn('Modal: currentImage object exists but has no URI property!', currentImage);
      } else if (!currentImage) {
        console.warn('Modal: currentImage is null or undefined when modalVisible is true!');
      }
    } else {
      console.log('Modal became hidden.');
    }
  }, [modalVisible, currentImage]);


  return (
    <View style={styles.contentSection}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Trash</Text>
        {selectionMode && Object.keys(selectedImages).length > 0 ? (
          <View style={styles.trashActionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, { marginRight: 15 }]}
              onPress={onRestoreSelected}
              activeOpacity={0.7}
            >
              <Icon name="restore" size={25} color="#27ae60" />
              <Text style={[styles.actionButtonText, { color: '#27ae60' }]}>
                Restore ({Object.keys(selectedImages).length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onPermanentDelete}
              activeOpacity={0.7}
            >
              <Icon name="delete-forever" size={25} color="#e74c3c" />
              <Text style={[styles.actionButtonText, { color: '#e74c3c' }]}>
                Delete Permanently
              </Text>
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
            onPress={() => handlePressItem(item)}
            onLongPress={() => handleLongPressItem(item)}
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
            <Image
              source={{ uri: item.uri }}
              style={styles.image}
              onError={(e) => console.log(`Error loading image ${item.id}:`, e.nativeEvent.error, 'URI:', item.uri)}
            />
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

     
    </View>
  );
}

const styles = StyleSheet.create({
  contentSection: {
    flex: 1,
    paddingHorizontal: 16,
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
    justifyContent: 'flex-start',
    // alignItems: 'center',
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
    height: '100%',
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
    // Add some padding to prevent text from touching screen edges
    paddingHorizontal: 20,
    textAlign: 'center',
  },
  loadingText: {
    color: 'white',
    fontSize: 18,
  }
});
