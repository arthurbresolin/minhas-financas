import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, View } from 'react-native';

import { getSummary, type Period, type Summary } from '@/api';
import { Doodle, type DoodleName } from '@/components/ng/doodle';
import { Pill } from '@/components/ng/pill';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { useSession } from '@/hooks/use-session';
import { formatMoney, formatWorkTime } from '@/lib/format';
import { chipForeground, chipSkin, space } from '@/theme/style';
import { useTheme, useThemePicker } from '@/theme/use-theme';

const PERIODS: { key: Period; label: string }[] = [
  { key: '7d', label: '7d' },
  { key: '30d', label: '30d' },
  { key: '3m', label: '3m' },
  { key: '6m', label: '6m' },
];

// Cada categoria recebe um rabisco fixo pela posição, não por sorteio: a mesma
// categoria precisa ter sempre o mesmo desenho, senão a Home muda de cara a
// cada recarregamento.
const DOODLES: DoodleName[] = ['viagem', 'brilho', 'passaro', 'fantasma', 'olhos', 'cofrinho'];

export default function InicioScreen() {
  const theme = useTheme();
  const { themes, setTheme, active } = useThemePicker();
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
  const categories = summary?.by_category ?? [];
  const biggest = categories[0]?.total_cents ?? 0;
  const balance = summary?.balance_cents ?? 0;
  const [reais, centavos] = formatMoney(balance).split(',');

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
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexShrink: 1, marginRight: 8 }}>
          <AppText variant="label" muted size={10} style={{ textTransform: 'uppercase' }}>
            e aí
          </AppText>
          {/* Só o primeiro nome: nome completo em condensada de 26px estoura a
              linha e empurra os pontinhos de tema pra fora da tela. */}
          <AppText variant="condensed" numberOfLines={1}>
            {(user?.name?.split(' ')[0] ?? 'você').toUpperCase()}
          </AppText>
        </View>

        {/* Os pontinhos de tema são o atalho da loja: um toque troca pro
            próximo pack, um toque longo abre a lista inteira. */}
        <Pressable
          onPress={() => router.push('/temas')}
          style={{
            flexDirection: 'row',
            gap: 6,
            alignItems: 'center',
            backgroundColor: theme.surface,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 20,
            paddingVertical: 6,
            paddingHorizontal: 8,
          }}
        >
          {/* Só os primeiros: com os temas que a pessoa cria, a lista inteira
              estouraria a linha. A grade completa está em /temas. */}
          {themes.slice(0, 4).map((item) => {
            const selected = item.id === active.id;
            return (
              // O anel do tema ativo é uma View em volta, não uma borda: borda
              // comeria o pontinho por dentro e ele sumiria nesse tamanho.
              <View
                key={item.id}
                style={{
                  padding: 2,
                  borderRadius: 9,
                  borderWidth: 1.5,
                  borderColor: selected ? theme.text : 'transparent',
                }}
              >
                <Pressable
                  onPress={() => setTheme(item.id)}
                  style={{
                    width: 11,
                    height: 11,
                    borderRadius: 6,
                    backgroundColor: item.swatch[0],
                  }}
                />
              </View>
            );
          })}
        </Pressable>
      </View>

      <Card destaque style={{ gap: 2, overflow: 'hidden' }}>
        {/* O rabisco é decoração, e tema sem decoração não tem rabisco: é o que
            faz um tema "clean" ficar realmente limpo em vez de só mais claro. */}
        {theme.decorationStyle === 'doodles' || theme.decorationStyle === 'minimal' ? (
          <View style={{ position: 'absolute', right: 12, top: 12 }}>
            <Doodle name="passaro" color={theme.text} size={34} />
          </View>
        ) : null}
        <AppText variant="label" muted size={10} style={{ textTransform: 'uppercase' }}>
          saldo disponível
        </AppText>
        <AppText variant="numeric" color={balance < 0 ? theme.negative : theme.text}>
          {reais}
          <AppText variant="numeric" size={22} color={balance < 0 ? theme.negative : theme.text}>
            ,{centavos}
          </AppText>
        </AppText>
        {balanceWorkTime ? (
          <AppText variant="mono" size={11} color={theme.positive}>
            ≈ {balanceWorkTime} de trabalho ↑
          </AppText>
        ) : !user?.hourly_rate_cents ? (
          // Sem valor por hora não dá pra converter nada — o convite só aparece
          // pra quem ainda não informou, não pra quem está no vermelho.
          <Pressable onPress={() => router.push('/perfil')}>
            <AppText variant="mono" size={11} muted>
              informe seu valor por hora →
            </AppText>
          </Pressable>
        ) : null}
      </Card>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Pill
          label="lançar"
          variant="cheio"
          style={{ flex: 1 }}
          onPress={() => router.push('/nova-transacao')}
        />
        <Pill label="extrato" style={{ flex: 1 }} onPress={() => router.push('/transacoes')} />
        <Pill label="⌗" style={{ width: 44 }} onPress={() => router.push('/contas')} />
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {PERIODS.map((item) => {
          const selected = item.key === period;
          return (
            <Pressable
              key={item.key}
              onPress={() => setPeriod(item.key)}
              style={[
                chipSkin(theme, selected),
                { flex: 1, paddingVertical: space(theme, 8), alignItems: 'center' },
              ]}
            >
              <AppText
                variant="mono"
                size={11}
                color={selected ? chipForeground(theme, true) : theme.textMuted}
              >
                {item.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Card style={{ flex: 1, gap: 2 }} alt>
          <AppText variant="label" muted size={10} style={{ textTransform: 'uppercase' }}>
            entrou
          </AppText>
          <AppText variant="mono" size={15} color={theme.positive}>
            {formatMoney(summary?.income_cents ?? 0)}
          </AppText>
        </Card>
        <Card style={{ flex: 1, gap: 2 }} alt>
          <AppText variant="label" muted size={10} style={{ textTransform: 'uppercase' }}>
            saiu
          </AppText>
          <AppText variant="mono" size={15} color={theme.negative}>
            {formatMoney(summary?.expense_cents ?? 0)}
          </AppText>
        </Card>
      </View>

      {expenseWorkTime ? (
        <Card style={{ gap: 2 }}>
          <AppText variant="label" muted size={10} style={{ textTransform: 'uppercase' }}>
            custou de você
          </AppText>
          <AppText variant="condensed" size={20}>
            {expenseWorkTime.toUpperCase()} DE TRABALHO
          </AppText>
          <AppText muted size={13}>
            É o que você trabalhou pra pagar esse período.
          </AppText>
        </Card>
      ) : null}

      <View
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
      >
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
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {categories.map((item, index) => (
            <Card
              key={item.category_id}
              // Duas por linha: `48%` em vez de metade exata deixa a folga do gap.
              style={{ width: '48%', gap: 8 }}
              alt
            >
              {theme.decorationStyle === 'doodles' ? (
                <Doodle
                  name={DOODLES[index % DOODLES.length]}
                  color={theme.text}
                  size={26}
                  strokeWidth={2}
                />
              ) : null}
              <AppText variant="title" size={13} numberOfLines={1}>
                {item.name}
              </AppText>
              <View style={{ height: 5, borderRadius: 3, backgroundColor: theme.border }}>
                <View
                  style={{
                    height: 5,
                    borderRadius: 3,
                    // Barra proporcional ao maior gasto, não ao total: com
                    // muitas categorias todas as barras ficariam invisíveis.
                    width: `${biggest ? (item.total_cents / biggest) * 100 : 0}%`,
                    backgroundColor: item.color ?? (index % 2 ? theme.accentAlt : theme.positive),
                  }}
                />
              </View>
              <AppText variant="mono" size={10} muted>
                {formatMoney(item.total_cents)}
              </AppText>
            </Card>
          ))}
        </View>
      ) : (
        <Card>
          <AppText muted>Nenhum gasto neste período ainda.</AppText>
        </Card>
      )}

      <View style={{ alignItems: 'center', paddingTop: 4 }}>
        <AppText variant="hand" size={16} muted>
          @{user?.name?.split(' ')[0]?.toLowerCase() ?? 'você'}
        </AppText>
      </View>
    </Screen>
  );
}
