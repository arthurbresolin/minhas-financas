import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import {
  createTransaction,
  listAccounts,
  listCategories,
  type Account,
  type Category,
} from '@/api';
import { ApiError } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { centsFromDigits, formatMoney } from '@/lib/format';
import { FONTS } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', '⌫'];

export default function NovaTransacaoScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [kind, setKind] = useState<'expense' | 'income'>('expense');
  const [digits, setDigits] = useState('');
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const [c, a] = await Promise.all([listCategories(), listAccounts()]);
        setCategories(c);
        setAccounts(a);
        // Pré-seleciona a primeira conta: na maioria das vezes só existe uma, e
        // obrigar a escolher transformaria dois toques em quatro.
        setAccountId((current) => current ?? a[0]?.id ?? null);
      } catch {
        setError('Não foi possível carregar contas e categorias.');
      }
    })();
  }, []);

  const visibleCategories = useMemo(
    () => categories.filter((category) => category.kind === kind),
    [categories, kind],
  );

  // Trocar entre gasto e receita invalida a categoria escolhida (as listas são
  // diferentes) — limpar evita salvar um salário na categoria "Lanche".
  useEffect(() => {
    setCategoryId(null);
  }, [kind]);

  const amountCents = centsFromDigits(digits);

  function press(key: string) {
    if (key === '⌫') {
      setDigits((current) => current.slice(0, -1));
      return;
    }
    if (key === ',') return; // os centavos já entram sozinhos pelos dígitos
    setDigits((current) => (current + key).replace(/^0+/, '').slice(0, 11));
  }

  async function handleSave() {
    if (amountCents <= 0) {
      setError('Digite um valor.');
      return;
    }
    if (!accountId) {
      setError('Crie uma conta antes de lançar.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await createTransaction({
        account_id: accountId,
        category_id: categoryId,
        kind,
        amount_cents: amountCents,
        description: description.trim() || null,
      });
      router.back();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen scroll={false}>
      <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 20 }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <AppText variant="title">Novo lançamento</AppText>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <AppText muted size={20}>
              ✕
            </AppText>
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(['expense', 'income'] as const).map((option) => {
            const active = option === kind;
            return (
              <Pressable
                key={option}
                onPress={() => setKind(option)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 14,
                  alignItems: 'center',
                  backgroundColor: active ? theme.accent : theme.surface,
                  borderWidth: 1,
                  borderColor: active ? theme.accent : theme.border,
                }}
              >
                <AppText color={active ? theme.onAccent : theme.textMuted}>
                  {option === 'expense' ? 'Gasto' : 'Entrada'}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        <View style={{ alignItems: 'center', paddingVertical: 6 }}>
          <AppText
            style={{ fontFamily: FONTS.mono, fontSize: 40, lineHeight: 54 }}
            color={amountCents ? theme.text : theme.textMuted}
          >
            {formatMoney(amountCents)}
          </AppText>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {KEYS.map((key) => (
            <Pressable
              key={key}
              onPress={() => press(key)}
              style={{
                width: '31.5%',
                paddingVertical: 14,
                borderRadius: 14,
                alignItems: 'center',
                backgroundColor: theme.surface,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <AppText variant="mono" size={19}>
                {key}
              </AppText>
            </Pressable>
          ))}
        </View>

        <View style={{ gap: 8 }}>
          <AppText variant="label" muted style={{ textTransform: 'uppercase' }}>
            Categoria
          </AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {visibleCategories.map((category) => {
              const active = category.id === categoryId;
              return (
                <Pressable
                  key={category.id}
                  onPress={() => setCategoryId(active ? null : category.id)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 9,
                    borderRadius: 14,
                    backgroundColor: active ? theme.accent : theme.surface,
                    borderWidth: 1,
                    borderColor: active ? theme.accent : theme.border,
                  }}
                >
                  <AppText size={13} color={active ? theme.onAccent : theme.text}>
                    {category.emoji ? `${category.emoji} ` : ''}
                    {category.name}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {accounts.length > 1 ? (
          <View style={{ gap: 8 }}>
            <AppText variant="label" muted style={{ textTransform: 'uppercase' }}>
              Conta
            </AppText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {accounts.map((account) => {
                const active = account.id === accountId;
                return (
                  <Pressable
                    key={account.id}
                    onPress={() => setAccountId(account.id)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 9,
                      borderRadius: 14,
                      backgroundColor: active ? theme.accent : theme.surface,
                      borderWidth: 1,
                      borderColor: active ? theme.accent : theme.border,
                    }}
                  >
                    <AppText size={13} color={active ? theme.onAccent : theme.text}>
                      {account.icon ? `${account.icon} ` : ''}
                      {account.name}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        <Field
          label="Descrição (opcional)"
          value={description}
          onChangeText={setDescription}
          placeholder="Com o quê?"
        />

        {error ? <AppText color={theme.negative}>{error}</AppText> : null}

        <Button title="Salvar" onPress={handleSave} loading={saving} />
      </ScrollView>
    </Screen>
  );
}
