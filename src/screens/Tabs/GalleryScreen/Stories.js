import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function Stories() {
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
}

const styles = StyleSheet.create({
  contentSection: {
    flex: 1,
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
});
