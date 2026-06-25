import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function QrScanScreen({ navigation }: any) {
  const [tag, setTag] = useState('');

  const handleScanMock = (mockTag: string) => {
    navigation.navigate('Checklist', { equipmentTag: mockTag });
  };

  const handleManualSubmit = () => {
    if (!tag.trim()) {
      Alert.alert('Error', 'Please enter a valid equipment tag.');
      return;
    }
    navigation.navigate('Checklist', { equipmentTag: tag.toUpperCase().trim() });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.brand}>S T R A N D</Text>
        <Text style={styles.subtitle}>Field Inspector QA</Text>
      </View>

      <View style={styles.scannerContainer}>
        <View style={styles.scannerBox}>
          <Text style={styles.scannerText}>[ QR Scanner Active ]</Text>
          <Text style={styles.scannerSubtext}>Align QR code within the frame</Text>
          
          <View style={styles.cornerTopLeft} />
          <View style={styles.cornerTopRight} />
          <View style={styles.cornerBottomLeft} />
          <View style={styles.cornerBottomRight} />
        </View>
      </View>

      <View style={styles.mockQuickScan}>
        <Text style={styles.sectionTitle}>Quick Demo Scan</Text>
        <View style={styles.demoButtonsRow}>
          <TouchableOpacity style={styles.demoButton} onPress={() => handleScanMock('GEN-01')}>
            <Text style={styles.demoButtonText}>GEN-01 (Generator)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.demoButton} onPress={() => handleScanMock('CT-01')}>
            <Text style={styles.demoButtonText}>CT-01 (Cooling Tower)</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.manualContainer}>
        <Text style={styles.inputLabel}>Or Enter Equipment Tag Manually</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="e.g. GEN-01"
            placeholderTextColor="#64748B"
            value={tag}
            onChangeText={setTag}
            autoCapitalize="characters"
          />
          <TouchableOpacity style={styles.submitButton} onPress={handleManualSubmit}>
            <Text style={styles.submitButtonText}>GO</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <TouchableOpacity 
        style={styles.syncNavButton}
        onPress={() => navigation.navigate('SyncStatus')}
      >
        <Text style={styles.syncNavText}>View Sync Status</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#10101E',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    paddingVertical: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
  },
  brand: {
    fontSize: 28,
    fontWeight: '900',
    color: '#06B6D4',
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
    fontWeight: '600',
  },
  scannerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
  },
  scannerBox: {
    width: 250,
    height: 250,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
    borderRadius: 16,
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  scannerText: {
    color: '#06B6D4',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1.2,
  },
  scannerSubtext: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 8,
  },
  cornerTopLeft: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: 20,
    height: 20,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#06B6D4',
    borderTopLeftRadius: 12,
  },
  cornerTopRight: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 20,
    height: 20,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: '#06B6D4',
    borderTopRightRadius: 12,
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: -2,
    left: -2,
    width: 20,
    height: 20,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#06B6D4',
    borderBottomLeftRadius: 12,
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: '#06B6D4',
    borderBottomRightRadius: 12,
  },
  mockQuickScan: {
    width: '100%',
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  demoButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  demoButton: {
    flex: 1,
    backgroundColor: '#1E293B',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  demoButtonText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
  },
  manualContainer: {
    width: '100%',
    marginBottom: 20,
  },
  inputLabel: {
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: 8,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#F8FAFC',
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#06B6D4',
    borderRadius: 12,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#10101E',
    fontWeight: '900',
    fontSize: 16,
  },
  syncNavButton: {
    alignSelf: 'center',
    marginBottom: 10,
  },
  syncNavText: {
    color: '#64748B',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
