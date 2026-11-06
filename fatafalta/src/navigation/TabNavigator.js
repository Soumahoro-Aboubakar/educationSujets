import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ChartNoAxesColumnIncreasing, FileText, GraduationCap, UserRound } from 'lucide-react-native';
import SelectionScreen from '../screens/SelectionScreen';
import AccountScreen from '../screens/account/AccountScreen';
import PrepHomeScreen from '../prep/screens/PrepHomeScreen';
import { ProgressScreen } from '../prep/screens/ProgressScreens';
import usePrep, { useSummary } from '../prep/store';
import PremiumTabBar from './PremiumTabBar';

const Tab = createBottomTabNavigator();

/**
 * 4 onglets, aucun tiroir (§ 5.1) : Prépa · Sujets · Progrès · Moi.
 * L'onglet d'ouverture dépend du choix du premier lancement (§ 6.1).
 */
const ICONS = { PrepTab: GraduationCap, ExploreTab: FileText, ProgressTab: ChartNoAxesColumnIncreasing, AccountTab: UserRound };

const TabNavigator = () => {
  const choix = usePrep((s) => s.onboarding.choix);
  const summary = useSummary();
  const badges = { PrepTab: Boolean(summary?.reviews?.total) };
  return (
    <Tab.Navigator
      initialRouteName={choix === 'sujets' ? 'ExploreTab' : 'PrepTab'}
      tabBar={(props) => <PremiumTabBar {...props} icons={ICONS} badges={badges} />}
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }}
    >
      <Tab.Screen name="PrepTab" component={PrepHomeScreen} options={{ tabBarLabel: 'Prépa' }} />
      {/* « Sujets » = catalogue existant des anciens sujets, inchangé (§ 8). */}
      <Tab.Screen name="ExploreTab" component={SelectionScreen} options={{ tabBarLabel: 'Sujets' }} />
      <Tab.Screen name="ProgressTab" component={ProgressScreen} options={{ tabBarLabel: 'Progrès' }} />
      <Tab.Screen name="AccountTab" component={AccountScreen} options={{ tabBarLabel: 'Moi' }} />
    </Tab.Navigator>
  );
};

export default TabNavigator;
