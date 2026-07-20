import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Image, Keyboard, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildJsonAuthHeaders } from '../apiAuth';
import { API_BASE_URL } from '../config';
import * as ImagePicker from 'expo-image-picker';

export default function NcrLogScreen({ route, navigation }: any) {
  const { equipmentTag, stepId } = route.params;
  
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isPhotoModalVisible, setIsPhotoModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inputMode, setInputMode] = useState<'voice' | 'type'>('voice');
  
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

  const handleCapturePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Camera permission is required.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });
    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

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
      setTranscript('Listening... (No hardware found)');
    }
  };

  const stopRecording = async () => {
    setIsRecording(false);
    if (!recording) {
      Alert.alert('Voice Transcription Unavailable', 'Please type your observation manually in the text box below.');
      setTranscript('');
      return;
    }

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      setTranscript('Transcribing audio locally on backend...');
      
      if (uri) {
        const formData = new FormData();
        formData.append('audio', {
          uri,
          name: 'audio.m4a',
          type: 'audio/m4a'
        } as any);

        const headers = await buildJsonAuthHeaders();
        // Remove Content-Type so fetch can auto-set the boundary for multipart/form-data
        delete (headers as any)['Content-Type'];
        
        const response = await fetch(`${API_BASE_URL}/inspector/transcribe`, {
          method: 'POST',
          headers,
          body: formData,
        });
        
        if (response.ok) {
          const data = await response.json();
          setTranscript(data.transcript || 'No speech detected.');
        } else {
          setTranscript('Transcription failed. Please type manually.');
        }
      }
    } catch (err) {
      console.error('Failed to stop recording', err);
    }
  };

  const handleSubmitNcr = async () => {
    if (!transcript.trim() || transcript === 'Listening...' || transcript === 'Listening (Simulation)...') {
      Alert.alert('Error', 'Please record or type a valid observation transcript.');
      return;
    }

    setLoading(true);
    try {
      // Attempt connection to the backend server with a 3s timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const headers = await buildJsonAuthHeaders();
      
      const response = await fetch(`${API_BASE_URL}/inspector/ncr`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          transcript: transcript,
          equipment_tag: equipmentTag,
          step_id: stepId,
          raised_by: 'field_engineer',
          photo_url: photoUri ? photoUri : null,
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        setResultNcr(data);
        setLoading(false);

        // Add to local logs for syncing/audit
        const localLogsRaw = await AsyncStorage.getItem('local_ncrs');
        const logs = localLogsRaw ? JSON.parse(localLogsRaw) : [];
        logs.push(data);
        await AsyncStorage.setItem('local_ncrs', JSON.stringify(logs));
        return;
      }
    } catch (apiErr) {
      console.log("Backend offline, queueing observation for sync.", apiErr);
      const queuedObservation = {
        ncr_id: `QUEUED-${Date.now()}`,
        equipment_tag: equipmentTag,
        step_id: stepId,
        transcript: transcript,
        r0_score: 'pending',
        severity: 'Pending',
        mitigation: 'Queued locally. Sync to STRAND backend to generate NCR, severity, Spec-DNA reference, and R0 score.',
        raised_by: 'field_engineer',
        status: 'queued_offline',
        photo_url: photoUri,
      };

      const localLogsRaw = await AsyncStorage.getItem('local_ncrs');
      const logs = localLogsRaw ? JSON.parse(localLogsRaw) : [];
      logs.push(queuedObservation);
      await AsyncStorage.setItem('local_ncrs', JSON.stringify(logs));
      setResultNcr(queuedObservation);
      setLoading(false);
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
            <View style={styles.segmentControl}>
              <TouchableOpacity 
                style={[styles.segmentBtn, inputMode === 'voice' && styles.segmentBtnActive]}
                onPress={() => setInputMode('voice')}
              >
                <Text style={[styles.segmentText, inputMode === 'voice' && styles.segmentTextActive]}>🎙️ Voice</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.segmentBtn, inputMode === 'type' && styles.segmentBtnActive]}
                onPress={() => setInputMode('type')}
              >
                <Text style={[styles.segmentText, inputMode === 'type' && styles.segmentTextActive]}>⌨️ Type Manually</Text>
              </TouchableOpacity>
            </View>

            {inputMode === 'voice' && (
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
              </>
            )}

            <View style={styles.transcriptSection}>
              <View style={styles.transcriptHeader}>
                <Text style={styles.sectionLabel}>{inputMode === 'voice' ? 'Transcription Result' : 'Type Observation'}</Text>
              </View>
              
              <TextInput
                style={[styles.transcriptInput, inputMode === 'type' && { minHeight: 160 }]}
                multiline
                numberOfLines={inputMode === 'type' ? 8 : 4}
                value={transcript}
                onChangeText={setTranscript}
                placeholder={inputMode === 'voice' ? "Transcribed text will appear here..." : "Type your detailed observation here..."}
                placeholderTextColor="#64748B"
              />
            </View>

            <View style={{ marginBottom: 24, width: '100%' }}>
              <Text style={styles.sectionLabel}>Evidence (Optional)</Text>
              <TouchableOpacity style={styles.attachPhotoButton} onPress={handleCapturePhoto}>
                <Text style={styles.attachPhotoText}>📷 {photoUri ? 'Retake Photo' : 'Attach Defect Photo'}</Text>
              </TouchableOpacity>
              {photoUri && (
                <TouchableOpacity
                  onPress={() => setIsPhotoModalVisible(true)}
                  activeOpacity={0.8}
                  style={styles.photoPreviewBlock}
                >
                  <Image 
                    source={{ uri: photoUri }} 
                    style={styles.photoPreviewBlockImage} 
                    resizeMode="cover" 
                  />
                  <View style={styles.photoPreviewLabel}>
                    <Text style={styles.photoPreviewLabelText}>👆 Tap to view full screen</Text>
                  </View>
                </TouchableOpacity>
              )}
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
              <Text style={styles.successBadgeText}>
                {resultNcr.status === 'queued_offline' ? 'OBSERVATION QUEUED FOR SYNC' : '✓ NCR GENERATED SUCCESSFULLY'}
              </Text>
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

      {/* Full Screen Photo Overlay */}
      {isPhotoModalVisible && photoUri && (
        <View 
          style={[StyleSheet.absoluteFill, styles.modalBackground, { zIndex: 99999, elevation: 99999 }]}
          pointerEvents="auto"
        >
          <TouchableOpacity 
            style={styles.modalCloseButton} 
            onPress={() => setIsPhotoModalVisible(false)}
            onPressOut={() => setIsPhotoModalVisible(false)}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          >
            <Text style={styles.modalCloseText}>✕ Close</Text>
          </TouchableOpacity>
          <Image 
            source={{ uri: photoUri }} 
            style={styles.fullScreenImage} 
            resizeMode="contain" 
             
          />
        </View>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111111',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#262626',
  },
  backButton: {
    padding: 8,
  },
  backText: {
    color: '#E5E5E5',
    fontSize: 15,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#F5F5F5',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  metaCard: {
    backgroundColor: '#1C1C1C',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#262626',
  },
  metaLabel: {
    color: '#A3A3A3',
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  metaValue: {
    color: '#F5F5F5',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  segmentControl: {
    flexDirection: 'row',
    backgroundColor: '#0A0A0A',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#262626',
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentBtnActive: {
    backgroundColor: '#1C1C1C',
    borderWidth: 1,
    borderColor: '#404040',
  },
  segmentText: {
    color: '#737373',
    fontSize: 13,
    fontWeight: '700',
  },
  segmentTextActive: {
    color: '#F5F5F5',
  },
  sectionLabel: {
    color: '#A3A3A3',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  voiceSection: {
    backgroundColor: '#0A0A0A',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#262626',
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ffb3ad',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#ffb3ad',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  recordButtonActive: {
    backgroundColor: '#1C1C1C',
    borderWidth: 3,
    borderColor: '#ffb3ad',
  },
  recordIcon: {
    fontSize: 32,
  },
  recordStatusText: {
    color: '#A3A3A3',
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
    backgroundColor: '#ffb3ad',
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
  transcriptInput: {
    backgroundColor: '#1C1C1C',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 16,
    padding: 16,
    color: '#F5F5F5',
    fontSize: 15,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
  attachPhotoButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: '#404040',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  attachPhotoText: {
    color: '#E5E5E5',
    fontSize: 13,
    fontWeight: 'bold',
  },
  photoPreviewBlock: {
    marginTop: 12,
    width: '100%',
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#404040',
  },
  photoPreviewBlockImage: {
    width: '100%',
    height: '100%',
  },
  photoPreviewLabel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingVertical: 8,
    alignItems: 'center',
  },
  photoPreviewLabelText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  attachedPhotoPreview: {
    width: 44,
    height: 44,
    borderRadius: 8,
    marginLeft: 12,
    borderWidth: 1,
    borderColor: '#404040',
  },
  submitButton: {
    backgroundColor: '#E5E5E5',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#E5E5E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  submitButtonText: {
    color: '#171717',
    fontWeight: '900',
    fontSize: 16,
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
  },
  modalCloseText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  fullScreenImage: {
    width: '100%',
    height: '80%',
  },
  resultContainer: {
    alignItems: 'center',
  },
  successBadge: {
    backgroundColor: 'rgba(78, 222, 163, 0.1)',
    borderWidth: 1,
    borderColor: '#4edea3',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 20,
    width: '100%',
    alignItems: 'center',
  },
  successBadgeText: {
    color: '#4edea3',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  ncrDetailsCard: {
    backgroundColor: '#1C1C1C',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: '#262626',
    marginBottom: 24,
  },
  detailsTitle: {
    color: '#F5F5F5',
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
    borderColor: '#262626',
  },
  detailLabel: {
    color: '#A3A3A3',
    fontSize: 13,
    fontWeight: '600',
  },
  detailLabelMargin: {
    color: '#A3A3A3',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 6,
  },
  detailValueId: {
    color: '#E5E5E5',
    fontSize: 16,
    fontWeight: '900',
  },
  detailValueR0: {
    color: '#ffb3ad',
    fontSize: 16,
    fontWeight: '900',
  },
  severityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  severityCritical: {
    backgroundColor: 'rgba(255, 179, 173, 0.15)',
    borderWidth: 1,
    borderColor: '#ffb3ad',
  },
  severityMajor: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  severityBadgeText: {
    color: '#F5F5F5',
    fontSize: 11,
    fontWeight: '900',
  },
  detailTranscript: {
    color: '#E2E8F0',
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 20,
    backgroundColor: '#0A0A0A',
    padding: 12,
    borderRadius: 8,
  },
  detailMitigation: {
    color: '#4edea3',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    backgroundColor: 'rgba(78, 222, 163, 0.05)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(78, 222, 163, 0.2)',
  },
  doneButton: {
    backgroundColor: '#1C1C1C',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 16,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#E5E5E5',
    fontWeight: '700',
    fontSize: 16,
  },
});
