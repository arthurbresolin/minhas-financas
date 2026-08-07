import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { createAccount, listAccounts, type Account } from '@/api';
import { ApiError } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { centsFromDigits, formatMoney } from '@/lib/format';
import { useTheme } from '@/theme/use-theme';

const KINDS: { key: Account['kind']; label: string; icon: string }[] = [
  { key: 'cash', label: 'Dinheiro', icon: '💵' },
  { key: 'checking', label: 'Conta', icon: '🏦' },
  { key: 'savings', label: 'Poupança', icon: '🐷' },
];

export default function ContasScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<Account['kind']>('checking');
  const [openingDigits, setOpeningDigits] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setAccounts(await listAccounts());
    } catch {
      setAccounts([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate() {
    if (!name.trim()) {
      setError('Dê um nome pra conta.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await createAccount({
        name: name.trim(),
        kind,
        icon: KINDS.find((item) => item.key === kind)?.icon,
        opening_balance_cents: centsFromDigits(openingDigits),
      });
      setName('');
      setOpeningDigits('');
      setAdding(false);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Não foi possível criar a conta.');
    } finally {
      setSaving(false);
    }
  }

  const total = accounts.reduce((sum, account) => sum + account.balance_cents, 0);

  return (
    <Screen>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <AppText variant="display">Contas</AppText>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <AppText muted size={20}>
            ✕
          </AppText>
        </Pressable>
      </View>

      <Card style={{ gap: 2 }}>
        <AppText variant="label" muted style={{ textTransform: 'uppercase' }}>
          Somando tudo
        </AppText>
        <AppText variant="mono" size={26} color={total < 0 ? theme.negative : theme.text}>
          {formatMoney(total)}
        </AppText>
      </Card>

      {accounts.map((account) => (
        <Card
          key={account.id}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <AppText size={20}>{account.icon ?? '🏦'}</AppText>
            <View>
              <AppText>{account.name}</AppText>
              <AppText muted size={12}>
                {KINDS.find((item) => item.key === account.kind)?.label ?? account.kind}
              </AppText>
            </View>
          </View>
          <AppText
            variant="mono"
            size={15}
            color={account.balance_cents < 0 ? theme.negative : theme.text}
          >
            {formatMoney(account.balance_cents)}
          </AppText>
        </Card>
      ))}

      {adding ? (
        <Card style={{ gap: 14 }}>
          <Field label="Nome" value={name} onChangeText={setName} placeholder="Nubank, carteira…" />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {KINDS.map((item) => {
              const active = item.key === kind;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => setKind(item.key)}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 14,
                    alignItems: 'center',
                    backgroundColor: active ? theme.accent : theme.surfaceAlt,
                    borderWidth: 1,
                    borderColor: active ? theme.accent : theme.border,
                  }}
                >
                  <AppText size={13} color={active ? theme.onAccent : theme.text}>
                    {item.icon} {item.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
          <Field
            label="Saldo de hoje"
            value={openingDigits ? formatMoney(centsFromDigits(openingDigits)) : ''}
            onChangeText={(text) => setOpeningDigits(text.replace(/\D/g, ''))}
            keyboardType="number-pad"
            placeholder="R$ 0,00"
          />
          {error ? <AppText color={theme.negative}>{error}</AppText> : null}
          <Button title="Criar conta" onPress={handleCreate} loading={saving} />
          <Button title="Cancelar" variant="ghost" onPress={() => setAdding(false)} />
        </Card>
      ) : (
        <Button title="+ Nova conta" variant="ghost" onPress={() => setAdding(true)} />
      )}
    </Screen>
  );
}
