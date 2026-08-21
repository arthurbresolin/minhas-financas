import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, RefreshControl, View } from 'react-native';

import {
  deleteTransaction,
  listAccounts,
  listCategories,
  listTransactions,
  type Account,
  type Category,
  type Transaction,
} from '@/api';
import { Titulo } from '@/components/ng/titulo';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { formatDayLabel, formatMoney, formatTime } from '@/lib/format';
import { useTheme } from '@/theme/use-theme';

const KIND_SIGN: Record<Transaction['kind'], number> = {
  expense: -1,
  income: 1,
  transfer_out: -1,
  transfer_in: 1,
};

export default function TransacoesScreen() {
  const theme = useTheme();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [t, c, a] = await Promise.all([
        listTransactions({ limit: 200 }),
        listCategories(),
        listAccounts(),
      ]);
      setTransactions(t);
      setCategories(c);
      setAccounts(a);
    } catch {
      setTransactions([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const categoryById = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories],
  );
  const accountById = useMemo(() => Object.fromEntries(accounts.map((a) => [a.id, a])), [accounts]);

  // Agrupa por dia mantendo a ordem que veio da API (mais recente primeiro).
  const groups = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const transaction of transactions) {
      const day = transaction.occurred_at.slice(0, 10);
      const list = map.get(day);
      if (list) list.push(transaction);
      else map.set(day, [transaction]);
    }
    return [...map.entries()];
  }, [transactions]);

  function confirmDelete(transaction: Transaction) {
    const remove = async () => {
      await deleteTransaction(transaction.id);
      await load();
    };
    Alert.alert('Excluir lançamento?', 'Isso não pode ser desfeito.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => void remove() },
    ]);
  }

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
      <Titulo chapeu="tudo que passou" titulo="extrato" />

      {groups.length === 0 ? (
        <Card>
          <AppText muted>Nada lançado ainda. Toque no + pra registrar um gasto.</AppText>
        </Card>
      ) : null}

      {groups.map(([day, items]) => (
        <View key={day} style={{ gap: 8 }}>
          <AppText variant="mono" muted size={11} style={{ textTransform: 'uppercase' }}>
            {formatDayLabel(items[0].occurred_at)}
          </AppText>
          <Card padded={false} style={{ overflow: 'hidden' }}>
            {items.map((transaction, index) => {
              const category = transaction.category_id
                ? categoryById[transaction.category_id]
                : undefined;
              const account = accountById[transaction.account_id];
              const sign = KIND_SIGN[transaction.kind];
              const isTransfer = transaction.kind.startsWith('transfer');
              return (
                <Pressable
                  key={transaction.id}
                  onLongPress={() => confirmDelete(transaction)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 13,
                    borderTopWidth: index === 0 ? 0 : 1,
                    borderTopColor: theme.border,
                  }}
                >
                  {/* A bolinha da categoria acompanha o desenho do tema: cheia
                      nos temas de superfície, vazada nos de traço. O emoji
                      continua sendo o da categoria que a pessoa escolheu —
                      isso é dado dela, não decoração. */}
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 19,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: theme.surfaceAlt,
                      borderWidth: 1,
                      borderColor: theme.border,
                    }}
                  >
                    <AppText size={17}>{isTransfer ? '⇄' : (category?.emoji ?? '💠')}</AppText>
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText numberOfLines={1}>
                      {transaction.description ||
                        (isTransfer ? 'Transferência' : (category?.name ?? 'Sem categoria'))}
                    </AppText>
                    <AppText muted size={12}>
                      {formatTime(transaction.occurred_at)}
                      {account ? ` · ${account.name}` : ''}
                    </AppText>
                  </View>
                  <AppText
                    variant="mono"
                    size={15}
                    color={isTransfer ? theme.textMuted : sign > 0 ? theme.positive : theme.text}
                  >
                    {formatMoney(sign * transaction.amount_cents, { showSign: !isTransfer })}
                  </AppText>
                </Pressable>
              );
            })}
          </Card>
        </View>
      ))}

      {groups.length ? (
        <AppText variant="hand" muted size={15} style={{ textAlign: 'center' }}>
          segure um lançamento pra excluir
        </AppText>
      ) : null}
    </Screen>
  );
}
