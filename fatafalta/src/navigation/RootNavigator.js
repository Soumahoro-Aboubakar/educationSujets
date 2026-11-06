import React from 'react';
import { View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TabNavigator from './TabNavigator';
import DocumentDetailScreen from '../screens/DocumentDetailScreen';
import DownloadsScreen from '../screens/DownloadsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import RegisterScreen from '../screens/RegisterScreen';
import LoginScreen from '../screens/LoginScreen';
import UploadScreen from '../screens/UploadScreen';
import EditDraftScreen from '../screens/EditDraftScreen';
import CorrectionUploadScreen from '../screens/CorrectionUploadScreen';
import AdminTrashScreen from '../screens/AdminTrashScreen';
import AdminDraftsScreen from '../screens/AdminDraftsScreen';
import SelectionScreen from '../screens/SelectionScreen';
import ContestDocumentsScreen from '../screens/ContestDocumentsScreen';
import DynamicCatalogScreen from '../screens/DynamicCatalogScreen';
import BulkDownloadScreen from '../screens/BulkDownloadScreen';
import ParcoursTypeSelectionScreen from '../screens/ParcoursTypeSelectionScreen';
import CatalogManagementScreen from '../screens/CatalogManagementScreen';
import SubscriptionScreen from '../screens/account/SubscriptionScreen';
import PaymentMethodsAdminScreen from '../screens/admin/PaymentMethodsAdminScreen';
import PromoCodeScreen from '../screens/account/PromoCodeScreen';
import WalletScreen from '../screens/account/WalletScreen';
import WithdrawScreen from '../screens/account/WithdrawScreen';
import { WelcomeScreen, ContestPickerScreen } from '../prep/screens/OnboardingScreens';
import { ModuleScreen, LessonScreen } from '../prep/screens/ModuleLessonScreens';
import SessionScreen from '../prep/screens/SessionScreen';
import ReviewsScreen from '../prep/screens/ReviewsScreen';
import { RankingScreen, CandidateScreen } from '../prep/screens/ProgressScreens';
import { MockIntroScreen, ProgramInfoScreen, PrepSubscriptionScreen } from '../prep/screens/ExtraScreens';
import { usePreferences } from '../context/PreferencesContext';
import usePrep from '../prep/store';
import theme from '../theme/tokens';

// Écrans hiérarchiques : glissent depuis la droite. Lecteurs plein écran (leçon, session) :
// montée depuis le bas, sans geste de retour accidentel (quitter demande confirmation, § 5.3).
const push = { animation: 'slide_from_right' };
const reader = { animation: 'slide_from_bottom', gestureEnabled: false };
const sheet = { animation: 'slide_from_bottom' };

const Stack = createNativeStackNavigator();

const RootNavigator = () => {
  const { preferences, isPreferencesReady } = usePreferences();
  const prepReady = usePrep((s) => s.ready);
  const onboardingDone = usePrep((s) => s.onboarding.fait);

  if (!isPreferencesReady || !prepReady) {
    return <View style={{ flex: 1, backgroundColor: theme.brand.paper }} />;
  }

  // « Que veux-tu faire ? » n'apparaît qu'au premier lancement (§ 6.1) ; les utilisateurs
  // ayant déjà fait l'ancienne orientation arrivent directement sur les onglets.
  const firstLaunch = !onboardingDone && !preferences.hasCompletedOrientation;

  return (
    <Stack.Navigator
      initialRouteName={firstLaunch ? 'Orientation' : 'MainTabs'}
      screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: theme.brand.paper } }}
    >
      <Stack.Screen name="Orientation" component={WelcomeScreen} />
      <Stack.Screen name="MainTabs" component={TabNavigator} />

      {/* ── Préparation ── */}
      <Stack.Screen name="PrepContestPicker" component={ContestPickerScreen} options={push} />
      <Stack.Screen name="PrepModule" component={ModuleScreen} options={push} />
      <Stack.Screen name="PrepLesson" component={LessonScreen} options={reader} />
      <Stack.Screen name="PrepSession" component={SessionScreen} options={reader} />
      <Stack.Screen name="PrepReviews" component={ReviewsScreen} options={push} />
      <Stack.Screen name="PrepRanking" component={RankingScreen} options={push} />
      <Stack.Screen name="PrepCandidate" component={CandidateScreen} options={push} />
      <Stack.Screen name="PrepMockIntro" component={MockIntroScreen} options={sheet} />
      <Stack.Screen name="PrepProgramInfo" component={ProgramInfoScreen} options={push} />
      <Stack.Screen name="PrepSubscription" component={PrepSubscriptionScreen} options={sheet} />

      {/* ── Anciens sujets (parcours existant, inchangé) ── */}
      <Stack.Screen name="EstablishmentSelection" component={SelectionScreen} options={push} />
      <Stack.Screen name="ContestSelection" component={SelectionScreen} options={push} />
      <Stack.Screen name="ParcoursTypeSelection" component={ParcoursTypeSelectionScreen} options={push} />
      <Stack.Screen name="DynamicCatalog" component={DynamicCatalogScreen} options={push} />
      <Stack.Screen name="ContestDocuments" component={ContestDocumentsScreen} options={push} />
      <Stack.Screen name="DocumentDetail" component={DocumentDetailScreen} options={push} />
      <Stack.Screen name="BulkDownload" component={BulkDownloadScreen} options={push} />

      {/* ── Moi : compte, téléchargements, réglages, administration ── */}
      <Stack.Screen name="Downloads" component={DownloadsScreen} options={push} />
      <Stack.Screen name="Register" component={RegisterScreen} options={push} />
      <Stack.Screen name="Login" component={LoginScreen} options={push} />
      <Stack.Screen name="Subscription" component={SubscriptionScreen} options={push} />
      <Stack.Screen name="PromoCode" component={PromoCodeScreen} options={push} />
      <Stack.Screen name="Wallet" component={WalletScreen} options={push} />
      <Stack.Screen name="Withdraw" component={WithdrawScreen} options={push} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={push} />
      <Stack.Screen name="AdminTab" component={AdminDraftsScreen} options={push} />
      <Stack.Screen name="CatalogManagement" component={CatalogManagementScreen} options={push} />
      <Stack.Screen name="AdminPaymentMethods" component={PaymentMethodsAdminScreen} options={push} />
      <Stack.Screen name="AdminTrash" component={AdminTrashScreen} options={push} />
      <Stack.Screen name="Upload" component={UploadScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="EditDraft" component={EditDraftScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="CorrectionUpload" component={CorrectionUploadScreen} options={{ presentation: 'modal' }} />
    </Stack.Navigator>
  );
};

export default RootNavigator;
