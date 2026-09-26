import React from 'react';
import { StyleSheet, View } from 'react-native';
import Text from '../ui/Text';
import theme from '../../theme/tokens';

const SOFT = '#4F5E72';

const DocumentMeta = ({ document, style }) => {
  const items = [
    document.institution?.abbreviation || document.institution?.name,
    document.university?.abbreviation || document.university?.name,
    document.level?.name,
    document.semester?.name,
    document.department?.name,
    ...(document.taxonomyNodes || []).map((node) => node?.name),
  ].filter(Boolean);

  if (!items.length) return null;

  return (
    <View style={[styles.container, style]}>
      {items.map((item, index) => (
        <React.Fragment key={`${item}-${index}`}>
          {index > 0 ? <Text style={styles.separator}>·</Text> : null}
          <Text variant="caption" style={styles.item} numberOfLines={1}>{item}</Text>
        </React.Fragment>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 5, rowGap: 2 },
  item: { maxWidth: '85%', color: SOFT, fontFamily: theme.fontFamily.medium, fontSize: 11, lineHeight: 16 },
  separator: { color: SOFT, fontSize: 11, lineHeight: 16 },
});

export default DocumentMeta;
