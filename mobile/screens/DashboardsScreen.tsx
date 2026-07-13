import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { supabase } from '../supabase';

interface Dashboard {
  id: string;
  dashboard_name: string;
  layout: any;
  created_at: string;
}

export default function DashboardsScreen() {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboards();
  }, []);

  const fetchDashboards = async () => {
    try {
      const { data, error } = await supabase
        .from('custom_dashboards')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching dashboards:', error);
      } else if (data) {
        setDashboards(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const renderDashboardItem = ({ item }: { item: Dashboard }) => (
    <TouchableOpacity style={styles.card}>
      <Text style={styles.cardTitle}>{item.dashboard_name}</Text>
      <Text style={styles.cardSubtitle}>
        Created: {new Date(item.created_at).toLocaleDateString()}
      </Text>
      <Text style={styles.badge}>
        {item.layout?.length || 0} Widgets
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>STRAND Dashboards</Text>
      
      {loading ? (
        <ActivityIndicator size="large" color="#4edea3" style={{ marginTop: 50 }} />
      ) : dashboards.length === 0 ? (
        <Text style={styles.emptyText}>No custom dashboards found.</Text>
      ) : (
        <FlatList
          data={dashboards}
          keyExtractor={(item) => item.id}
          renderItem={renderDashboardItem}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111111',
    paddingTop: 50,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#e5e5e5',
    marginLeft: 20,
    marginBottom: 20,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#1c1c1c',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f5f5f5',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#a3a3a3',
    fontFamily: 'monospace',
    marginBottom: 12,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#4edea320',
    color: '#4edea3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  emptyText: {
    color: '#a3a3a3',
    textAlign: 'center',
    marginTop: 50,
    fontSize: 14,
  }
});
