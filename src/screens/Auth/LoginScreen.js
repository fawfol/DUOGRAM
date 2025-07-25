import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import Ionicons from 'react-native-vector-icons/Ionicons';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secureText, setSecureText] = useState(true);
  const [loading, setLoading] = useState(false); 

  const checkPairStatus = async (user) => {
    try {
      setLoading(true);
      const userDocSnap = await getDoc(doc(db, 'users', user.uid));
      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        if (data.pairCode) {
          navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
        } else {
          navigation.reset({ index: 0, routes: [{ name: 'Pair' }] });
        }
      } else {
        navigation.reset({ index: 0, routes: [{ name: 'Pair' }] });
      }
    } catch (err) {
      Alert.alert('Error', 'Unable to check pair status. ' + err.message);
    } finally {
      setLoading(false); 
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Enter email and password');
      return;
    }
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;
      await checkPairStatus(user);
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        Alert.alert('Login Failed', 'User does not exist. Please sign up first.');
      } else if (err.code === 'auth/wrong-password') {
        Alert.alert('Login Failed', 'Incorrect password.');
      } else {
        Alert.alert('Login Error', err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Enter email and password to sign up.');
      return;
    }
    setLoading(true); // Start loading
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;
      await checkPairStatus(user);
      Alert.alert('Sign Up Success', 'Account created and logged in!');
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        Alert.alert('Sign Up Error', 'That email is already in use.');
      } else if (err.code === 'auth/invalid-email') {
        Alert.alert('Sign Up Error', 'That email address is invalid.');
      } else if (err.code === 'auth/weak-password') {
        Alert.alert('Sign Up Error', 'Password should be at least 6 characters.');
      } else {
        Alert.alert('Sign Up Error', err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Duogram</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          editable={!loading} 
        />

        <View style={styles.passwordContainer}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0, borderWidth: 0 }]}
            placeholder="Password"
            secureTextEntry={secureText}
            value={password}
            onChangeText={setPassword}
            editable={!loading}
          />
          <TouchableOpacity onPress={() => setSecureText(!secureText)} style={styles.eyeIcon} disabled={loading}> 
            <Ionicons name={secureText ? 'eye-off' : 'eye'} size={24} color="#888" />
          </TouchableOpacity>
        </View>

        <View style={styles.buttonGroup}>
          <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Log In</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.signupButton]} onPress={handleSignUp} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign Up</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 36, fontWeight: 'bold', alignSelf: 'center', marginBottom: 40 },
  input: {
    borderWidth: 1,
    borderColor: '#aaa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#aaa',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  eyeIcon: {
    paddingLeft: 8,
  },
  buttonGroup: { flexDirection: 'row', justifyContent: 'space-between' },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
  },
  signupButton: { backgroundColor: '#34C759' },
  buttonText: { color: '#fff', fontSize: 16 },
});
