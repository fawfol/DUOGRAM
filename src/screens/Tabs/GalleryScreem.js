import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function GalleryScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Gallery will be here soon!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  text: { fontSize: 20, color: '#666' }
});
