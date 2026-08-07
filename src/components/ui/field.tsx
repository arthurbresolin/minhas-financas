import { TextInput, View, type TextInputProps } from 'react-native';

import { AppText } from '@/components/ui/text';
import { FONTS } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

type Props = TextInputProps & { label: string };

export function Field({ label, style, ...rest }: Props) {
  const theme = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <AppText variant="label" muted style={{ textTransform: 'uppercase' }}>
        {label}
      </AppText>
      <TextInput
        placeholderTextColor={theme.textMuted}
        style={[
          {
            backgroundColor: theme.surfaceAlt,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: theme.border,
            paddingHorizontal: 14,
            paddingVertical: 13,
            color: theme.text,
            fontFamily: FONTS.body,
            fontSize: 15,
          },
          style,
        ]}
        {...rest}
      />
    </View>
  );
}
