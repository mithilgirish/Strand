import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Image, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { API_BASE_URL } from '../config';

// Define step structure
interface TestStep {
  step_id: string;
  sequence: number;
  description: string;
  acceptance_criteria: string;
  parameter_name: string;
  expected_value: number | string;
  unit: string;
  tia942_clause: string;
  status?: 'pass' | 'fail' | 'pending';
  notes?: string;
  photoUri?: string;
}

export default function ChecklistScreen({ route, navigation }: any) {
  const { equipmentTag } = route.params;
  const [loading, setLoading] = useState(true);
  const [steps, setSteps] = useState<TestStep[]>([]);
  const [ncrCount, setNcrCount] = useState(0);

  useEffect(() => {
    loadChecklist();
  }, [equipmentTag]);

  const loadChecklist = async () => {
    setLoading(true);
    try {
      // Look for cached checklist in local storage first
      const cached = await AsyncStorage.getItem(`checklist_${equipmentTag}`);
      if (cached) {
        setSteps(JSON.parse(cached));
      } else {
        try {
          // Attempt connection to the backend server with a 3s timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);
          
          const response = await fetch(`${API_BASE_URL}/inspector/checklist/${equipmentTag}`, {
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          if (response.ok) {
            const data = await response.json();
            setSteps(data.steps);
            await AsyncStorage.setItem(`checklist_${equipmentTag}`, JSON.stringify(data.steps));
            return;
          }
        } catch (apiErr) {
          console.log("Backend offline and no cached checklist is available.", apiErr);
          Alert.alert('Backend Unavailable', 'No cached checklist exists for this equipment. Connect to STRAND backend and retry.');
          setSteps([]);
        }
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to load checklist.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (stepId: string, status: 'pass' | 'fail') => {
    const updated = steps.map(s => {
      if (s.step_id === stepId) {
        return { ...s, status };
      }
      return s;
    });
    setSteps(updated);
    await AsyncStorage.setItem(`checklist_${equipmentTag}`, JSON.stringify(updated));

    if (status === 'fail') {
      Alert.alert(
        'Observation Log Required',
        'You marked this step as FAIL. Do you want to record a voice observation/NCR?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Log Voice NCR',
            onPress: () => navigation.navigate('NcrLog', { equipmentTag, stepId })
          }
        ]
      );
    }
  };

  const handleCapturePhoto = async (stepId: string) => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Camera permission is required to attach photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });

    if (!result.canceled) {
      const updated = steps.map(s => {
        if (s.step_id === stepId) {
          return { ...s, photoUri: result.assets[0].uri };
        }
        return s;
      });
      setSteps(updated);
      await AsyncStorage.setItem(`checklist_${equipmentTag}`, JSON.stringify(updated));
      Alert.alert('Success', 'Photo successfully attached to step.');
    }
  };

  const handleUpdateNotes = async (stepId: string, notes: string) => {
    const updated = steps.map(s => {
      if (s.step_id === stepId) {
        return { ...s, notes };
      }
      return s;
    });
    setSteps(updated);
    await AsyncStorage.setItem(`checklist_${equipmentTag}`, JSON.stringify(updated));
  };

  const handleCloseSession = async () => {
    // Check if there are pending steps
    const pendingCount = steps.filter(s => s.status === 'pending').length;
    if (pendingCount > 0) {
      Alert.alert('Incomplete Test', `There are ${pendingCount} pending test steps. Please complete them first.`);
      return;
    }

    setLoading(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(`${API_BASE_URL}/inspector/checklist/${equipmentTag}/close`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          steps,
          closed_by: 'field_engineer',
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(errorBody || `Backend returned ${response.status}`);
      }

      const record = await response.json();
      await AsyncStorage.removeItem(`checklist_${equipmentTag}`);
      Alert.alert(
        'Checklist Session Closed',
        `As-built testing record ${record.as_built_id || record.record_id} successfully compiled.`,
        [{ text: 'OK', onPress: () => navigation.navigate('MainTabs') }]
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to close checklist session.';
      Alert.alert('Sync Failed', message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#06B6D4" />
        <Text style={styles.loadingText}>Processing checklist data...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.title}>{equipmentTag}</Text>
          <Text style={styles.subtitle}>Integrated System Test (IST)</Text>
        </View>
        <TouchableOpacity 
          style={styles.syncIndicator}
          onPress={() => navigation.navigate('SyncStatus')}
        >
          <Text style={styles.syncText}>Offline Ready</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {steps.map((step) => (
          <View key={step.step_id} style={[
            styles.card, 
            step.status === 'pass' && styles.cardPass,
            step.status === 'fail' && styles.cardFail
          ]}>
            <View style={styles.cardHeader}>
              <View style={styles.stepIdBadge}>
                <Text style={styles.stepIdText}>{step.step_id}</Text>
              </View>
              <Text style={styles.clauseText}>{step.tia942_clause}</Text>
            </View>

            <Text style={styles.description}>{step.description}</Text>
            <View style={styles.criteriaBox}>
              <Text style={styles.criteriaTitle}>Acceptance Criteria:</Text>
              <Text style={styles.criteriaValue}>{step.acceptance_criteria}</Text>
            </View>

            {/* Notes Input Field */}
            <View style={styles.notesContainer}>
              <Text style={styles.notesLabel}>Notes / Observation:</Text>
              <TextInput
                style={styles.notesInput}
                placeholder="Add audit notes..."
                placeholderTextColor="#64748B"
                value={step.notes || ''}
                onChangeText={(text) => handleUpdateNotes(step.step_id, text)}
                multiline
              />
            </View>

            <View style={styles.actionsRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity 
                  style={styles.photoButton} 
                  onPress={() => handleCapturePhoto(step.step_id)}
                >
                  <Text style={styles.photoButtonText}>📷 Attach Photo</Text>
                </TouchableOpacity>
                {step.photoUri && (
                  <Image source={{ uri: step.photoUri }} style={styles.photoPreview} />
                )}
              </View>
              
              <View style={styles.statusButtons}>
                <TouchableOpacity 
                  style={[styles.statusButton, styles.passButton, step.status === 'pass' && styles.passButtonActive]}
                  onPress={() => handleToggleStatus(step.step_id, 'pass')}
                >
                  <Text style={[styles.statusText, step.status === 'pass' && styles.passTextActive]}>PASS</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.statusButton, styles.failButton, step.status === 'fail' && styles.failButtonActive]}
                  onPress={() => handleToggleStatus(step.step_id, 'fail')}
                >
                  <Text style={[styles.statusText, step.status === 'fail' && styles.failTextActive]}>FAIL</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.closeSessionButton} onPress={handleCloseSession}>
          <Text style={styles.closeSessionButtonText}>Complete & Generate As-Built</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111111',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#111111',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#A3A3A3',
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#262626',
    backgroundColor: '#111111',
  },
  backButton: {
    padding: 8,
  },
  backText: {
    color: '#E5E5E5',
    fontSize: 15,
    fontWeight: 'bold',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#F5F5F5',
  },
  subtitle: {
    fontSize: 11,
    color: '#A3A3A3',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  syncIndicator: {
    backgroundColor: 'rgba(78, 222, 163, 0.1)',
    borderWidth: 1,
    borderColor: '#4edea3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  syncText: {
    color: '#4edea3',
    fontSize: 10,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#1C1C1C',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#262626',
  },
  cardPass: {
    borderColor: 'rgba(78, 222, 163, 0.4)',
    backgroundColor: 'rgba(78, 222, 163, 0.05)',
  },
  cardFail: {
    borderColor: 'rgba(255, 179, 173, 0.4)',
    backgroundColor: 'rgba(255, 179, 173, 0.05)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepIdBadge: {
    backgroundColor: '#0A0A0A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#262626',
  },
  stepIdText: {
    color: '#E5E5E5',
    fontSize: 12,
    fontWeight: '900',
  },
  clauseText: {
    color: '#A3A3A3',
    fontSize: 12,
    fontWeight: 'bold',
  },
  description: {
    color: '#F5F5F5',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    marginBottom: 12,
  },
  criteriaBox: {
    backgroundColor: '#0A0A0A',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  notesContainer: {
    marginBottom: 16,
  },
  notesLabel: {
    color: '#A3A3A3',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  notesInput: {
    backgroundColor: '#0A0A0A',
    borderColor: '#262626',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    color: '#F5F5F5',
    fontSize: 13,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  photoPreview: {
    width: 36,
    height: 36,
    borderRadius: 6,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#404040',
  },
  criteriaTitle: {
    color: '#A3A3A3',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  criteriaValue: {
    color: '#F5F5F5',
    fontSize: 13,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  photoButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: '#404040',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  photoButtonText: {
    color: '#A3A3A3',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  statusButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 70,
    alignItems: 'center',
  },
  passButton: {
    borderColor: '#404040',
    backgroundColor: 'transparent',
  },
  passButtonActive: {
    backgroundColor: '#4edea3',
    borderColor: '#4edea3',
  },
  failButton: {
    borderColor: '#404040',
    backgroundColor: 'transparent',
  },
  failButtonActive: {
    backgroundColor: '#ffb3ad',
    borderColor: '#ffb3ad',
  },
  statusText: {
    color: '#A3A3A3',
    fontSize: 12,
    fontWeight: 'bold',
  },
  passTextActive: {
    color: '#003824',
  },
  failTextActive: {
    color: '#68000a',
  },
  closeSessionButton: {
    backgroundColor: '#E5E5E5',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#E5E5E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  closeSessionButtonText: {
    color: '#171717',
    fontWeight: '900',
    fontSize: 16,
  },
});
