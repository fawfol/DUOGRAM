import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  TouchableOpacity,
  FlatList,
  Image,
  LayoutAnimation,
  Platform,
  UIManager,
  TouchableWithoutFeedback,
  PanResponder,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const SIDEBAR_EXPANDED_WIDTH = screenWidth * 0.4;
const HANDLE_WIDTH = 25;
const HANDLE_HEIGHT = 80;

const dummyPictures = Array.from({ length: 30 }, (_, i) => ({
  id: String(i),
  uri: `https://picsum.photos/seed/${i + 100}/200/200`,
  title: `Image ${i + 1}`,
}));

const dummyAlbums = [
  { id: '1', name: 'Vacation 2023', cover: 'https://picsum.photos/seed/300/200/200', count: 15 },
  { id: '2', name: 'Family Fun', cover: 'https://picsum.photos/seed/301/200/200', count: 22 },
  { id: '3', name: 'Work Events', cover: 'https://picsum.photos/seed/302/200/200', count: 8 },
  { id: '4', name: 'Nature Walks', cover: 'https://picsum.photos/seed/303/200/200', count: 10 },
  { id: '5', name: 'Food Adventures', cover: 'https://picsum.photos/seed/304/200/200', count: 12 },
  { id: '6', name: 'Pets', cover: 'https://picsum.photos/seed/305/200/200', count: 7 },
];

