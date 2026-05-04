import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {Colors, Spacing} from '../../theme';

// Phase 3 (§5 Cube Workflow) — full implementation pending
export const CubeTrackingScreen: React.FC = () => (
  <View style={styles.container}>
    <Text style={styles.text}>Cube tracking coming soon.</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background, padding: Spacing.outer},
  text: {fontFamily: 'Inter-Regular', fontSize: 16, color: Colors.textMuted},
});
