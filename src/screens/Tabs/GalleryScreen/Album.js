// Albums.js
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Dimensions,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {
  toggleAlbumSelection,
  handleAlbumLongPress,
  handleOpenAlbum,
  handleCreateAlbum,
  handleDeleteSelectedAlbums,
} from './functions/albumFunctions';

const { width: screenWidth } = Dimensions.get('window');

const initialDummyAlbums = [
  { id: '1', name: 'Vacation 2023', cover: 'https://picsum.photos/seed/300/200/200', count: 15 },
  { id: '2', name: 'Family Fun', cover: 'https://picsum.photos/seed/301/200/200', count: 22 },
  { id: '3', name: 'Work Events', cover: 'https://picsum.photos/seed/302/200/200', count: 8 },
  { id: '4', name: 'Nature Walks', cover: 'https://picsum.photos/seed/303/200/200', count: 10 },
  { id: '5', name: 'Food Adventures', cover: 'https://picsum.photos/seed/304/200/200', count: 12 },
  { id: '6', name: 'Pets', cover: 'https://picsum.photos/seed/305/200/200', count: 7 },
];

export default function Albums({ navigation }) { // receive navigation prop if using React Navigation
  const [albums, setAlbums] = useState(initialDummyAlbums);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedAlbums, setSelectedAlbums] = useState({});
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState('');

  const albumNumColumns = 2;
  const albumItemPadding = 10;
  const mainContentPaddingHorizontal = 16;
  const effectiveContentWidth = screenWidth - mainContentPaddingHorizontal * 2;
  const albumItemWidth = (effectiveContentWidth - (albumNumColumns - 1) * albumItemPadding) / albumNumColumns;

  //memoized handlers for album selection
  const handleToggleAlbumSelection = useCallback((albumId) =>
    toggleAlbumSelection(albumId, selectedAlbums, setSelectedAlbums, setSelectionMode),
    [selectedAlbums, setSelectedAlbums, setSelectionMode]
  );

  const handleAlbumLongPressEvent = useCallback((item) =>
    handleAlbumLongPress(item, setSelectionMode, handleToggleAlbumSelection, selectedAlbums, setSelectedAlbums),
    [setSelectionMode, handleToggleAlbumSelection, selectedAlbums, setSelectedAlbums]
  );

  const handleAlbumPressEvent = useCallback((item) => {
    if (selectionMode) {
      handleToggleAlbumSelection(item.id);
    } else {
      //pass navigation prop to handleOpenAlbum
      handleOpenAlbum(item.id, item.name, navigation);
    }
  }, [selectionMode, handleToggleAlbumSelection, navigation]);


  //memoized handlers for album actions (create/delete)
  const onCreateAlbum = useCallback(() =>
    handleCreateAlbum(newAlbumName, albums, setAlbums, setCreateModalVisible, setNewAlbumName, Alert),
    [newAlbumName, albums, setAlbums, setCreateModalVisible, setNewAlbumName]
  );

  const onDeleteSelectedAlbums = useCallback(() =>
    handleDeleteSelectedAlbums(selectedAlbums, albums, setAlbums, setSelectedAlbums, setSelectionMode, Alert),
    [selectedAlbums, albums, setAlbums, setSelectedAlbums, setSelectionMode]
  );

  return (
    <View style={styles.contentSection}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Albums</Text>
        {selectionMode && Object.keys(selectedAlbums).length > 0 ? (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onDeleteSelectedAlbums} // Use memoized handler
            activeOpacity={0.7}
          >
            <Icon name="delete" size={25} color="#e74c3c" />
            <Text style={styles.actionButtonText}>
              Delete ({Object.keys(selectedAlbums).length})
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => {
              setCreateModalVisible(true);
            }}
            activeOpacity={0.7}
          >
            <Icon name="plus-circle" size={25} color="#3498db" />
            <Text style={styles.createButtonText}>Create</Text>
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        data={albums}
        keyExtractor={(item) => item.id}
        numColumns={albumNumColumns}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.albumCard,
              { width: albumItemWidth, margin: albumItemPadding / 2 },
              selectedAlbums[item.id] && styles.albumSelected,
            ]}
            onPress={() => handleAlbumPressEvent(item)} 
            onLongPress={() => handleAlbumLongPressEvent(item)}
            activeOpacity={0.8}
          >
            <Image source={{ uri: item.cover }} style={styles.albumCover} />
            <Text style={styles.albumTitle} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.albumCount}>{item.count} Photos</Text>
            {selectionMode && selectedAlbums[item.id] && (
              <View style={styles.selectionOverlay}>
                <Icon name="check-circle" size={30} color="#3498db" />
              </View>
            )}
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.albumGrid}
        ListEmptyComponent={() => (
          <View style={styles.emptyAlbumsContainer}>
            <Icon name="folder-multiple-image" size={60} color="#999" />
            <Text style={styles.emptyAlbumsText}>No albums found.</Text>
            <Text style={styles.emptyAlbumsSubText}>Tap "Create" to make a new album.</Text>
          </View>
        )}
      />

      {/* Create Album Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={createModalVisible}
        onRequestClose={() => {
          setCreateModalVisible(false);
          setNewAlbumName('');
        }}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Create New Album</Text>
            <TextInput
              style={styles.input}
              placeholder="Album Name"
              placeholderTextColor="#999"
              value={newAlbumName}
              onChangeText={setNewAlbumName}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.buttonClose]}
                onPress={() => {
                  setCreateModalVisible(false);
                  setNewAlbumName('');
                }}
              >
                <Text style={styles.textStyle}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.buttonCreate]}
                onPress={onCreateAlbum}
              >
                <Text style={styles.textStyle}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  contentSection: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  createButtonText: {
    color: '#3498db',
    fontWeight: 'bold',
    fontSize: 18,
    marginLeft: 6,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#e74c3c',
    fontWeight: 'bold',
    fontSize: 18,
    marginLeft: 6,
  },
  albumGrid: {
    paddingHorizontal: 5,
    alignItems: 'center',
    paddingBottom: 20,
    flexGrow: 1,
  },
  albumCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    position: 'relative',
  },
  albumCover: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginBottom: 10,
    resizeMode: 'cover',
  },
  albumTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
    textAlign: 'center',
  },
  albumCount: {
    fontSize: 14,
    color: '#666',
  },
  albumSelected: {
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
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '80%',
  },
  modalTitle: {
    marginBottom: 15,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  input: {
    width: '100%',
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 20,
    fontSize: 16,
    color: '#333',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  button: {
    borderRadius: 10,
    padding: 12,
    elevation: 2,
    flex: 1,
    marginHorizontal: 5,
  },
  buttonClose: {
    backgroundColor: '#95a5a6',
  },
  buttonCreate: {
    backgroundColor: '#3498db',
  },
  textStyle: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 16,
  },
  emptyAlbumsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  emptyAlbumsText: {
    fontSize: 20,
    color: '#666',
    marginTop: 10,
    fontWeight: 'bold',
  },
  emptyAlbumsSubText: {
    fontSize: 14,
    color: '#888',
    marginTop: 5,
  },
});
