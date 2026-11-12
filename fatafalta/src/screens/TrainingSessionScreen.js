import Skeleton, { SkeletonRows } from '../components/ui/Skeleton';
import Pressable from '../components/ui/FeedbackPressable';
import StatusBar from '../theme/ThemeStatusBar';
import { useTheme, createThemedStyles } from '../theme/ThemeProvider';

import { getUserMessage } from '../utils/userMessages';
import React, { useMemo, useState } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Lightbulb,
  RefreshCcw,
  X,
  XCircle,
} from 'lucide-react-native';
import Text from '../components/ui/Text';
import { PrepButton } from '../prep/ui/primitives';
import { useTrainingQuestions } from '../hooks/useTrainingQuestions';
import { answerTrainingQuestion } from '../services/orientation';
import { usePreferences } from '../context/PreferencesContext';

const TrainingSessionScreen = ({ navigation, route }) => {
  const { theme, trainingFeedback } = useTheme();
  const { styles } = useStyles();
  const insets = useSafeAreaInsets();
  const { preferences } = usePreferences();
  const contest = route.params?.contest || preferences.contest;
  const contestId = contest?._id;
  const { data: questions = [], isLoading, isError, refetch, error: loadError } = useTrainingQuestions(contestId);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);

  const question = questions[currentIndex];
  const progress = useMemo(() => {
    if (!questions.length) return 0;
    return ((currentIndex + (feedback ? 1 : 0)) / questions.length) * 100;
  }, [currentIndex, feedback, questions.length]);

  const exitToLibrary = () => {
    navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
  };

  const submitAnswer = async () => {
    if (selectedIndex === null || isChecking || !question) return;
    setIsChecking(true);

    try {
      const answer = await answerTrainingQuestion(question._id, selectedIndex);
      setFeedback(answer);
      if (answer.isCorrect) {
        setCorrectCount((count) => count + 1);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      }
    } finally {
      setIsChecking(false);
    }
  };

  const nextQuestion = () => {
    if (currentIndex + 1 >= questions.length) {
      setCurrentIndex(questions.length);
      return;
    }
    setCurrentIndex((index) => index + 1);
    setSelectedIndex(null);
    setFeedback(null);
  };

  const restart = () => {
    setCurrentIndex(0);
    setSelectedIndex(null);
    setFeedback(null);
    setCorrectCount(0);
  };

  if (isLoading) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.loadingScreen}>
        <StatusBar barStyle="dark-content" />
        <Skeleton width="90%" height={64} style={{ marginVertical: 24 }} />
        <SkeletonRows count={4} withMeta={false} />
        <Text variant="body" color={theme.colors.textSecondary} style={styles.loadingText}>Préparation de ton entraînement…</Text>
      </ScrollView>
    );
  }

  if (isError || !contest) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={[styles.loadingScreen, { paddingTop: insets.top }]}>
        <XCircle size={36} color={theme.colors.error} />
        <Text variant="h2" style={styles.errorTitle}>Entraînement indisponible</Text>
        <Text variant="body" color={theme.colors.textSecondary} align="center">{isError ? getUserMessage(loadError, 'entrainement').message : 'Choisis un concours dans la bibliothèque pour commencer.'}</Text>
        <PrepButton title={isError ? 'Réessayer' : 'Retour à la bibliothèque'} onPress={isError ? refetch : exitToLibrary} />
      </ScrollView>
    );
  }

  if (!questions.length) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={[styles.loadingScreen, { paddingTop: insets.top }]}>
        <View style={styles.emptyBadge}><Lightbulb size={26} color={theme.colors.primary} /></View>
        <Text variant="h2" style={styles.errorTitle}>Aucun exercice disponible</Text>
        <Text variant="body" color={theme.colors.textSecondary} align="center" style={styles.emptyCopy}>
          Aucun exercice interactif n’est disponible pour {contest.name}. Consulte les sujets pour poursuivre ta préparation.
        </Text>
        <PrepButton title="Voir les sujets disponibles" onPress={exitToLibrary} />
      </ScrollView>
    );
  }

  const isCompleted = currentIndex >= questions.length;
  if (isCompleted) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={[styles.completedScreen, { paddingTop: insets.top + theme.spacing['3xl'], paddingBottom: Math.max(insets.bottom, theme.spacing.lg) }]}>
        <View style={styles.completedOrb}><CheckCircle2 size={38} color={theme.colors.primary} strokeWidth={2.15} /></View>
        <Text variant="h1" align="center" style={styles.completedTitle}>Belle session !</Text>
        <Text variant="body" color={theme.colors.textSecondary} align="center" style={styles.completedCopy}>
          Tu as obtenu {correctCount} bonne{correctCount > 1 ? 's' : ''} réponse{correctCount > 1 ? 's' : ''} sur {questions.length}.
        </Text>
        <View style={styles.scoreCard}>
          <Text variant="overline" color={theme.colors.primary}>Ton score</Text>
          <Text variant="h1" color={theme.colors.primary} style={styles.score}>{Math.round((correctCount / questions.length) * 100)}%</Text>
        </View>
        <View style={styles.completedActions}>
          <PrepButton title="Recommencer" iconLeft={RefreshCcw} onPress={restart} />
          <PrepButton title="Retour aux sujets" variant="secondary" onPress={exitToLibrary} />
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.trainingContent, { paddingTop: insets.top + theme.spacing.sm, paddingBottom: Math.max(insets.bottom, theme.spacing.md) }]}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <View style={styles.topBar}>
        <Pressable
          style={styles.roundButton}
          onPress={() => (navigation.canGoBack() ? navigation.goBack() : exitToLibrary())}
          accessibilityLabel="Retour"
        >
          <ArrowLeft size={20} color={theme.colors.textPrimary} strokeWidth={2.2} />
        </Pressable>
        <View style={styles.trainingLabel}>
          <View style={styles.trainingDot} />
          <Text variant="caption" color={theme.colors.primaryDark}>{contest.name}</Text>
        </View>
        <Pressable style={styles.roundButton} onPress={exitToLibrary} accessibilityLabel="Quitter l’entraînement">
          <X size={20} color={theme.colors.textPrimary} strokeWidth={2.2} />
        </Pressable>
      </View>

      <View style={styles.progressRow}>
        <Text variant="caption" color={theme.colors.textSecondary}>Question {currentIndex + 1} sur {questions.length}</Text>
        <Text variant="caption" color={theme.colors.primary}>{Math.round(progress)}%</Text>
      </View>
      <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress}%` }]} /></View>

      <View style={styles.questionCard}>
        <View style={styles.questionLabel}><Text variant="overline" color={theme.colors.primary}>À toi de jouer</Text></View>
        <Text variant="h2" style={styles.question}>{question.question}</Text>
      </View>

      <View style={styles.answers}>
        {question.options.map((option, index) => {
          const isSelected = selectedIndex === index;
          const isCorrect = feedback?.correctIndex === index;
          const isWrongSelection = feedback && isSelected && !feedback.isCorrect;
          return (
            <Pressable
              key={`${question._id}-${index}`}
              onPress={() => !feedback && setSelectedIndex(index)}
              disabled={Boolean(feedback)}
              style={({ pressed }) => [
                styles.answer,
                isSelected && styles.answerSelected,
                isCorrect && styles.answerCorrect,
                isWrongSelection && styles.answerWrong,
                pressed && !feedback && styles.answerPressed,
              ]}
            >
              <View style={[styles.answerMarker, isSelected && styles.answerMarkerSelected, isCorrect && styles.answerMarkerCorrect, isWrongSelection && styles.answerMarkerWrong]}>
                {isCorrect ? <Check size={15} color={theme.colors.textInverse} strokeWidth={2.2} /> : isWrongSelection ? <X size={15} color={theme.colors.textInverse} strokeWidth={2.2} /> : <Text variant="caption" color={isSelected ? theme.colors.primary : theme.colors.textMuted}>{String.fromCharCode(65 + index)}</Text>}
              </View>
              <Text variant="bodyMedium" color={theme.colors.textPrimary} style={styles.answerText}>{option}</Text>
            </Pressable>
          );
        })}
      </View>

      {feedback && (
        <View style={[styles.feedback, feedback.isCorrect ? styles.feedbackCorrect : styles.feedbackWrong]}>
          {feedback.isCorrect ? <CheckCircle2 size={20} color={theme.colors.success} /> : <Lightbulb size={20} color={trainingFeedback.hint} />}
          <View style={styles.feedbackCopy}>
            <Text variant="bodyMedium" color={feedback.isCorrect ? trainingFeedback.correct : trainingFeedback.hintText}>{feedback.isCorrect ? 'Bonne réponse !' : 'À retenir'}</Text>
            {feedback.explanation ? <Text variant="caption" color={feedback.isCorrect ? trainingFeedback.correctText : trainingFeedback.hintText} style={styles.explanation}>{feedback.explanation}</Text> : null}
          </View>
        </View>
      )}

      <View style={styles.actionArea}>
        {!feedback ? (
          <PrepButton title="Vérifier ma réponse" onPress={submitAnswer} disabled={selectedIndex === null || isChecking} loading={isChecking} />
        ) : (
          <PrepButton onPress={nextQuestion} title={currentIndex + 1 === questions.length ? 'Voir mon résultat' : 'Question suivante'} />
        )}
      </View>
    </ScrollView>
  );
};

export default TrainingSessionScreen;

const useStyles = createThemedStyles(({ theme, trainingFeedback }) => {
  const styles = StyleSheet.create({
    container: { ...theme.layout.readingFrame, flex: 1, paddingHorizontal: theme.spacing.lg, backgroundColor: theme.brand.paper },
    trainingContent: { flexGrow: 1 },
    loadingScreen: { flexGrow: 1, paddingVertical: 24, alignItems: 'center', justifyContent: 'center', paddingHorizontal: theme.spacing['3xl'], backgroundColor: theme.brand.paper },
    loadingText: { marginTop: theme.spacing.md },
    errorTitle: { marginTop: theme.spacing.md, marginBottom: theme.spacing.sm, textAlign: 'center' },
    emptyBadge: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: theme.colors.primaryWash },
    emptyCopy: { marginTop: theme.spacing.sm },
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    roundButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.borderLight },
    trainingLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '58%', paddingHorizontal: 11, paddingVertical: 7, borderRadius: theme.radius.full, backgroundColor: theme.colors.primaryWash },
    trainingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.brand.night },
    progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: theme.spacing['2xl'], marginBottom: theme.spacing.sm },
    progressTrack: { height: 7, borderRadius: 99, overflow: 'hidden', backgroundColor: theme.brand.line },
    progressFill: { height: '100%', borderRadius: 99, backgroundColor: theme.brand.night },
    questionCard: { marginTop: theme.spacing['3xl'], padding: theme.spacing.xl, borderRadius: 26, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: trainingFeedback.questionBorder, shadowColor: trainingFeedback.questionShadow, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 22, elevation: 2 },
    questionLabel: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 5, borderRadius: theme.radius.full, backgroundColor: theme.colors.primaryWash },
    question: { marginTop: theme.spacing.lg, fontSize: 21, lineHeight: 29, letterSpacing: -0.35 },
    answers: { gap: theme.spacing.sm, marginTop: theme.spacing.xl },
    answer: { minHeight: 62, flexDirection: 'row', alignItems: 'center', padding: theme.spacing.md, borderRadius: 18, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.borderLight },
    answerPressed: { transform: [{ scale: 0.99 }], backgroundColor: theme.brand.paperDim },
    answerSelected: { borderColor: theme.colors.primary, backgroundColor: theme.brand.paperDim },
    answerCorrect: { borderColor: trainingFeedback.correctBorder, backgroundColor: trainingFeedback.correctWash },
    answerWrong: { borderColor: trainingFeedback.wrongBorder, backgroundColor: trainingFeedback.wrongWash },
    answerMarker: { minWidth: 30, minHeight: 30, padding: 5, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: theme.brand.paperDim },
    answerMarkerSelected: { backgroundColor: theme.colors.primary100 },
    answerMarkerCorrect: { backgroundColor: theme.colors.successSolid },
    answerMarkerWrong: { backgroundColor: theme.colors.errorSolid },
    answerText: { flex: 1, marginLeft: theme.spacing.md },
    feedback: { flexDirection: 'row', padding: theme.spacing.md, marginTop: theme.spacing.md, borderRadius: 17, borderWidth: 1 },
    feedbackCorrect: { backgroundColor: trainingFeedback.correctWash, borderColor: trainingFeedback.feedbackBorder },
    feedbackWrong: { backgroundColor: trainingFeedback.hintWash, borderColor: trainingFeedback.hintBorder },
    feedbackCopy: { flex: 1, marginLeft: theme.spacing.sm },
    explanation: { marginTop: 2, lineHeight: 18 },
    actionArea: { marginTop: 'auto', paddingTop: theme.spacing.lg },
    completedScreen: { flexGrow: 1, alignItems: 'center', paddingHorizontal: theme.spacing.xl, backgroundColor: theme.brand.paper },
    completedOrb: { width: 82, height: 82, alignItems: 'center', justifyContent: 'center', borderRadius: 29, backgroundColor: theme.colors.primaryWash, borderWidth: 1, borderColor: theme.colors.primary200 },
    completedTitle: { marginTop: theme.spacing.xl, fontSize: 31, letterSpacing: -0.8 },
    completedCopy: { marginTop: theme.spacing.sm, maxWidth: 280 },
    scoreCard: { alignSelf: 'stretch', alignItems: 'center', paddingVertical: theme.spacing.xl, marginTop: theme.spacing['3xl'], borderRadius: 24, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.borderLight },
    score: { marginTop: 2, fontSize: 42, lineHeight: 49, letterSpacing: -1.2 },
    completedActions: { alignSelf: 'stretch', gap: theme.spacing.sm, marginTop: 'auto' },
  });
  return { styles };
});
