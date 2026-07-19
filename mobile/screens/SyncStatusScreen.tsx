import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildJsonAuthHeaders } from '../apiAuth';
import { API_BASE_URL } from '../config';

export default function SyncStatusScreen({ navigation }: any) {
  const [loading, setLoading] = useState(false);
  const [localNcrs, setLocalNcrs] = useState<any[]>([]);
  const [syncTime, setSyncTime] = useState<string>('Never');

  useEffect(() => {
    loadLocalData();
  }, []);

  const loadLocalData = async () => {
    try {
      const ncrsRaw = await AsyncStorage.getItem('local_ncrs');
      const time = await AsyncStorage.getItem('last_sync_time');
      if (ncrsRaw) {
        setLocalNcrs(JSON.parse(ncrsRaw));
      }
      if (time) {
        setSyncTime(time);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSyncAll = async () => {
    if (localNcrs.length === 0) {
      Alert.alert('Synced', 'All local data is already up to date.');
      return;
    }

    setLoading(true);
    let successCount = 0;
    try {
      const headers = await buildJsonAuthHeaders();

      // Loop and sync each local NCR to the backend
      for (const ncr of localNcrs) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const response = await fetch(`${API_BASE_URL}/inspector/ncr`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            transcript: ncr.transcript,
            equipment_tag: ncr.equipment_tag,
            step_id: ncr.step_id,
            raised_by: ncr.raised_by || 'field_engineer',
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (response.ok) {
          successCount++;
        }
      }

      if (successCount === localNcrs.length) {
        const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setSyncTime(currentTime);
        await AsyncStorage.setItem('last_sync_time', currentTime);
        
        Alert.alert(
          'Sync Successful',
          `Successfully uploaded ${successCount} observations to STRAND PKG database.`
        );
        
        setLocalNcrs([]);
        await AsyncStorage.removeItem('local_ncrs');
      } else {
        Alert.alert('Sync Incomplete', `Uploaded ${successCount} of ${localNcrs.length} records. Try again.`);
      }
    } catch (err) {
      Alert.alert(
        'Sync Failed',
        'Backend server is unreachable. Please ensure the backend is running on your host machine at http://192.168.0.100:8000'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    await AsyncStorage.removeItem('local_ncrs');
    await AsyncStorage.removeItem('last_sync_time');
    setLocalNcrs([]);
    setSyncTime('Never');
    Alert.alert('History Cleared', 'Local audit cache cleared.');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title}>Database Sync</Text>
        <Text style={styles.subtitle}>Audit & Sync Logs</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Connection Status:</Text>
            <Text style={styles.statusOnline}>ONLINE</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Last Database Sync:</Text>
            <Text style={styles.statusTime}>{syncTime}</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Pending Sync Queue:</Text>
            <Text style={[styles.statusQueue, localNcrs.length > 0 && styles.statusQueueActive]}>
              {localNcrs.length} items
            </Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#06B6D4" style={{ marginVertical: 24 }} />
        ) : (
          <TouchableOpacity style={styles.syncButton} onPress={handleSyncAll}>
            <Text style={styles.syncButtonText}>Trigger Manual DB Sync</Text>
          </TouchableOpacity>
        )}

        <View style={styles.logsHeaderRow}>
          <Text style={styles.sectionTitle}>Local Observation Audit Trail</Text>
          {localNcrs.length > 0 && (
            <TouchableOpacity onPress={handleClearHistory}>
              <Text style={styles.clearText}>Clear Cache</Text>
            </TouchableOpacity>
          )}
        </View>

        {localNcrs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No pending observations in offline cache.</Text>
          </View>
        ) : (
          localNcrs.map((ncr, index) => (
            <View key={index} style={styles.ncrItem}>
              <View style={styles.ncrItemHeader}>
                <Text style={styles.ncrId}>{ncr.ncr_id}</Text>
                <View style={[
                  styles.severityBadge,
                  ncr.severity === 'Critical' ? styles.severityCritical : styles.severityMajor
                ]}>
                  <Text style={styles.severityText}>{ncr.severity}</Text>
                </View>
              </View>
              <Text style={styles.ncrMeta}>{ncr.equipment_tag} • Step {ncr.step_id}</Text>
              <Text style={styles.ncrTranscript}>"{ncr.transcript}"</Text>
              <Text style={styles.ncrR0}>R0 Impact: {ncr.r0_score}</Text>
            </View>
          ))
        )}
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
  subtitle: {
    fontSize: 11,
    color: '#A3A3A3',
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 2,
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
  statusCard: {
    backgroundColor: '#1C1C1C',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#262626',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statusLabel: {
    color: '#A3A3A3',
    fontSize: 14,
    fontWeight: '600',
  },
  statusOnline: {
    color: '#4edea3',
    fontWeight: 'bold',
    fontSize: 14,
  },
  statusTime: {
    color: '#F5F5F5',
    fontWeight: 'bold',
    fontSize: 14,
  },
  statusQueue: {
    color: '#A3A3A3',
    fontWeight: 'bold',
    fontSize: 14,
  },
  statusQueueActive: {
    color: '#F59E0B',
  },
  syncButton: {
    backgroundColor: '#E5E5E5',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#E5E5E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  syncButtonText: {
    color: '#171717',
    fontWeight: '900',
    fontSize: 16,
  },
  logsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#A3A3A3',
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  clearText: {
    color: '#ffb3ad',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#A3A3A3',
    fontSize: 14,
    fontStyle: 'italic',
  },
  ncrItem: {
    backgroundColor: '#0A0A0A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#262626',
  },
  ncrItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  ncrId: {
    color: '#E5E5E5',
    fontWeight: '900',
    fontSize: 15,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
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
  severityText: {
    color: '#F5F5F5',
    fontSize: 9,
    fontWeight: '900',
  },
  ncrMeta: {
    color: '#A3A3A3',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  ncrTranscript: {
    color: '#E2E8F0',
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 18,
    marginBottom: 8,
  },
  ncrR0: {
    color: '#ffb3ad',
    fontWeight: 'bold',
    fontSize: 12,
  },
});
