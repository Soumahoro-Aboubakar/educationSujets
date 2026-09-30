import React, { useContext } from 'react';
import { StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Compass, Download, ShieldCheck, UserRound } from 'lucide-react-native';
import SelectionScreen from '../screens/SelectionScreen';
import DownloadsScreen from '../screens/DownloadsScreen';
import AdminDraftsScreen from '../screens/AdminDraftsScreen';
import AccountScreen from '../screens/account/AccountScreen';
import AuthContext from '../context/AuthContext';
import theme from '../theme/tokens';

const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  const { isAuthenticated, isAdmin } = useContext(AuthContext);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.brand.ink,
        tabBarInactiveTintColor: theme.brand.inkMuted,
        // Barre sobre : un filet suffit à la séparer du contenu.
        tabBarStyle: {
          height: 68,
          paddingTop: 8,
          paddingBottom: 10,
          backgroundColor: theme.colors.surface,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: theme.brand.line,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontFamily: theme.fontFamily.medium,
          fontSize: 12,
          marginTop: 2,
        },
      }}
    >
      {/* Explorer = catalogue des organismes (anciennement « Bibliothèque » / HomeScreen). */}
      <Tab.Screen
        name="ExploreTab"
        component={SelectionScreen}
        options={{
          tabBarLabel: 'Explorer',
          tabBarIcon: ({ color, size }) => <Compass color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="DownloadsTab"
        component={DownloadsScreen}
        options={{
          tabBarLabel: 'Téléchargements',
          tabBarIcon: ({ color, size }) => <Download color={color} size={size} />,
        }}
      />
      {/* Invité : l'onglet Compte propose connexion et inscription. */}
      <Tab.Screen
        name="AccountTab"
        component={AccountScreen}
        options={{
          tabBarLabel: 'Compte',
          tabBarIcon: ({ color, size }) => <UserRound color={color} size={size} />,
        }}
      />
      {isAuthenticated && isAdmin() && (
        <Tab.Screen
          name="AdminTab"
          component={AdminDraftsScreen}
          options={{
            tabBarLabel: 'Admin',
            tabBarIcon: ({ color, size }) => <ShieldCheck color={color} size={size} />,
          }}
        />
      )}
    </Tab.Navigator>
  );
};

export default TabNavigator;
