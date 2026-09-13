import React from 'react';
import { View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DrawerNavigator from './DrawerNavigator';
import DocumentDetailScreen from '../screens/DocumentDetailScreen';
import SettingsScreen from '../screens/SettingsScreen';
import RegisterScreen from '../screens/RegisterScreen';
import LoginScreen from '../screens/LoginScreen';
import UploadScreen from '../screens/UploadScreen';
import EditDraftScreen from '../screens/EditDraftScreen';
import CorrectionUploadScreen from '../screens/CorrectionUploadScreen';
import AdminTrashScreen from '../screens/AdminTrashScreen';
import OrientationScreen from '../screens/OrientationScreen';
import SelectionScreen from '../screens/SelectionScreen';
import ContestDocumentsScreen from '../screens/ContestDocumentsScreen';
import DynamicCatalogScreen from '../screens/DynamicCatalogScreen';
import ParcoursTypeSelectionScreen from '../screens/ParcoursTypeSelectionScreen';
import CatalogManagementScreen from '../screens/CatalogManagementScreen';
import TrainingSessionScreen from '../screens/TrainingSessionScreen';
import { usePreferences } from '../context/PreferencesContext';

const Stack = createNativeStackNavigator();

const RootNavigator = () => {
  const { preferences, isPreferencesReady } = usePreferences();
  const shouldResumeTraining = preferences.hasCompletedOrientation
    && preferences.selectedContentType === 'training'
    && Boolean(preferences.contest?._id);

  if (!isPreferencesReady) {
    return <View style={{ flex: 1, backgroundColor: '#F8FAFD' }} />;
  }

  /*  initialRouteName={preferences.hasCompletedOrientation
        ? (shouldResumeTraining ? 'TrainingSession' : 'MainTabs')
        : 'Orientation'}
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }} */

  return (
    <Stack.Navigator
      initialRouteName={'Orientation'}
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }}
    >
      <Stack.Screen name="Orientation" component={OrientationScreen} />
      <Stack.Screen name="EstablishmentSelection" component={SelectionScreen} />
      <Stack.Screen name="ParcoursTypeSelection" component={ParcoursTypeSelectionScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="DynamicCatalog" component={DynamicCatalogScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="CatalogManagement" component={CatalogManagementScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="ContestSelection" component={SelectionScreen} />
      <Stack.Screen name="ContestDocuments" component={ContestDocumentsScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="TrainingSelection" component={SelectionScreen} />
      <Stack.Screen name="MainTabs" component={DrawerNavigator} />
      <Stack.Screen
        name="TrainingSession"
        component={TrainingSessionScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen 
        name="DocumentDetail" 
        component={DocumentDetailScreen}
        options={{
          presentation: 'modal', // Use modal presentation for the detail screen
        }}
      />
      <Stack.Screen 
        name="Upload" 
        component={UploadScreen}
        options={{
          presentation: 'modal',
        }}
      />
      <Stack.Screen 
        name="EditDraft" 
        component={EditDraftScreen}
        options={{
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="CorrectionUpload"
        component={CorrectionUploadScreen}
        options={{
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
      />
      <Stack.Screen
        name="AdminTrash"
        component={AdminTrashScreen}
      />
    </Stack.Navigator>
  );
};

export default RootNavigator;
