import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';

export default function QrScanScreen({ navigation }: any) {
  const [tag, setTag] = useState('');
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [isScannerActive, setIsScannerActive] = useState(false);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }

    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
    };
  }, [permission]);

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    setScanned(true);
    setIsScannerActive(false); // Turn off camera upon successful scan
    const cleanedTag = data.trim().toUpperCase();
    Alert.alert('Equipment Detected', `Scanned QR Code: ${cleanedTag}`, [
      {
        text: 'Proceed to Checklist',
        onPress: () => {
          setScanned(false);
          navigation.navigate('Checklist', { equipmentTag: cleanedTag });
        }
      },
      {
        text: 'Rescan',
        onPress: () => setScanned(false),
        style: 'cancel'
      }
    ]);
  };


  const handleManualSubmit = () => {
    if (!tag.trim()) {
      Alert.alert('Error', 'Please enter a valid equipment tag.');
      return;
    }
    navigation.navigate('Checklist', { equipmentTag: tag.toUpperCase().trim() });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="light" />
      <View style={styles.mainContent}>
        <View style={styles.header}>
          <Text style={styles.brand}>S T R A N D</Text>
          <Text style={styles.subtitle}>Field Inspector QA</Text>
        </View>

        <View style={styles.scannerContainer}>
          <View style={styles.scannerBox}>
            {!isScannerActive ? (
              <TouchableOpacity 
                style={styles.activateButton}
                activeOpacity={0.8}
                onPress={() => {
                  setIsScannerActive(true);
                  if (permission && !permission.granted && permission.canAskAgain) {
                    requestPermission();
                  }
                }}
              >
                <Ionicons name="camera-outline" size={48} color="#A3A3A3" style={{ marginBottom: 12 }} />
                <Text style={styles.activateText}>Tap to Scan QR Code</Text>
              </TouchableOpacity>
            ) : (
              <>
                {permission === null ? (
                  <Text style={styles.scannerText}>Requesting camera...</Text>
                ) : !permission.granted ? (
                  <TouchableOpacity onPress={requestPermission} style={{ padding: 16 }}>
                    <Text style={[styles.scannerText, { textAlign: 'center', fontSize: 13 }]}>
                      Camera access required. Tap to grant permission.
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <CameraView
                    onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                    barcodeScannerSettings={{
                      barcodeTypes: ['qr'],
                    }}
                    style={StyleSheet.absoluteFill}
                  />
                )}
                
                {(!scanned && permission?.granted) && (
                  <TouchableOpacity 
                    style={styles.deactivateOverlayButton}
                    onPress={() => setIsScannerActive(false)}
                  >
                    <Text style={styles.deactivateOverlayText}>Turn Off Camera</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
            
            <View style={styles.cornerTopLeft} />
            <View style={styles.cornerTopRight} />
            <View style={styles.cornerBottomLeft} />
            <View style={styles.cornerBottomRight} />
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
      </View>
      
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111111',
  },
  mainContent: {
    flex: 1,
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
    color: '#E5E5E5',
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#A3A3A3',
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
    borderColor: 'rgba(229, 229, 229, 0.2)',
    borderRadius: 16,
    backgroundColor: '#171717',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  activateButton: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activateIcon: {
    fontSize: 48,
    color: '#A3A3A3',
    marginBottom: 12,
  },
  activateText: {
    color: '#A3A3A3',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  deactivateOverlayButton: {
    position: 'absolute',
    bottom: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderWidth: 1,
    borderColor: '#404040',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  deactivateOverlayText: {
    color: '#ffb3ad',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scannerText: {
    color: '#E5E5E5',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1.2,
  },
  scannerSubtext: {
    color: '#A3A3A3',
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
    borderColor: '#E5E5E5',
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
    borderColor: '#E5E5E5',
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
    borderColor: '#E5E5E5',
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
    borderColor: '#E5E5E5',
    borderBottomRightRadius: 12,
  },
  manualContainer: {
    width: '100%',
    marginBottom: 20,
  },
  inputLabel: {
    color: '#A3A3A3',
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
    backgroundColor: '#1C1C1C',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#F5F5F5',
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#E5E5E5',
    borderRadius: 12,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#171717',
    fontWeight: '900',
    fontSize: 16,
  },
  syncNavButton: {
    alignSelf: 'center',
    marginBottom: 10,
  },
  syncNavText: {
    color: '#A3A3A3',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
