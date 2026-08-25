import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import {
  createRecurring,
  deleteRecurring,
  listAccounts,
  listRecurring,
  updateRecurring,
  type Account,
  type RecurringRule,
} from '@/api';
import { ApiError } from '@/api/client';
import { Titulo } from '@/components/ng/titulo';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { MoneyInput } from '@/components/ui/money-input';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { centsFromDigits, formatMoney } from '@/lib/format';
import { chipForeground, chipSkin } from '@/theme/style';
import { useTheme } from '@/theme/use-theme';

/** "dia 5" a partir de "2026-09-05" — a data inteira aqui seria ruído. */
function diaDe(iso: string): string {
  return String(Number(iso.slice(8, 10)));
}

/**
 * O que se repete todo mês.
 *
 * A mesada, a assinatura, o aluguel: os valores que a pessoa esquece de
 * registrar não por dar trabalho, mas por serem previsíveis demais pra lembrar.
 *
 * A regra não é o lançamento. Ela é a receita — e o que ela gera são linhas
 * comuns no extrato, que dá pra apagar uma a uma.
 */
export default function RecorrentesScreen() {
  const theme = useTheme();
  const router = useRouter();

  const [regras, setRegras] = useState<RecurringRule[]>([]);
  const [contas, setContas] = useState<Account[]>([]);
  const [criando, setCriando] = useState(false);

  const [tipo, setTipo] = useState<RecurringRule['kind']>('income');
  const [descricao, setDescricao] = useState('');
  const [digits, setDigits] = useState('');
  const [dia, setDia] = useState('');
  const [contaId, setContaId] = useState<number | null>(null);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    const [lista, todasAsContas] = await Promise.all([
      listRecurring().catch(() => [] as RecurringRule[]),
      listAccounts().catch(() => [] as Account[]),
    ]);
    setRegras(lista);
    setContas(todasAsContas);
    setContaId((atual) => atual ?? todasAsContas[0]?.id ?? null);
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function criar() {
    const valor = centsFromDigits(digits);
    const diaNumero = Number(dia);

    if (!descricao.trim()) return setErro('Dê um nome — "mesada", "Spotify".');
    if (valor <= 0) return setErro('Quanto é?');
    if (!Number.isInteger(diaNumero) || diaNumero < 1 || diaNumero > 31) {
      return setErro('Em que dia do mês? (1 a 31)');
    }
    if (!contaId) return setErro('Crie uma conta antes.');

    setErro('');
    setSalvando(true);
    try {
      await createRecurring({
        account_id: contaId,
        kind: tipo,
        amount_cents: valor,
        day_of_month: diaNumero,
        description: descricao.trim(),
      });
      setDescricao('');
      setDigits('');
      setDia('');
      setCriando(false);
      await carregar();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível salvar.');
    } finally {
      setSalvando(false);
    }
  }

  async function alternar(regra: RecurringRule) {
    await updateRecurring(regra.id, { active: !regra.active }).catch(() => {});
    await carregar();
  }

  function apagar(regra: RecurringRule) {
    Alert.alert(
      'Apagar essa repetição?',
      'Ela para de gerar. Os lançamentos que já entraram continuam no extrato — o dinheiro entrou de verdade.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: async () => {
            await deleteRecurring(regra.id).catch(() => {});
            await carregar();
          },
        },
      ],
    );
  }

  return (
    <Screen>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Titulo chapeu="acontece sozinho" titulo="todo mês" />
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <AppText muted size={20}>
            ✕
          </AppText>
        </Pressable>
      </View>

      {regras.length === 0 && !criando ? (
        <Card alt>
          <AppText variant="title" size={15}>
            🔁 Nada se repetindo ainda
          </AppText>
          <AppText muted size={13} style={{ marginTop: 6 }}>
            A mesada que cai todo dia 5, a assinatura que sai todo dia 20. Você cadastra uma vez e
            o lançamento passa a aparecer sozinho no extrato.
          </AppText>
        </Card>
      ) : null}

      {regras.map((regra) => {
        const entrada = regra.kind === 'income';
        return (
          <Card key={regra.id} style={{ gap: 8, opacity: regra.active ? 1 : 0.55 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexShrink: 1 }}>
                <AppText variant="title" size={15} numberOfLines={1}>
                  {regra.description ?? (entrada ? 'Entrada' : 'Gasto')}
                </AppText>
                <AppText variant="mono" size={11} muted>
                  todo dia {regra.day_of_month}
                  {regra.active && regra.proxima_em ? ` · próxima dia ${diaDe(regra.proxima_em)}` : ''}
                  {regra.active ? '' : ' · pausada'}
                </AppText>
              </View>
              <AppText variant="mono" size={15} color={entrada ? theme.positive : theme.text}>
                {entrada ? '+' : '−'}
                {formatMoney(regra.amount_cents)}
              </AppText>
            </View>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                onPress={() => void alternar(regra)}
                style={[chipSkin(theme, false), { flex: 1, paddingVertical: 8, alignItems: 'center' }]}
              >
                <AppText size={12}>{regra.active ? 'pausar' : 'religar'}</AppText>
              </Pressable>
              <Pressable
                onPress={() => apagar(regra)}
                style={[chipSkin(theme, false), { paddingVertical: 8, paddingHorizontal: 16 }]}
              >
                <AppText size={12} color={theme.negative}>
                  apagar
                </AppText>
              </Pressable>
            </View>
          </Card>
        );
      })}

      {criando ? (
        <Card style={{ gap: 14 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(
              [
                { valor: 'income' as const, rotulo: 'Entra' },
                { valor: 'expense' as const, rotulo: 'Sai' },
              ]
            ).map((opcao) => {
              const ativo = opcao.valor === tipo;
              return (
                <Pressable
                  key={opcao.valor}
                  onPress={() => setTipo(opcao.valor)}
                  style={[chipSkin(theme, ativo), { flex: 1, paddingVertical: 10, alignItems: 'center' }]}
                >
                  <AppText variant="title" size={13} color={chipForeground(theme, ativo)}>
                    {opcao.rotulo}
                  </AppText>
                </Pressable>
              );
            })}
          </View>

          <Field
            label="O que é"
            value={descricao}
            onChangeText={setDescricao}
            placeholder={tipo === 'income' ? 'Mesada' : 'Spotify'}
          />

          <MoneyInput digits={digits} onChangeDigits={setDigits} label="quanto" />

          <Field
            label="Todo dia"
            value={dia}
            onChangeText={(t) => setDia(t.replace(/\D/g, '').slice(0, 2))}
            keyboardType="number-pad"
            placeholder="5"
          />

          {contas.length > 1 ? (
            <View style={{ gap: 8 }}>
              <AppText variant="label" muted style={{ textTransform: 'uppercase' }}>
                Em qual conta
              </AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {contas.map((conta) => {
                  const ativo = conta.id === contaId;
                  return (
                    <Pressable
                      key={conta.id}
                      onPress={() => setContaId(conta.id)}
                      style={[chipSkin(theme, ativo), { paddingVertical: 8, paddingHorizontal: 12 }]}
                    >
                      <AppText size={12} color={chipForeground(theme, ativo)}>
                        {conta.icon ? `${conta.icon} ` : ''}
                        {conta.name}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          {erro ? <AppText color={theme.negative}>{erro}</AppText> : null}

          <Button title="Salvar" onPress={criar} loading={salvando} />
          <Button title="Cancelar" variant="ghost" onPress={() => setCriando(false)} />
        </Card>
      ) : (
        <Button title="+ Nova repetição" variant="ghost" onPress={() => setCriando(true)} />
      )}

      <AppText variant="hand" muted size={14} style={{ textAlign: 'center' }}>
        o lançamento entra quando o dia chega, não antes
      </AppText>
    </Screen>
  );
}
