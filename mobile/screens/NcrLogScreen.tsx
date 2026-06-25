import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ActivityIndicator, SafeAreaView } from 'react-native';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function NcrLogScreen({ route, navigation }: any) {
  const { equipmentTag, stepId } = route.params;
  
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Results states
  const [resultNcr, setResultNcr] = useState<any>(null);

  // Clean up recording on unmount
  useEffect(() => {
    return () => {
      if (recording) {
        recording.stopAndUnloadAsync();
      }
    };
  }, [recording]);

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission Denied', 'Microphone permissions are required to record voice NCR.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
      setTranscript('Listening...');
    } catch (err) {
      console.error('Failed to start recording', err);
      // Fallback if recording fails (e.g. on emulators)
      setIsRecording(true);
      setTranscript('Listening (Simulation)...');
    }
  };

  const stopRecording = async () => {
    setIsRecording(false);
    if (!recording) {
      // Simulate transcription fallback
      setTimeout(() => {
        if (stepId === 'IST-002') {
          setTranscript('Fuel consumption reads 285 litres per hour against spec 260');
        } else {
          setTranscript('Ambient operating temperature is 45°C which is below the TIA-942 spec of 50°C');
        }
      }, 1000);
      return;
    }

    try {
      await recording.stopAndUnloadAsync();
      setRecording(null);
      
      // In a real app, send audio file to Whisper API.
      // For demo, we simulate transcription based on standard inputs.
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        if (stepId === 'IST-002') {
          setTranscript('Fuel consumption reads 285 litres per hour against spec 260');
        } else {
          setTranscript('Ambient operating temperature is 45°C which is below the TIA-942 spec of 50°C');
        }
      }, 1200);
    } catch (err) {
      console.error('Failed to stop recording', err);
    }
  };

  const handleSimulateSpeech = () => {
    if (stepId === 'IST-002') {
      setTranscript('Fuel consumption reads 285 litres per hour against spec 260');
    } else {
      setTranscript('Ambient operating temperature is 45°C which is below the TIA-942 spec of 50°C');
    }
  };

  const handleSubmitNcr = async () => {
    if (!transcript.trim() || transcript === 'Listening...' || transcript === 'Listening (Simulation)...') {
      Alert.alert('Error', 'Please record or type a valid observation transcript.');
      return;
    }

    setLoading(true);
    try {
      // We will perform a POST request to the backend API if online.
      // If offline, it saves to AsyncStorage queue (handled in SyncStatusScreen).
      // For the demo/hackathon, we'll mock the success response from the Inspector Agent.
      
      setTimeout(async () => {
        const mockResponse = {
          ncr_id: `NCR-${Math.floor(1000 + Math.random() * 9000)}`,
          equipment_tag: equipmentTag,
          step_id: stepId,
          transcript: transcript,
          r0_score: stepId === 'IST-002' ? 4.2 : 3.1,
          severity: stepId === 'IST-002' ? 'Critical' : 'Major',
          mitigation: stepId === 'IST-002' 
            ? 'Verify governor settings or replace fuel injector unit.' 
            : 'Escalate to engineering lead for temperature tolerance override.'
        };

        setResultNcr(mockResponse);
        setLoading(false);

        // Add to local logs for syncing/audit
        const localLogsRaw = await AsyncStorage.getItem('local_ncrs');
        const logs = localLogsRaw ? JSON.parse(localLogsRaw) : [];
        logs.push(mockResponse);
        await AsyncStorage.setItem('local_ncrs', JSON.stringify(logs));
        
      }, 1500);
    } catch (err) {
      setLoading(false);
      Alert.alert('Error', 'Failed to submit NCR.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Log Observation</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.metaCard}>
          <Text style={styles.metaLabel}>Equipment Tag:</Text>
          <Text style={styles.metaValue}>{equipmentTag}</Text>
          <Text style={styles.metaLabel}>Step Reference:</Text>
          <Text style={styles.metaValue}>{stepId}</Text>
        </View>

        {!resultNcr ? (
          <>
            <Text style={styles.sectionLabel}>Record Voice Observation</Text>
            
            <View style={styles.voiceSection}>
              <TouchableOpacity 
                style={[styles.recordButton, isRecording && styles.recordButtonActive]}
                onPress={isRecording ? stopRecording : startRecording}
              >
                <Text style={styles.recordIcon}>{isRecording ? '⏹️' : '🎙️'}</Text>
              </TouchableOpacity>
              <Text style={styles.recordStatusText}>
                {isRecording ? 'Recording audio... Tap to stop' : 'Tap to record audio'}
              </Text>
              
              {isRecording && (
                <View style={styles.waveformContainer}>
                  <View style={[styles.waveBar, { height: 15 }]} />
                  <View style={[styles.waveBar, { height: 30 }]} />
                  <View style={[styles.waveBar, { height: 45 }]} />
                  <View style={[styles.waveBar, { height: 25 }]} />
                  <View style={[styles.waveBar, { height: 35 }]} />
                  <View style={[styles.waveBar, { height: 10 }]} />
                </View>
              )}
            </View>

            <View style={styles.transcriptSection}>
              <View style={styles.transcriptHeader}>
                <Text style={styles.sectionLabel}>Observation Transcript</Text>
                <TouchableOpacity onPress={handleSimulateSpeech}>
                  <Text style={styles.simulateText}>Auto-Fill Demo</Text>
                </TouchableOpacity>
              </View>
              
              <TextInput
                style={styles.transcriptInput}
                multiline
                numberOfLines={4}
                value={transcript}
                onChangeText={setTranscript}
                placeholder="Transcribed text will appear here. You can also edit it manually."
                placeholderTextColor="#64748B"
              />
            </View>

            {loading ? (
              <ActivityIndicator size="large" color="#06B6D4" style={{ marginVertical: 20 }} />
            ) : (
              <TouchableOpacity style={styles.submitButton} onPress={handleSubmitNcr}>
                <Text style={styles.submitButtonText}>Generate NCR & Compute R0</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <View style={styles.resultContainer}>
            <View style={styles.successBadge}>
              <Text style={styles.successBadgeText}>✓ NCR GENERATED SUCCESSFULLY</Text>
            </View>

            <View style={styles.ncrDetailsCard}>
              <Text style={styles.detailsTitle}>NCR Record Detail</Text>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>NCR ID:</Text>
                <Text style={styles.detailValueId}>{resultNcr.ncr_id}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Severity Rating:</Text>
                <View style={[
                  styles.severityBadge,
                  resultNcr.severity === 'Critical' ? styles.severityCritical : styles.severityMajor
                ]}>
                  <Text style={styles.severityBadgeText}>{resultNcr.severity.toUpperCase()}</Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>R0 Contagion Score:</Text>
                <Text style={styles.detailValueR0}>{resultNcr.r0_score} / 10</Text>
              </View>

              <Text style={styles.detailLabelMargin}>Causal Observation:</Text>
              <Text style={styles.detailTranscript}>"{resultNcr.transcript}"</Text>

              <Text style={styles.detailLabelMargin}>Action Mitigation:</Text>
              <Text style={styles.detailMitigation}>{resultNcr.mitigation}</Text>
            </View>

            <TouchableOpacity 
              style={styles.doneButton} 
              onPress={() => navigation.navigate('Checklist', { equipmentTag })}
            >
              <Text style={styles.doneButtonText}>Return to Checklist</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#10101E',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#1E293B',
  },
  backButton: {
    padding: 8,
  },
  backText: {
    color: '#06B6D4',
    fontSize: 15,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#F8FAFC',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  metaCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  metaLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  metaValue: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  sectionLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  voiceSection: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  recordButtonActive: {
    backgroundColor: '#1E293B',
    borderWidth: 3,
    borderColor: '#EF4444',
  },
  recordIcon: {
    fontSize: 32,
  },
  recordStatusText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 16,
    height: 50,
  },
  waveBar: {
    width: 6,
    backgroundColor: '#EF4444',
    borderRadius: 3,
  },
  transcriptSection: {
    marginBottom: 24,
  },
  transcriptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  simulateText: {
    color: '#06B6D4',
    fontSize: 12,
    fontWeight: 'bold',
  },
  transcriptInput: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 16,
    padding: 16,
    color: '#F8FAFC',
    fontSize: 15,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#06B6D4',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#06B6D4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  submitButtonText: {
    color: '#10101E',
    fontWeight: '900',
    fontSize: 16,
  },
  resultContainer: {
    alignItems: 'center',
  },
  successBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: '#10B981',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 20,
    width: '100%',
    alignItems: 'center',
  },
  successBadgeText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  ncrDetailsCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 24,
  },
  detailsTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: '#2D3748',
  },
  detailLabel: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  detailLabelMargin: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 6,
  },
  detailValueId: {
    color: '#06B6D4',
    fontSize: 16,
    fontWeight: '900',
  },
  detailValueR0: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '900',
  },
  severityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  severityCritical: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  severityMajor: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  severityBadgeText: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '900',
  },
  detailTranscript: {
    color: '#E2E8F0',
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 20,
    backgroundColor: '#0F172A',
    padding: 12,
    borderRadius: 8,
  },
  detailMitigation: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  doneButton: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 16,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#F8FAFC',
    fontWeight: '700',
    fontSize: 16,
  },
});
