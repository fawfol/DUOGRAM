import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput, Alert,
  Linking, Share, ScrollView
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { signOut, updateProfile, sendPasswordResetEmail, deleteUser, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc, setDoc, deleteDoc, onSnapshot } from "firebase/firestore";
import Clipboard from '@react-native-clipboard/clipboard';
import DeviceInfo from 'react-native-device-info';
import { auth, db } from '../firebase';
import { useNavigation } from '@react-navigation/native';

function generatePairCode(length = 6) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%';
  let code = '';
  for (let i = 0; i < length; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

export default function AccountScreen({ navigation }) {
  const [profileName, setProfileName] = useState('');
  const [editing, setEditing] = useState(false);
  const [pairCode, setPairCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Loading account…');
  const [user, setUser] = useState(null);
  const [currentPairDocData, setCurrentPairDocData] = useState(null); // To store the full pair document data

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
        const userPairCode = userData.pairCode || '';
        setPairCode(userPairCode);

        // Fetch the associated pair document if a pairCode exists
        if (userPairCode) {
          const pairDocRef = doc(db, 'pairs', userPairCode);
          const pairSnap = await getDoc(pairDocRef);
          if (pairSnap.exists()) {
            setCurrentPairDocData(pairSnap.data());
          } else {
            // If user has a pairCode but the pair document doesn't exist (e.g., deleted by partner)
            // Clear their pairCode locally and in DB
            await updateDoc(doc(db, 'users', currentUser.uid), { pairCode: '' });
            setPairCode('');
            setCurrentPairDocData(null);
          }
        } else {
          setCurrentPairDocData(null);
        }

      } catch (e) {
        Alert.alert('Error loading profile', e.message);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);
  
  useEffect(() => {
  if (!pairCode || !user) return;

  const pairDocRef = doc(db, 'pairs', pairCode);

  const unsubscribe = onSnapshot(pairDocRef, async (docSnap) => {
    if (!docSnap.exists()) {
      setCurrentPairDocData(null);
      setPairCode('');
      return;
    }

    const data = docSnap.data();
    setCurrentPairDocData(data);

    if (data.deleteRequest && data.deleteRequest.status === 'pending') {
      const approval = data.deleteRequest.approvalState || {};
      const otherUserId = data.user1 === user.uid ? data.user2 : data.user1;

      // If current user hasn't approved yet, show approval alert
      if (!approval[user.uid]) {
        Alert.alert(
          'Delete Approval Required',
          'Your DuoMate wants to delete your Duo link. Please confirm deletion twice.',
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: async () => {
                await updateDoc(pairDocRef, { 'deleteRequest.status': 'cancelled' });
              },
            },
            {
              text: 'Approve',
              onPress: async () => {
                approval[user.uid] = true;
                await updateDoc(pairDocRef, { 'deleteRequest.approvalState': approval });

                const approvalsCount = Object.values(approval).filter(Boolean).length;
                if (approvalsCount >= 2) {
                  // Both approved: delete the pair and clear users' pairCode
                  await deleteDoc(pairDocRef);
                  if (data.user1) await updateDoc(doc(db, 'users', data.user1), { pairCode: '' });
                  if (data.user2) await updateDoc(doc(db, 'users', data.user2), { pairCode: '' });

                  Alert.alert('Deleted', 'Your Duo link has been deleted.');
                  navigation.navigate('Pair'); // Navigate to pairing screen
                } else {
                  Alert.alert('First approval noted.', 'Please confirm once more to complete deletion.');
                }
              },
            },
          ],
          { cancelable: false },
        );
      }
    }
  });

  return () => unsubscribe();
}, [pairCode, user]);


  const saveName = async () => {
    if (!profileName.trim()) {
      Alert.alert('Name cannot be empty.');
      return;
    }
    try {
      if (user) {
        await updateProfile(user, { displayName: profileName });
        await setDoc(doc(db, 'users', user.uid), { name: profileName }, { merge: true });
        setEditing(false);
        Alert.alert('Name updated!');
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const copyCode = async () => {
    if (pairCode) {
      Clipboard.setString(pairCode);
      Alert.alert('Copied', 'Pair code copied to clipboard!');
    } else {
      Alert.alert('No Code', 'There is no pair code to copy.');
    }
  };

  const shareCode = async () => {
    if (pairCode) {
      await Share.share({ message: `Join my Duogram! Pair code: ${pairCode}` });
    } else {
      Alert.alert('No Code', 'Generate a code first to share it.');
    }
  };

  const triggerReset = async () => {
    try {
      if (user && user.email) {
        await sendPasswordResetEmail(auth, user.email);
        Alert.alert('Password Reset', `Instructions to reset your password have been sent to: ${user.email}`);
      } else {
        Alert.alert('Error', 'No email associated with this account or user not logged in.');
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const regenerateCode = async () => {
    if (!user) return;

    Alert.alert(
      'Regenerate Pair Code',
      'Are you sure? This will generate a new code. Both users will need to update to this new code to remain paired. Your existing messages/photos will remain linked to your accounts.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Regenerate',
          onPress: async () => {
            try {
              const newCode = generatePairCode(); // Use the common generator function
              
              // If currently paired, check if current user is user1 or user2
              if (currentPairDocData) {
                  // If I was user1, delete the old pair doc (optional, depends on how you manage old codes)
                  // For now, let's keep it simple: just update user's profile with new code.
                  // A more robust solution might involve deleting the old 'pairs' document
                  // and creating a new one, or clearing partner's pairCode.
                  // For this implementation, we will just update the user's personal pairCode.
                  // The old 'pairs' document might remain, but it won't be pointed to by current user.
              }

              // Update the user's personal pairCode in their user document
              await updateDoc(doc(db, 'users', user.uid), { pairCode: newCode });
              setPairCode(newCode); // Update local state
              setCurrentPairDocData({ user1: user.uid, user2: '' }); // Assume new code is for user1, user2 starts empty

              // Also, if this user was part of an existing 'pairs' document as user1,
              // you might want to update that 'pairs' document or delete it.
              // For a simple regeneration, we're just updating the current user's reference.
              // The other user (if paired) will need to be explicitly disconnected or manually update their code.
              Alert.alert('Pair code updated!', `Your new code is: ${newCode}\nShare this with your partner.`);
            } catch (err) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  const LoginNavigation = useNavigation(); // Use useNavigation hook

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
  if (!user) return;

  Alert.alert(
    'Disconnect Duo',
    'Are you sure you want to disconnect from your current duo? You can always re-pair later.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect',
        style: 'destructive',
        onPress: async () => {
          try {
            // Clear the pairCode from the current user's profile
            await updateDoc(doc(db, 'users', user.uid), { pairCode: '' });

            // Update the pair document by clearing user1/user2 depending on who you are
            if (currentPairDocData) {
              if (currentPairDocData.user1 === user.uid) {
                await updateDoc(doc(db, 'pairs', pairCode), { user1: '', user2: '' });
              } else if (currentPairDocData.user2 === user.uid) {
                await updateDoc(doc(db, 'pairs', pairCode), { user2: '' });
              }
            }

            // Clear local state and navigate back to Pair screen
            setPairCode('');
            setCurrentPairDocData(null);
            Alert.alert('Disconnected', 'You have successfully disconnected from your duo.');
            navigation.reset({ index: 0, routes: [{ name: 'Pair' }] });
          } catch (error) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const requestDeleteApproval = async () => {
  if (!user || !pairCode) {
    Alert.alert('Error', 'No pairing code found.');
    return;
  }
  const pairRef = doc(db, 'pairs', pairCode);
  const pairSnap = await getDoc(pairRef);
  if (!pairSnap.exists()) {
    Alert.alert('Error', 'Pair document not found.');
    return;
  }
  const data = pairSnap.data();

  // If a delete request already exists, inform user
  if (data.deleteRequest && data.deleteRequest.status === 'pending') {
    Alert.alert('Delete request already pending');
    return;
  }

  // Create delete request field with requester approval
  await updateDoc(pairRef, {
    deleteRequest: {
      requestedBy: user.uid,
      approvalState: { [user.uid]: true },
      requestedAt: new Date(),
      status: 'pending',
    },
  });

  Alert.alert('Delete request sent!', 'Your partner must approve deletion twice.');
};

  const deleteAccount = async () => {
  Alert.alert(
    'Delete Account',
    'This action is permanent and cannot be undone. All your data will be removed. Continue?',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            if (!user) return;

            // Attempt to clean up pair info if user is paired
            if (pairCode) {
              const pairRef = doc(db, 'pairs', pairCode);
              const pairSnap = await getDoc(pairRef);
              if (pairSnap.exists()) {
                const data = pairSnap.data();
                // If the user is either user1 or user2, clear their slot
                if (data.user1 === user.uid) {
                  await updateDoc(pairRef, { user1: '' });
                } else if (data.user2 === user.uid) {
                  await updateDoc(pairRef, { user2: '' });
                }
                // Optionally: remove pairCode entirely if both slots empty
                const updatedSnap = await getDoc(pairRef);
                const updatedData = updatedSnap.data();
                if (
                  (!updatedData.user1 || updatedData.user1 === '') &&
                  (!updatedData.user2 || updatedData.user2 === '')
                ) {
                  await deleteDoc(pairRef);
                }
              }
              // Remove pairCode reference from user's own doc
              await updateDoc(doc(db, 'users', user.uid), { pairCode: '' });
            }

            // Delete the user's Firestore profile/document
            await deleteDoc(doc(db, 'users', user.uid));

            // Delete Firebase Auth user
            await deleteUser(user);

            Alert.alert('Account Deleted', 'Your account and all data have been removed.');
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          } catch (err) {
            if (err.code === 'auth/requires-recent-login') {
              Alert.alert(
                'Re-authentication Required',
                'Please log out and log back in, then try deleting your account again.'
              );
              } else {
                Alert.alert('Error', err.message);
              }
            }
          },
        },
      ]
    );
  };

   const deleteCode = () => {
    if (!user || !pairCode) {
      Alert.alert('No Duo Code', 'You do not have an active Duo Code to delete.');
      return;
    }

    // Check if the current user is user1 (the creator of the code)
    const isCurrentUserUser1 = currentPairDocData && currentPairDocData.user1 === user.uid;
    const isUser2Present = currentPairDocData && currentPairDocData.user2 !== '';

    if (isCurrentUserUser1 && !isUser2Present) {
      // Scenario: Current user is user1, and no user2 is connected
      Alert.alert(
        "Confirm Delete Duo Code",
        "Are you sure you want to permanently delete this Duo Code? This action cannot be undone and will prevent anyone from joining this specific code.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete Code",
            style: "destructive",
            onPress: async () => {
              try {
                // Delete the pair document from the 'pairs' collection
                await deleteDoc(doc(db, 'pairs', pairCode));
                // Clear the pairCode from the current user's profile
                await updateDoc(doc(db, 'users', user.uid), { pairCode: '' });

                setPairCode(''); // Update local state
                setCurrentPairDocData(null); // Clear pair document data
                Alert.alert("Duo Code Deleted", "Your Duo Code has been permanently removed.");
                // Optionally navigate to the pair screen if they are no longer paired
                navigation.reset({ index: 0, routes: [{ name: 'Pair' }] });
              } catch (error) {
                Alert.alert('Error Deleting Code', error.message);
              }
            },
          },
        ]
      );
    } else if (isCurrentUserUser1 && isUser2Present) {
      // Scenario: Current user is user1, and user2 is connected
      Alert.alert(
        "Cannot Delete While Paired",
        "Your DuoMate is currently connected to this code. Deleting the code would disconnect them. If you wish to proceed, please consider using 'Disconnect' first or be aware that your DuoMate will be affected.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Disconnect Me Only", onPress: disconnectPair }, // Offer to just disconnect
          {
            text: "Force Delete (Affects DuoMate)",
            style: "destructive",
            onPress: async () => {
              // This is a more aggressive action.ensure user understands
              try {
                // Delete the pair document from the 'pairs' collection
                await deleteDoc(doc(db, 'pairs', pairCode));
                // Clear the pairCode from the current user's profile
                await updateDoc(doc(db, 'users', user.uid), { pairCode: '' });
                
                // lear pairCode from the *other* user's profile as well if possible (not possibles rn),
                // or ensuring app handles orphaned pairCodes which got my mind fuckedd
                // For simplicity assume the 'pairs' document is the source of truth coz it is and will be coz gmail based
                // and once it's gone, the other user will eventually be prompted to re-pair with other duocode
                //Firebase Cloud Function for notifying/updating the other user.
                
                setPairCode(''); // Update local state
                setCurrentPairDocData(null); // Clear pair document data
                Alert.alert("Duo Code Deleted", "Your Duo Code has been permanently removed, affecting your DuoMate.");
                navigation.reset({ index: 0, routes: [{ name: 'Pair' }] });
              } catch (error) {
                Alert.alert('Error Deleting Code', error.message);
              }
            }
          }
        ]
      );
    } else {
      // Scenario: Current user is user2 (not the creator of the code)
      Alert.alert(
        "Cannot Delete Duo Code",
        "You did not generate this Duo Code. You can only disconnect yourself from it.",
        [
          { text: "OK", style: "cancel" },
          { text: "Disconnect Me", onPress: disconnectPair }
        ]
      );
    }
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
        
      {/*PAIR/Duo SECTION */}
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
             
            </View>
            <View style={styles.row}>
              <TouchableOpacity style={styles.dangerBtn} onPress={disconnectPair}>
                <Text style={styles.dangerText}>Disconnect</Text>
              </TouchableOpacity>
              {/* Only show "Delete Code" if the current user is user1 (creator) or if it's the only way to clean up */}
              {currentPairDocData && currentPairDocData.user1 === user?.uid && (
                <TouchableOpacity style={styles.dangerBtn} onPress={deleteCode}>
                  <Text style={styles.dangerText}>Delete Code</Text>
                </TouchableOpacity>
              )}
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
              style={[styles.resetBtn, { backgroundColor: '#34C759', marginTop: 14, paddingRight : 40, paddingLeft : 40}]}
              onPress={() => navigation.navigate('Pair')}
            >
              <Text style={[styles.actionText, { color: '#fff', fontWeight: 'bold'}]}>
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
  section: { fontSize: 27, fontWeight: 'bold', marginBottom: 15, marginTop: 20 },
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
