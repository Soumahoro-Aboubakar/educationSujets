import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TabNavigator from './TabNavigator';
import DocumentDetailScreen from '../screens/DocumentDetailScreen';
import RegisterScreen from '../screens/RegisterScreen';
import UploadScreen from '../screens/UploadScreen';
import EditDraftScreen from '../screens/EditDraftScreen';
import CorrectionUploadScreen from '../screens/CorrectionUploadScreen';
import AdminTrashScreen from '../screens/AdminTrashScreen';

const Stack = createNativeStackNavigator();

const RootNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="MainTabs" component={TabNavigator} />
      <Stack.Screen name="Register" component={RegisterScreen} />
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
        name="AdminTrash"
        component={AdminTrashScreen}
      />
    </Stack.Navigator>
  );
};

export default RootNavigator;