export default function GalleryScreen() {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [activeScreen, setActiveScreen] = useState('pictures');
  const [sidebarAnim] = useState(
    new Animated.Value(-SIDEBAR_EXPANDED_WIDTH)
  );

  React.useEffect(() => {
    Animated.timing(sidebarAnim, {
      toValue: isSidebarExpanded ? 0 : -SIDEBAR_EXPANDED_WIDTH,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isSidebarExpanded]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (e, gestureState) => {
        if (
          !isSidebarExpanded &&
          e.nativeEvent.pageX < 30 &&
          gestureState.dx > 10
        ) {
          return true;
        }
        if (
          isSidebarExpanded &&
          gestureState.dx < -10 &&
          e.nativeEvent.pageX > SIDEBAR_EXPANDED_WIDTH - 20
        ) {
          return true;
        }
        return false;
      },
      onPanResponderMove: () => {},
      onPanResponderRelease: (e, gestureState) => {
        if (!isSidebarExpanded && gestureState.dx > 25) {
          setIsSidebarExpanded(true);
        }
        if (isSidebarExpanded && gestureState.dx < -25) {
          setIsSidebarExpanded(false);
        }
      },
    })
  ).current;

  const toggleSidebar = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsSidebarExpanded(!isSidebarExpanded);
  };

  const closeSidebar = () => {
    if (isSidebarExpanded) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setIsSidebarExpanded(false);
    }
  };

  const navItems = [
    { name: 'pictures', label: 'Pictures', icon: 'image' },
    { name: 'albums', label: 'Albums', icon: 'folder-multiple-image' },
    { name: 'stories', label: 'Stories', icon: 'book-open' },
    { name: 'trash', label: 'Trash', icon: 'delete' },
  ];

  const renderMainContent = () => {
    switch (activeScreen) {
      case 'pictures': {
        const numColumns = 3;
        const itemPadding = 5;
        const mainContentPaddingHorizontal = 16;
        const effectiveContentWidth = screenWidth - mainContentPaddingHorizontal * 2;
        const itemSize =
          (effectiveContentWidth - (numColumns - 1) * itemPadding) / numColumns;

        return (
          <View style={styles.contentSection}>
            <Text style={styles.sectionTitle}>All Pictures</Text>
            <FlatList
              data={dummyPictures}
              keyExtractor={item => item.id}
              numColumns={numColumns}
              renderItem={({ item }) => (
                <View
                  style={[
                    styles.imageWrapper,
                    {
                      width: itemSize,
                      height: itemSize,
                      margin: itemPadding / 2,
                    },
                  ]}
                >
                  <Image source={{ uri: item.uri }} style={styles.image} />
                </View>
              )}
              contentContainerStyle={styles.imageGrid}
            />
          </View>
        );
      }
      case 'albums': {
        const albumNumColumns = 2;
        const albumItemPadding = 10;
        const mainContentPaddingHorizontal = 16;
        const effectiveContentWidth = screenWidth - mainContentPaddingHorizontal * 2;
        const albumItemWidth =
          (effectiveContentWidth - (albumNumColumns - 1) * albumItemPadding) /
          albumNumColumns;

        return (
          <View style={styles.contentSection}>
            <Text style={styles.sectionTitle}>Albums</Text>
            <FlatList
              data={dummyAlbums}
              keyExtractor={item => item.id}
              numColumns={albumNumColumns}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.albumCard,
                    { width: albumItemWidth, margin: albumItemPadding / 2 },
                  ]}
                >
                  <Image source={{ uri: item.cover }} style={styles.albumCover} />
                  <Text style={styles.albumTitle} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.albumCount}>{item.count} Photos</Text>
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.albumGrid}
            />
          </View>
        );
      }
      case 'stories':
        return (
          <View style={styles.contentSection}>
            <Text style={styles.sectionTitle}>Stories</Text>
            <Text style={styles.placeholderText}>
              Your memorable stories will appear here.
            </Text>
            <Text style={styles.placeholderText}>
              This section can feature curated collections or timelines.
            </Text>
          </View>
        );
      case 'trash':
        return (
          <View style={styles.contentSection}>
            <Text style={styles.sectionTitle}>Trash</Text>
            <Text style={styles.placeholderText}>
              Items deleted within the last 30 days will be here.
            </Text>
            <Text style={styles.placeholderText}>
              You can restore or permanently delete them from here.
            </Text>
          </View>
        );
      default:
        return (
          <View style={styles.contentSection}>
            <Text style={styles.sectionTitle}>Welcome to Gallery!</Text>
            <Text style={styles.placeholderText}>
              Select an option from the sidebar.
            </Text>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container} {...panResponder.panHandlers}>
        {/* Main Content */}
        <View style={styles.mainContentArea}>{renderMainContent()}</View>

        {/* Overlay */}
        {isSidebarExpanded && (
          <TouchableWithoutFeedback onPress={closeSidebar}>
            <View style={styles.overlay} />
          </TouchableWithoutFeedback>
        )}

        {/* Animated Sidebar + Handle */}
        <Animated.View
          style={[
            styles.sidebarContainer,
            { left: sidebarAnim, zIndex: 25 },
          ]}
        >
          <View style={styles.navItemsContainer}>
            {navItems.map(item => (
              <TouchableOpacity
                key={item.name}
                style={[
                  styles.navItem,
                  activeScreen === item.name && styles.navItemActive,
                ]}
                onPress={() => {
                  setActiveScreen(item.name);
                  closeSidebar();
                }}
              >
                <Icon
                  name={item.icon}
                  size={24}
                  color={activeScreen === item.name ? '#eaeaea' : '#606060'}
                />
                <Text
                  style={[
                    styles.navItemText,
                    activeScreen === item.name && styles.navItemTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {/* Sidebar Handle (rectangle, attached) */}
          <TouchableOpacity
            onPress={toggleSidebar}
            style={styles.handleTab}
            activeOpacity={0.8}
          >
            <Icon
              name={isSidebarExpanded ? 'chevron-left' : 'chevron-right'}
              size={25}
              color="#606060"
            />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1
  },
  container: {
    flex: 1,
  },
  mainContentArea: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#a0a0a0',
    borderTopColor : 'transparent',
    borderBottomColor : 'transparent',
    backgroundColor: '#f2f2f2',
    paddingHorizontal: 16,
    paddingVertical: 20,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 20,
  },
  sidebarContainer: {
    width: SIDEBAR_EXPANDED_WIDTH,
    backgroundColor: '#fff',
    paddingVertical: 10,
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -135 }],
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    justifyContent: 'center',
    alignItems: 'flex-start',
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    borderWidth : 2,
    borderColor: '#a0a0a0',
    borderLeftColor : 'transparent',
    height: 'auto',
  },
  navItemsContainer: {
    width: '100%',
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginVertical: 4,
    borderRadius: 8,
    marginHorizontal: 10,
  },
  navItemActive: {
    backgroundColor: '#3498db',
  },
  navItemText: {
    marginLeft: 15,
    fontSize: 18,
    color: '#606060',
    fontWeight : '800',
  },
  navItemTextActive: {
    fontWeight: 'bold',
    color: '#eaeaea',
  },
  handleTab: {
    position: 'absolute',
    right: -HANDLE_WIDTH,
    top: '35%',
    width: HANDLE_WIDTH,
    height: HANDLE_HEIGHT,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 2,
    zIndex: 100,
    borderWidth: 2,
    borderColor: '#a0a0a0',
    borderLeftColor : '#fff'
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
    justifyContent: 'flex-start',
  },
  imageWrapper: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  albumGrid: {
  	paddingHorizontal: 0,
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
  },
  albumCount: {
    fontSize: 14,
    color: '#666',
  },
});
