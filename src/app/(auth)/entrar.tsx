import { Link } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { ApiError } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/theme/use-theme';

export default function EntrarScreen() {
  const theme = useTheme();
  const { signIn } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError('');
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Não foi possível entrar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <View style={{ gap: 4, marginTop: 40, marginBottom: 12 }}>
        <AppText variant="mono" size={11} muted>
          dinheiro é tempo
        </AppText>
        {/* A marca é a mesma da barra de status do design: condensada, itálica
            e com o ponto final — "minhas." */}
        <AppText variant="condensed" size={44}>
          MINHAS.
        </AppText>
        <AppText muted>Entre pra ver seu dinheiro.</AppText>
      </View>

      <Field
        label="E-mail"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="voce@email.com"
      />
      <Field
        label="Senha"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="••••••••"
      />

      {error ? <AppText color={theme.negative}>{error}</AppText> : null}

      <Button title="Entrar" onPress={handleSubmit} loading={loading} />

      <Link href="/cadastro" style={{ marginTop: 4 }}>
        <AppText muted>
          Não tem conta? <AppText color={theme.accent}>Criar agora</AppText>
        </AppText>
      </Link>
    </Screen>
  );
}
