import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { createAccount, createTransfer, listAccounts, type Account } from '@/api';
import { ApiError } from '@/api/client';
import { Titulo } from '@/components/ng/titulo';
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
  { key: 'credit_card', label: 'Cartão', icon: '💳' },
];

/** "fecha em 3 dias", "fecha hoje" — o número que faz segurar a compra. */
function quandoFecha(dias: number): string {
  if (dias <= 0) return 'fecha hoje';
  if (dias === 1) return 'fecha amanhã';
  return `fecha em ${dias} dias`;
}

function diaDoMes(iso: string): string {
  return String(Number(iso.slice(8, 10)));
}

export default function ContasScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<Account['kind']>('checking');
  const [openingDigits, setOpeningDigits] = useState('');
  const [fechamento, setFechamento] = useState('');
  const [vencimento, setVencimento] = useState('');
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
    const ehCartao = kind === 'credit_card';
    const dia = (texto: string) => {
      const n = Number(texto);
      return Number.isInteger(n) && n >= 1 && n <= 31 ? n : null;
    };
    if (ehCartao && (!dia(fechamento) || !dia(vencimento))) {
      // Sem os dois dias não há ciclo, e inventar um faria o app afirmar uma
      // data de vencimento que o banco nunca disse.
      setError('Diga em que dia o cartão fecha e em que dia vence (1 a 31).');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await createAccount({
        name: name.trim(),
        kind,
        icon: KINDS.find((item) => item.key === kind)?.icon,
        // Cartão não tem "saldo de hoje": o que ele tem é fatura, e ela é
        // sempre derivada dos gastos.
        opening_balance_cents: ehCartao ? 0 : centsFromDigits(openingDigits),
        closing_day: ehCartao ? dia(fechamento) : null,
        due_day: ehCartao ? dia(vencimento) : null,
      });
      setName('');
      setOpeningDigits('');
      setFechamento('');
      setVencimento('');
      setAdding(false);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Não foi possível criar a conta.');
    } finally {
      setSaving(false);
    }
  }

  // Cartão fica de fora do "somando tudo", igual ao servidor: passar o cartão
  // não tira dinheiro seu, tira quando a fatura é paga. O que se deve aparece
  // logo abaixo, com nome próprio.
  const caixa = accounts.filter((a) => a.kind !== 'credit_card');
  const cartoes = accounts.filter((a) => a.kind === 'credit_card');
  const total = caixa.reduce((sum, account) => sum + account.balance_cents, 0);
  const devendo = cartoes.reduce((sum, account) => sum + account.balance_cents, 0);

  async function pagarFatura(cartao: Account) {
    const valor = -cartao.balance_cents;
    const origem = caixa.find((a) => a.balance_cents >= valor) ?? caixa[0];
    if (!origem) {
      Alert.alert('Sem conta de onde pagar', 'Crie uma conta ou carteira antes.');
      return;
    }
    Alert.alert(
      `Pagar ${cartao.name}?`,
      `${formatMoney(valor)} sai de "${origem.name}".`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Pagar',
          onPress: async () => {
            try {
              await createTransfer({
                from_account_id: origem.id,
                to_account_id: cartao.id,
                amount_cents: valor,
                description: `Fatura ${cartao.name}`,
              });
              await load();
            } catch {
              Alert.alert('Não deu pra pagar', 'Verifique a conexão e tente de novo.');
            }
          },
        },
      ],
    );
  }

  return (
    <Screen>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Titulo chapeu="onde seu dinheiro mora" titulo="contas" />
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <AppText muted size={20}>
            ✕
          </AppText>
        </Pressable>
      </View>

      <Card destaque style={{ gap: 2 }}>
        <AppText variant="label" muted size={10} style={{ textTransform: 'uppercase' }}>
          somando tudo
        </AppText>
        <AppText variant="numeric" size={34} color={total < 0 ? theme.negative : theme.text}>
          {formatMoney(total)}
        </AppText>
      </Card>

      {devendo < 0 ? (
        <Card alt style={{ gap: 2 }}>
          <AppText variant="label" muted size={10} style={{ textTransform: 'uppercase' }}>
            devendo no cartão
          </AppText>
          <AppText variant="mono" size={18} color={theme.negative}>
            {formatMoney(-devendo)}
          </AppText>
          <AppText muted size={12}>
            Não sai do saldo agora — sai quando a fatura for paga.
          </AppText>
        </Card>
      ) : null}

      {caixa.map((account) => (
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

      {cartoes.map((cartao) => (
        <Card key={cartao.id} style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 }}>
              <AppText size={20}>💳</AppText>
              <View style={{ flexShrink: 1 }}>
                <AppText numberOfLines={1}>{cartao.name}</AppText>
                <AppText muted size={12}>
                  {cartao.fatura
                    ? `${quandoFecha(cartao.fatura.dias_ate_fechar)} · vence dia ${diaDoMes(cartao.fatura.vence_em)}`
                    : 'sem fechamento configurado'}
                </AppText>
              </View>
            </View>
            <AppText variant="mono" size={15} color={theme.negative}>
              {formatMoney(cartao.fatura ? cartao.fatura.total_cents : -cartao.balance_cents)}
            </AppText>
          </View>

          {cartao.balance_cents < 0 ? (
            <Button title="Pagar fatura" variant="ghost" onPress={() => void pagarFatura(cartao)} />
          ) : null}
        </Card>
      ))}

      {adding ? (
        <Card style={{ gap: 14 }}>
          <Field label="Nome" value={name} onChangeText={setName} placeholder="Nubank, carteira…" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {KINDS.map((item) => {
              const active = item.key === kind;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => setKind(item.key)}
                  style={{
                    minWidth: '46%',
                    flexGrow: 1,
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
          {kind === 'credit_card' ? (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Field
                  label="Fecha dia"
                  value={fechamento}
                  onChangeText={(t) => setFechamento(t.replace(/\D/g, '').slice(0, 2))}
                  keyboardType="number-pad"
                  placeholder="10"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label="Vence dia"
                  value={vencimento}
                  onChangeText={(t) => setVencimento(t.replace(/\D/g, '').slice(0, 2))}
                  keyboardType="number-pad"
                  placeholder="17"
                />
              </View>
            </View>
          ) : (
            <Field
              label="Saldo de hoje"
              value={openingDigits ? formatMoney(centsFromDigits(openingDigits)) : ''}
              onChangeText={(text) => setOpeningDigits(text.replace(/\D/g, ''))}
              keyboardType="number-pad"
              placeholder="R$ 0,00"
            />
          )}
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
