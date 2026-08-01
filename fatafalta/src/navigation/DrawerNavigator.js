import React, { useContext } from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import TabNavigator from './TabNavigator';
import CustomDrawer from './CustomDrawer';
import AuthContext from '../context/AuthContext';

const Drawer = createDrawerNavigator();

const DrawerNavigator = () => {
  const { isAuthenticated } = useContext(AuthContext);

  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawer {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'slide',
        swipeEnabled: isAuthenticated, // Only allow swiping if logged in
        overlayColor: 'rgba(15, 23, 42, 0.4)', // theme.colors.background with opacity
        drawerStyle: {
          width: '80%',
          maxWidth: 340,
          backgroundColor: 'transparent',
        },
      }}
    >
      <Drawer.Screen name="MainTabs" component={TabNavigator} />
    </Drawer.Navigator>
  );
};

export default DrawerNavigator;
