import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { updateMe } from '@/api';
import { ApiError } from '@/api/client';
import { Titulo } from '@/components/ng/titulo';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { useSession } from '@/hooks/use-session';
import { centsFromDigits, formatMoney, previewTimeCost } from '@/lib/format';
import { chipForeground, chipSkin } from '@/theme/style';
import { useTheme } from '@/theme/use-theme';

export default function PerfilScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user, refresh, signOut } = useSession();
  const [modo, setModo] = useState<'work' | 'allowance'>('work');
  const [rateDigits, setRateDigits] = useState('');
  const [workday, setWorkday] = useState('8');
  const [mesadaDigits, setMesadaDigits] = useState('');
  const [periodo, setPeriodo] = useState<'week' | 'month'>('month');
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.hourly_rate_cents) setRateDigits(String(user.hourly_rate_cents));
    if (user?.workday_hours) setWorkday(String(user.workday_hours));
    if (user?.allowance_cents) setMesadaDigits(String(user.allowance_cents));
    if (user?.income_mode) setModo(user.income_mode);
    if (user?.allowance_period) setPeriodo(user.allowance_period);
  }, [user]);

  const rateCents = centsFromDigits(rateDigits);
  const mesadaCents = centsFromDigits(mesadaDigits);

  // A prévia com um gasto concreto: um número abstrato não convence ninguém de
  // que a conta faz sentido, mas "R$ 50 = 5 dias de mesada" convence na hora.
  const exemplo = previewTimeCost(5_000, {
    income_mode: modo,
    hourly_rate_cents: rateCents,
    workday_hours: parseInt(workday, 10) || 8,
    allowance_cents: mesadaCents,
    allowance_period: periodo,
  });

  async function handleSave() {
    setStatus('');
    setSaving(true);
    try {
      await updateMe({
        income_mode: modo,
        hourly_rate_cents: rateCents || null,
        workday_hours: Math.min(24, Math.max(1, parseInt(workday, 10) || 8)),
        allowance_cents: mesadaCents || null,
        allowance_period: periodo,
      });
      await refresh();
      setStatus('Salvo.');
    } catch (e) {
      setStatus(e instanceof ApiError ? e.message : 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  }

  function confirmarSaida() {
    Alert.alert('Sair da conta?', 'Você vai precisar entrar de novo com email e senha.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => void signOut() },
    ]);
  }

  return (
    <Screen>
      <Titulo chapeu="quem é você aqui" titulo="perfil" />

      <Card destaque style={{ gap: 4 }}>
        <AppText variant="label" muted size={10} style={{ textTransform: 'uppercase' }}>
          conta
        </AppText>
        <AppText variant="condensed" size={20}>
          {(user?.name || 'sem nome').toUpperCase()}
        </AppText>
        <AppText variant="mono" size={12} muted>
          {user?.email}
        </AppText>
      </Card>

      <Card style={{ gap: 14 }}>
        <View style={{ gap: 2 }}>
          <AppText variant="label" muted size={10} style={{ textTransform: 'uppercase' }}>
            de onde vem seu dinheiro
          </AppText>
          <AppText muted size={13}>
            É com isso que o app traduz cada gasto: nem todo mundo troca horas por dinheiro, e
            dizer "2 horas de trabalho" pra quem recebe mesada seria mentira.
          </AppText>
        </View>

        {/* A escolha vem antes dos campos de propósito: ela decide quais campos
            fazem sentido, e mostrar os dois conjuntos juntos seria pedir que a
            pessoa ignorasse metade da tela. */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {([
            { valor: 'work', rotulo: 'Eu trabalho' },
            { valor: 'allowance', rotulo: 'Recebo mesada' },
          ] as const).map((opcao) => {
            const ativo = opcao.valor === modo;
            return (
              <Pressable
                key={opcao.valor}
                onPress={() => setModo(opcao.valor)}
                style={[
                  chipSkin(theme, ativo),
                  { flex: 1, paddingVertical: 10, alignItems: 'center' },
                ]}
              >
                <AppText variant="title" size={13} color={chipForeground(theme, ativo)}>
                  {opcao.rotulo}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        {modo === 'work' ? (
          <>
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
          </>
        ) : (
          <>
            <Field
              label="Quanto você recebe"
              value={mesadaCents ? formatMoney(mesadaCents) : ''}
              onChangeText={(text) => setMesadaDigits(text.replace(/\D/g, ''))}
              keyboardType="number-pad"
              placeholder="R$ 0,00"
            />
            <View style={{ gap: 8 }}>
              <AppText variant="label" muted style={{ textTransform: 'uppercase' }}>
                De quanto em quanto tempo
              </AppText>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {([
                  { valor: 'week', rotulo: 'Por semana' },
                  { valor: 'month', rotulo: 'Por mês' },
                ] as const).map((opcao) => {
                  const ativo = opcao.valor === periodo;
                  return (
                    <Pressable
                      key={opcao.valor}
                      onPress={() => setPeriodo(opcao.valor)}
                      style={[
                        chipSkin(theme, ativo),
                        { flex: 1, paddingVertical: 9, alignItems: 'center' },
                      ]}
                    >
                      <AppText size={13} color={chipForeground(theme, ativo)}>
                        {opcao.rotulo}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </>
        )}

        {/* A prova de que a conta faz sentido, com um número que existe. */}
        {exemplo ? (
          <AppText variant="mono" size={12} color={theme.positive}>
            um gasto de R$ 50,00 vira ≈ {exemplo}
          </AppText>
        ) : null}

        {status ? <AppText muted>{status}</AppText> : null}
        <Button title="Salvar" onPress={handleSave} loading={saving} />
      </Card>

      {/* O Atalho fica logo abaixo da configuração de propósito: é aqui que a
          frase "quanto isso custou de você" acabou de ser ajustada, e o Atalho
          é o jeito mais rápido de alimentar essa conta. */}
      <Button
        title="Atalho do iPhone · lançar em 2 toques"
        variant="ghost"
        onPress={() => router.push('/atalho')}
      />
      <Button title="Minhas contas" variant="ghost" onPress={() => router.push('/contas')} />
      <Button title="O que se repete todo mês" variant="ghost" onPress={() => router.push('/recorrentes')} />
      <Button title="Aparência" variant="ghost" onPress={() => router.push('/temas')} />
      {/* Sair pede confirmação porque o caminho de volta é digitar a senha, e
          o botão fica logo abaixo de outros dois que só navegam. */}
      <Button title="Sair da conta" variant="danger" onPress={confirmarSaida} />

      <AppText variant="hand" muted size={15} style={{ textAlign: 'center' }}>
        @{user?.name?.split(' ')[0]?.toLowerCase() ?? 'você'}
      </AppText>
    </Screen>
  );
}
