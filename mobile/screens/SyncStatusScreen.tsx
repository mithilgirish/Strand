import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, ActivityIndicator, SafeAreaView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
    // Simulate syncing local observations with the Neo4j PKG via backend
    setTimeout(async () => {
      setLoading(false);
      const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setSyncTime(currentTime);
      await AsyncStorage.setItem('last_sync_time', currentTime);
      
      Alert.alert(
        'Sync Successful',
        `Successfully uploaded ${localNcrs.length} observations to STRAND PKG database.`
      );
      
      // Clear synced queue for demo
      setLocalNcrs([]);
      await AsyncStorage.removeItem('local_ncrs');
    }, 2000);
  };

  const handleClearHistory = async () => {
    await AsyncStorage.removeItem('local_ncrs');
    await AsyncStorage.removeItem('last_sync_time');
    setLocalNcrs([]);
    setSyncTime('Never');
    Alert.alert('History Cleared', 'Local audit cache cleared.');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Database Sync</Text>
        <View style={{ width: 60 }} />
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
  statusCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statusLabel: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  statusOnline: {
    color: '#10B981',
    fontWeight: 'bold',
    fontSize: 14,
  },
  statusTime: {
    color: '#F8FAFC',
    fontWeight: 'bold',
    fontSize: 14,
  },
  statusQueue: {
    color: '#64748B',
    fontWeight: 'bold',
    fontSize: 14,
  },
  statusQueueActive: {
    color: '#F59E0B',
  },
  syncButton: {
    backgroundColor: '#06B6D4',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#06B6D4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  syncButtonText: {
    color: '#10101E',
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
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  clearText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 14,
    fontStyle: 'italic',
  },
  ncrItem: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  ncrItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  ncrId: {
    color: '#06B6D4',
    fontWeight: '900',
    fontSize: 15,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
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
  severityText: {
    color: '#F8FAFC',
    fontSize: 9,
    fontWeight: '900',
  },
  ncrMeta: {
    color: '#64748B',
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
    color: '#EF4444',
    fontWeight: 'bold',
    fontSize: 12,
  },
});
