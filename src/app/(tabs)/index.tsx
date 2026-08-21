import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, View } from 'react-native';

import { getSummary, listGoals, type Goal, type Period, type Summary } from '@/api';
import { Card } from '@/components/ui/card';
import { Fill, useCountUp } from '@/components/ui/motion';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { useSession } from '@/hooks/use-session';
import { formatMoney } from '@/lib/format';
import { alpha, chipForeground, chipSkin } from '@/theme/style';
import { useTheme, useThemePicker } from '@/theme/use-theme';

const PERIODS: { key: Period; label: string }[] = [
  { key: '7d', label: '7d' },
  { key: '30d', label: '30d' },
  { key: '3m', label: '3m' },
  { key: '6m', label: '6m' },
];

/** Só o valor abreviado, pra caber no rodapé de um pote: "3,1/5k". */
function curto(cents: number): string {
  const reais = cents / 100;
  if (reais >= 1000) return `${(reais / 1000).toFixed(1).replace('.', ',')}k`;
  return String(Math.round(reais));
}

export default function InicioScreen() {
  const theme = useTheme();
  const { themes } = useThemePicker();
  const router = useRouter();
  const { user } = useSession();
  const [period, setPeriod] = useState<Period>('30d');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    // Em paralelo e cada uma se defendendo sozinha: se as metas falharem, o
    // saldo ainda aparece. Um `Promise.all` cru deixaria a Home vazia por
    // causa de um endpoint só.
    const [resumo, potes] = await Promise.all([
      getSummary(period).catch(() => null),
      listGoals().catch(() => [] as Goal[]),
    ]);
    setSummary(resumo);
    setGoals(potes);
  }, [period]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const balance = summary?.balance_cents ?? 0;
  // O saldo sobe de zero até o valor — é o movimento que abre a tela e mostra
  // de onde o número veio.
  const contando = useCountUp(balance);
  const [reais, centavos] = formatMoney(contando).split(',');
  // A frase inteira vem do servidor: "18 dias e 2 horas de trabalho" ou
  // "6 dias de mesada". A Home não sabe qual dos dois é, e é isso que faz
  // trocar de modo não exigir tocar aqui.
  const custoDoSaldo = summary?.balance_time_cost?.label ?? null;
  const custoDosGastos = summary?.expense_time_cost?.label ?? null;
  // A última frase escrita na mão: "você trabalhou" não vale pra quem recebe
  // mesada. É a única coisa que a Home ainda decide sobre o modo, e só porque
  // é uma frase de contexto, não o número em si.
  const explicacaoDoCusto =
    summary?.expense_time_cost?.mode === 'allowance'
      ? 'É o quanto da sua mesada foi embora nesse período.'
      : 'É o que você trabalhou pra pagar esse período.';
  const categories = summary?.by_category ?? [];
  const biggest = categories[0]?.total_cents ?? 0;
  // Dois potes na Home; o resto mora na aba de metas.
  const destaques = goals.slice(0, 2);
  const negativo = balance < 0;

  return (
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
      {/* ---------------------------------------------------------------- */}
      {/* Cabeçalho */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <AppText variant="title" size={14} numberOfLines={1} style={{ flexShrink: 1 }}>
          e aí, {user?.name?.split(' ')[0] ?? 'você'}
        </AppText>

        {/* A lista de temas a um toque, mostrando as cores do tema ativo. */}
        <Pressable
          onPress={() => router.push('/temas')}
          style={{
            flexDirection: 'row',
            gap: 4,
            alignItems: 'center',
            backgroundColor: theme.surface,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 16,
            paddingVertical: 7,
            paddingHorizontal: 9,
          }}
        >
          {themes.slice(0, 2).map((item) => (
            <View key={item.id} style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: item.swatch[0] }} />
          ))}
        </Pressable>
      </View>

      {/* ---------------------------------------------------------------- */}
      {/* Saldo */}
      <Card destaque>
        <AppText variant="mono" size={10} muted style={{ letterSpacing: 1, textTransform: 'uppercase' }}>
          saldo
        </AppText>
        <AppText variant="numeric" size={34} color={negativo ? theme.negative : theme.text} style={{ marginTop: 2 }}>
          {reais}
          <AppText variant="numeric" size={20} color={negativo ? theme.negative : theme.text}>
            ,{centavos}
          </AppText>
        </AppText>
        {custoDoSaldo ? (
          // A pílula do tempo é o coração do app: o número acima é dinheiro, e
          // este aqui é o que ele custou de vida.
          <View
            style={{
              alignSelf: 'flex-start',
              marginTop: 8,
              backgroundColor: alpha(theme.accent, 0.12),
              borderWidth: 1,
              borderColor: alpha(theme.accent, 0.35),
              borderRadius: 16,
              paddingVertical: 4,
              paddingHorizontal: 10,
            }}
          >
            <AppText variant="mono" size={11} color={theme.positive}>
              ≈ {custoDoSaldo}
            </AppText>
          </View>
        ) : !summary?.balance_time_cost ? (
          <Pressable onPress={() => router.push('/perfil')} style={{ marginTop: 8 }}>
            <AppText variant="mono" size={11} muted>
              diga de onde vem seu dinheiro →
            </AppText>
          </Pressable>
        ) : null}
      </Card>

      {/* ---------------------------------------------------------------- */}
      {/* Potes */}
      {destaques.length ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {destaques.map((goal, index) => (
            <Pressable key={goal.id} style={{ flex: 1 }} onPress={() => router.push('/metas')}>
              <Card alt>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <AppText size={15}>{goal.emoji ?? '🫙'}</AppText>
                  <AppText variant="mono" size={10} color={theme.positive}>
                    {Math.round(goal.progress * 100)}%
                  </AppText>
                </View>
                <View style={{ marginTop: 9 }}>
                  <Fill
                    progress={goal.progress}
                    color={goal.color ?? theme.accent}
                    track={alpha(theme.bg, 0.7)}
                    height={5}
                    delay={index * 120}
                  />
                </View>
                <AppText variant="mono" size={9} muted style={{ marginTop: 6 }} numberOfLines={1}>
                  {goal.name} {curto(goal.saved_cents)}/{curto(goal.target_cents)}
                </AppText>
              </Card>
            </Pressable>
          ))}
        </View>
      ) : (
        <Pressable onPress={() => router.push('/metas')}>
          <Card alt>
            <AppText size={13} muted>
              🫙 Crie um pote e veja o dinheiro juntar →
            </AppText>
          </Card>
        </Pressable>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Período e recorte */}
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {PERIODS.map((item) => {
          const selected = item.key === period;
          return (
            <Pressable
              key={item.key}
              onPress={() => setPeriod(item.key)}
              style={[chipSkin(theme, selected), { flex: 1, paddingVertical: 7, alignItems: 'center' }]}
            >
              <AppText variant="mono" size={11} color={selected ? chipForeground(theme, true) : theme.textMuted}>
                {item.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Card alt style={{ flex: 1 }}>
          <AppText variant="label" muted size={10} style={{ textTransform: 'uppercase' }}>
            entrou
          </AppText>
          <AppText variant="mono" size={15} color={theme.positive}>
            {formatMoney(summary?.income_cents ?? 0)}
          </AppText>
        </Card>
        <Card alt style={{ flex: 1 }}>
          <AppText variant="label" muted size={10} style={{ textTransform: 'uppercase' }}>
            saiu
          </AppText>
          <AppText variant="mono" size={15} color={theme.negative}>
            {formatMoney(summary?.expense_cents ?? 0)}
          </AppText>
        </Card>
      </View>

      {custoDosGastos ? (
        <Card style={{ gap: 2 }}>
          <AppText variant="label" muted size={10} style={{ textTransform: 'uppercase' }}>
            custou de você
          </AppText>
          <AppText variant="condensed" size={20}>
            {custoDosGastos.toUpperCase()}
          </AppText>
          <AppText muted size={13}>
            {explicacaoDoCusto}
          </AppText>
        </Card>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <AppText variant="condensed" size={17}>
          PRA ONDE FOI
        </AppText>
        <Pressable onPress={() => router.push('/transacoes')}>
          <AppText variant="mono" size={11} muted>
            ver tudo →
          </AppText>
        </Pressable>
      </View>

      {categories.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {categories.map((item, index) => (
            <Card alt key={item.category_id ?? `sem-${index}`} style={{ width: '48.5%' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <AppText size={13}>{item.emoji ?? '•'}</AppText>
                <AppText variant="title" size={12} numberOfLines={1} style={{ flex: 1 }}>
                  {item.name}
                </AppText>
              </View>
              <View style={{ marginTop: 8 }}>
                <Fill
                  progress={biggest ? item.total_cents / biggest : 0}
                  color={item.color ?? (index % 2 ? theme.accentAlt : theme.positive)}
                  track={alpha(theme.bg, 0.7)}
                  height={5}
                  delay={index * 70}
                />
              </View>
              <AppText variant="mono" size={10} muted style={{ marginTop: 6 }}>
                {formatMoney(item.total_cents)}
              </AppText>
            </Card>
          ))}
        </View>
      ) : (
        <Card alt>
          <AppText muted size={13}>
            Nenhum gasto neste período ainda.
          </AppText>
        </Card>
      )}
    </Screen>
  );
}
