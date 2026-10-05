import React from 'react';
import { View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DrawerNavigator from './DrawerNavigator';
import DocumentDetailScreen from '../screens/DocumentDetailScreen';
import DownloadsScreen from '../screens/DownloadsScreen';
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
import SubscriptionScreen from '../screens/account/SubscriptionScreen';
import PaymentMethodsAdminScreen from '../screens/admin/PaymentMethodsAdminScreen';
import PromoCodeScreen from '../screens/account/PromoCodeScreen';
import WalletScreen from '../screens/account/WalletScreen';
import WithdrawScreen from '../screens/account/WithdrawScreen';
import { usePreferences } from '../context/PreferencesContext';
import theme from '../theme/tokens';

// Écrans hiérarchiques du parcours : ils glissent depuis la droite,
// le retour les renvoie dans le sens inverse.
const push = { animation: 'slide_from_right' };

const Stack = createNativeStackNavigator();

const RootNavigator = () => {
  const { preferences, isPreferencesReady } = usePreferences();
  const shouldResumeTraining = preferences.hasCompletedOrientation
    && preferences.selectedContentType === 'training'
    && Boolean(preferences.contest?._id);

  if (!isPreferencesReady) {
    return <View style={{ flex: 1, backgroundColor: theme.brand.paper }} />;
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
        contentStyle: { backgroundColor: theme.brand.paper },
      }}
    >
      <Stack.Screen name="Orientation" component={OrientationScreen} />
      <Stack.Screen name="EstablishmentSelection" component={SelectionScreen} options={push} />
      <Stack.Screen name="ParcoursTypeSelection" component={ParcoursTypeSelectionScreen} options={push} />
      <Stack.Screen name="DynamicCatalog" component={DynamicCatalogScreen} options={push} />
      <Stack.Screen name="CatalogManagement" component={CatalogManagementScreen} options={push} />
      <Stack.Screen name="ContestSelection" component={SelectionScreen} options={push} />
      <Stack.Screen name="ContestDocuments" component={ContestDocumentsScreen} options={push} />
      <Stack.Screen name="TrainingSelection" component={SelectionScreen} options={push} />
      <Stack.Screen name="MainTabs" component={DrawerNavigator} />
      {/* Accès direct depuis l'accueil : évite de construire Drawer + onglets pour une simple liste. */}
      <Stack.Screen name="Downloads" component={DownloadsScreen} options={push} />
      <Stack.Screen
        name="TrainingSession"
        component={TrainingSessionScreen}
        options={push}
      />
      <Stack.Screen name="Register" component={RegisterScreen} options={push} />
      <Stack.Screen name="Login" component={LoginScreen} options={push} />
      <Stack.Screen name="DocumentDetail" component={DocumentDetailScreen} options={push} />
      <Stack.Screen name="Subscription" component={SubscriptionScreen} options={push} />
      <Stack.Screen name="AdminPaymentMethods" component={PaymentMethodsAdminScreen} options={push} />
      <Stack.Screen name="PromoCode" component={PromoCodeScreen} options={push} />
      <Stack.Screen name="Wallet" component={WalletScreen} options={push} />
      <Stack.Screen name="Withdraw" component={WithdrawScreen} options={push} />
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
