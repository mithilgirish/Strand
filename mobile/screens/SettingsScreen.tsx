import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Switch, TouchableOpacity, Alert, Platform, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase';
import { API_BASE_URL, setApiBaseUrl } from '../config';

export default function SettingsScreen({ navigation }: any) {
  const [offlineSync, setOfflineSync] = useState(true);
  const [voiceAssisted, setVoiceAssisted] = useState(true);
  const [profile, setProfile] = useState<{ email: string; name: string; role: string }>({
    email: 'operator@strandplatform.com',
    name: 'Operator',
    role: 'qa-inspector'
  });
  
  const [displayName, setDisplayName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);

  const [apiHost, setApiHost] = useState(API_BASE_URL);
  const [isEditingHost, setIsEditingHost] = useState(false);

  const [nodeStatus, setNodeStatus] = useState('CHECKING...');
  const [isOnline, setIsOnline] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [diagnosticLogs, setDiagnosticLogs] = useState<string[]>([]);
  const [isDiagnosing, setIsDiagnosing] = useState(false);

  useEffect(() => {
    void loadProfile();
    void checkConnection();
  }, []);

  const checkConnection = async () => {
    setIsChecking(true);
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      
      const response = await fetch(API_BASE_URL.replace('/api/v1', '') + '/health', {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const latency = Date.now() - start;
        setNodeStatus(`CONNECTED (${latency}ms)`);
        setIsOnline(true);
      } else {
        setNodeStatus('DISCONNECTED (STATUS ERROR)');
        setIsOnline(false);
      }
    } catch {
      setNodeStatus('OFFLINE (TIMEOUT)');
      setIsOnline(false);
    } finally {
      setIsChecking(false);
    }
  };

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (data) {
          const name = data.full_name || user.email?.split('@')[0] || 'Operator';
          setProfile({
            email: user.email || '',
            name: name,
            role: data.role || 'qa-inspector'
          });
          setDisplayName(name);
        } else {
          const name = user.email?.split('@')[0] || 'Operator';
          setProfile({
            email: user.email || '',
            name: name,
            role: (user.app_metadata?.role as string) || 'qa-inspector'
          });
          setDisplayName(name);
        }
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    }
  };

  const handleSaveName = async () => {
    if (!displayName.trim()) {
      Alert.alert('Validation Error', 'Display name cannot be empty.');
      return;
    }
    
    setIsSavingName(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from('profiles')
          .update({ full_name: displayName.trim() })
          .eq('id', user.id);

        if (error) throw error;
        
        setProfile(prev => ({ ...prev, name: displayName.trim() }));
        setIsEditingName(false);
        Alert.alert('Profile Updated', 'Name saved successfully.');
      }
    } catch (err: any) {
      Alert.alert('Update Failed', err.message || 'Could not save display name.');
    } finally {
      setIsSavingName(false);
    }
  };

  const handleClearCache = async () => {
    Alert.alert(
      'Purge Cache',
      'Erase cached checklist data and offline records?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Purge', 
          style: 'destructive',
          onPress: async () => {
            try {
              const keys = await AsyncStorage.getAllKeys();
              const checklistKeys = keys.filter(k => k.startsWith('checklist_') || k === 'local_ncrs');
              if (checklistKeys.length > 0) {
                await AsyncStorage.multiRemove(checklistKeys);
              }
              Alert.alert('Cache Purged', 'Cached data cleared.');
            } catch (err) {
              Alert.alert('Error', 'Failed to clear cache.');
            }
          }
        }
      ]
    );
  };

  const handleRunDiagnostics = async () => {
    setIsDiagnosing(true);
    setDiagnosticLogs([]);
    const logs: string[] = [];

    const addLog = (msg: string) => {
      logs.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
      setDiagnosticLogs([...logs]);
    };

    addLog('Initiating diagnosis...');
    await new Promise(resolve => setTimeout(resolve, 300));

    addLog('Checking authentication session...');
    try {
      const session = await supabase.auth.getSession();
      if (session.data.session) {
        addLog('Session: OK');
      } else {
        addLog('Session: NONE');
      }
    } catch {
      addLog('Session: ERROR');
    }
    await new Promise(resolve => setTimeout(resolve, 300));

    addLog(`Pinging host node: ${API_BASE_URL}`);
    try {
      const response = await fetch(API_BASE_URL.replace('/api/v1', '') + '/health');
      if (response.ok) {
        addLog('Connection: ONLINE');
      } else {
        addLog(`Connection: ERROR (${response.status})`);
      }
    } catch {
      addLog('Connection: OFFLINE');
    }
    await new Promise(resolve => setTimeout(resolve, 300));

    addLog('Querying cache segments...');
    try {
      const keys = await AsyncStorage.getAllKeys();
      addLog(`Cache count: ${keys.length} items`);
    } catch {
      addLog('Cache count: ERROR');
    }

    addLog('Diagnostics complete.');
    setIsDiagnosing(false);
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (err: any) {
      Alert.alert('Sign Out Error', err.message || 'Failed to sign out.');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>System Config</Text>
        <Text style={styles.subtitle}>Operator & Node Profile</Text>
      </View>

      <ScrollView style={styles.scrollContent}>
        {/* Profile Card */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Operator Identity</Text>
        </View>
        <View style={styles.profileCard}>
          <View style={styles.profileInfo}>
            {isEditingName ? (
              <View style={styles.editNameRow}>
                <TextInput
                  value={displayName}
                  onChangeText={setDisplayName}
                  style={styles.nameInput}
                  placeholder="Enter Name"
                  placeholderTextColor="#737373"
                  autoCorrect={false}
                />
                <TouchableOpacity 
                  style={styles.saveNameBtn} 
                  onPress={handleSaveName}
                  disabled={isSavingName}
                >
                  {isSavingName ? (
                    <ActivityIndicator size="small" color="#111111" />
                  ) : (
                    <Text style={styles.saveNameBtnText}>Save</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.cancelNameBtn} 
                  onPress={() => { setIsEditingName(false); setDisplayName(profile.name); }}
                >
                  <Text style={styles.cancelNameBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.nameRow}>
                <Text style={styles.profileName}>{profile.name}</Text>
                <TouchableOpacity style={styles.editBtn} onPress={() => setIsEditingName(true)}>
                  <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>
              </View>
            )}
            <Text style={styles.profileRole}>{profile.role.toUpperCase()}</Text>
            <Text style={styles.profileEmail}>{profile.email}</Text>
          </View>
        </View>

        {/* System Settings */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Device Preferences</Text>
        </View>
        <View style={styles.settingsCard}>
          <View style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Offline-First Mode</Text>
              <Text style={styles.settingDesc}>Cache checklists for local field usage</Text>
            </View>
            <Switch
              value={offlineSync}
              onValueChange={setOfflineSync}
              trackColor={{ false: '#262626', true: '#4edea3' }}
              thumbColor={offlineSync ? '#F5F5F5' : '#A3A3A3'}
            />
          </View>

          <View style={[styles.settingRow, styles.lastRow]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Voice Assistant</Text>
              <Text style={styles.settingDesc}>Enable Whisper transcription fallback</Text>
            </View>
            <Switch
              value={voiceAssisted}
              onValueChange={setVoiceAssisted}
              trackColor={{ false: '#262626', true: '#4edea3' }}
              thumbColor={voiceAssisted ? '#F5F5F5' : '#A3A3A3'}
            />
          </View>
        </View>

        {/* Database Status */}
        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.sectionTitle}>Environment Node</Text>
            <TouchableOpacity onPress={checkConnection} disabled={isChecking}>
              {isChecking ? (
                <ActivityIndicator size="small" color="#4edea3" />
              ) : (
                <Text style={styles.refreshText}>Refresh Connection</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.settingsCard}>
          <View style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Active Host</Text>
              {isEditingHost ? (
                <TextInput
                  value={apiHost}
                  onChangeText={setApiHost}
                  style={[styles.nameInput, { marginTop: 8, maxWidth: 220 }]}
                  placeholder="http://192.168.x.x:8000/api/v1"
                  placeholderTextColor="#737373"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              ) : (
                <Text style={styles.monoValue}>{API_BASE_URL}</Text>
              )}
            </View>
            {isEditingHost ? (
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <TouchableOpacity style={styles.saveNameBtn} onPress={async () => {
                  await setApiBaseUrl(apiHost);
                  setIsEditingHost(false);
                  checkConnection();
                }}>
                  <Text style={styles.saveNameBtnText}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelNameBtn} onPress={() => {
                  setApiHost(API_BASE_URL);
                  setIsEditingHost(false);
                }}>
                  <Text style={styles.cancelNameBtnText}>X</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.editBtn} onPress={() => setIsEditingHost(true)}>
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>API Version</Text>
            <Text style={styles.monoValue}>v1.4.2</Text>
          </View>
          <View style={[styles.settingRow, styles.lastRow]}>
            <Text style={styles.settingLabel}>Node Status</Text>
            <Text style={isOnline ? styles.onlineValue : styles.offlineValue}>{nodeStatus}</Text>
          </View>
        </View>

        {/* Diagnostics & Operations */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Diagnostics & Cache</Text>
        </View>
        <View style={styles.settingsCard}>
          <TouchableOpacity style={styles.actionRow} onPress={handleClearCache}>
            <Text style={[styles.settingLabel, { color: '#ffb3ad' }]}>Purge Cached Data</Text>
            <Text style={styles.chevronText}>&gt;</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionRow, styles.lastRow]} onPress={handleRunDiagnostics} disabled={isDiagnosing}>
            <Text style={[styles.settingLabel, { color: '#3b82f6' }]}>Run Diagnosis Routine</Text>
            {isDiagnosing ? (
              <ActivityIndicator size="small" color="#3b82f6" />
            ) : (
              <Text style={styles.chevronText}>&gt;</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Diagnostic logs output */}
        {diagnosticLogs.length > 0 && (
          <View style={styles.logsConsole}>
            {diagnosticLogs.map((log, idx) => (
              <Text key={idx} style={styles.logText}>{log}</Text>
            ))}
          </View>
        )}

        {/* Actions */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Log Out Session</Text>
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
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: '#262626',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#F5F5F5',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 11,
    color: '#A3A3A3',
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 4,
  },
  scrollContent: {
    padding: 16,
  },
  sectionHeader: {
    marginTop: 18,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 10,
    color: '#737373',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  profileCard: {
    backgroundColor: '#171717',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#262626',
    padding: 16,
  },
  profileInfo: {
    width: '100%',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profileName: {
    color: '#F5F5F5',
    fontSize: 18,
    fontWeight: '700',
  },
  editBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#262626',
    borderRadius: 6,
  },
  editBtnText: {
    color: '#a3a3a3',
    fontSize: 11,
    fontWeight: '600',
  },
  editNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nameInput: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: '#404040',
    borderRadius: 6,
    color: '#f5f5f5',
    fontSize: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  saveNameBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#4edea3',
    borderRadius: 6,
  },
  saveNameBtnText: {
    color: '#111111',
    fontSize: 12,
    fontWeight: '700',
  },
  cancelNameBtn: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  cancelNameBtnText: {
    color: '#737373',
    fontSize: 12,
  },
  profileRole: {
    color: '#737373',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 6,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  profileEmail: {
    color: '#737373',
    fontSize: 11,
    marginTop: 2,
  },
  settingsCard: {
    backgroundColor: '#171717',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#262626',
    paddingHorizontal: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#262626',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: '#262626',
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  settingLabel: {
    color: '#F5F5F5',
    fontSize: 13,
    fontWeight: '600',
  },
  settingDesc: {
    color: '#737373',
    fontSize: 11,
    marginTop: 2,
    maxWidth: 260,
  },
  monoValue: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#A3A3A3',
    fontSize: 11,
  },
  onlineValue: {
    color: '#4edea3',
    fontSize: 11,
    fontWeight: '700',
  },
  offlineValue: {
    color: '#ffb3ad',
    fontSize: 11,
    fontWeight: '700',
  },
  chevronText: {
    color: '#525252',
    fontSize: 12,
    fontWeight: 'bold',
  },
  refreshText: {
    color: '#4edea3',
    fontSize: 10,
    fontWeight: '700',
  },
  logsConsole: {
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  logText: {
    color: '#4edea3',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 10,
    marginBottom: 4,
    lineHeight: 14,
  },
  logoutButton: {
    backgroundColor: 'rgba(255,179,173,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,179,173,0.2)',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  logoutButtonText: {
    color: '#ffb3ad',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.5,
  },
});
