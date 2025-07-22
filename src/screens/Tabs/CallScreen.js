import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  PermissionsAndroid,
  Platform,
  Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  createAgoraRtcEngine,
  AgoraVideoView,
  VideoRenderMode,
  ClientRole,
  ChannelProfile,
} from 'react-native-agora';

const APP_ID = 'appid';
const CHANNEL_NAME = 'myduocall';
const TOKEN =
  'tokenid';

export default function CallScreen() {
  const [isJoined, setIsJoined] = useState(false);
  const [remoteUids, setRemoteUids] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const engine = useRef(null);

  useEffect(() => {
    const init = async () => {
      if (!APP_ID) {
        Alert.alert('Error', 'APP_ID is missing');
        return;
      }

      engine.current = createAgoraRtcEngine();

      engine.current.initialize({
        appId: APP_ID,
        channelProfile: ChannelProfile.Communication,
      });

      engine.current.setClientRole(ClientRole.Broadcaster);

      // Enable video by default
      engine.current.enableVideo();

      // Set event handlers
      const handler = {
        onJoinChannelSuccess: (channel, uid, elapsed) => {
          console.log('JoinChannelSuccess', channel, uid, elapsed);
          setIsJoined(true);
        },
        onUserJoined: (uid, elapsed) => {
          console.log('UserJoined', uid, elapsed);
          setRemoteUids((prev) => {
            if (!prev.includes(uid)) return [...prev, uid];
            return prev;
          });
        },
        onUserOffline: (uid, reason) => {
          console.log('UserOffline', uid, reason);
          setRemoteUids((prev) => prev.filter((id) => id !== uid));
        },
        onError: (err) => {
          console.error('Agora Error', err);
          Alert.alert('Agora Error', JSON.stringify(err));
        },
      };

      engine.current.registerEventHandler(handler);
    };

    init();

    return () => {
      if (engine.current) {
        engine.current.unregisterEventHandler();
        engine.current.release();
        engine.current = null;
      }
    };
  }, []);

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.CAMERA,
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        ]);

        if (
          granted['android.permission.CAMERA'] === PermissionsAndroid.RESULTS.GRANTED &&
          granted['android.permission.RECORD_AUDIO'] === PermissionsAndroid.RESULTS.GRANTED
        ) {
          return true;
        } else {
          Alert.alert('Permissions Required', 'Camera and microphone permissions are needed for calls.');
          return false;
        }
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    // iOS permissions are handled in Info.plist
    return true;
  };

  const joinChannel = async (enableVideo) => {
    if (!engine.current) {
      Alert.alert('Error', 'Agora engine not initialized.');
      return;
    }
    const hasPerm = await requestPermissions();
    if (!hasPerm) return;

    try {
      if (enableVideo) {
        engine.current.enableVideo();
        setIsVideoOff(false);
      } else {
        engine.current.disableVideo();
        setIsVideoOff(true);
      }

      await engine.current.joinChannel(TOKEN, CHANNEL_NAME, null, 0);
      console.log('Joining channel...');
    } catch (e) {
      console.error('Failed to join channel:', e);
      Alert.alert('Join Channel Error', e.message);
    }
  };

  const leaveChannel = async () => {
    if (!engine.current) return;
    try {
      await engine.current.leaveChannel();
      setIsJoined(false);
      setRemoteUids([]);
      setIsMuted(false);
      setIsVideoOff(false);
    } catch (e) {
      console.error(e);
      Alert.alert('Leave Channel Error', e.message);
    }
  };

  const toggleMute = async () => {
    if (!engine.current) return;
    try {
      await engine.current.muteLocalAudioStream(!isMuted);
      setIsMuted(!isMuted);
    } catch (e) {
      console.error(e);
    }
  };

  const toggleVideo = async () => {
    if (!engine.current) return;
    try {
      await engine.current.muteLocalVideoStream(!isVideoOff);
      setIsVideoOff(!isVideoOff);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Call Your Duo</Text>

      {!isJoined ? (
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.callButton, { backgroundColor: '#007AFF' }]}
            onPress={() => joinChannel(false)}
          >
            <Ionicons name="call-outline" size={42} color="#fff" />
            <Text style={styles.buttonText}>Voice Call</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.callButton, { backgroundColor: '#0ab885' }]}
            onPress={() => joinChannel(true)}
          >
            <Ionicons name="videocam-outline" size={42} color="#fff" />
            <Text style={styles.buttonText}>Video Call</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.callActiveContainer}>
          {!isVideoOff && (
            <AgoraVideoView
              style={styles.localVideo}
              showLocalVideo={true}
              mode={VideoRenderMode.Hidden}
            />
          )}

          {remoteUids.length > 0 ? (
            <View style={styles.remoteVideoContainer}>
              {remoteUids.map((uid) => (
                <AgoraVideoView
                  key={uid}
                  style={styles.remoteVideo}
                  uid={uid}
                  channelId={CHANNEL_NAME}
                  mode={VideoRenderMode.Hidden}
                />
              ))}
            </View>
          ) : (
            <Text style={styles.waitingText}>Waiting for Duo to join...</Text>
          )}

          <View style={styles.controlsContainer}>
            <TouchableOpacity style={styles.controlButton} onPress={toggleMute}>
              <Ionicons name={isMuted ? 'mic-off-outline' : 'mic-outline'} size={30} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButton} onPress={toggleVideo}>
              <Ionicons name={isVideoOff ? 'videocam-off-outline' : 'videocam-outline'} size={30} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.controlButton, styles.hangupButton]} onPress={leaveChannel}>
              <Ionicons
                name="call-outline"
                size={30}
                color="#fff"
                style={{ transform: [{ rotate: '135deg' }] }}
              />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {!isJoined && (
        <Text style={styles.subText}>
          Hook up your DuoMate and live moment lost in breathes and gaze of virtual world
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // your styles can stay the same as your original
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f2f5', padding: 24 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 40, color: '#333', textAlign: 'center' },
  buttonContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 30, gap: 30 },
  callButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    width: 140,
    height: 140,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    padding: 15,
  },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600', marginTop: 10 },
  subText: { fontSize: 14, color: '#888', marginTop: 30, textAlign: 'center', lineHeight: 20 },
  callActiveContainer: { flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  localVideo: {
    width: 120,
    height: 160,
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 1,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: '#333',
  },
  remoteVideoContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#222',
    borderRadius: 15,
    overflow: 'hidden',
  },
  remoteVideo: { width: '100%', height: '100%', borderRadius: 15 },
  waitingText: { color: '#fff', fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginTop: 50 },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '80%',
    position: 'absolute',
    bottom: 40,
    zIndex: 2,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 30,
    paddingVertical: 15,
    paddingHorizontal: 10,
  },
  controlButton: {
    backgroundColor: '#555',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  hangupButton: { backgroundColor: '#ff3b30' },
});
