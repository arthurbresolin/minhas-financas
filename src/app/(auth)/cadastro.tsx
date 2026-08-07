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

export default function CadastroScreen() {
  const theme = useTheme();
  const { signUp } = useSession();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (password.length < 8) {
      setError('A senha precisa ter pelo menos 8 caracteres.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await signUp(email.trim(), password, name.trim());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Não foi possível criar a conta.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <View style={{ gap: 6, marginTop: 40, marginBottom: 12 }}>
        <AppText variant="display">Criar conta</AppText>
        <AppText muted>Leva menos de um minuto.</AppText>
      </View>

      <Field label="Nome" value={name} onChangeText={setName} placeholder="Como te chamar" />
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
        placeholder="mínimo 8 caracteres"
      />

      {error ? <AppText color={theme.negative}>{error}</AppText> : null}

      <Button title="Criar conta" onPress={handleSubmit} loading={loading} />

      <Link href="/entrar" style={{ marginTop: 4 }}>
        <AppText muted>
          Já tem conta? <AppText color={theme.accent}>Entrar</AppText>
        </AppText>
      </Link>
    </Screen>
  );
}
