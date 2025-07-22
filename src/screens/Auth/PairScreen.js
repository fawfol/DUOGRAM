//DDUOGRAM/src/screens/Auth/PairScreen.js
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Share, Animated, Easing } from 'react-native';
import { doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../../firebase';

function generatePairCode(length = 6) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%';
  let code = '';
  for (let i = 0; i < length; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

export default function PairScreen({ navigation }) {
  const [pairCode, setPairCode] = useState('');
  const [myCode, setMyCode] = useState('');

  // Animation for "Continue Without Pairing" button (Shining effect)
  const shineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start the shining animation loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(shineAnim, {
          toValue: 1,
          duration: 1500, // Duration of one "shine" cycle
          easing: Easing.linear,
          useNativeDriver: false, // Must be false for color animation
        }),
        Animated.timing(shineAnim, {
          toValue: 0,
          duration: 1500, // Duration of returning to original color
          easing: Easing.linear,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, []); // Run once on component mount

  // Interpolate color for the shining effect (green shades)
  const shiningBackgroundColor = shineAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['#28a745', '#3cb371', '#28a745'], // Shades of green: base green, brighter green, base green
  });


  // Generate and store a new code
  async function handleGenerateCode() {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Error', 'No user is logged in. Please log in first.');
      return;
    }

    try {
      // --- Check for existing active codes (where current user is user1) ---
      const q = query(collection(db, 'pairs'), where('user1', '==', user.uid));
      const querySnapshot = await getDocs(q);
      const activeCodesCount = querySnapshot.size;

      if (activeCodesCount >= 2) {
        Alert.alert(
          'Code Limit Reached',
          'You already have 2 active pairing codes. Please delete one from your Account screen before generating a new one.'
        );
        return; // Stop function execution
      }
      // --- END NEW CHECK ---

      const code = generatePairCode();
      
      // Add createdAt timestamp when generating the code
      await setDoc(doc(db, 'pairs', code), { user1: user.uid, user2: '', createdAt: new Date() });
      
      // Optional code in user profile (merge ensures other fields aren't overwritten)
      await setDoc(doc(db, 'users', user.uid), { pairCode: code }, { merge: true });
      setMyCode(code); // Set the generated code to state to display it
      Alert.alert('Code Generated!', `Share this code with your partner: ${code}`);
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  }

  // Share the generated code
  async function handleShareCode() {
    if (myCode) {
      try {
        await Share.share({
          message: `My Duogram pairing code is: ${myCode}. Use this to connect with me!`,
          title: 'Duogram Pairing Code',
        });
      } catch (error) {
        Alert.alert('Sharing Error', 'Failed to share code. Please try again.');
      }
    } else {
      Alert.alert('No Code', 'Please generate a code first to share it.');
    }
  }

  //SIMPLIFIED handleJoin function
  async function handleJoin() {
  const user = auth.currentUser;
  if (!user) {
    Alert.alert('Error', 'No user is logged in.');
    return;
  }
  if (!pairCode.trim()) {
    Alert.alert('Error', 'Please enter a code');
    return;
  }

  const code = pairCode.trim().toUpperCase();
  const pairDocRef = doc(db, 'pairs', code);
  const pairDocSnap = await getDoc(pairDocRef);

  if (!pairDocSnap.exists()) {
    Alert.alert('Invalid Code', 'No such code found.');
    return;
  }

  const data = pairDocSnap.data();
  let authorizedUsers = data.authorizedUsers || [];
  let connectionState = data.connectionState || {};

  // If authorizedUsers is empty, treat this as new code: add current user as first authorized user
  if (authorizedUsers.length === 0) {
    authorizedUsers = [user.uid];
    connectionState = { [user.uid]: true };
    await updateDoc(pairDocRef, { authorizedUsers, connectionState });
  }

  // Check if current user is authorized
  if (!authorizedUsers.includes(user.uid)) {
    // If only 1 authorized user, allow new user to join as second authorized user
    if (authorizedUsers.length === 1) {
      authorizedUsers.push(user.uid);
      connectionState[user.uid] = true;
      await updateDoc(pairDocRef, { authorizedUsers, connectionState });
    } else {
      // No room for more users or user not authorized
      Alert.alert('Unauthorized', 'You are not authorized to join this pair code.');
      return;
    }
  } else {
    // User already authorized but mark them connected
    connectionState[user.uid] = true;
    await updateDoc(pairDocRef, { connectionState });
  }

  // Update user's document with current pair code
  await setDoc(doc(db, 'users', user.uid), { pairCode: code }, { merge: true });

  Alert.alert('Connected', 'You have joined your duo successfully!');
  navigation.replace('Main');
}


  return (
    <View style={styles.container}>
      <Text style={styles.title}>Connect Your Duogram</Text>
      <Text style={styles.subtitle}>Pair with a partner to share your moments.</Text>

      <TouchableOpacity style={styles.button} onPress={handleGenerateCode}>
        <Text style={styles.buttonText}>Generate My Pairing Code</Text>
      </TouchableOpacity>

      {myCode ? (
        <View style={styles.myCodeContainer}>
          <Text style={styles.myCodeText}>Your Code: {myCode}</Text>
          <TouchableOpacity style={styles.shareButton} onPress={handleShareCode}>
            <Text style={styles.shareButtonText}>Share Code</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.divider} />

      <Text style={styles.subtitle}>Already have a code? Enter it below:</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter partner's code"
        value={pairCode}
        autoCapitalize="characters"
        onChangeText={setPairCode}
        maxLength={6} // Standard code length, consider increasing if special chars are common
      />
      <TouchableOpacity style={styles.button} onPress={handleJoin}>
        <Text style={styles.buttonText}>Connect</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.secondaryButton]}
        onPress={() => navigation.replace('Login')}
      >
        <Text style={styles.buttonText}>Go Back to Login</Text>
      </TouchableOpacity>

      {/* Animated "Continue Without Pairing" button with conditional text */}
      <Animated.View style={[styles.button, styles.continueButton, { backgroundColor: shiningBackgroundColor }]}>
        <TouchableOpacity
          onPress={() => navigation.replace('Main')}
          style={{ width: '100%', alignItems: 'center' }} // Make touchable area fill the Animated.View
        >
          <Text style={styles.buttonText}>
            {myCode ? 'Wait for your DuoMate, Enter Home' : 'Continue Without Pairing'}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f0f2f5', // Light grey background
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000', // Add subtle shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3, // For Android
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  myCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
    backgroundColor: '#e9ecef', // Light background for the code display
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  myCodeText: {
    fontSize: 20,
    color: '#007AFF',
    fontWeight: 'bold',
    marginRight: 10,
  },
  shareButton: {
    backgroundColor: '#28a745', // Green for share
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: '#6c757d', // Reverted to muted grey for "Go Back to Login"
    marginTop: 10,
  },
  continueButton: {
    // Background color is handled by animation now
    marginTop: 20,
  },
  divider: {
    borderBottomColor: '#ddd',
    borderBottomWidth: 1,
    marginVertical: 25,
  },
});
