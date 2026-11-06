import React from 'react';
import { StyleSheet, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChartNoAxesColumnIncreasing, FileText, GraduationCap, UserRound } from 'lucide-react-native';
import SelectionScreen from '../screens/SelectionScreen';
import AccountScreen from '../screens/account/AccountScreen';
import PrepHomeScreen from '../prep/screens/PrepHomeScreen';
import { ProgressScreen } from '../prep/screens/ProgressScreens';
import usePrep, { useSummary } from '../prep/store';
import theme from '../theme/tokens';

const Tab = createBottomTabNavigator();
const { brand } = theme;

/** Icône d'onglet : petite barre or au-dessus quand l'onglet est actif (maquettes partie B). */
const TabIcon = ({ Icon, color, focused, badge }) => (
  <View style={styles.iconWrap}>
    <View style={[styles.activeBar, { opacity: focused ? 1 : 0 }]} />
    <View style={[styles.iconPill, focused && styles.iconPillOn]}>
      <Icon color={color} size={22} strokeWidth={focused ? 2.1 : 1.8} />
    </View>
    {badge ? <View style={styles.badge} accessibilityLabel="Révisions à faire" /> : null}
  </View>
);

const PrepIcon = (props) => {
  const summary = useSummary();
  return <TabIcon Icon={GraduationCap} {...props} badge={Boolean(summary?.reviews?.total)} />;
};

/**
 * 4 onglets, aucun tiroir (§ 5.1) : Prépa · Sujets · Progrès · Moi.
 * L'onglet d'ouverture dépend du choix du premier lancement (§ 6.1).
 */
const TabNavigator = () => {
  const choix = usePrep((s) => s.onboarding.choix);
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      initialRouteName={choix === 'sujets' ? 'ExploreTab' : 'PrepTab'}
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        tabBarActiveTintColor: brand.burgundy,
        tabBarInactiveTintColor: brand.inkMuted,
        tabBarStyle: {
          // La zone sûre du bas (barre de geste iOS / Android) s'ajoute à la hauteur utile.
          height: 64 + Math.max(insets.bottom, 8),
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 8),
          backgroundColor: brand.sheet,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: brand.line,
          elevation: 12,
          shadowColor: brand.ink,
          shadowOpacity: 0.06,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: -4 },
        },
        tabBarLabelStyle: { fontFamily: theme.fontFamily.semiBold, fontSize: 11.5, marginTop: 2, letterSpacing: 0.1 },
      }}
    >
      <Tab.Screen name="PrepTab" component={PrepHomeScreen} options={{ tabBarLabel: 'Prépa', tabBarIcon: (p) => <PrepIcon {...p} /> }} />
      {/* « Sujets » = catalogue existant des anciens sujets, inchangé (§ 8). */}
      <Tab.Screen name="ExploreTab" component={SelectionScreen} options={{ tabBarLabel: 'Sujets', tabBarIcon: (p) => <TabIcon Icon={FileText} {...p} /> }} />
      <Tab.Screen name="ProgressTab" component={ProgressScreen} options={{ tabBarLabel: 'Progrès', tabBarIcon: (p) => <TabIcon Icon={ChartNoAxesColumnIncreasing} {...p} /> }} />
      <Tab.Screen name="AccountTab" component={AccountScreen} options={{ tabBarLabel: 'Moi', tabBarIcon: (p) => <TabIcon Icon={UserRound} {...p} /> }} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  iconWrap: { alignItems: 'center', justifyContent: 'center' },
  activeBar: { position: 'absolute', top: -9, width: 18, height: 3, borderRadius: 2, backgroundColor: brand.gold },
  iconPill: { width: 48, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  iconPillOn: { backgroundColor: brand.burgundyWash },
  badge: { position: 'absolute', top: 0, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: brand.burgundy, borderWidth: 1.5, borderColor: '#FFF' },
});

export default TabNavigator;
