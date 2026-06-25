import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, ActivityIndicator, SafeAreaView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
        // Mock a 23-step checklist generator (with subset for readability and speed)
        const mockSteps: TestStep[] = [
          {
            step_id: 'IST-001',
            sequence: 1,
            description: 'Verify fuel level at minimum 90% capacity',
            acceptance_criteria: '>= 900 litres',
            parameter_name: 'fuel_level_litres',
            expected_value: 900,
            unit: 'litres',
            tia942_clause: '§8.3.1',
            status: 'pass'
          },
          {
            step_id: 'IST-002',
            sequence: 2,
            description: 'Measure fuel consumption at full load',
            acceptance_criteria: '<= 260 litres/hour at rated load',
            parameter_name: 'fuel_consumption_lph',
            expected_value: 260,
            unit: 'l/hr',
            tia942_clause: '§8.3.4',
            status: 'pending'
          },
          {
            step_id: 'IST-003',
            sequence: 3,
            description: 'Test automatic transfer switch (ATS) reaction time',
            acceptance_criteria: '<= 10 seconds transfer window',
            parameter_name: 'ats_delay_seconds',
            expected_value: 10,
            unit: 'seconds',
            tia942_clause: '§5.2.1',
            status: 'pending'
          },
          {
            step_id: 'IST-004',
            sequence: 4,
            description: 'Verify UPS redundancy configurations',
            acceptance_criteria: 'N+1 minimum configuration',
            parameter_name: 'ups_redundancy',
            expected_value: 'N+1',
            unit: '',
            tia942_clause: '§5.2.3',
            status: 'pass'
          },
          {
            step_id: 'IST-005',
            sequence: 5,
            description: 'Measure cooling tower thermal exhaust capability',
            acceptance_criteria: 'Capable of operation up to 50°C ambient',
            parameter_name: 'ambient_temperature_max',
            expected_value: 50,
            unit: '°C',
            tia942_clause: '§6.7.1',
            status: 'pending'
          }
        ];
        setSteps(mockSteps);
        await AsyncStorage.setItem(`checklist_${equipmentTag}`, JSON.stringify(mockSteps));
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

  const handleCapturePhoto = (stepId: string) => {
    Alert.alert('Photo Captured', `Mock photo successfully attached to step ${stepId}`);
  };

  const handleCloseSession = async () => {
    // Check if there are pending steps
    const pendingCount = steps.filter(s => s.status === 'pending').length;
    if (pendingCount > 0) {
      Alert.alert('Incomplete Test', `There are ${pendingCount} pending test steps. Please complete them first.`);
      return;
    }

    setLoading(true);
    // Simulate API close session
    setTimeout(async () => {
      setLoading(false);
      Alert.alert(
        'Checklist Session Closed',
        'As-built testing record successfully compiled and synced to PKG DB.',
        [{ text: 'OK', onPress: () => navigation.navigate('QrScan') }]
      );
      await AsyncStorage.removeItem(`checklist_${equipmentTag}`);
    }, 1500);
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

            <View style={styles.actionsRow}>
              <TouchableOpacity 
                style={styles.photoButton} 
                onPress={() => handleCapturePhoto(step.step_id)}
              >
                <Text style={styles.photoButtonText}>📷 Attach Photo</Text>
              </TouchableOpacity>
              
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
    backgroundColor: '#10101E',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#10101E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94A3B8',
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
    borderColor: '#1E293B',
    backgroundColor: '#10101E',
  },
  backButton: {
    padding: 8,
  },
  backText: {
    color: '#06B6D4',
    fontSize: 15,
    fontWeight: 'bold',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#F8FAFC',
  },
  subtitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  syncIndicator: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  syncText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardPass: {
    borderColor: 'rgba(16, 185, 129, 0.4)',
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
  },
  cardFail: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepIdBadge: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  stepIdText: {
    color: '#06B6D4',
    fontSize: 12,
    fontWeight: '900',
  },
  clauseText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: 'bold',
  },
  description: {
    color: '#F8FAFC',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    marginBottom: 12,
  },
  criteriaBox: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  },
  criteriaTitle: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  criteriaValue: {
    color: '#F1F5F9',
    fontSize: 13,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  photoButton: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderWidth: 1,
    borderColor: '#475569',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  photoButtonText: {
    color: '#94A3B8',
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
    borderColor: '#475569',
    backgroundColor: 'transparent',
  },
  passButtonActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  failButton: {
    borderColor: '#475569',
    backgroundColor: 'transparent',
  },
  failButtonActive: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  statusText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: 'bold',
  },
  passTextActive: {
    color: '#10101E',
  },
  failTextActive: {
    color: '#F8FAFC',
  },
  closeSessionButton: {
    backgroundColor: '#06B6D4',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#06B6D4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  closeSessionButtonText: {
    color: '#10101E',
    fontWeight: '900',
    fontSize: 16,
  },
});
