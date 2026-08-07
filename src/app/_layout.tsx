import {
  IBMPlexMono_600SemiBold,
  useFonts as usePlexMono,
} from '@expo-google-fonts/ibm-plex-mono';
import { Inter_400Regular, Inter_500Medium, useFonts as useInter } from '@expo-google-fonts/inter';
import {
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold,
  useFonts as useGrotesk,
} from '@expo-google-fonts/space-grotesk';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SessionProvider, useSession } from '@/hooks/use-session';
import { useTheme } from '@/theme/use-theme';

function RootNavigator() {
  const { user, loading } = useSession();
  const theme = useTheme();

  // Enquanto o token é lido do armazenamento não dá pra saber se a pessoa está
  // logada. Renderizar as rotas antes disso faria a tela de login piscar a cada
  // abertura do app, mesmo pra quem nunca deslogou.
  if (loading) {
    return <View style={{ flex: 1, backgroundColor: theme.bg }} />;
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }}>
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="nova-transacao" options={{ presentation: 'modal' }} />
        <Stack.Screen name="contas" />
      </Stack.Protected>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [groteskReady] = useGrotesk({ SpaceGrotesk_500Medium, SpaceGrotesk_700Bold });
  const [interReady] = useInter({ Inter_400Regular, Inter_500Medium });
  const [monoReady] = usePlexMono({ IBMPlexMono_600SemiBold });

  if (!groteskReady || !interReady || !monoReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SessionProvider>
          <StatusBar style="light" />
          <RootNavigator />
        </SessionProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
