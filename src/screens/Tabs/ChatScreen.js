import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Keyboard, ActivityIndicator, Alert, Platform, KeyboardAvoidingView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { collection, addDoc, query, orderBy, onSnapshot, doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import moment from 'moment';
import { useHeaderHeight } from '@react-navigation/elements';

// Helper function to get date labels for chat separators
function getDateLabel(dateString) {
  const m = moment(dateString, 'YYYY-MM-DD');
  if (m.isSame(moment(), 'day')) return 'Today';
  if (m.isSame(moment().subtract(1, 'day'), 'day')) return 'Yesterday';
  return m.format('D MMMM YYYY');
}

export default function ChatScreen() {
  const [messages, setMessages] = useState([]);
  const [pairCode, setPairCode] = useState(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const user = auth.currentUser;
  const flatListRef = useRef(null);
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();

  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setIsKeyboardOpen(true);
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setIsKeyboardOpen(false);
    });

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    async function getPairCode() {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (mounted && userDoc.exists()) setPairCode(userDoc.data().pairCode);
      } catch (error) {
        console.error("Error fetching pair code:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    if (user) {
      getPairCode();
    } else {
      setLoading(false);
    }
    return () => { mounted = false };
  }, [user]);

  useEffect(() => {
    if (!pairCode) {
      if (!loading) setLoading(true);
      return;
    }
    setLoading(true);
    const q = query(collection(db, 'pairs', pairCode, 'messages'), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const rawMsgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      const merged = [];
      let lastDate = null;
      rawMsgs.forEach(msg => {
        let ts = msg.timestamp?.toDate?.() || msg.timestamp;
        let thisDate = moment(ts).format("YYYY-MM-DD");
        if (thisDate !== lastDate) {
          merged.push({ type: 'separator', id: 'sep_' + thisDate, dateString: thisDate });
          lastDate = thisDate;
        }
        if (!(msg.deletedFor || []).includes(user.uid)) {
          merged.push({ type: 'message', ...msg });
        }
      });

      const shouldScrollToBottom = flatListRef.current && (
        !isScrolledUp ||
        messages.length === 0
      );

      setMessages(merged);

      if (shouldScrollToBottom) {
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
      setLoading(false);

    }, (error) => {
      console.error("Error fetching messages:", error);
      setLoading(false);
    });
    return unsubscribe;
  }, [pairCode, user, isScrolledUp, messages.length]);

  useEffect(() => {
    if (!pairCode || !user) return;
    const updateSeenMessages = async () => {
      const unread = messages.filter(
        msg =>
          msg.type === 'message' &&
          msg.sender !== user.uid &&
          !(msg.seenBy || []).includes(user.uid)
      );
      for (const msg of unread) {
        const msgRef = doc(db, 'pairs', pairCode, 'messages', msg.id);
        try {
          await updateDoc(msgRef, { seenBy: arrayUnion(user.uid) });
        } catch (error) {
          console.error("Error marking message as seen:", error);
        }
      }
    };
    const timer = setTimeout(updateSeenMessages, 500);
    return () => clearTimeout(timer);
  }, [messages, pairCode, user]);

  const sendMessage = async () => {
    if (!input.trim() || !pairCode || !user?.uid) return;
    try {
      await addDoc(collection(db, 'pairs', pairCode, 'messages'), {
        text: input.trim(),
        sender: user.uid,
        timestamp: new Date(),
        seenBy: [user.uid],
        deleted: false,
        deletedFor: []
      });
      setInput('');
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (error) {
      console.error("Error sending message:", error);
      Alert.alert("Error", "Failed to send message.");
    }
  };

  const handleDeleteOptions = (msg) => {
    const isMine = msg.sender === user.uid;
    const options = [];
    options.push({
      text: 'Delete for me',
      onPress: () => deleteForMe(msg.id),
      style: 'default'
    });
    if (isMine && !msg.deleted) {
      options.push({
        text: 'Delete for everyone',
        onPress: () => Alert.alert(
          "Confirm Delete",
          "Are you sure you want to delete this message for everyone? This action cannot be undone.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", onPress: () => deleteForEveryone(msg.id), style: "destructive" }
          ]
        ),
        style: 'destructive'
      });
    }
    options.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('Delete message?', '', options);
  };

  const deleteForMe = async (msgId) => {
    try {
      const msgRef = doc(db, 'pairs', pairCode, 'messages', msgId);
      await updateDoc(msgRef, { deletedFor: arrayUnion(user.uid) });
    } catch (error) {
      console.error("Error deleting for me:", error);
      Alert.alert("Error", "Failed to delete message for yourself.");
    }
  };

  const deleteForEveryone = async (msgId) => {
    try {
      const msgRef = doc(db, 'pairs', pairCode, 'messages', msgId);
      await updateDoc(msgRef, { deleted: true, text: '' });
    } catch (error) {
      console.error("Error deleting for everyone:", error);
      Alert.alert("Error", "Failed to delete message for everyone.");
    }
  };

  const renderItem = ({ item }) => {
    if (item.type === 'separator') {
      return (
        <View style={{ alignItems: 'center', marginVertical: 8 }}>
          <View style={{
            backgroundColor: '#d6d6d6',
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 2,
          }}>
            <Text style={{ color: '#444', fontWeight: 'bold', fontSize: 12 }}>
              {getDateLabel(item.dateString)}
            </Text>
          </View>
        </View>
      );
    }
    const isMine = item.sender === user.uid;
    const seenByPartner = (item.seenBy || []).some(uid => uid !== user.uid);
    const isDeleted = item.deleted;
    const wasDeletedForMe = (item.deletedFor || []).includes(user.uid);
    let timeString = '';
    if (item.timestamp?.toDate) {
      timeString = moment(item.timestamp.toDate()).format('HH:mm');
    } else if (item.timestamp) {
      timeString = moment(item.timestamp).format('HH:mm');
    }
    const getDisplayText = () => {
      if (isDeleted) return 'Message deleted for everyone';
      if (wasDeletedForMe) return 'Message deleted for you';
      return item.text;
    };
    return (
      <TouchableOpacity
        onLongPress={() => {
          if (!isDeleted && !wasDeletedForMe) handleDeleteOptions(item);
        }}
        delayLongPress={500}
        activeOpacity={0.7}
      >
        <View style={[styles.bubble, isMine ? styles.myBubble : styles.partnerBubble]}>
          <Text style={[
            styles.msgText,
            (isDeleted || wasDeletedForMe) && { fontStyle: 'italic', color: '#888' }
          ]}>
            {getDisplayText()}
          </Text>
          <Text style={[styles.meta, { textAlign: 'right' }]}>
            {timeString}{' '}
            {isMine && !isDeleted && !wasDeletedForMe && (
              <Text style={{ color: seenByPartner ? 'green' : 'gray', fontSize: 15, fontWeight: '900' }}>✓</Text>
            )}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const handleScroll = (event) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 50;
    setIsScrolledUp(!isCloseToBottom);
  };

  // Calculate the base offset for KeyboardAvoidingView
  const baseKeyboardOffset = Platform.select({
    ios: headerHeight + insets.top,
    android: headerHeight,
    default: 0,
  });

  const finalKeyboardVerticalOffset = isKeyboardOpen ? baseKeyboardOffset + 20 : baseKeyboardOffset;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={finalKeyboardVerticalOffset}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        style={styles.flatList}
        contentContainerStyle={styles.flatListContent}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color="#007AFF" style={{ alignSelf: 'center', marginTop: 40 }} />
          ) : (
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptyText}>Say hi 👋 and start the conversation!</Text>
            </View>
          )
        }
        onScroll={handleScroll}
        scrollEventThrottle={16}
      />
      <View style={[styles.inputBar, { paddingBottom: insets.bottom }]}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Type a message…"
          returnKeyType="send"
          onSubmitEditing={sendMessage}
          editable={!!pairCode}
        />
        <TouchableOpacity
          onPress={sendMessage}
          style={[styles.sendBtn, (!input.trim() || !pairCode) && styles.sendBtnDisabled]}
          disabled={!input.trim() || !pairCode}
        >
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flatList: {
    paddingHorizontal: 16,
  },
  flatListContent: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    paddingTop: 16,
  },
  bubble: {
    padding: 10, paddingBottom : 5, borderRadius: 12, marginBottom: 7, maxWidth: '80%',
  },
  myBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#d1e7ff',
  },
  partnerBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#e6e6e6',
  },
  msgText: { fontSize: 16 },
  meta: { fontSize: 11, color: '#888', marginTop: 3 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  input: { flex: 1, height: 40, borderColor: '#aaa', borderWidth: 1, borderRadius: 20, paddingHorizontal: 12},
  sendBtn: { marginLeft: 8, backgroundColor: '#007AFF', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20 },
  sendBtnDisabled: { opacity: 0.5 },
  sendText: { color: '#fff', fontWeight: 'bold' },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#555' },
  emptyText: { fontSize: 14, color: '#777', marginTop: 4 }
});
