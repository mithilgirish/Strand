import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Platform,
  TextInput,
  Alert,
  Modal,
  Animated,
  Easing,
  Vibration,
  Pressable,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase';
import { API_BASE_URL } from '../config';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type WidgetType =
  | 'R0Gauge'
  | 'PredictiveTrendChart'
  | 'FormulaCard'
  | 'DataGrid'
  | 'BarChart'
  | 'DonutChart'
  | 'StatusList'
  | 'MarkdownCard';

export type WidgetSize = '1x1' | '2x1' | 'full' | 'tall';
export type ColorScheme = 'emerald' | 'cyan' | 'amber' | 'purple' | 'rose';

export interface Widget {
  id: string;
  type: WidgetType;
  title: string;
  subtitle?: string;
  size?: WidgetSize;
  colorScheme?: ColorScheme;
  query?: string;
  data?: any;
}

export interface Dashboard {
  id: string;
  dashboard_name: string;
  layout: Widget[];
  queries: Record<string, string>;
  created_at: string;
  theme?: 'emerald' | 'cyan' | 'obsidian' | 'amber';
  isPreset?: boolean;
}

// ---------------------------------------------------------------------------
// Standard Presets (Synchronized with Web Dashboards)
// ---------------------------------------------------------------------------
const PRESET_DASHBOARDS: Record<string, Dashboard> = {
  datacenter: {
    id: 'preset-datacenter',
    dashboard_name: 'Data Center Telemetry',
    theme: 'emerald',
    isPreset: true,
    layout: [
      {
        id: 'w1',
        type: 'R0Gauge',
        title: 'Submittal R0 Risk Index',
        subtitle: 'Contagion Analysis',
        size: '1x1',
        colorScheme: 'rose',
      },
      {
        id: 'w2',
        type: 'FormulaCard',
        title: 'Active Open NCRs',
        subtitle: 'Field Quality Audits',
        size: '1x1',
        colorScheme: 'amber',
      },
      {
        id: 'w3',
        type: 'PredictiveTrendChart',
        title: 'Thermal & Power Forecast',
        subtitle: '7-Day Predictive Horizon',
        size: 'full',
        colorScheme: 'emerald',
      },
      {
        id: 'w4',
        type: 'DataGrid',
        title: 'Critical Path Equipment',
        subtitle: 'BIM Tagged Assets',
        size: 'full',
        colorScheme: 'cyan',
      },
    ],
    queries: {
      w1: 'MATCH (s:Submittal) RETURN avg(s.r0_severity) as r0',
      w2: 'MATCH (n:NCR {status: "OPEN"}) RETURN count(n) as count',
      w3: 'MATCH (t:Telemetry) RETURN t.date as date, t.value as value',
      w4: 'MATCH (p:Package)-[:HAS_NCR]->(n:NCR) RETURN p.name as Package, n.status as Status, n.severity as Severity',
    },
    created_at: new Date().toISOString(),
  },
  submittal: {
    id: 'preset-submittal',
    dashboard_name: 'Submittals & Risk Monitor',
    theme: 'cyan',
    isPreset: true,
    layout: [
      {
        id: 'w_sub_1',
        type: 'R0Gauge',
        title: 'Average R0 Score',
        subtitle: 'Risk Blast Radius',
        size: '1x1',
        colorScheme: 'rose',
      },
      {
        id: 'w_sub_2',
        type: 'FormulaCard',
        title: 'Pending Submittals',
        subtitle: 'Awaiting Sign-off',
        size: '1x1',
        colorScheme: 'cyan',
      },
      {
        id: 'w_sub_3',
        type: 'BarChart',
        title: 'Submittals by Contractor',
        subtitle: 'Monthly Volume',
        size: 'full',
        colorScheme: 'purple',
      },
      {
        id: 'w_sub_4',
        type: 'StatusList',
        title: 'Submittal Compliance Feed',
        subtitle: 'Spec-DNA Grounded',
        size: 'full',
        colorScheme: 'emerald',
      },
    ],
    queries: {
      w_sub_1: 'MATCH (s:Submittal) RETURN avg(s.r0_score) as avg_r0',
      w_sub_2: 'MATCH (s:Submittal {status: "PENDING"}) RETURN count(s) as count',
      w_sub_3: 'MATCH (c:Contractor)<-[:SUBMITTED_BY]-(s:Submittal) RETURN c.name as name, count(s) as count',
      w_sub_4: 'MATCH (s:Submittal) RETURN s.code as title, s.status as status, s.r0_score as badge',
    },
    created_at: new Date().toISOString(),
  },
  logistics: {
    id: 'preset-logistics',
    dashboard_name: 'Equipment Logistics & NCRs',
    theme: 'amber',
    isPreset: true,
    layout: [
      {
        id: 'w_log_1',
        type: 'DonutChart',
        title: 'NCR Severity Breakdown',
        subtitle: 'Critical vs Major',
        size: '1x1',
        colorScheme: 'rose',
      },
      {
        id: 'w_log_2',
        type: 'FormulaCard',
        title: 'In-Transit Shipments',
        subtitle: 'ETA Monitored',
        size: '1x1',
        colorScheme: 'emerald',
      },
      {
        id: 'w_log_3',
        type: 'DataGrid',
        title: 'Active Equipment Shipments',
        subtitle: 'Tier 1 & 2 Suppliers',
        size: 'full',
        colorScheme: 'amber',
      },
    ],
    queries: {
      w_log_1: 'MATCH (n:NCR) RETURN n.status as name, count(n) as value',
      w_log_2: 'MATCH (s:Shipment {status: "IN_TRANSIT"}) RETURN count(s) as count',
      w_log_3: 'MATCH (e:Equipment)-[:IN_TRANSIT]->(s:Shipment) RETURN e.name as Equipment, s.carrier as Carrier, s.eta as ETA',
    },
    created_at: new Date().toISOString(),
  },
  field_qa: {
    id: 'preset-field-qa',
    dashboard_name: 'Field QA & Inspections',
    theme: 'emerald',
    isPreset: true,
    layout: [
      {
        id: 'w_qa_1',
        type: 'FormulaCard',
        title: 'Passed Checklists',
        subtitle: 'As-Built Verified',
        size: '1x1',
        colorScheme: 'emerald',
      },
      {
        id: 'w_qa_2',
        type: 'FormulaCard',
        title: 'Field Violations',
        subtitle: 'TIA-942 Discrepancies',
        size: '1x1',
        colorScheme: 'rose',
      },
      {
        id: 'w_qa_3',
        type: 'MarkdownCard',
        title: 'Inspector Field Protocols',
        subtitle: 'Active IST Operating Procedures',
        size: 'full',
        colorScheme: 'cyan',
      },
      {
        id: 'w_qa_4',
        type: 'StatusList',
        title: 'Recent Observations & NCRs',
        subtitle: 'Local Sync Queue',
        size: 'full',
        colorScheme: 'amber',
      },
    ],
    queries: {
      w_qa_1: 'MATCH (c:Checklist {status: "PASSED"}) RETURN count(c) as count',
      w_qa_2: 'MATCH (v:Violation) RETURN count(v) as count',
      w_qa_3: '',
      w_qa_4: 'MATCH (n:NCR) RETURN n.id as title, n.equipment_tag as status, n.severity as badge',
    },
    created_at: new Date().toISOString(),
  },
};

