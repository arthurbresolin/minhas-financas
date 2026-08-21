import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, RefreshControl, View } from 'react-native';

import { depositGoal, listGoals, type Goal } from '@/api';
import { ApiError } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MoneyInput } from '@/components/ui/money-input';
import { Fill } from '@/components/ui/motion';
import { Screen } from '@/components/ui/screen';
import { Sheet } from '@/components/ui/sheet';
import { AppText } from '@/components/ui/text';
import { centsFromDigits, formatMoney } from '@/lib/format';
import { alpha, chipForeground, chipSkin } from '@/theme/style';
import { useTheme } from '@/theme/use-theme';

/** Atalhos de valor: a maior parte dos depósitos é um número redondo. */
const ATALHOS = [1_000, 5_000, 10_000, 50_000];

export default function MetasScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [aberta, setAberta] = useState<Goal | null>(null);
  const [modo, setModo] = useState<'guardar' | 'resgatar'>('guardar');
  const [digits, setDigits] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const load = useCallback(async () => {
    try {
      setGoals(await listGoals());
    } catch {
      setGoals([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  function abrir(goal: Goal) {
    setAberta(goal);
    setModo('guardar');
    setDigits('');
    setErro('');
  }

  const valor = centsFromDigits(digits);

  async function confirmar() {
    if (!aberta || valor <= 0) {
      setErro('Digite um valor.');
      return;
    }
    setSalvando(true);
    setErro('');
    try {
      const resposta = await depositGoal(aberta.id, modo === 'guardar' ? valor : -valor);
      setAberta(null);
      await load();
      // A comemoração é decisão do servidor: ele é o único que sabe se foi
      // *este* depósito que bateu a meta. Era uma tela inteira com anel de
      // progresso e confete; virou o aviso do sistema, que diz a mesma coisa.
      if (resposta.just_completed) {
        Alert.alert('Meta batida! 🎉', `Você juntou tudo pra "${resposta.goal.name}".`);
      }
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível salvar.');
    } finally {
      setSalvando(false);
    }
  }

  const guardadoTotal = goals.reduce((soma, goal) => soma + goal.saved_cents, 0);

  return (
    <>
      <Screen
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={theme.accent}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <AppText variant="condensed" size={24}>
            METAS
          </AppText>
          <Pressable onPress={() => router.push('/meta')}>
            <AppText variant="mono" size={12} color={theme.accent}>
              + nova
            </AppText>
          </Pressable>
        </View>

        {goals.length ? (
          <Card destaque>
            <AppText variant="mono" size={10} muted style={{ letterSpacing: 1, textTransform: 'uppercase' }}>
              guardado no total
            </AppText>
            <AppText variant="numeric" size={30} style={{ marginTop: 2 }}>
              {formatMoney(guardadoTotal)}
            </AppText>
          </Card>
        ) : null}

        {goals.length === 0 ? (
          <Card alt>
            <AppText variant="title" size={15}>
              🫙 Nenhum pote ainda
            </AppText>
            <AppText muted size={13} style={{ marginTop: 6 }}>
              Um pote é um objetivo com nome: a viagem, o fone, a reserva. Você guarda aos poucos
              e vê a barra encher.
            </AppText>
            <View style={{ marginTop: 14 }}>
              <Button title="Criar meu primeiro pote" onPress={() => router.push('/meta')} />
            </View>
          </Card>
        ) : null}

        {goals.map((goal, index) => {
          const batida = goal.done_at !== null;
          const cor = goal.color ?? theme.accent;
          const custo = goal.saved_time_cost?.label ?? null;

          return (
            <Pressable key={goal.id} onPress={() => abrir(goal)} onLongPress={() => router.push(`/meta?id=${goal.id}`)}>
              <Card alt>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <AppText size={24}>{goal.emoji ?? '🫙'}</AppText>
                  <View style={{ flex: 1 }}>
                    <AppText variant="title" size={15} numberOfLines={1}>
                      {goal.name}
                    </AppText>
                    <AppText variant="mono" size={10} muted>
                      {formatMoney(goal.saved_cents)} de {formatMoney(goal.target_cents)}
                    </AppText>
                  </View>
                  <AppText
                    // O check sai na fonte de título, não na mono: em várias
                    // monoespaçadas o ✓ vira um "√" torto.
                    variant={batida ? 'title' : 'mono'}
                    size={13}
                    color={batida ? theme.positive : theme.text}
                  >
                    {batida ? '✓ 100%' : `${Math.round(goal.progress * 100)}%`}
                  </AppText>
                </View>

                <View style={{ marginTop: 12 }}>
                  <Fill
                    progress={goal.progress}
                    color={cor}
                    track={alpha(theme.bg, 0.7)}
                    height={8}
                    delay={index * 110}
                  />
                </View>

                {custo ? (
                  <AppText variant="mono" size={10} color={theme.positive} style={{ marginTop: 8 }}>
                    ≈ {custo} guardados
                  </AppText>
                ) : null}
              </Card>
            </Pressable>
          );
        })}

        {goals.length ? (
          <AppText variant="mono" size={10} muted style={{ textAlign: 'center' }}>
            toque pra guardar · segure pra editar
          </AppText>
        ) : null}
      </Screen>

      {/* -------------------------------------------------------------- */}
      {/* Guardar / resgatar */}
      <Sheet visible={aberta !== null} onClose={() => setAberta(null)} title={aberta ? `${aberta.emoji ?? '🫙'} ${aberta.name}` : undefined}>
        <View style={{ flexDirection: 'row', backgroundColor: alpha(theme.bg, 0.6), borderRadius: 14, padding: 4, marginBottom: 14 }}>
          {(['guardar', 'resgatar'] as const).map((opcao) => {
            const ativo = opcao === modo;
            return (
              <Pressable
                key={opcao}
                onPress={() => setModo(opcao)}
                style={[chipSkin(theme, ativo), { flex: 1, paddingVertical: 8, alignItems: 'center' }]}
              >
                <AppText variant="title" size={12} color={chipForeground(theme, ativo)}>
                  {opcao}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        <MoneyInput digits={digits} onChangeDigits={setDigits} autoFocus />

        <View style={{ flexDirection: 'row', gap: 6, marginTop: 12 }}>
          {ATALHOS.map((atalho) => (
            <Pressable
              key={atalho}
              onPress={() => setDigits(String(atalho))}
              style={[chipSkin(theme, false), { flex: 1, paddingVertical: 8, alignItems: 'center' }]}
            >
              <AppText variant="mono" size={11}>
                {formatMoney(atalho).replace('R$', '').trim()}
              </AppText>
            </Pressable>
          ))}
        </View>


        {erro ? (
          <AppText color={theme.negative} size={13} style={{ marginBottom: 8 }}>
            {erro}
          </AppText>
        ) : null}

        <Button
          title={modo === 'guardar' ? 'guardar' : 'resgatar'}
          onPress={confirmar}
          loading={salvando}
        />
      </Sheet>
    </>
  );
}
