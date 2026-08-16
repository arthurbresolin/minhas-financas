import { Anton_400Regular, useFonts as useAnton } from '@expo-google-fonts/anton';
import { Archivo_900Black_Italic, useFonts as useArchivo } from '@expo-google-fonts/archivo';
import { Caveat_700Bold, useFonts as useCaveat } from '@expo-google-fonts/caveat';
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
import { isLight } from '@/theme/style';
import { ThemeProvider, useTheme } from '@/theme/use-theme';

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
    <>
      {/* Nem todo tema é escuro: no CHERRY e no ICE o relógio branco do sistema
          sumiria no fundo claro. Quem manda é a luminância do fundo do tema. */}
      <StatusBar style={isLight(theme) ? 'dark' : 'light'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }}>
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="nova-transacao" options={{ presentation: 'modal' }} />
        <Stack.Screen name="contas" />
        <Stack.Screen name="temas" />
        <Stack.Screen name="tema-editor" />
      </Stack.Protected>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [groteskReady] = useGrotesk({ SpaceGrotesk_500Medium, SpaceGrotesk_700Bold });
  const [interReady] = useInter({ Inter_400Regular, Inter_500Medium });
  const [monoReady] = usePlexMono({ IBMPlexMono_600SemiBold });
  // Do design NG.cash: condensada itálica pros títulos, Anton pro número
  // gigante do saldo e a manuscrita pros rabiscos.
  const [archivoReady] = useArchivo({ Archivo_900Black_Italic });
  const [antonReady] = useAnton({ Anton_400Regular });
  const [caveatReady] = useCaveat({ Caveat_700Bold });

  if (!groteskReady || !interReady || !monoReady || !archivoReady || !antonReady || !caveatReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {/* Sessão por fora do tema: o tema ativo é do usuário logado, então o
            provider de tema precisa conseguir ler a sessão. */}
        <SessionProvider>
          <ThemeProvider>
            <RootNavigator />
          </ThemeProvider>
        </SessionProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
