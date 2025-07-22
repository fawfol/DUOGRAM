import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput, Alert,
  Linking, Share, ScrollView
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { signOut, updateProfile, sendPasswordResetEmail, deleteUser, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import Clipboard from '@react-native-clipboard/clipboard';
import DeviceInfo from 'react-native-device-info';
import { auth, db } from '../firebase';
import { useNavigation } from '@react-navigation/native';

export default function AccountScreen({ navigation }) {
  const [profileName, setProfileName] = useState('');
  const [editing, setEditing] = useState(false);
  const [pairCode, setPairCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Loading account…');
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setLoadingMessage('No user found, please login again…');
        setLoading(false);
        return;
      }
      await currentUser.reload();
      setUser(currentUser);
      setLoading(true);
      setLoadingMessage('Fetching profile…');
      try {
        const userSnap = await getDoc(doc(db, 'users', currentUser.uid));
        const userData = userSnap.exists() ? userSnap.data() : {};
        setProfileName(userData.name || '');
        setPairCode(userData.pairCode || '');
      } catch (e) {
        Alert.alert('Error', e.message);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const saveName = async () => {
    if (!profileName.trim()) {
      Alert.alert('Name cannot be empty.');
      return;
    }
    try {
      await updateProfile(user, { displayName: profileName });
      await setDoc(doc(db, 'users', user.uid), { name: profileName }, { merge: true });
      setEditing(false);
      Alert.alert('Name updated!');
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const copyCode = async () => {
    Clipboard.setString(pairCode ?? '');
    Alert.alert('Copied', 'Pair code copied!');
  };

  const shareCode = async () => {
    await Share.share({ message: `Join my Duogram! Pair code: ${pairCode}` });
  };

  const triggerReset = async () => {
    try {
      await sendPasswordResetEmail(auth, user.email);
      Alert.alert('Done', `Instruction sent to: ${user.email}`);
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const regenerateCode = async () => {
    Alert.alert(
      'Regenerate Pair Code',
      'Are you sure? Both users will need to use the new code. Messages/photos remain.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Regenerate',
          onPress: async () => {
            try {
              const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
              await updateDoc(doc(db, 'users', user.uid), { pairCode: newCode });
              setPairCode(newCode);
              Alert.alert('Pair code updated!', `New code: ${newCode}`);
            } catch (err) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  const LoginNavigation = useNavigation();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      LoginNavigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      Alert.alert("Logout Failed", error.message);
    }
  };

  const disconnectPair = async () => {
    Alert.alert(
      'Disconnect',
      'Remove yourself from this duo? You can re-pair later.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            await updateDoc(doc(db, 'users', user.uid), { pairCode: '' });
            setPairCode('');
            navigation.reset({ index: 0, routes: [{ name: 'Pair' }] });
          },
        },
      ]
    );
  };

  const deleteAccount = async () => {
    Alert.alert('Delete Account', 'This is permanent and cannot be undone. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteUser(user);
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          } catch (err) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  const deleteCode = () => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete your Duo Code? This will notify your pair as well.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setPairCode(null);
            alert("Duo Code deleted.");
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text>{loadingMessage}</Text>
      </View>
    );
  }

  const version = DeviceInfo.getVersion();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* PROFILE */}
      <Text style={styles.section}>Profile</Text>
      <View style={styles.profileField}>
        <Text style={styles.label}>Name</Text>
        {editing ? (
          <View style={styles.editRow}>
            <TextInput value={profileName} onChangeText={setProfileName} style={styles.nameInput} placeholder="Enter your name" autoFocus />
            <TouchableOpacity style={styles.saveBtn} onPress={saveName}>
              <Text style={styles.btnText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(false)}>
              <Text style={styles.btnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.viewRow, styles.infoBoxname]}>
            <Text style={styles.infoText}>{profileName || 'No name set'}</Text>
            <TouchableOpacity onPress={() => setEditing(true)}>
              <Text style={[styles.actionText, { marginLeft: 120 }, styles.center]}>Edit</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      <View style={styles.profileField}>
        <Text style={styles.label}>Email</Text>
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>{user?.email || 'No email found'}</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.resetBtn} onPress={triggerReset}>
        <Text style={styles.resetBtnText}>Change or Reset Password</Text>
      </TouchableOpacity>
      
      
      {/* PAIR/Duo SECTION */}
      <Text style={styles.section}>Duolink</Text>
      <View style={styles.glassCard}>
  {pairCode ? (
    <>
      <Text selectable style={styles.infoText}>
        Duo Code: {pairCode}
      </Text>
      <View style={styles.row}>
        <TouchableOpacity style={styles.actionBtn} onPress={copyCode}>
          <Text style={styles.actionText}>Copy</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={shareCode}>
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={regenerateCode}>
          <Text style={styles.actionText}>Regenerate</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.row}>
        <TouchableOpacity style={styles.dangerBtn} onPress={disconnectPair}>
          <Text style={styles.dangerText}>Disconnect</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dangerBtn} onPress={deleteCode}>
          <Text style={styles.dangerText}>Delete Code</Text>
        </TouchableOpacity>
      </View>
      <View style={[styles.row, { marginTop: 6 }]}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#34C759' }]}
          onPress={() => navigation.navigate('Pair')}
        >
          <Text style={[styles.actionText, { color: '#fff', fontWeight: 'bold' }]}>
            Pair With Another Duo Code
          </Text>
        </TouchableOpacity>
      </View>
    </>
  ) : (
    <>
      <Text style={styles.subtle}>Not paired.</Text>
      <TouchableOpacity
        style={[styles.actionBtn, { backgroundColor: '#34C759', marginTop: 14 }]}
        onPress={() => navigation.navigate('Pair')}
      >
        <Text style={[styles.actionText, { color: '#fff', fontWeight: 'bold' }]}>
          Pair Now
        </Text>
      </TouchableOpacity>
    </>
  )}
</View>


      {/* SUPPORT */}
      <Text style={styles.section}>Support</Text>
      <TouchableOpacity
        style={styles.row}
        onPress={() => Linking.openURL('mailto:kalsangkalsang5@gmail.com')}
      >
        <Ionicons name="mail-outline" size={20} color="#007AFF" />
        <Text style={[styles.actionText, { fontSize: 16, marginLeft: 7 }]}>Contact Support</Text>
      </TouchableOpacity>
      <Text style={[styles.subtle, { marginBottom: 0 }]}>
        Version: {version}
      </Text>
      
      
      {/* SECURITY */}
      <Text style={styles.section}>Security & Account</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutBtn}>&nbsp;&nbsp;Log Out&nbsp;&nbsp;</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dangerBtn} onPress={deleteAccount}>
          <Text style={styles.dangerText}>Delete Account</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#fff', flexGrow: 1, paddingTop: 0 },
  section: { fontSize: 27, fontWeight: 'bold', marginBottom: 5, marginTop: 20 },
  profileRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 7 },
  subtle: { fontSize: 13, color: '#888', marginLeft: 0, marginTop: 2 },
  nameInput: { fontSize: 16, borderWidth: 1, borderColor: '#aaa', borderRadius: 8, padding: 7, minWidth: 120, marginRight: 10 },
  saveBtn: { backgroundColor: '#007AFF', borderRadius: 8, marginRight: 4, paddingHorizontal: 12, paddingVertical: 7 },
  cancelBtn: { backgroundColor: '#aaa', borderRadius: 8, marginRight: 4, paddingHorizontal: 12, paddingVertical: 7 },
  logoutBtn: { borderWidth: 1, borderColor: '#FF3B30', paddingHorizontal: 9, paddingVertical: 8, borderRadius: 8, marginRight: 10, color: '#FF3B30', fontSize: 17 },
  btnText: { color: '#fff', fontSize: 18 },
  actionText: { color: '#007AFF', fontSize: 16 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 7},
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  infoText: { fontSize: 16, marginBottom: 8, fontWeight: '500', color: '#333' },
  dangerText: { color: '#fff', fontSize: 16, fontWeight: '600', },
  dangerBtn: { backgroundColor: '#FF3B30', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, marginRight: 10, alignItems: 'center', },
  actionBtn: { marginRight: 10, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#EAF4FF', borderRadius: 6, },
  profileField: { marginBottom: 10, },
  label: { fontSize: 14, color: '#666', marginBottom: 4, },
  viewRow: { flexDirection: 'row', alignItems: 'center' },
  editRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', },
  infoBox: { backgroundColor: '#F3F4F6', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 10, marginBottom: 3, width: 250, paddingTop: 10 },
  infoBoxname: { backgroundColor: '#F3F4F6', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 10, marginBottom: 3, width: 200, paddingTop: 10 },
  resetBtn: { backgroundColor: '#2196F3', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 10, alignSelf: 'flex-start', marginTop: 8, },
  resetBtnText: { color: 'white', fontWeight: '600', },
});
