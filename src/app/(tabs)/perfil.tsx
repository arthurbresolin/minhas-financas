import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { updateMe } from '@/api';
import { ApiError } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { useSession } from '@/hooks/use-session';
import { centsFromDigits, formatMoney } from '@/lib/format';
import { useTheme } from '@/theme/use-theme';

export default function PerfilScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user, signOut, refresh } = useSession();
  const [rateDigits, setRateDigits] = useState('');
  const [workday, setWorkday] = useState('8');
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.hourly_rate_cents) setRateDigits(String(user.hourly_rate_cents));
    if (user?.workday_hours) setWorkday(String(user.workday_hours));
  }, [user]);

  const rateCents = centsFromDigits(rateDigits);

  async function handleSave() {
    setStatus('');
    setSaving(true);
    try {
      await updateMe({
        hourly_rate_cents: rateCents || null,
        workday_hours: Math.min(24, Math.max(1, parseInt(workday, 10) || 8)),
      });
      await refresh();
      setStatus('Salvo.');
    } catch (e) {
      setStatus(e instanceof ApiError ? e.message : 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <AppText variant="display">Perfil</AppText>

      <Card style={{ gap: 4 }}>
        <AppText variant="label" muted style={{ textTransform: 'uppercase' }}>
          Conta
        </AppText>
        <AppText variant="title">{user?.name || 'Sem nome'}</AppText>
        <AppText muted>{user?.email}</AppText>
      </Card>

      <Card style={{ gap: 14 }}>
        <View style={{ gap: 2 }}>
          <AppText variant="label" muted style={{ textTransform: 'uppercase' }}>
            Tempo de trabalho
          </AppText>
          <AppText muted size={13}>
            Com quanto vale sua hora, o app mostra cada gasto também em horas e dias
            de trabalho.
          </AppText>
        </View>

        <Field
          label="Quanto vale sua hora"
          value={rateCents ? formatMoney(rateCents) : ''}
          onChangeText={(text) => setRateDigits(text.replace(/\D/g, ''))}
          keyboardType="number-pad"
          placeholder="R$ 0,00"
        />
        <Field
          label="Horas por dia de trabalho"
          value={workday}
          onChangeText={(text) => setWorkday(text.replace(/\D/g, '').slice(0, 2))}
          keyboardType="number-pad"
          placeholder="8"
        />

        {status ? <AppText muted>{status}</AppText> : null}
        <Button title="Salvar" onPress={handleSave} loading={saving} />
      </Card>

      <Button title="Minhas contas" variant="ghost" onPress={() => router.push('/contas')} />
      <Button title="Sair" variant="danger" onPress={() => void signOut()} />

      <AppText muted size={12} style={{ textAlign: 'center' }}>
        Tema: {theme.name} · a edição de temas chega no próximo bloco.
      </AppText>
    </Screen>
  );
}
