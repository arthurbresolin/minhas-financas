import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  createTransaction,
  listAccounts,
  listCategories,
  type Account,
  type Category,
} from '@/api';
import { ApiError } from '@/api/client';
import { MoneyInput } from '@/components/ui/money-input';
import { Rise } from '@/components/ui/motion';
import { AppText } from '@/components/ui/text';
import { useSession } from '@/hooks/use-session';
import { centsFromDigits, previewTimeCost } from '@/lib/format';
import { alpha, chipForeground, chipSkin, depthShadow, mix, readableOn } from '@/theme/style';
import { useTheme } from '@/theme/use-theme';

/**
 * Lançar um gasto — como gaveta, não como tela.
 *
 * A rota é um modal transparente: o que estava atrás continua ali, escurecido.
 * É uma diferença pequena de código e grande de sensação — lançar deixa de ser
 * "ir a outro lugar" e vira "resolver isso aqui e voltar", que é o que faz
 * alguém registrar o lanche em vez de deixar pra depois (e nunca fazer).
 */
export default function NovaTransacaoScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { user } = useSession();

  const [kind, setKind] = useState<'expense' | 'income'>('expense');
  const [digits, setDigits] = useState('');
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

  useEffect(() => {
    setCategoryId(null);
  }, [kind]);

  const amountCents = centsFromDigits(digits);
  // O custo acompanha cada tecla, e não só o servidor. Serve tanto pra quem
  // trabalha quanto pra quem recebe mesada, sem esta tela saber qual é o caso.
  const tempo = previewTimeCost(amountCents, user);

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
      });
      router.back();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Não foi possível salvar.');
      setSaving(false);
    }
  }

  const radius = 26;

  return (
    <View style={{ flex: 1, justifyContent: 'flex-end' }}>
      {/* O escuro é clicável de ponta a ponta: fechar a gaveta tocando fora é
          o gesto que as pessoas já tentam antes de procurar um botão. */}
      <Pressable
        onPress={() => router.back()}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: alpha('#000000', 0.55) }}
      />

      <Rise>
        <View
          style={[
            depthShadow(theme, 'strong'),
            {
              backgroundColor: theme.surface,
              borderTopLeftRadius: radius,
              borderTopRightRadius: radius,
              borderWidth: 1,
              borderColor: theme.border,
              paddingTop: 14,
              paddingBottom: insets.bottom + 16,
              // Em pixels, não em porcentagem: dentro de uma View animada sem
              // altura própria, `92%` não tem de quem ser 92% e não resolve.
              maxHeight: height * 0.92,
            },
          ]}
        >
          <View
            style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: theme.border, alignSelf: 'center' }}
          />

          {/* `flexShrink` é o que faz a rolagem existir: sem ele o ScrollView
              cresce até o tamanho do conteúdo e empurra o rodapé pra fora. */}
          <ScrollView
            style={{ flexShrink: 1 }}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Saída / entrada ---------------------------------------- */}
            <View style={{ flexDirection: 'row', backgroundColor: alpha(theme.bg, 0.6), borderRadius: 14, padding: 4 }}>
              {(['expense', 'income'] as const).map((option) => {
                const active = option === kind;
                return (
                  <Pressable
                    key={option}
                    onPress={() => setKind(option)}
                    style={[chipSkin(theme, active), { flex: 1, paddingVertical: 8, alignItems: 'center' }]}
                  >
                    <AppText variant="title" size={12} color={chipForeground(theme, active)}>
                      {option === 'expense' ? 'saída' : 'entrada'}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>

            {/* Valor --------------------------------------------------- */}
            <MoneyInput
              digits={digits}
              onChangeDigits={setDigits}
              autoFocus
              color={kind === 'income' ? theme.positive : theme.text}
            />

            {/* Categoria ----------------------------------------------- */}
            <AppText variant="mono" size={10} muted style={{ letterSpacing: 1, textTransform: 'uppercase' }}>
              categoria
            </AppText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
              {visibleCategories.map((category) => {
                const active = category.id === categoryId;
                return (
                  <Pressable
                    key={category.id}
                    onPress={() => setCategoryId(active ? null : category.id)}
                    style={[
                      chipSkin(theme, active),
                      { paddingHorizontal: 12, paddingVertical: 8, borderRadius: (34 / 2) },
                    ]}
                  >
                    <AppText variant="title" size={12} color={chipForeground(theme, active)}>
                      {category.emoji ? `${category.emoji} ` : ''}
                      {category.name}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>

            {/* Conta, só quando há escolha a fazer ---------------------- */}
            {accounts.length > 1 ? (
              <>
                <AppText variant="mono" size={10} muted style={{ letterSpacing: 1, textTransform: 'uppercase', marginTop: 16 }}>
                  conta
                </AppText>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                  {accounts.map((account) => {
                    const active = account.id === accountId;
                    return (
                      <Pressable
                        key={account.id}
                        onPress={() => setAccountId(account.id)}
                        style={[
                          chipSkin(theme, active),
                          { paddingHorizontal: 12, paddingVertical: 8, borderRadius: (34 / 2) },
                        ]}
                      >
                        <AppText size={12} color={chipForeground(theme, active)}>
                          {account.icon ? `${account.icon} ` : ''}
                          {account.name}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}

          </ScrollView>

          {/* Salvar fica fora da rolagem: é a ação da gaveta, e ter que rolar
              até ela é o que faz alguém desistir de registrar um gasto. */}
          <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
            {error ? (
              <AppText color={theme.negative} size={13} style={{ textAlign: 'center', marginBottom: 8 }}>
                {error}
              </AppText>
            ) : null}

            <Pressable
              onPress={handleSave}
              disabled={saving}
              style={({ pressed }) => ({
                height: 50,
                borderRadius: 16,
                backgroundColor: theme.accent,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed || saving ? 0.85 : 1,
                ...depthShadow(theme),
                shadowColor: theme.accent,
              })}
            >
              <AppText variant="title" size={14} color={readableOn(theme.accent, theme.onAccent)}>
                {/* O botão diz o preço em tempo, não só "salvar": é a última
                    chance de a pessoa ver quanto daquele gasto é vida dela. */}
                salvar{tempo ? ` · ≈${tempo} ⏱` : ''}
              </AppText>
            </Pressable>

            <Pressable onPress={() => router.back()} style={{ alignItems: 'center', paddingTop: 12 }}>
              <AppText variant="title" size={13} color={mix(theme.textMuted, theme.text, 0.2)}>
                cancelar
              </AppText>
            </Pressable>
          </View>
        </View>
      </Rise>
    </View>
  );
}
