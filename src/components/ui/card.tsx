import { View, type ViewProps } from 'react-native';

import { useTheme } from '@/theme/use-theme';

type Props = ViewProps & { alt?: boolean; padded?: boolean };

export function Card({ alt, padded = true, style, ...rest }: Props) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: alt ? theme.surfaceAlt : theme.surface,
          borderRadius: theme.radius,
          borderWidth: 1,
          borderColor: theme.border,
          padding: padded ? 16 : 0,
        },
        style,
      ]}
      {...rest}
    />
  );
}
