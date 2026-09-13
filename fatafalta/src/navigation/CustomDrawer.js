import React, { useContext, useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { Switch, TextInput, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Library,
  Download,
  ShieldCheck,
  LogOut,
  ChevronRight,
  Settings,
  User as UserIcon,
  Crown,
  Network
} from 'lucide-react-native';
import Text from '../components/ui/Text';
import AuthContext from '../context/AuthContext';
import theme from '../theme/tokens';
import * as FileSystem from 'expo-file-system/legacy';

const CustomDrawer = (props) => {
  const { state, navigation } = props;
  const { user, logout, isAuthenticated } = useContext(AuthContext);
  const insets = useSafeAreaInsets();

  const handleLogout = () => {
    logout();
    navigation.closeDrawer();
  };

  const currentRouteName = state.routes[state.index].name;
  
  // Custom active route check for nested tabs
  const isActive = (tabName) => {
    // We only have one screen in Drawer currently (MainTabs), so we have to check the state deeply if possible
    // But since the drawer items just navigate to the tabs, they will work. For active styling, we just rely on standard navigation state if we had screens here, but since they are in TabNavigator, we might not get perfect active state without deep checking. 
    // For now, let's just make them simple touchables that navigate.
    return false;
  };

  const getRoleInfo = (role) => {
    switch (role) {
      case 'admin':
        return {
          label: 'Super Administrateur',
          color: '#8B5CF6',
          bg: 'rgba(139, 92, 246, 0.15)',
          icon: <Crown size={14} color="#8B5CF6" style={{ marginRight: 4 }} />
        };
      case 'sub-admin':
        return {
          label: 'Administrateur',
          color: theme.colors.primary,
          bg: theme.colors.primaryWash,
          icon: <ShieldCheck size={14} color={theme.colors.primary} style={{ marginRight: 4 }} />
        };
      case 'contributor':
      default:
        return {
          label: 'Contributeur',
          color: theme.colors.textSecondary,
          bg: theme.colors.surfaceRaised,
          icon: null
        };
    }
  };

  const roleInfo = user ? getRoleInfo(user.role) : null;

  // Preferences for PDF generation (persisted locally)
  const [addWatermarkPref, setAddWatermarkPref] = useState(true);
  const [addFooterPref, setAddFooterPref] = useState(false);
  const [footerText, setFooterText] = useState('Fatafalta · Téléchargez plus de documents sur www.fatafalta.com');
  const [footerSize, setFooterSize] = useState(9);
  const [editingFooter, setEditingFooter] = useState(false);

  const PREFS_FILE = FileSystem.documentDirectory + 'fatafalta_prefs.json';

  const readPrefs = async () => {
    try {
      const info = await FileSystem.getInfoAsync(PREFS_FILE);
      if (!info.exists) return {};
      const raw = await FileSystem.readAsStringAsync(PREFS_FILE);
      return JSON.parse(raw || '{}');
    } catch (e) {
      return {};
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const prefs = await readPrefs();
        if (prefs['pdf.addWatermark'] !== undefined) setAddWatermarkPref(Boolean(prefs['pdf.addWatermark']));
        if (prefs['pdf.addFooter'] !== undefined) setAddFooterPref(Boolean(prefs['pdf.addFooter']));
        if (prefs['pdf.footerText']) setFooterText(String(prefs['pdf.footerText']));
          if (prefs['pdf.footerSize'] !== undefined) setFooterSize(Number(prefs['pdf.footerSize']));
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  const savePref = async (key, value) => {
    try {
      const prefs = await readPrefs();
      prefs[key] = value;
      await FileSystem.writeAsStringAsync(PREFS_FILE, JSON.stringify(prefs));
    } catch (e) {
      // ignore
    }
  };

  const DrawerItem = ({ icon: Icon, label, onPress, active, isDanger }) => (
    <TouchableOpacity
      style={[
        styles.drawerItem,
        active && styles.drawerItemActive,
        isDanger && styles.drawerItemDanger
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.drawerItemIconBox, active && styles.drawerItemIconBoxActive, isDanger && styles.drawerItemIconBoxDanger]}>
        <Icon
          size={20}
          color={isDanger ? theme.colors.error : active ? theme.colors.primary : theme.colors.textSecondary}
        />
      </View>
      <Text
        variant="bodyMedium"
        style={[
          styles.drawerItemLabel,
          active && styles.drawerItemLabelActive,
          isDanger && styles.drawerItemLabelDanger
        ]}
      >
        {label}
      </Text>
      {!isDanger && <ChevronRight size={16} color={theme.colors.borderLight} />}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={{ paddingTop: 0 }}
        showsVerticalScrollIndicator={false}
      >
        {/* User Profile Header */}
        <View style={[styles.profileHeader, { paddingTop: insets.top + 20 }]}>
          <LinearGradient
            colors={[theme.colors.surface, theme.colors.background]}
            style={StyleSheet.absoluteFillObject}
          />
          {isAuthenticated && user ? (
            <>
              <View style={styles.avatarContainer}>
                <LinearGradient
                  colors={[theme.colors.primary, theme.colors.accent]}
                  style={styles.avatarGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text variant="h2" color={theme.colors.textInverse}>
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </Text>
                </LinearGradient>
              </View>
              <Text variant="h3" style={styles.userName} numberOfLines={1}>
                {user.name}
              </Text>
              <Text variant="caption" color={theme.colors.textMuted} style={styles.userEmail} numberOfLines={1}>
                {user.email}
              </Text>
              <View style={[styles.roleBadge, { backgroundColor: roleInfo.bg }]}>
                {roleInfo.icon}
                <Text variant="overline" color={roleInfo.color} style={{ fontSize: 11 }}>
                  {roleInfo.label}
                </Text>
              </View>
            </>
          ) : (
            <>
              <View style={[styles.avatarContainer, { backgroundColor: theme.colors.surfaceRaised }]}>
                <UserIcon size={32} color={theme.colors.textMuted} />
              </View>
              <Text variant="h3" style={styles.userName}>
                Mode Invité
              </Text>
              <Text variant="caption" color={theme.colors.textMuted} style={styles.userEmail}>
                Connectez-vous pour plus de fonctions
              </Text>
            </>
          )}
        </View>

        <View style={styles.menuSection}>
          <Text variant="overline" color={theme.colors.textMuted} style={styles.sectionTitle}>
            NAVIGATION
          </Text>
          <DrawerItem
            icon={Library}
            label="Ma Bibliothèque"
            onPress={() => navigation.navigate('HomeTab')}
          />
          <DrawerItem
            icon={Download}
            label="Mes Téléchargements"
            onPress={() => navigation.navigate('DownloadsTab')}
          />
          <DrawerItem
            icon={Settings}
            label="Paramètres"
            onPress={() => navigation.getParent()?.navigate('Settings')}
          />
          {/* PDF preferences */}
          <View style={{ marginTop: 12, paddingHorizontal: 8 }}>
            <Text variant="overline" color={theme.colors.textMuted} style={styles.sectionTitle}>
              PDF
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 }}>
              <Text variant="body" color={theme.colors.textPrimary}>Ajouter un filigrane</Text>
              <Switch
                value={addWatermarkPref}
                onValueChange={(v) => { setAddWatermarkPref(v); savePref('pdf.addWatermark', v); }}
              />
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 }}>
              <Text variant="body" color={theme.colors.textPrimary}>Ajouter un pied de page</Text>
              <Switch
                value={addFooterPref}
                onValueChange={(v) => { setAddFooterPref(v); savePref('pdf.addFooter', v); }}
              />
            </View>

            {isAuthenticated && (user?.role === 'admin' || user?.role === 'sub-admin') && (
              <TouchableOpacity onPress={() => setEditingFooter(true)} style={{ paddingVertical: 8 }}>
                <Text variant="bodyMedium" color={theme.colors.primary}>Modifier le texte du pied de page</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {isAuthenticated && (user?.role === 'admin' || user?.role === 'sub-admin') && (
            <>
              <View style={styles.divider} />
              <Text variant="overline" color={theme.colors.textMuted} style={styles.sectionTitle}>
                ADMINISTRATION
              </Text>
              <DrawerItem
                icon={ShieldCheck}
                label="Tableau de bord"
                onPress={() => navigation.navigate('AdminTab')}
              />
              <DrawerItem
                icon={Network}
                label="Catalogue pédagogique"
                onPress={() => navigation.getParent()?.navigate('CatalogManagement')}
              />
            </>
          )}
        </View>
      </DrawerContentScrollView>

      {/* Footer text editor modal (admin only) */}
      <Modal visible={editingFooter} transparent animationType="slide" onRequestClose={() => setEditingFooter(false)}>
        <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View style={{ backgroundColor: theme.colors.background, borderRadius: 12, padding: 16 }}>
            <Text variant="h3">Modifier le pied de page</Text>
            <Text variant="caption" color={theme.colors.textMuted} style={{ marginTop: 8 }}>Ce texte sera ajouté en bas des PDFs téléchargés.</Text>
            <TextInput
              value={footerText}
              onChangeText={setFooterText}
              multiline
              style={{ marginTop: 12, minHeight: 80, padding: 8, backgroundColor: theme.colors.surface, borderRadius: 8, color: theme.colors.textPrimary }}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', marginTop: 12, gap: 12 }}>
              <Text variant="body">Taille du texte :</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => setFooterSize((s) => Math.max(6, s - 1))}
                  style={{ padding: 8, backgroundColor: theme.colors.surface, borderRadius: 8 }}
                >
                  <Text variant="body">-</Text>
                </TouchableOpacity>
                <View style={{ minWidth: 36, alignItems: 'center' }}>
                  <Text variant="bodyMedium">{footerSize}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setFooterSize((s) => Math.min(24, s + 1))}
                  style={{ padding: 8, backgroundColor: theme.colors.surface, borderRadius: 8 }}
                >
                  <Text variant="body">+</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 }}>
              <TouchableOpacity onPress={() => setEditingFooter(false)} style={{ padding: 8, marginRight: 8 }}>
                <Text variant="body">Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={async () => { await savePref('pdf.footerText', footerText); await savePref('pdf.footerSize', footerSize); setEditingFooter(false); }} style={{ padding: 8 }}>
                <Text variant="body" color={theme.colors.primary}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Footer Area */}
      {isAuthenticated && (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <DrawerItem
            icon={LogOut}
            label="Se déconnecter"
            onPress={handleLogout}
            isDanger
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  profileHeader: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
    alignItems: 'center',
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
    backgroundColor: theme.colors.surface,
  },
  avatarGradient: {
    flex: 1,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    marginBottom: 4,
    textAlign: 'center',
  },
  userEmail: {
    marginBottom: 16,
    textAlign: 'center',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  menuSection: {
    paddingTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    marginLeft: 8,
    marginBottom: 12,
    letterSpacing: 1.2,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.borderLight,
    marginVertical: 16,
    marginHorizontal: 8,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    marginBottom: 4,
  },
  drawerItemActive: {
    backgroundColor: theme.colors.primaryWash,
  },
  drawerItemDanger: {
    backgroundColor: theme.colors.errorWash,
  },
  drawerItemIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  drawerItemIconBoxActive: {
    backgroundColor: theme.colors.surface,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  drawerItemIconBoxDanger: {
    backgroundColor: theme.colors.surface,
  },
  drawerItemLabel: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  drawerItemLabelActive: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  drawerItemLabelDanger: {
    color: theme.colors.error,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    backgroundColor: theme.colors.surface,
  },
});

export default CustomDrawer;
