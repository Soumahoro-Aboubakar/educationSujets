import React, { useContext } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Library, Search, Download, LogIn, ShieldCheck } from 'lucide-react-native';
import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import DownloadsScreen from '../screens/DownloadsScreen';
import AdminDraftsScreen from '../screens/AdminDraftsScreen';
import LoginScreen from '../screens/LoginScreen';
import AuthContext from '../context/AuthContext';
import theme from '../theme/tokens';

const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  const { isAuthenticated, isAdmin } = useContext(AuthContext);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: theme.colors.borderLight,
          backgroundColor: theme.colors.surface,
          height: 72,
          paddingBottom: 10,
          paddingTop: 8,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 10,
        },
        tabBarLabelStyle: {
          fontFamily: theme.fontFamily.medium,
          fontSize: 12,
          marginTop: 2,
        },
        tabBarItemStyle: {
          borderRadius: 16,
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Bibliothèque',
          tabBarIcon: ({ color, size }) => <Library color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="SearchTab"
        component={SearchScreen}
        options={{
          tabBarLabel: 'Recherche',
          tabBarIcon: ({ color, size }) => <Search color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="DownloadsTab"
        component={DownloadsScreen}
        options={{
          tabBarLabel: 'Téléchargés',
          tabBarIcon: ({ color, size }) => <Download color={color} size={size} />,
        }}
      />
      {!isAuthenticated && (
        <Tab.Screen
          name="LoginTab"
          component={LoginScreen}
          options={{
            tabBarLabel: 'Connexion',
            tabBarIcon: ({ color, size }) => <LogIn color={color} size={size} />,
          }}
        />
      )}
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
