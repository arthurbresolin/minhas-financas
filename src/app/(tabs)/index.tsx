import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, View } from 'react-native';

import { getSummary, type Period, type Summary } from '@/api';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { useSession } from '@/hooks/use-session';
import { formatMoney, formatWorkTime } from '@/lib/format';
import { FONTS } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const PERIODS: { key: Period; label: string }[] = [
  { key: '7d', label: '7 dias' },
  { key: '30d', label: '30 dias' },
  { key: '3m', label: '3 meses' },
  { key: '6m', label: '6 meses' },
];

export default function InicioScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useSession();
  const [period, setPeriod] = useState<Period>('30d');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setSummary(await getSummary(period));
    } catch {
      setSummary(null);
    }
  }, [period]);

  // Recarrega ao voltar pra aba: depois de lançar um gasto no modal, o saldo
  // aqui precisa já estar certo quando a tela reaparece.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const expenseWorkTime = formatWorkTime(summary?.expense_work_time);
  const balanceWorkTime = formatWorkTime(summary?.balance_work_time);
  const biggest = summary?.by_category[0]?.total_cents ?? 0;

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
      <View>
        <AppText variant="label" muted style={{ textTransform: 'uppercase' }}>
          Olá{user?.name ? `, ${user.name}` : ''}
        </AppText>
        <AppText variant="display">Minhas Finanças</AppText>
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {PERIODS.map((item) => {
          const active = item.key === period;
          return (
            <Pressable
              key={item.key}
              onPress={() => setPeriod(item.key)}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: 12,
                alignItems: 'center',
                backgroundColor: active ? theme.accent : theme.surface,
                borderWidth: 1,
                borderColor: active ? theme.accent : theme.border,
              }}
            >
              <AppText variant="label" size={11} color={active ? theme.onAccent : theme.textMuted}>
                {item.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <Card style={{ gap: 4 }}>
        <AppText variant="label" muted style={{ textTransform: 'uppercase' }}>
          Saldo disponível
        </AppText>
        <AppText
          style={{ fontFamily: FONTS.mono, fontSize: 34, lineHeight: 46 }}
          color={(summary?.balance_cents ?? 0) < 0 ? theme.negative : theme.text}
        >
          {formatMoney(summary?.balance_cents ?? 0)}
        </AppText>
        {balanceWorkTime ? (
          <AppText muted>
            <AppText color={theme.accent}>{balanceWorkTime}</AppText> de trabalho guardados
          </AppText>
        ) : !user?.hourly_rate_cents ? (
          // Sem valor por hora não dá pra converter nada — o convite só aparece
          // pra quem ainda não informou, não pra quem está no vermelho.
          <Pressable onPress={() => router.push('/perfil')}>
            <AppText muted>
              Informe seu valor por hora pra ver isso em{' '}
              <AppText color={theme.accent}>tempo de trabalho</AppText>
            </AppText>
          </Pressable>
        ) : null}
      </Card>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Card style={{ flex: 1, gap: 2 }} alt>
          <AppText variant="label" muted style={{ textTransform: 'uppercase' }}>
            Entrou
          </AppText>
          <AppText variant="mono" color={theme.positive}>
            {formatMoney(summary?.income_cents ?? 0)}
          </AppText>
        </Card>
        <Card style={{ flex: 1, gap: 2 }} alt>
          <AppText variant="label" muted style={{ textTransform: 'uppercase' }}>
            Saiu
          </AppText>
          <AppText variant="mono" color={theme.negative}>
            {formatMoney(summary?.expense_cents ?? 0)}
          </AppText>
        </Card>
      </View>

      {expenseWorkTime ? (
        <Card style={{ gap: 2 }}>
          <AppText variant="label" muted style={{ textTransform: 'uppercase' }}>
            Custou de você
          </AppText>
          <AppText variant="title" color={theme.accent}>
            {expenseWorkTime} de trabalho
          </AppText>
          <AppText muted size={13}>
            É o que você trabalhou pra pagar esse período.
          </AppText>
        </Card>
      ) : null}

      <Card style={{ gap: 14 }}>
        <AppText variant="label" muted style={{ textTransform: 'uppercase' }}>
          Para onde foi
        </AppText>
        {summary?.by_category.length ? (
          summary.by_category.map((item) => (
            <View key={`${item.category_id}`} style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <AppText>
                  {item.emoji ? `${item.emoji}  ` : ''}
                  {item.name}
                </AppText>
                <AppText variant="mono" size={14}>
                  {formatMoney(item.total_cents)}
                </AppText>
              </View>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: theme.surfaceAlt }}>
                <View
                  style={{
                    height: 6,
                    borderRadius: 3,
                    // Barra proporcional ao maior gasto, não ao total: com
                    // muitas categorias todas as barras ficariam invisíveis.
                    width: `${biggest ? (item.total_cents / biggest) * 100 : 0}%`,
                    backgroundColor: item.color ?? theme.accent,
                  }}
                />
              </View>
            </View>
          ))
        ) : (
          <AppText muted>Nenhum gasto neste período ainda.</AppText>
        )}
      </Card>

      <Pressable onPress={() => router.push('/contas')}>
        <Card style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <AppText>Minhas contas</AppText>
          <AppText muted>›</AppText>
        </Card>
      </Pressable>
    </Screen>
  );
}