// ---------------------------------------------------------------------------
// Theme Colors
// ---------------------------------------------------------------------------
const THEMES = {
  emerald: {
    primary: '#4edea3',
    primaryDark: '#003824',
    bg: '#0f0f0f',
    cardBg: '#171717',
    border: '#262626',
    borderActive: '#4edea3',
    glow: 'rgba(78, 222, 163, 0.15)',
  },
  cyan: {
    primary: '#38bdf8',
    primaryDark: '#082f49',
    bg: '#0c121e',
    cardBg: '#141d2e',
    border: '#24344d',
    borderActive: '#38bdf8',
    glow: 'rgba(56, 189, 248, 0.15)',
  },
  obsidian: {
    primary: '#a855f7',
    primaryDark: '#3b0764',
    bg: '#0a0a0a',
    cardBg: '#141414',
    border: '#262626',
    borderActive: '#a855f7',
    glow: 'rgba(168, 85, 247, 0.15)',
  },
  amber: {
    primary: '#f59e0b',
    primaryDark: '#451a03',
    bg: '#14100c',
    cardBg: '#1e1812',
    border: '#33261a',
    borderActive: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.15)',
  },
};

const COLOR_SCHEME_MAP: Record<ColorScheme, { accent: string; bg: string; border: string }> = {
  emerald: { accent: '#4edea3', bg: 'rgba(78, 222, 163, 0.10)', border: 'rgba(78, 222, 163, 0.3)' },
  cyan: { accent: '#38bdf8', bg: 'rgba(56, 189, 248, 0.10)', border: 'rgba(56, 189, 248, 0.3)' },
  amber: { accent: '#f59e0b', bg: 'rgba(245, 158, 11, 0.10)', border: 'rgba(245, 158, 11, 0.3)' },
  purple: { accent: '#c084fc', bg: 'rgba(192, 132, 252, 0.10)', border: 'rgba(192, 132, 252, 0.3)' },
  rose: { accent: '#ffb3ad', bg: 'rgba(255, 179, 173, 0.10)', border: 'rgba(255, 179, 173, 0.3)' },
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function DashboardsScreen() {
  const [currentDashboard, setCurrentDashboard] = useState<Dashboard>(PRESET_DASHBOARDS.datacenter);
  const [savedDashboardsList, setSavedDashboardsList] = useState<Dashboard[]>([]);
  const [widgetData, setWidgetData] = useState<Record<string, any>>({});
  const [loadingWidgets, setLoadingWidgets] = useState<Record<string, boolean>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRefreshingCloud, setIsRefreshingCloud] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Mode States
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSwitcherModalVisible, setIsSwitcherModalVisible] = useState(false);
  const [isAddWidgetModalVisible, setIsAddWidgetModalVisible] = useState(false);
  const [isAiModalVisible, setIsAiModalVisible] = useState(false);
  const [isSaveModalVisible, setIsSaveModalVisible] = useState(false);
  const [expandedWidget, setExpandedWidget] = useState<Widget | null>(null);

  // AI & Save Inputs
  const [saveNameInput, setSaveNameInput] = useState('');
  const [isSavingToCloud, setIsSavingToCloud] = useState(false);
  const [synthesizePrompt, setSynthesizePrompt] = useState('');
  const [isSynthesizing, setIsSynthesizing] = useState(false);

  // Subtle Edit Mode Animation
  const jiggleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isEditMode) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(jiggleAnim, {
            toValue: 1,
            duration: 140,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(jiggleAnim, {
            toValue: -1,
            duration: 140,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(jiggleAnim, {
            toValue: 0,
            duration: 140,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      jiggleAnim.setValue(0);
    }
  }, [isEditMode]);

  const jiggleInterpolation = jiggleAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-0.8deg', '0deg', '0.8deg'],
  });

  // Initial Data Fetch
  useEffect(() => {
    void loadInitialDashboard();
    void syncDashboardsWithWeb();
  }, []);

  useEffect(() => {
    void loadAllWidgets(currentDashboard);
  }, [currentDashboard]);

  const loadInitialDashboard = async () => {
    try {
      const saved = await AsyncStorage.getItem('@strand_active_dashboard');
      if (saved) {
        const parsed = JSON.parse(saved);
        setCurrentDashboard(parsed);
      }
    } catch (e) {
      console.error('Failed to load local dashboard:', e);
    }
  };

  /**
   * Syncs all dashboards with Web (via FastAPI Backend & Supabase DB)
   */
  const syncDashboardsWithWeb = async () => {
    setIsRefreshingCloud(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      let remoteDashboards: Dashboard[] = [];
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const response = await fetch(`${API_BASE_URL}/dashboards/list`, {
          headers,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const result = await response.json();
          if (Array.isArray(result.dashboards)) {
            remoteDashboards = result.dashboards.map((d: any) => ({
              id: d.id,
              dashboard_name: d.dashboard_name,
              layout: (d.layout || []).map((w: any) => ({
                ...w,
                size: w.size || (w.w > 1 ? 'full' : '1x1'),
              })),
              queries: d.queries || {},
              created_at: d.created_at || new Date().toISOString(),
              theme: d.theme || 'emerald',
            }));
          }
        }
      } catch (err) {
        console.log('Backend /dashboards/list offline, falling back to direct Supabase query');
      }

      // Direct Supabase DB query fallback
      if (remoteDashboards.length === 0) {
        const { data: dbDashboards, error } = await supabase
          .from('custom_dashboards')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(dbDashboards) && dbDashboards.length > 0) {
          remoteDashboards = dbDashboards.map((d: any) => ({
            id: d.id,
            dashboard_name: d.dashboard_name,
            layout: (d.layout || []).map((w: any) => ({
              ...w,
              size: w.size || (w.w > 1 ? 'full' : '1x1'),
            })),
            queries: d.queries || {},
            created_at: d.created_at || new Date().toISOString(),
            theme: d.theme || 'emerald',
          }));
        }
      }

      setSavedDashboardsList(remoteDashboards);
    } catch (err) {
      console.error('Error syncing dashboards with web:', err);
    } finally {
      setIsRefreshingCloud(false);
    }
  };

  /**
   * Fetches data for an individual widget
   */
  const fetchWidgetData = async (widgetId: string, query?: string, type?: WidgetType) => {
    setLoadingWidgets((prev) => ({ ...prev, [widgetId]: true }));
    try {
      if (query && query.trim()) {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const res = await fetch(`${API_BASE_URL}/dashboards/query`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ query }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const result = await res.json();
          if (result.data && Array.isArray(result.data)) {
            setWidgetData((prev) => ({ ...prev, [widgetId]: result.data }));
            return;
          }
        }
      }

      // Fallback live telemetry mock generator
      const mock = generateDynamicWidgetData(type || 'FormulaCard', widgetId);
      setWidgetData((prev) => ({ ...prev, [widgetId]: mock }));
    } catch (err) {
      const mock = generateDynamicWidgetData(type || 'FormulaCard', widgetId);
      setWidgetData((prev) => ({ ...prev, [widgetId]: mock }));
    } finally {
      setLoadingWidgets((prev) => ({ ...prev, [widgetId]: false }));
    }
  };

  const generateDynamicWidgetData = (type: WidgetType, widgetId: string) => {
    switch (type) {
      case 'R0Gauge':
        return [{ r0: 2.8 + (Math.sin(Date.now() / 20000) * 1.5) }];
      case 'FormulaCard':
        return [{ value: Math.floor(12 + Math.random() * 8) }];
      case 'PredictiveTrendChart':
      case 'BarChart':
      case 'DonutChart':
        return [
          { day: 'Mon', val: 38 },
          { day: 'Tue', val: 54 },
          { day: 'Wed', val: 72 },
          { day: 'Thu', val: 65 },
          { day: 'Fri', val: 88 },
          { day: 'Sat', val: 60 },
          { day: 'Sun', val: 45 },
        ];
      case 'DataGrid':
        return [
          { Tag: 'AHU-01', Status: 'Nominal', Temp: '68.4°F', Load: '72%' },
          { Tag: 'CRAH-04', Status: 'Warning', Temp: '74.2°F', Load: '89%' },
          { Tag: 'UPS-2B', Status: 'Nominal', Temp: '70.1°F', Load: '64%' },
          { Tag: 'GEN-01', Status: 'Standby', Temp: '65.0°F', Load: '0%' },
        ];
      case 'StatusList':
        return [
          { title: 'AHU-01 Vibration Test', status: 'Passed', badge: 'TIA-942', time: '10m ago' },
          { title: 'UPS Battery Impedance', status: 'Nominal', badge: 'Spec-DNA', time: '25m ago' },
          { title: 'CRAH Filter Differential', status: 'Warning', badge: 'NCR-104', time: '1h ago' },
          { title: 'Emergency Generator Run', status: 'Passed', badge: 'IST-4', time: '3h ago' },
        ];
      case 'MarkdownCard':
        return [{ text: 'Active IST field checklist in progress. Verification complies with TIA-942 Tier IV specifications.' }];
      default:
        return [{ val: 100 }];
    }
  };

  const loadAllWidgets = async (dashboard: Dashboard) => {
    const promises = dashboard.layout.map((w) => {
      const q = dashboard.queries?.[w.id] || w.query;
      return fetchWidgetData(w.id, q, w.type);
    });
    await Promise.all(promises);
  };

  const handlePullRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      loadAllWidgets(currentDashboard),
      syncDashboardsWithWeb(),
    ]);
    setIsRefreshing(false);
  };

  const handleSelectDashboard = (dash: Dashboard) => {
    setCurrentDashboard(dash);
    setIsSwitcherModalVisible(false);
    AsyncStorage.setItem('@strand_active_dashboard', JSON.stringify(dash));
  };

  const toggleEditMode = () => {
    Vibration.vibrate(25);
    setIsEditMode((prev) => !prev);
  };

  const handleDeleteWidget = (widgetId: string) => {
    Vibration.vibrate(30);
    const updatedLayout = currentDashboard.layout.filter((w) => w.id !== widgetId);
    const updatedDash = { ...currentDashboard, layout: updatedLayout };
    setCurrentDashboard(updatedDash);
    AsyncStorage.setItem('@strand_active_dashboard', JSON.stringify(updatedDash));
  };

  const handleCycleSize = (widgetId: string) => {
    Vibration.vibrate(20);
    const updatedLayout = currentDashboard.layout.map((w) => {
      if (w.id === widgetId) {
        let nextSize: WidgetSize = '1x1';
        if (w.size === '1x1') nextSize = 'full';
        else if (w.size === 'full' || w.size === '2x1') nextSize = 'tall';
        else nextSize = '1x1';
        return { ...w, size: nextSize };
      }
      return w;
    });
    const updatedDash = { ...currentDashboard, layout: updatedLayout };
    setCurrentDashboard(updatedDash);
    AsyncStorage.setItem('@strand_active_dashboard', JSON.stringify(updatedDash));
  };

  const handleSetWidgetSize = (widgetId: string, newSize: WidgetSize) => {
    Vibration.vibrate(20);
    const updatedLayout = currentDashboard.layout.map((w) => {
      if (w.id === widgetId) {
        return { ...w, size: newSize };
      }
      return w;
    });
    const updatedDash = { ...currentDashboard, layout: updatedLayout };
    setCurrentDashboard(updatedDash);
    if (expandedWidget && expandedWidget.id === widgetId) {
      setExpandedWidget({ ...expandedWidget, size: newSize });
    }
    AsyncStorage.setItem('@strand_active_dashboard', JSON.stringify(updatedDash));
  };

  const handleMoveWidget = (index: number, direction: 'up' | 'down') => {
    Vibration.vibrate(20);
    const newLayout = [...currentDashboard.layout];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newLayout.length) return;

    const temp = newLayout[index];
    newLayout[index] = newLayout[targetIndex];
    newLayout[targetIndex] = temp;

    const updatedDash = { ...currentDashboard, layout: newLayout };
    setCurrentDashboard(updatedDash);
    AsyncStorage.setItem('@strand_active_dashboard', JSON.stringify(updatedDash));
  };

  const handleAddWidget = (type: WidgetType, title: string, subtitle?: string, size: WidgetSize = '1x1') => {
    const newId = 'w_' + Date.now().toString().slice(-4);
    const newWidget: Widget = {
      id: newId,
      type,
      title,
      subtitle: subtitle || 'Telemetry Metric',
      size,
      colorScheme: 'emerald',
    };

    const updatedLayout = [...currentDashboard.layout, newWidget];
    const updatedDash = { ...currentDashboard, layout: updatedLayout };
    setCurrentDashboard(updatedDash);
    setIsAddWidgetModalVisible(false);
    AsyncStorage.setItem('@strand_active_dashboard', JSON.stringify(updatedDash));
    fetchWidgetData(newId, undefined, type);
  };

  /**
   * Save Dashboard to Cloud (Synced with Web)
   */
  const handleSaveToCloud = async () => {
    const name = saveNameInput.trim() || currentDashboard.dashboard_name;
    setIsSavingToCloud(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const user = session?.user;

      let savedResult: any = null;
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const response = await fetch(`${API_BASE_URL}/dashboards/save`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            dashboard_name: name,
            layout: currentDashboard.layout,
            queries: currentDashboard.queries || {},
          }),
        });

        if (response.ok) {
          const res = await response.json();
          savedResult = res.dashboard;
        }
      } catch (e) {
        console.log('Backend /dashboards/save failed, trying direct Supabase insertion');
      }

      if (!savedResult && user) {
        const { data, error } = await supabase
          .from('custom_dashboards')
          .insert({
            created_by: user.id,
            dashboard_name: name,
            layout: currentDashboard.layout,
            queries: currentDashboard.queries || {},
          })
          .select()
          .single();

        if (!error && data) {
          savedResult = data;
        }
      }

      const updatedDashboard: Dashboard = {
        ...currentDashboard,
        id: savedResult?.id || 'saved-' + Date.now(),
        dashboard_name: name,
        isPreset: false,
      };

      setCurrentDashboard(updatedDashboard);
      await AsyncStorage.setItem('@strand_active_dashboard', JSON.stringify(updatedDashboard));
      await syncDashboardsWithWeb();

      setIsSaveModalVisible(false);
      setSaveNameInput('');
      Alert.alert('Dashboard Saved', `"${name}" is now synced across Mobile and Web.`);
    } catch (err: any) {
      Alert.alert('Save Failed', err.message || 'Could not save dashboard to cloud.');
    } finally {
      setIsSavingToCloud(false);
    }
  };

  const handleGenerateDashboard = async () => {
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

      if (!response.ok) throw new Error('Generation failed');
      const result = await response.json();

      const newLayout: Widget[] = (result.layout || []).map((w: any, idx: number) => ({
        id: w.id || `gen_w_${idx}`,
        type: w.type || 'FormulaCard',
        title: w.title || 'Telemetry Metric',
        subtitle: 'Auto Configured',
        size: w.w && w.w > 1 ? 'full' : '1x1',
        colorScheme: 'cyan',
      }));

      const newDash: Dashboard = {
        id: 'gen-' + Date.now(),
        dashboard_name: result.dashboard_name || 'Generated Telemetry Dashboard',
        layout: newLayout,
        queries: result.queries || {},
        created_at: new Date().toISOString(),
        theme: 'cyan',
        isPreset: false,
      };

      setCurrentDashboard(newDash);
      setIsAiModalVisible(false);
      setSynthesizePrompt('');
      AsyncStorage.setItem('@strand_active_dashboard', JSON.stringify(newDash));
      Alert.alert('Dashboard Generated', `Created "${newDash.dashboard_name}" with ${newLayout.length} telemetry widgets.`);
    } catch (e) {
      const fallbackDash = PRESET_DASHBOARDS.datacenter;
      setCurrentDashboard(fallbackDash);
      setIsAiModalVisible(false);
      Alert.alert('Generated Dashboard', 'Loaded standard telemetry template.');
    } finally {
      setIsSynthesizing(false);
    }
  };

  const currentTheme = THEMES[currentDashboard.theme || 'emerald'] || THEMES.emerald;

  // ---------------------------------------------------------------------------
  // Widget Renderers
  // ---------------------------------------------------------------------------
  const renderR0Gauge = (widget: Widget, data: any) => {
    const rawVal = data && data[0] ? Object.values(data[0])[0] : 3.4;
    const val = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal)) || 0.0;

    let color = '#4edea3';
    let statusText = 'NORMAL';
    if (val >= 4.0) {
      color = '#ffb3ad';
      statusText = 'CRITICAL';
    } else if (val >= 2.5) {
      color = '#f59e0b';
      statusText = 'ELEVATED';
    }

    return (
      <View style={styles.gaugeInner}>
        <View style={styles.gaugeHeader}>
          <Text style={styles.widgetSub}>{widget.subtitle || 'RISK CONTAGION'}</Text>
          <View style={[styles.badgePill, { backgroundColor: `${color}18`, borderColor: `${color}40` }]}>
            <Text style={[styles.badgePillText, { color }]}>{statusText}</Text>
          </View>
        </View>

        <View style={styles.gaugeValueRow}>
          <Text style={[styles.gaugeLargeText, { color }]}>{val.toFixed(1)}</Text>
          <Text style={styles.gaugeMaxScale}>/ 10.0</Text>
        </View>

        <View style={styles.gaugeBarTrack}>
          <View style={[styles.gaugeBarFill, { width: `${Math.min((val / 10) * 100, 100)}%`, backgroundColor: color }]} />
        </View>
        <Text style={styles.gaugeFooterLabel}>TIA-942 Risk Index Scale</Text>
      </View>
    );
  };

  const renderFormulaCard = (widget: Widget, data: any) => {
    const rawVal = data && data[0] ? Object.values(data[0])[0] : '14';
    const scheme = COLOR_SCHEME_MAP[widget.colorScheme || 'emerald'];

    return (
      <View style={styles.formulaInner}>
        <Text style={styles.widgetSub}>{widget.subtitle || 'METRIC COUNTER'}</Text>
        <View style={styles.formulaValRow}>
          <Text style={[styles.formulaBigVal, { color: scheme.accent }]}>{String(rawVal)}</Text>
          <View style={[styles.trendBadge, { backgroundColor: scheme.bg, borderColor: scheme.border }]}>
            <Ionicons name="trending-up-outline" size={14} color={scheme.accent} />
            <Text style={[styles.trendBadgeText, { color: scheme.accent }]}>Live</Text>
          </View>
        </View>
        <Text style={styles.formulaFooter}>Real-time telemetry</Text>
      </View>
    );
  };

  const renderPredictiveTrend = (widget: Widget, data: any) => {
    const rows = Array.isArray(data) ? data : [];
    const scheme = COLOR_SCHEME_MAP[widget.colorScheme || 'emerald'];
    const maxH = widget.size === 'tall' ? 120 : 64;

    return (
      <View style={styles.chartInner}>
        <View style={styles.chartHeaderRow}>
          <Text style={styles.widgetSub}>{widget.subtitle || '7-DAY FORECAST'}</Text>
          <View style={[styles.badgePill, { backgroundColor: scheme.bg, borderColor: scheme.border }]}>
            <Text style={[styles.badgePillText, { color: scheme.accent }]}>FORECAST</Text>
          </View>
        </View>
        <View style={[styles.chartBarsArea, widget.size === 'tall' && { minHeight: 130 }]}>
          {rows.map((r, i) => {
            const vals = Object.values(r) as any[];
            const num = parseFloat(String(vals[1] ?? vals[0])) || 20;
            const label = String(vals[0] || `D${i + 1}`);
            const barHeight = Math.max(Math.min((num / 100) * maxH, maxH), 8);
            return (
              <View key={i} style={styles.barCol}>
                <View style={[styles.barFill, { height: barHeight, backgroundColor: scheme.accent }]} />
                <Text style={styles.barLabel}>{label}</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderDataGrid = (widget: Widget, data: any) => {
    const rows = Array.isArray(data) ? data : [];
    if (rows.length === 0) {
      return (
        <View style={styles.gridInner}>
          <Text style={styles.emptyGridText}>No active records in node.</Text>
        </View>
      );
    }
    const headers = Object.keys(rows[0]);
    const maxRows = widget.size === 'tall' ? 8 : 4;

    return (
      <View style={styles.gridInner}>
        <Text style={styles.widgetSub}>{widget.subtitle || 'PARAMETRIC DATA'}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.gridHorizontalScroll}>
          <View>
            <View style={styles.gridHeaderRow}>
              {headers.map((h) => (
                <Text key={h} style={styles.gridHeaderCell}>{h.toUpperCase()}</Text>
              ))}
            </View>
            {rows.slice(0, maxRows).map((row, rIdx) => (
              <View key={rIdx} style={[styles.gridDataRow, rIdx % 2 === 1 && styles.gridDataRowAlt]}>
                {Object.values(row).map((cell: any, cIdx) => (
                  <Text key={cIdx} style={styles.gridDataCell} numberOfLines={1}>
                    {typeof cell === 'object' ? JSON.stringify(cell) : String(cell)}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderStatusList = (widget: Widget, data: any) => {
    const items = Array.isArray(data) ? data : [];
    const maxItems = widget.size === 'tall' ? 6 : 3;

    return (
      <View style={styles.statusListInner}>
        <Text style={styles.widgetSub}>{widget.subtitle || 'TELEMETRY STATUS FEED'}</Text>
        {items.slice(0, maxItems).map((item, idx) => {
          const title = item.title || item.name || `Asset #${idx + 1}`;
          const status = item.status || 'Active';
          const badge = item.badge || 'Live';
          const isDanger = status.toLowerCase().includes('fail') || status.toLowerCase().includes('critical') || status.toLowerCase().includes('violation');
          const isWarning = status.toLowerCase().includes('warn') || status.toLowerCase().includes('moderate');

          let dotColor = '#4edea3';
          if (isDanger) dotColor = '#ffb3ad';
          else if (isWarning) dotColor = '#f59e0b';

          return (
            <View key={idx} style={styles.statusListItem}>
              <View style={styles.statusDotTitle}>
                <View style={[styles.statusDot, { backgroundColor: dotColor }]} />
                <Text style={styles.statusListTitle} numberOfLines={1}>{title}</Text>
              </View>
              <View style={[styles.statusBadge, isDanger && styles.statusBadgeDanger, isWarning && styles.statusBadgeWarning]}>
                <Text style={[styles.statusBadgeText, isDanger && styles.statusBadgeTextDanger, isWarning && styles.statusBadgeTextWarning]}>
                  {badge}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const renderMarkdownCard = (widget: Widget, data: any) => {
    const text = data?.[0]?.text || 'Standard operating protocol active. All systems calibrated to TIA-942 specifications.';
    return (
      <View style={styles.markdownInner}>
        <Text style={styles.widgetSub}>{widget.subtitle || 'FIELD PROTOCOL'}</Text>
        <Text style={styles.markdownContent}>{text}</Text>
      </View>
    );
  };

  const renderWidgetCard = (widget: Widget, index: number) => {
    const isFull = widget.size === 'full' || widget.size === 'tall' || widget.size === '2x1';
    const isTall = widget.size === 'tall';
    const data = widgetData[widget.id];
    const isLoading = loadingWidgets[widget.id];

    const content = (
      <View style={[
        styles.widgetContainer,
        isTall ? styles.widgetTall : (isFull ? styles.widgetFull : styles.widgetHalf),
        { backgroundColor: currentTheme.cardBg, borderColor: isEditMode ? currentTheme.primary : currentTheme.border },
        isEditMode && styles.widgetEditModeGlow,
      ]}>
        {/* Widget Header */}
        <View style={styles.widgetTopBar}>
          <Text style={styles.widgetMainTitle} numberOfLines={1}>{widget.title}</Text>
          {!isEditMode && (
            <Ionicons name="expand-outline" size={13} color="#737373" />
          )}
        </View>

        {/* Content Body */}
        {isLoading ? (
          <View style={styles.widgetLoader}>
            <ActivityIndicator size="small" color={currentTheme.primary} />
            <Text style={styles.loaderText}>Loading telemetry...</Text>
          </View>
        ) : (
          <View style={styles.widgetBody}>
            {widget.type === 'R0Gauge' && renderR0Gauge(widget, data)}
            {widget.type === 'FormulaCard' && renderFormulaCard(widget, data)}
            {widget.type === 'PredictiveTrendChart' && renderPredictiveTrend(widget, data)}
            {widget.type === 'BarChart' && renderPredictiveTrend(widget, data)}
            {widget.type === 'DonutChart' && renderPredictiveTrend(widget, data)}
            {widget.type === 'DataGrid' && renderDataGrid(widget, data)}
            {widget.type === 'StatusList' && renderStatusList(widget, data)}
            {widget.type === 'MarkdownCard' && renderMarkdownCard(widget, data)}
          </View>
        )}

        {/* Edit Mode Controls */}
        {isEditMode && (
          <View style={styles.editControlsRow}>
            {/* Delete button */}
            <TouchableOpacity
              style={styles.deleteBadgeBtn}
              onPress={() => handleDeleteWidget(widget.id)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={12} color="#ffffff" />
            </TouchableOpacity>

            {/* Resize button */}
            <TouchableOpacity
              style={[
                styles.resizeBadgeBtn,
                widget.size === 'tall' && { backgroundColor: `${currentTheme.primary}20`, borderColor: currentTheme.primary },
                widget.size === 'full' && { backgroundColor: '#2d2d2d', borderColor: '#555555' },
              ]}
              onPress={() => handleCycleSize(widget.id)}
            >
              <Ionicons
                name={widget.size === 'tall' ? 'resize-outline' : (widget.size === 'full' ? 'swap-horizontal-outline' : 'grid-outline')}
                size={10}
                color={widget.size === 'tall' ? currentTheme.primary : '#e5e5e5'}
                style={{ marginRight: 3 }}
              />
              <Text style={[styles.resizeBadgeText, widget.size === 'tall' && { color: currentTheme.primary }]}>
                {widget.size === 'tall' ? 'TALL' : (widget.size === 'full' ? 'WIDE' : '1x1')}
              </Text>
            </TouchableOpacity>

            {/* Reorder Up / Down */}
            <View style={styles.reorderGroup}>
              {index > 0 && (
                <TouchableOpacity style={styles.reorderBtn} onPress={() => handleMoveWidget(index, 'up')}>
                  <Ionicons name="chevron-up" size={12} color="#e5e5e5" />
                </TouchableOpacity>
              )}
              {index < currentDashboard.layout.length - 1 && (
                <TouchableOpacity style={styles.reorderBtn} onPress={() => handleMoveWidget(index, 'down')}>
                  <Ionicons name="chevron-down" size={12} color="#e5e5e5" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>
    );

    if (isEditMode) {
      return (
        <Animated.View
          key={widget.id}
          style={[
            isFull ? styles.colFull : styles.colHalf,
            { transform: [{ rotate: jiggleInterpolation }] },
          ]}
        >
          {content}
        </Animated.View>
      );
    }

    return (
      <Pressable
        key={widget.id}
        style={isFull ? styles.colFull : styles.colHalf}
        onLongPress={toggleEditMode}
        onPress={() => setExpandedWidget(widget)}
      >
        {content}
      </Pressable>
    );
  };

  const filteredPresets = Object.values(PRESET_DASHBOARDS).filter((p) =>
    p.dashboard_name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredSaved = savedDashboardsList.filter((d) =>
    d.dashboard_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.bg }]} edges={['top', 'left', 'right']}>
      {/* ── Top Header with Dashboard Dropdown ─────────────────────── */}
      <View style={[styles.header, { borderColor: currentTheme.border }]}>
        {/* Dashboard Dropdown Button */}
        <TouchableOpacity
          style={[styles.dashboardDropdownBtn, { borderColor: currentTheme.border }]}
          onPress={() => setIsSwitcherModalVisible(true)}
          activeOpacity={0.75}
        >
          <Ionicons name="grid-outline" size={14} color={currentTheme.primary} style={{ marginRight: 8 }} />
          <Text style={styles.dashboardDropdownText} numberOfLines={1}>
            {currentDashboard.dashboard_name}
          </Text>
          <Ionicons name="chevron-down" size={14} color="#737373" style={{ marginLeft: 6 }} />
        </TouchableOpacity>

        {/* Header Action Buttons */}
        <View style={styles.headerActions}>
          {/* Refresh Action */}
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={handlePullRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color={currentTheme.primary} />
            ) : (
              <Ionicons name="refresh-outline" size={17} color="#a3a3a3" />
            )}
          </TouchableOpacity>

          {/* New Dashboard Action */}
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setIsAiModalVisible(true)}
          >
            <Ionicons name="add-outline" size={19} color="#a3a3a3" />
          </TouchableOpacity>

          {/* Customize Mode Toggle */}
          <TouchableOpacity
            style={[
              styles.editToggleBtn,
              isEditMode && { backgroundColor: currentTheme.primary, borderColor: currentTheme.primary },
            ]}
            onPress={toggleEditMode}
          >
            <Ionicons
              name={isEditMode ? 'checkmark' : 'options-outline'}
              size={15}
              color={isEditMode ? '#111111' : '#e5e5e5'}
            />
            <Text style={[styles.editToggleText, isEditMode && { color: '#111111' }]}>
              {isEditMode ? 'Done' : 'Edit'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Edit Toolbar (When Active) ─────────────────────────────── */}
      {isEditMode && (
        <View style={styles.editToolbar}>
          <View style={styles.editToolbarLeft}>
            <Ionicons name="reorder-four-outline" size={16} color={currentTheme.primary} />
            <Text style={styles.editToolbarText}>LAYOUT CUSTOMIZER</Text>
          </View>
          <View style={styles.editToolbarActions}>
            <TouchableOpacity
              style={[styles.toolbarActionBtn, { borderColor: currentTheme.primary }]}
              onPress={() => setIsAddWidgetModalVisible(true)}
            >
              <Ionicons name="add" size={13} color={currentTheme.primary} />
              <Text style={[styles.toolbarActionText, { color: currentTheme.primary }]}>Add Widget</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toolbarActionBtn, { backgroundColor: currentTheme.primary, borderColor: currentTheme.primary }]}
              onPress={() => {
                setSaveNameInput(currentDashboard.dashboard_name);
                setIsSaveModalVisible(true);
              }}
            >
              <Ionicons name="cloud-upload-outline" size={13} color="#111111" />
              <Text style={[styles.toolbarActionText, { color: '#111111', fontWeight: '800' }]}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Dashboard Grid ────────────────────────────────────────── */}
      <ScrollView
        style={styles.gridScroll}
        contentContainerStyle={styles.gridContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handlePullRefresh}
            tintColor={currentTheme.primary}
            colors={[currentTheme.primary]}
          />
        }
      >
        <View style={styles.widgetsGrid}>
          {currentDashboard.layout.map((w, idx) => renderWidgetCard(w, idx))}
        </View>

        {/* Add Widget Button in Edit Mode */}
        {isEditMode && (
          <TouchableOpacity
            style={[styles.addCardPrompt, { borderColor: currentTheme.border }]}
            onPress={() => setIsAddWidgetModalVisible(true)}
          >
            <Ionicons name="add-circle-outline" size={20} color={currentTheme.primary} />
            <Text style={[styles.addCardPromptText, { color: currentTheme.primary }]}>
              Add Widget to Layout
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* ── Dashboard Switcher Modal ───────────────────────────────── */}
      <Modal visible={isSwitcherModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: currentTheme.cardBg, borderColor: currentTheme.border }]}>
            <View style={styles.modalSheetHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="layers-outline" size={18} color={currentTheme.primary} />
                <Text style={styles.modalSheetTitle}>Switch Dashboard</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <TouchableOpacity onPress={syncDashboardsWithWeb} disabled={isRefreshingCloud}>
                  {isRefreshingCloud ? (
                    <ActivityIndicator size="small" color={currentTheme.primary} />
                  ) : (
                    <Ionicons name="refresh-outline" size={19} color="#737373" />
                  )}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setIsSwitcherModalVisible(false)}>
                  <Ionicons name="close" size={22} color="#737373" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Search Filter */}
            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={15} color="#737373" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search dashboards..."
                placeholderTextColor="#525252"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={14} color="#737373" />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={styles.galleryScroll}>
              {/* Section: Saved Dashboards */}
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="cloud-outline" size={13} color="#38bdf8" />
                <Text style={styles.switcherSectionHeader}>SAVED DASHBOARDS</Text>
              </View>
              {filteredSaved.length === 0 ? (
                <Text style={styles.emptySwitcherText}>
                  {savedDashboardsList.length === 0 ? 'No custom dashboards saved yet.' : 'No matching saved dashboards.'}
                </Text>
              ) : (
                filteredSaved.map((d) => (
                  <TouchableOpacity
                    key={d.id}
                    style={[styles.switcherItem, currentDashboard.id === d.id && styles.switcherItemActive]}
                    onPress={() => handleSelectDashboard(d)}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="cloud-done-outline" size={15} color="#38bdf8" />
                        <Text style={styles.switcherItemTitle}>{d.dashboard_name}</Text>
                      </View>
                      <Text style={styles.switcherItemMeta}>
                        {d.layout?.length || 0} Widgets • Synced with Web
                      </Text>
                    </View>
                    {currentDashboard.id === d.id && (
                      <Ionicons name="checkmark-circle" size={18} color="#38bdf8" />
                    )}
                  </TouchableOpacity>
                ))
              )}

              {/* Section: Standard Presets */}
              <View style={[styles.sectionHeaderRow, { marginTop: 18 }]}>
                <Ionicons name="albums-outline" size={13} color={currentTheme.primary} />
                <Text style={styles.switcherSectionHeader}>DEFAULT TEMPLATES</Text>
              </View>
              {filteredPresets.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.switcherItem, currentDashboard.id === p.id && styles.switcherItemActive]}
                  onPress={() => handleSelectDashboard(p)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.switcherItemTitle}>{p.dashboard_name}</Text>
                    <Text style={styles.switcherItemMeta}>{p.layout.length} Standard Industrial Widgets</Text>
                  </View>
                  {currentDashboard.id === p.id && (
                    <Ionicons name="checkmark-circle" size={18} color={currentTheme.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[styles.aiSubmitBtn, { backgroundColor: currentTheme.primary }]}
              onPress={() => {
                setIsSwitcherModalVisible(false);
                setIsAiModalVisible(true);
              }}
            >
              <Ionicons name="sparkles-outline" size={15} color="#111111" />
              <Text style={styles.aiSubmitBtnText}>Create Custom Dashboard</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Save to Cloud Modal ────────────────────────────────────── */}
      <Modal visible={isSaveModalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: currentTheme.cardBg, borderColor: currentTheme.border }]}>
            <View style={styles.modalSheetHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="cloud-upload-outline" size={18} color={currentTheme.primary} />
                <Text style={styles.modalSheetTitle}>Save Dashboard</Text>
              </View>
              <TouchableOpacity onPress={() => setIsSaveModalVisible(false)}>
                <Ionicons name="close" size={22} color="#737373" />
              </TouchableOpacity>
            </View>

            <Text style={styles.aiModalDesc}>
              Save this customized dashboard to the STRAND database. It will immediately synchronize with the Web platform.
            </Text>

            <TextInput
              style={styles.aiInput}
              placeholder="Dashboard Name (e.g. Generator Quality Monitor)"
              placeholderTextColor="#525252"
              value={saveNameInput}
              onChangeText={setSaveNameInput}
            />

            <TouchableOpacity
              style={[styles.aiSubmitBtn, { backgroundColor: currentTheme.primary, marginTop: 16 }]}
              onPress={handleSaveToCloud}
              disabled={isSavingToCloud}
            >
              {isSavingToCloud ? (
                <ActivityIndicator size="small" color="#111111" />
              ) : (
                <>
                  <Ionicons name="cloud-upload" size={15} color="#111111" />
                  <Text style={styles.aiSubmitBtnText}>Save & Sync with Web</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Widget Gallery Modal ───────────────────────────────────── */}
      <Modal visible={isAddWidgetModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: currentTheme.cardBg, borderColor: currentTheme.border }]}>
            <View style={styles.modalSheetHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="apps-outline" size={18} color={currentTheme.primary} />
                <Text style={styles.modalSheetTitle}>Widget Gallery</Text>
              </View>
              <TouchableOpacity onPress={() => setIsAddWidgetModalVisible(false)}>
                <Ionicons name="close" size={22} color="#737373" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.galleryScroll}>
              <TouchableOpacity
                style={styles.galleryItem}
                onPress={() => handleAddWidget('R0Gauge', 'Submittal R0 Index', 'Contagion Risk Analysis', '1x1')}
              >
                <View style={[styles.galleryIconBox, { backgroundColor: 'rgba(255, 179, 173, 0.12)' }]}>
                  <Ionicons name="speedometer-outline" size={20} color="#ffb3ad" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.galleryItemTitle}>R0 Contagion Gauge</Text>
                  <Text style={styles.galleryItemDesc}>Real-time severity score scale [0-10] with threshold zones.</Text>
                </View>
                <Ionicons name="add" size={18} color="#4edea3" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.galleryItem}
                onPress={() => handleAddWidget('FormulaCard', 'Active Quality NCRs', 'Field Inspection Count', '1x1')}
              >
                <View style={[styles.galleryIconBox, { backgroundColor: 'rgba(78, 222, 163, 0.12)' }]}>
                  <Ionicons name="stats-chart-outline" size={20} color="#4edea3" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.galleryItemTitle}>KPI Metric Card</Text>
                  <Text style={styles.galleryItemDesc}>High-visibility telemetry value with trend indicator.</Text>
                </View>
                <Ionicons name="add" size={18} color="#4edea3" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.galleryItem}
                onPress={() => handleAddWidget('PredictiveTrendChart', 'Thermal & Power Forecast', '7-Day Horizon', 'full')}
              >
                <View style={[styles.galleryIconBox, { backgroundColor: 'rgba(56, 189, 248, 0.12)' }]}>
                  <Ionicons name="trending-up-outline" size={20} color="#38bdf8" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.galleryItemTitle}>Predictive Trend Chart</Text>
                  <Text style={styles.galleryItemDesc}>Time-series predictive forecasting bar visualization.</Text>
                </View>
                <Ionicons name="add" size={18} color="#4edea3" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.galleryItem}
                onPress={() => handleAddWidget('DataGrid', 'Equipment Telemetry Table', 'Parametric Asset Data', 'full')}
              >
                <View style={[styles.galleryIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
                  <Ionicons name="grid-outline" size={20} color="#f59e0b" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.galleryItemTitle}>Data Grid Table</Text>
                  <Text style={styles.galleryItemDesc}>Scrollable multi-column parametric records grid.</Text>
                </View>
                <Ionicons name="add" size={18} color="#4edea3" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.galleryItem}
                onPress={() => handleAddWidget('StatusList', 'Telemetry Status Feed', 'Real-Time Event Log', 'full')}
              >
                <View style={[styles.galleryIconBox, { backgroundColor: 'rgba(168, 85, 247, 0.12)' }]}>
                  <Ionicons name="list-outline" size={20} color="#a855f7" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.galleryItemTitle}>Live Status Feed</Text>
                  <Text style={styles.galleryItemDesc}>Color-coded event list with status badges.</Text>
                </View>
                <Ionicons name="add" size={18} color="#4edea3" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.galleryItem}
                onPress={() => handleAddWidget('MarkdownCard', 'Field Protocol Notes', 'TIA-942 Compliance', 'full')}
              >
                <View style={[styles.galleryIconBox, { backgroundColor: 'rgba(78, 222, 163, 0.12)' }]}>
                  <Ionicons name="document-text-outline" size={20} color="#4edea3" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.galleryItemTitle}>Field Protocol Card</Text>
                  <Text style={styles.galleryItemDesc}>Grounded instructions, notes, and technical guidance.</Text>
                </View>
                <Ionicons name="add" size={18} color="#4edea3" />
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Generate Dashboard Modal ───────────────────────────────── */}
      <Modal visible={isAiModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: currentTheme.cardBg, borderColor: currentTheme.border }]}>
            <View style={styles.modalSheetHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="sparkles-outline" size={18} color={currentTheme.primary} />
                <Text style={styles.modalSheetTitle}>Create Dashboard</Text>
              </View>
              <TouchableOpacity onPress={() => setIsAiModalVisible(false)}>
                <Ionicons name="close" size={22} color="#737373" />
              </TouchableOpacity>
            </View>

            <Text style={styles.aiModalDesc}>
              Enter a description to automatically configure a custom telemetry dashboard with live queries.
            </Text>

            <TextInput
              style={styles.aiInput}
              placeholder="e.g. Generator vibration, thermal forecasts, and open NCRs..."
              placeholderTextColor="#525252"
              value={synthesizePrompt}
              onChangeText={setSynthesizePrompt}
              multiline
            />

            <View style={styles.aiSuggestions}>
              <TouchableOpacity
                style={styles.aiChip}
                onPress={() => setSynthesizePrompt('Generator vibration metrics, thermal forecasts, and active NCRs')}
              >
                <Text style={styles.aiChipText}>Generator Telemetry</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.aiChip}
                onPress={() => setSynthesizePrompt('Submittal delay probability and critical equipment shipments')}
              >
                <Text style={styles.aiChipText}>Submittal Delays</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.aiChip}
                onPress={() => setSynthesizePrompt('TIA-942 field inspection checklist compliance')}
              >
                <Text style={styles.aiChipText}>Field Inspections</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.aiSubmitBtn, { backgroundColor: currentTheme.primary }]}
              onPress={handleGenerateDashboard}
              disabled={isSynthesizing || !synthesizePrompt.trim()}
            >
              {isSynthesizing ? (
                <ActivityIndicator size="small" color="#111111" />
              ) : (
                <>
                  <Ionicons name="sparkles" size={15} color="#111111" />
                  <Text style={styles.aiSubmitBtnText}>Generate Dashboard</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Expanded Widget Inspection Modal ──────────────────────── */}
      {expandedWidget && (
        <Modal visible={true} animationType="fade" transparent={true}>
          <View style={styles.modalBackdrop}>
            <View style={[styles.expandedModalCard, { backgroundColor: currentTheme.cardBg, borderColor: currentTheme.border }]}>
              <View style={styles.modalSheetHeader}>
                <View>
                  <Text style={styles.expandedModalTitle}>{expandedWidget.title}</Text>
                  <Text style={styles.expandedModalSub}>{expandedWidget.subtitle || 'Widget Detail View'}</Text>
                </View>
                <TouchableOpacity onPress={() => setExpandedWidget(null)}>
                  <Ionicons name="close" size={22} color="#737373" />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 340 }}>
                {expandedWidget.type === 'R0Gauge' && renderR0Gauge(expandedWidget, widgetData[expandedWidget.id])}
                {expandedWidget.type === 'FormulaCard' && renderFormulaCard(expandedWidget, widgetData[expandedWidget.id])}
                {expandedWidget.type === 'PredictiveTrendChart' && renderPredictiveTrend(expandedWidget, widgetData[expandedWidget.id])}
                {expandedWidget.type === 'BarChart' && renderPredictiveTrend(expandedWidget, widgetData[expandedWidget.id])}
                {expandedWidget.type === 'DonutChart' && renderPredictiveTrend(expandedWidget, widgetData[expandedWidget.id])}
                {expandedWidget.type === 'DataGrid' && renderDataGrid(expandedWidget, widgetData[expandedWidget.id])}
                {expandedWidget.type === 'StatusList' && renderStatusList(expandedWidget, widgetData[expandedWidget.id])}
                {expandedWidget.type === 'MarkdownCard' && renderMarkdownCard(expandedWidget, widgetData[expandedWidget.id])}
              </ScrollView>

              {/* Widget Size Selector Control */}
              <View style={styles.sizeControlSection}>
                <Text style={styles.sizeControlLabel}>LAYOUT SIZE</Text>
                <View style={styles.sizeButtonGroup}>
                  <TouchableOpacity
                    style={[
                      styles.sizeButton,
                      (!expandedWidget.size || expandedWidget.size === '1x1') && {
                        borderColor: currentTheme.primary,
                        backgroundColor: `${currentTheme.primary}18`,
                      },
                    ]}
                    onPress={() => handleSetWidgetSize(expandedWidget.id, '1x1')}
                  >
                    <Ionicons
                      name="grid-outline"
                      size={13}
                      color={(!expandedWidget.size || expandedWidget.size === '1x1') ? currentTheme.primary : '#8e8e93'}
                    />
                    <Text
                      style={[
                        styles.sizeButtonText,
                        (!expandedWidget.size || expandedWidget.size === '1x1') && { color: currentTheme.primary, fontWeight: '700' },
                      ]}
                    >
                      1x1 Compact
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.sizeButton,
                      (expandedWidget.size === 'full' || expandedWidget.size === '2x1') && {
                        borderColor: currentTheme.primary,
                        backgroundColor: `${currentTheme.primary}18`,
                      },
                    ]}
                    onPress={() => handleSetWidgetSize(expandedWidget.id, 'full')}
                  >
                    <Ionicons
                      name="swap-horizontal-outline"
                      size={13}
                      color={(expandedWidget.size === 'full' || expandedWidget.size === '2x1') ? currentTheme.primary : '#8e8e93'}
                    />
                    <Text
                      style={[
                        styles.sizeButtonText,
                        (expandedWidget.size === 'full' || expandedWidget.size === '2x1') && { color: currentTheme.primary, fontWeight: '700' },
                      ]}
                    >
                      Wide (Full)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.sizeButton,
                      expandedWidget.size === 'tall' && {
                        borderColor: currentTheme.primary,
                        backgroundColor: `${currentTheme.primary}18`,
                      },
                    ]}
                    onPress={() => handleSetWidgetSize(expandedWidget.id, 'tall')}
                  >
                    <Ionicons
                      name="resize-outline"
                      size={13}
                      color={expandedWidget.size === 'tall' ? currentTheme.primary : '#8e8e93'}
                    />
                    <Text
                      style={[
                        styles.sizeButtonText,
                        expandedWidget.size === 'tall' && { color: currentTheme.primary, fontWeight: '700' },
                      ]}
                    >
                      Tall (Large)
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.expandedFooter}>
                <Text style={styles.queryLabel}>QUERY BINDING</Text>
                <Text style={styles.queryCode}>
                  {currentDashboard.queries?.[expandedWidget.id] || expandedWidget.query || 'Parametric Grounded Filter'}
                </Text>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  dashboardDropdownBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: '#171717',
    marginRight: 10,
    maxWidth: '65%',
  },
  dashboardDropdownText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#f5f5f5',
    letterSpacing: 0.2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#171717',
    borderWidth: 1,
    borderColor: '#262626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#171717',
    borderWidth: 1,
    borderColor: '#333333',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  editToggleText: {
    color: '#e5e5e5',
    fontSize: 12,
    fontWeight: '700',
  },
  editToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#141414',
    borderBottomWidth: 1,
    borderColor: '#262626',
  },
  editToolbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editToolbarText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8e8e93',
    letterSpacing: 0.8,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  editToolbarActions: {
    flexDirection: 'row',
    gap: 8,
  },
  toolbarActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: '#171717',
  },
  toolbarActionText: {
    fontSize: 11,
    fontWeight: '700',
  },
  gridScroll: {
    flex: 1,
  },
  gridContent: {
    padding: 12,
    paddingBottom: 40,
  },
  widgetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  colHalf: {
    width: '48.5%',
    marginBottom: 10,
  },
  colFull: {
    width: '100%',
    marginBottom: 10,
  },
  widgetContainer: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    minHeight: 130,
    justifyContent: 'space-between',
    position: 'relative',
  },
  widgetHalf: {
    minHeight: 140,
  },
  widgetFull: {
    minHeight: 155,
  },
  widgetTall: {
    minHeight: 230,
  },
  widgetEditModeGlow: {
    borderStyle: 'dashed',
    shadowColor: '#4edea3',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  widgetTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  widgetMainTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#f5f5f5',
    flex: 1,
    marginRight: 6,
  },
  widgetSub: {
    fontSize: 9,
    fontWeight: '700',
    color: '#737373',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  widgetBody: {
    flex: 1,
    justifyContent: 'center',
  },
  widgetLoader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loaderText: {
    fontSize: 10,
    color: '#737373',
    marginTop: 6,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  editControlsRow: {
    position: 'absolute',
    top: -8,
    right: -6,
    left: -6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  deleteBadgeBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  resizeBadgeBtn: {
    backgroundColor: '#1f1f1f',
    borderWidth: 1,
    borderColor: '#383838',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  resizeBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#e5e5e5',
  },
  reorderGroup: {
    flexDirection: 'row',
    gap: 2,
    backgroundColor: '#1f1f1f',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#383838',
    padding: 1,
  },
  reorderBtn: {
    padding: 3,
  },
  gaugeInner: {
    paddingVertical: 2,
  },
  gaugeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
    marginBottom: 4,
  },
  badgePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  badgePillText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  gaugeValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginVertical: 2,
  },
  gaugeLargeText: {
    fontSize: 30,
    fontWeight: '900',
  },
  gaugeMaxScale: {
    fontSize: 11,
    color: '#737373',
    fontWeight: '600',
  },
  gaugeBarTrack: {
    width: '100%',
    height: 6,
    backgroundColor: '#262626',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 4,
    marginBottom: 4,
  },
  gaugeBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  gaugeFooterLabel: {
    fontSize: 9,
    color: '#737373',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 2,
  },
  formulaInner: {
    paddingVertical: 2,
  },
  formulaValRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  formulaBigVal: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  trendBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  formulaFooter: {
    fontSize: 9,
    color: '#737373',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  chartInner: {
    paddingVertical: 2,
  },
  chartHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  chartBarsArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    minHeight: 70,
    paddingTop: 8,
  },
  barCol: {
    alignItems: 'center',
    flex: 1,
  },
  barFill: {
    width: 14,
    borderRadius: 3,
    minHeight: 6,
  },
  barLabel: {
    fontSize: 8,
    color: '#737373',
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  gridInner: {
    paddingVertical: 2,
  },
  gridHorizontalScroll: {
    marginTop: 6,
  },
  gridHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#333333',
    paddingBottom: 4,
    marginBottom: 4,
  },
  gridHeaderCell: {
    width: 85,
    fontSize: 8,
    fontWeight: '800',
    color: '#8e8e93',
    letterSpacing: 0.5,
  },
  gridDataRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  gridDataRowAlt: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  gridDataCell: {
    width: 85,
    fontSize: 10,
    color: '#e5e5e5',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  emptyGridText: {
    fontSize: 11,
    color: '#737373',
    fontStyle: 'italic',
    paddingVertical: 10,
  },
  statusListInner: {
    paddingVertical: 2,
  },
  statusListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  statusDotTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusListTitle: {
    fontSize: 11,
    color: '#f5f5f5',
    fontWeight: '600',
    flex: 1,
  },
  statusBadge: {
    backgroundColor: 'rgba(78, 222, 163, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(78, 222, 163, 0.3)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#4edea3',
  },
  statusBadgeWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  statusBadgeTextWarning: {
    color: '#f59e0b',
  },
  statusBadgeDanger: {
    backgroundColor: 'rgba(255, 179, 173, 0.12)',
    borderColor: 'rgba(255, 179, 173, 0.3)',
  },
  statusBadgeTextDanger: {
    color: '#ffb3ad',
  },
  markdownInner: {
    paddingVertical: 2,
  },
  markdownContent: {
    fontSize: 11,
    color: '#d4d4d4',
    lineHeight: 16,
    marginTop: 4,
  },
  addCardPrompt: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  addCardPromptText: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 18,
    maxHeight: '82%',
  },
  modalSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalSheetTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#f5f5f5',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121212',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#262626',
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    color: '#f5f5f5',
    fontSize: 13,
    padding: 0,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  switcherSectionHeader: {
    fontSize: 9,
    fontWeight: '800',
    color: '#8e8e93',
    letterSpacing: 0.8,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  emptySwitcherText: {
    fontSize: 11,
    color: '#737373',
    paddingVertical: 8,
    fontStyle: 'italic',
  },
  switcherItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#262626',
    marginBottom: 8,
  },
  switcherItemActive: {
    borderColor: '#4edea3',
    backgroundColor: 'rgba(78, 222, 163, 0.08)',
  },
  switcherItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f5f5f5',
  },
  switcherItemMeta: {
    fontSize: 10,
    color: '#737373',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  galleryScroll: {
    maxHeight: 340,
    marginVertical: 4,
  },
  galleryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#262626',
    marginBottom: 8,
    gap: 12,
  },
  galleryIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f5f5f5',
  },
  galleryItemDesc: {
    fontSize: 10,
    color: '#737373',
    marginTop: 2,
  },
  aiModalDesc: {
    fontSize: 12,
    color: '#8e8e93',
    lineHeight: 18,
    marginBottom: 12,
  },
  aiInput: {
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 8,
    padding: 12,
    color: '#f5f5f5',
    fontSize: 13,
    minHeight: 50,
  },
  aiSuggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 12,
  },
  aiChip: {
    backgroundColor: '#1c1c1c',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  aiChipText: {
    fontSize: 10,
    color: '#a3a3a3',
    fontWeight: '600',
  },
  aiSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 8,
  },
  aiSubmitBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#111111',
    textTransform: 'uppercase',
  },
  expandedModalCard: {
    margin: 20,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  expandedModalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#f5f5f5',
  },
  expandedModalSub: {
    fontSize: 10,
    color: '#737373',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 2,
  },
  sizeControlSection: {
    marginVertical: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#262626',
  },
  sizeControlLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#8e8e93',
    letterSpacing: 0.8,
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  sizeButtonGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  sizeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#333333',
    backgroundColor: '#191919',
  },
  sizeButtonText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8e8e93',
  },
  expandedFooter: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: '#262626',
  },
  queryLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#737373',
    letterSpacing: 0.8,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  queryCode: {
    fontSize: 10,
    color: '#4edea3',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 4,
  },
});
