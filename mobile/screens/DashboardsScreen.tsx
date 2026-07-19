import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, ScrollView, Dimensions, Platform, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabase';
import { API_BASE_URL } from '../config';

interface Dashboard {
  id: string;
  dashboard_name: string;
  layout: Array<{
    id: string;
    type: 'FormulaCard' | 'R0Gauge' | 'DataGrid' | 'PredictiveTrendChart';
    title: string;
    x: number;
    y: number;
    w: number;
    h: number;
  }>;
  queries: Record<string, string>;
  created_at: string;
}

export default function DashboardsScreen() {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDashboard, setSelectedDashboard] = useState<Dashboard | null>(null);
  const [widgetData, setWidgetData] = useState<Record<string, any>>({});
  const [loadingWidgets, setLoadingWidgets] = useState<Record<string, boolean>>({});
  const [synthesizePrompt, setSynthesizePrompt] = useState('');
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [unsavedDashboard, setUnsavedDashboard] = useState<Dashboard | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchDashboards();
  }, []);

  useEffect(() => {
    if (selectedDashboard) {
      loadDashboardWidgets(selectedDashboard);
    } else {
      setWidgetData({});
    }
  }, [selectedDashboard]);

  const fetchDashboards = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/dashboards/list`, {
        headers,
      });

      if (response.ok) {
        const result = await response.json();
        setDashboards(result.dashboards || []);
      } else {
        console.error('Failed to fetch dashboards from API', response.status);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardWidgets = async (dashboard: Dashboard) => {
    const dataState: Record<string, any> = {};
    const loadState: Record<string, boolean> = {};
    
    // Set all as loading first
    Object.keys(dashboard.queries).forEach((id) => {
      loadState[id] = true;
    });
    setLoadingWidgets(loadState);

    // Fetch in parallel
    await Promise.all(
      Object.entries(dashboard.queries).map(async ([widgetId, query]) => {
        const result = await executeWidgetQuery(query);
        dataState[widgetId] = result;
        setLoadingWidgets((prev) => ({ ...prev, [widgetId]: false }));
        setWidgetData((prev) => ({ ...prev, [widgetId]: result }));
      })
    );
  };

  const executeWidgetQuery = async (query: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(`${API_BASE_URL}/dashboards/query`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      if (response.ok) {
        const result = await response.json();
        return result.data || [];
      }
      throw new Error(`API status ${response.status}`);
    } catch (err) {
      console.log('Mobile query failed, backend offline or error:', err);
      // In production, we don't fall back to mock data. We return empty array to show no data.
      return [];
    }
  };

  const handleSynthesize = async () => {
    if (!synthesizePrompt.trim()) return;
    setIsSynthesizing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`${API_BASE_URL}/dashboards/generate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ prompt: synthesizePrompt }),
      });

      if (!response.ok) throw new Error('Synthesis failed');
      const result = await response.json();
      
      const newDash: Dashboard = {
        id: 'unsaved-' + Date.now(),
        dashboard_name: result.dashboard_name || 'Custom Generated Widget',
        layout: result.layout,
        queries: result.queries,
        created_at: new Date().toISOString(),
      };
      
      setUnsavedDashboard(newDash);
      setSelectedDashboard(newDash);
      setSynthesizePrompt('');
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to synthesize widget.');
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handleSaveDashboard = async () => {
    if (!unsavedDashboard) return;
    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`${API_BASE_URL}/dashboards/save`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          dashboard_name: unsavedDashboard.dashboard_name,
          layout: unsavedDashboard.layout,
          queries: unsavedDashboard.queries,
        }),
      });

      if (!response.ok) throw new Error('Save failed');
      
      Alert.alert('Success', 'Dashboard saved successfully!');
      setUnsavedDashboard(null);
      fetchDashboards(); // refresh list
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to save dashboard.');
    } finally {
      setIsSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Widget Render Builders
  // ---------------------------------------------------------------------------
  const renderFormulaCard = (title: string, data: any) => {
    const val = data && data[0] ? Object.values(data[0])[0] : '—';
    return (
      <View style={styles.widgetInner}>
        <Text style={styles.widgetTitle}>{title}</Text>
        <Text style={styles.widgetBigValue}>{String(val)}</Text>
      </View>
    );
  };

  const renderR0Gauge = (title: string, data: any) => {
    const rawVal = data && data[0] ? Object.values(data[0])[0] : 0;
    const val = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal)) || 0.0;
    
    // Color mapping
    let color = '#4edea3';
    if (val >= 4.0) color = '#f87171'; // red
    else if (val >= 2.5) color = '#fbbf24'; // orange

    return (
      <View style={styles.widgetInner}>
        <Text style={styles.widgetTitle}>{title}</Text>
        <View style={styles.gaugeContainer}>
          <Text style={[styles.gaugeValue, { color }]}>{val.toFixed(1)}</Text>
          <View style={styles.gaugeTrack}>
            <View style={[styles.gaugeFill, { width: `${Math.min((val / 10) * 100, 100)}%`, backgroundColor: color }]} />
          </View>
          <Text style={styles.gaugeLabel}>Severity Index (0-10)</Text>
        </View>
      </View>
    );
  };

  const renderDataGrid = (title: string, data: any) => {
    const rows = Array.isArray(data) ? data : [];
    if (rows.length === 0) {
      return (
        <View style={styles.widgetInner}>
          <Text style={styles.widgetTitle}>{title}</Text>
          <Text style={styles.emptyWidgetText}>No records found</Text>
        </View>
      );
    }
    const headers = Object.keys(rows[0]);
    return (
      <View style={styles.widgetInner}>
        <Text style={styles.widgetTitle}>{title}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.gridScroll}>
          <View>
            <View style={styles.tableHeader}>
              {headers.map((h) => (
                <Text key={h} style={styles.tableHeaderCell}>{h.toUpperCase()}</Text>
              ))}
            </View>
            {rows.map((row, i) => (
              <View key={i} style={[styles.tableRow, i === rows.length - 1 && styles.lastTableRow]}>
                {Object.values(row).map((val: any, j) => (
                  <Text key={j} style={styles.tableCell} numberOfLines={1}>
                    {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderTrendChart = (title: string, data: any) => {
    const rows = Array.isArray(data) ? data : [];
    if (rows.length === 0) {
      return (
        <View style={styles.widgetInner}>
          <Text style={styles.widgetTitle}>{title}</Text>
          <Text style={styles.emptyWidgetText}>No trend metrics</Text>
        </View>
      );
    }
    return (
      <View style={styles.widgetInner}>
        <Text style={styles.widgetTitle}>{title}</Text>
        <View style={styles.chartContainer}>
          {rows.map((row, i) => {
            const rowValues = Object.values(row) as any[];
            const val = parseFloat(String(rowValues[0])) || 20;
            const period = String(rowValues[1] || `P${i}`);
            const height = Math.max(Math.min((val / 150) * 80, 80), 8);
            return (
              <View key={i} style={styles.chartBarWrapper}>
                <View style={[styles.chartBar, { height }]} />
                <Text style={styles.chartBarLabel}>{period}</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  // ---------------------------------------------------------------------------
  // Dashboard Card list
  // ---------------------------------------------------------------------------
  const renderDashboardItem = ({ item }: { item: Dashboard }) => (
    <TouchableOpacity 
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => setSelectedDashboard(item)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.dashboard_name}</Text>
        <Ionicons name="chevron-forward-outline" size={18} color="#525252" />
      </View>
      <Text style={styles.cardSubtitle}>
        Created: {new Date(item.created_at).toLocaleDateString()}
      </Text>
      <Text style={styles.badge}>
        {item.layout?.length || 0} Widgets
      </Text>
    </TouchableOpacity>
  );

  if (selectedDashboard) {
    return (
      <View style={styles.container}>
        {/* Workspace Sub Header */}
        <View style={styles.subHeader}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => setSelectedDashboard(null)}
          >
            <Ionicons name="arrow-back-outline" size={20} color="#a3a3a3" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.subHeaderTitle} numberOfLines={1}>
            {selectedDashboard.dashboard_name}
          </Text>
          {unsavedDashboard?.id === selectedDashboard.id && (
            <TouchableOpacity 
              style={styles.saveButton} 
              onPress={handleSaveDashboard}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#003824" />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        <ScrollView style={styles.widgetsScroll} contentContainerStyle={styles.widgetsContainer}>
          {selectedDashboard.layout.map((widget) => {
            const data = widgetData[widget.id];
            const loading = loadingWidgets[widget.id];

            return (
              <View key={widget.id} style={styles.widgetWrapper}>
                {loading ? (
                  <View style={styles.widgetLoading}>
                    <ActivityIndicator size="small" color="#4edea3" />
                    <Text style={styles.widgetLoadingText}>Syncing node...</Text>
                  </View>
                ) : (
                  <>
                    {widget.type === 'FormulaCard' && renderFormulaCard(widget.title, data)}
                    {widget.type === 'R0Gauge' && renderR0Gauge(widget.title, data)}
                    {widget.type === 'DataGrid' && renderDataGrid(widget.title, data)}
                    {widget.type === 'PredictiveTrendChart' && renderTrendChart(widget.title, data)}
                  </>
                )}
              </View>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Custom Dashboards</Text>
        <Text style={styles.subtitle}>Field Operations & BI Hub</Text>
      </View>

      {/* Synthesize UI */}
      <View style={styles.synthesizeContainer}>
        <TextInput
          style={styles.synthesizeInput}
          placeholder="Ask BI Agent to build a dashboard..."
          placeholderTextColor="#737373"
          value={synthesizePrompt}
          onChangeText={setSynthesizePrompt}
          multiline
        />
        <TouchableOpacity 
          style={styles.synthesizeButton} 
          onPress={handleSynthesize}
          disabled={isSynthesizing || !synthesizePrompt.trim()}
        >
          {isSynthesizing ? (
            <ActivityIndicator size="small" color="#003824" />
          ) : (
            <>
              <Ionicons name="flash" size={16} color="#003824" />
              <Text style={styles.synthesizeButtonText}>Synthesize</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
      
      {loading ? (
        <ActivityIndicator size="large" color="#4edea3" style={{ marginTop: 50 }} />
      ) : dashboards.length === 0 ? (
        <Text style={styles.emptyText}>No custom dashboards deployed to this node.</Text>
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
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#e5e5e5',
  },
  subtitle: {
    fontSize: 12,
    color: '#a3a3a3',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  backButtonText: {
    color: '#a3a3a3',
    fontSize: 14,
    marginLeft: 5,
  },
  subHeaderTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e5e5e5',
  },
  saveButton: {
    backgroundColor: '#4edea3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 10,
  },
  saveButtonText: {
    color: '#003824',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  synthesizeContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 10,
  },
  synthesizeInput: {
    backgroundColor: '#171717',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 8,
    color: '#e5e5e5',
    padding: 12,
    minHeight: 80,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    textAlignVertical: 'top',
  },
  synthesizeButton: {
    backgroundColor: '#4edea3',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  synthesizeButtonText: {
    color: '#003824',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#171717',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#262626',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f5f5f5',
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#737373',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 12,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(78, 222, 163, 0.1)',
    color: '#4edea3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyText: {
    color: '#737373',
    textAlign: 'center',
    marginTop: 50,
    fontSize: 14,
  },
  widgetsScroll: {
    flex: 1,
  },
  widgetsContainer: {
    padding: 15,
    paddingBottom: 40,
  },
  widgetWrapper: {
    backgroundColor: '#171717',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 8,
    marginBottom: 15,
    overflow: 'hidden',
  },
  widgetInner: {
    padding: 16,
  },
  widgetTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#737373',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  widgetBigValue: {
    fontSize: 36,
    fontWeight: '800',
    color: '#f5f5f5',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  widgetLoading: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  widgetLoadingText: {
    color: '#737373',
    fontSize: 11,
    marginTop: 8,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  gaugeContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  gaugeValue: {
    fontSize: 48,
    fontWeight: '900',
  },
  gaugeTrack: {
    height: 6,
    width: '100%',
    backgroundColor: '#262626',
    borderRadius: 3,
    marginTop: 10,
    marginBottom: 5,
  },
  gaugeFill: {
    height: '100%',
    borderRadius: 3,
  },
  gaugeLabel: {
    color: '#525252',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  gridScroll: {
    width: '100%',
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
    paddingBottom: 6,
    marginBottom: 6,
  },
  tableHeaderCell: {
    color: '#525252',
    fontSize: 9,
    fontWeight: 'bold',
    width: 100,
    marginRight: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(38, 38, 38, 0.4)',
    paddingVertical: 8,
  },
  lastTableRow: {
    borderBottomWidth: 0,
  },
  tableCell: {
    color: '#a3a3a3',
    fontSize: 11,
    width: 100,
    marginRight: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  emptyWidgetText: {
    color: '#525252',
    fontStyle: 'italic',
    fontSize: 12,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 100,
    paddingTop: 10,
  },
  chartBarWrapper: {
    alignItems: 'center',
  },
  chartBar: {
    width: 20,
    backgroundColor: '#4edea3',
    borderRadius: 2,
    opacity: 0.8,
  },
  chartBarLabel: {
    color: '#525252',
    fontSize: 9,
    marginTop: 5,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});
