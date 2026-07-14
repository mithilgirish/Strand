import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface BottomNavbarProps {
  activeTab: 'QrScan' | 'Chatbot' | 'Dashboards' | 'SyncStatus' | 'Settings';
  onTabChange: (tabId: 'QrScan' | 'Chatbot' | 'Dashboards' | 'SyncStatus' | 'Settings') => void;
}

export default function BottomNavbar({ activeTab, onTabChange }: BottomNavbarProps) {
  const tabs = [
    { id: 'QrScan' as const, label: 'Scan', iconName: 'qr-code-outline' as const },
    { id: 'Chatbot' as const, label: 'Brain', iconName: 'chatbubble-ellipses-outline' as const },
    { id: 'Dashboards' as const, label: 'Boards', iconName: 'stats-chart-outline' as const },
    { id: 'SyncStatus' as const, label: 'Sync', iconName: 'sync-outline' as const },
    { id: 'Settings' as const, label: 'Config', iconName: 'settings-outline' as const },
  ];

  return (
    <View style={styles.navbar}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            style={styles.tab}
            activeOpacity={0.7}
            onPress={() => {
              if (activeTab !== tab.id) {
                onTabChange(tab.id);
              }
            }}
          >
            <View style={[styles.iconContainer, isActive && styles.activeIconContainer]}>
              <Ionicons 
                name={tab.iconName} 
                size={20} 
                color={isActive ? '#E5E5E5' : '#A3A3A3'} 
              />
            </View>
            <Text style={[styles.label, isActive && styles.activeText]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  navbar: {
    flexDirection: 'row',
    backgroundColor: '#171717',
    borderTopWidth: 1,
    borderColor: '#262626',
    paddingVertical: 10,
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  activeIconContainer: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  label: {
    fontSize: 9,
    color: '#A3A3A3',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  activeText: {
    color: '#E5E5E5',
  },
});
