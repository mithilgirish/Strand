import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Switch, TouchableOpacity, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen({ navigation }: any) {
  const [offlineSync, setOfflineSync] = useState(true);
  const [voiceAssisted, setVoiceAssisted] = useState(true);

  const handleLogout = () => {
    Alert.alert('Session Terminated', 'You have been successfully logged out.');
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
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>ME</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>Mithil Girish</Text>
            <Text style={styles.profileRole}>Lead Field QA Engineer</Text>
            <Text style={styles.profileEmail}>mithil@strandplatform.com</Text>
          </View>
        </View>

        {/* System Settings */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Device Preferences</Text>
        </View>
        <View style={styles.settingsCard}>
          <View style={styles.settingRow}>
            <View>
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
            <View>
              <Text style={styles.settingLabel}>Voice Recognition Assistant</Text>
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
          <Text style={styles.sectionTitle}>Environment Node</Text>
        </View>
        <View style={styles.settingsCard}>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Active Host</Text>
            <Text style={styles.monoValue}>https://api.strand.internal</Text>
          </View>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>API Schema Version</Text>
            <Text style={styles.monoValue}>v1.4.2</Text>
          </View>
          <View style={[styles.settingRow, styles.lastRow]}>
            <Text style={styles.settingLabel}>Local Node Status</Text>
            <Text style={styles.onlineValue}>CONNECTED (100ms)</Text>
          </View>
        </View>

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
    fontSize: 20,
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
    marginTop: 2,
  },
  scrollContent: {
    padding: 16,
  },
  sectionHeader: {
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 11,
    color: '#A3A3A3',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  profileCard: {
    flexDirection: 'row',
    backgroundColor: '#1C1C1C',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#262626',
    padding: 16,
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E5E5E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#171717',
    fontWeight: '900',
    fontSize: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    color: '#F5F5F5',
    fontSize: 16,
    fontWeight: '700',
  },
  profileRole: {
    color: '#A3A3A3',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  profileEmail: {
    color: '#A3A3A3',
    fontSize: 11,
    marginTop: 1,
    opacity: 0.7,
  },
  settingsCard: {
    backgroundColor: '#1C1C1C',
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
  lastRow: {
    borderBottomWidth: 0,
  },
  settingLabel: {
    color: '#F5F5F5',
    fontSize: 14,
    fontWeight: '600',
  },
  settingDesc: {
    color: '#A3A3A3',
    fontSize: 11,
    marginTop: 2,
    maxWidth: 240,
  },
  monoValue: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#A3A3A3',
    fontSize: 12,
  },
  onlineValue: {
    color: '#4edea3',
    fontSize: 12,
    fontWeight: '700',
  },
  logoutButton: {
    backgroundColor: 'rgba(255,179,173,0.1)',
    borderWidth: 1,
    borderColor: '#ffb3ad',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  logoutButtonText: {
    color: '#ffb3ad',
    fontWeight: '700',
    fontSize: 14,
  },
});
