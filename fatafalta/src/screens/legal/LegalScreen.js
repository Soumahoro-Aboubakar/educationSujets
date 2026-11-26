import React from 'react';
import { StyleSheet, View } from 'react-native';
import { FileText, Mail } from 'lucide-react-native';
import { Linking } from 'react-native';
import Text from '../../components/ui/Text';
import ScreenHeader from '../../components/ui/ScreenHeader';
import { AccountScroll, Row, Section } from '../../components/account/AccountLayout';
import { createThemedStyles } from '../../theme/ThemeProvider';
import { LEGAL_DOCUMENTS, openLegal } from '../../utils/legalLinks';

/** Informations légales : liens vers les pages officielles du site (aucune copie native). */
const LegalScreen = ({ navigation }) => {
  const { styles } = useStyles();
  return (
    <View style={styles.container}>
      <ScreenHeader title="Informations légales" onBack={() => navigation.goBack()} />
      <AccountScroll>
        <Text variant="body" style={styles.intro}>
          Les documents en vigueur sont publiés sur fatafalta.com. Ils s’ouvrent ici, et tu reviens à l’application en les fermant.
        </Text>
        <Section>
          {LEGAL_DOCUMENTS.map((doc, i) => (
            <Row
              key={doc.slug}
              icon={FileText}
              label={doc.titre}
              hint={doc.resume}
              onPress={() => openLegal(doc.slug)}
              isLast={i === LEGAL_DOCUMENTS.length - 1}
            />
          ))}
        </Section>
        <Section title="Une question ?">
          <Row icon={Mail} label="contact@fatafalta.com" hint="Données personnelles, sécurité, droits d’auteur" onPress={() => Linking.openURL('mailto:contact@fatafalta.com').catch(() => {})} isLast />
        </Section>
      </AccountScroll>
    </View>
  );
};

export default LegalScreen;

const useStyles = createThemedStyles(({ brand, theme }) => ({
  styles: StyleSheet.create({
    container: { ...theme.layout.readingFrame, flex: 1, backgroundColor: brand.paper },
    intro: { color: brand.inkSoft, marginBottom: 20, lineHeight: 22 },
  }),
}));
