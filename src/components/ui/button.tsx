import { ActivityIndicator, Pressable, type PressableProps, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/text';
import { useTheme } from '@/theme/use-theme';

type Props = Omit<PressableProps, 'style'> & {
  title: string;
  variant?: 'primary' | 'ghost' | 'danger';
  loading?: boolean;
  style?: ViewStyle;
};

export function Button({ title, variant = 'primary', loading, disabled, style, ...rest }: Props) {
  const theme = useTheme();
  const isPrimary = variant === 'primary';
  const background = isPrimary ? theme.accent : 'transparent';
  const foreground =
    variant === 'primary' ? theme.onAccent : variant === 'danger' ? theme.negative : theme.text;

  return (
    <Pressable
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          backgroundColor: background,
          borderRadius: theme.radius,
          borderWidth: isPrimary ? 0 : 1,
          borderColor: variant === 'danger' ? theme.negative : theme.border,
          paddingVertical: 15,
          paddingHorizontal: 20,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
        },
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <AppText variant="title" size={15} color={foreground}>
          {title}
        </AppText>
      )}
    </Pressable>
  );
}
