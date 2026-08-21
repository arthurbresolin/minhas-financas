import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { createGoal, deleteGoal, listGoals, updateGoal } from '@/api';
import { ApiError } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { MoneyInput } from '@/components/ui/money-input';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { centsFromDigits } from '@/lib/format';
import { chipSkin } from '@/theme/style';
import { useTheme } from '@/theme/use-theme';

/** Um punhado de caras pro pote. Escolher emoji num teclado é trabalho demais. */
const EMOJIS = ['🏝️', '🎧', '🚗', '🏠', '💻', '🎮', '🎓', '✈️', '🐶', '💍', '🛟', '🫙'];

export default function MetaScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editando = id !== undefined;

  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const [digits, setDigits] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!editando) return;
    void (async () => {
      try {
        const goal = (await listGoals()).find((item) => String(item.id) === id);
        if (!goal) return;
        setName(goal.name);
        setEmoji(goal.emoji ?? EMOJIS[0]);
        setDigits(String(goal.target_cents));
      } catch {
        setErro('Não foi possível carregar a meta.');
      }
    })();
  }, [editando, id]);

  const alvo = centsFromDigits(digits);

  async function salvar() {
    if (!name.trim()) {
      setErro('Dê um nome ao pote.');
      return;
    }
    if (alvo <= 0) {
      setErro('Quanto você quer juntar?');
      return;
    }
    setSalvando(true);
    setErro('');
    try {
      if (editando) await updateGoal(Number(id), { name: name.trim(), emoji, target_cents: alvo });
      else await createGoal({ name: name.trim(), emoji, target_cents: alvo });
      router.back();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível salvar.');
    } finally {
      setSalvando(false);
    }
  }

  async function apagar() {
    if (!editando) return;
    setSalvando(true);
    try {
      await deleteGoal(Number(id));
      router.back();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível apagar.');
      setSalvando(false);
    }
  }

  return (
    <Screen tabBar={false}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <AppText variant="condensed" size={22}>
          {editando ? 'EDITAR POTE' : 'NOVO POTE'}
        </AppText>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <AppText muted size={20}>
            ✕
          </AppText>
        </Pressable>
      </View>

      <View style={{ gap: 8 }}>
        <AppText variant="label" muted style={{ textTransform: 'uppercase' }}>
          Cara do pote
        </AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {EMOJIS.map((opcao) => {
            const ativo = opcao === emoji;
            return (
              <Pressable
                key={opcao}
                onPress={() => setEmoji(opcao)}
                style={[chipSkin(theme, ativo), { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' }]}
              >
                <AppText size={20}>{opcao}</AppText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Field label="Nome" value={name} onChangeText={setName} placeholder="Trip dos cria" />

      <MoneyInput label="quero juntar" digits={digits} onChangeDigits={setDigits} />

      {erro ? <AppText color={theme.negative}>{erro}</AppText> : null}

      <Button title={editando ? 'Salvar' : 'Criar pote'} onPress={salvar} loading={salvando} />

      {editando ? (
        // Apagar um pote apaga o histórico dele junto — por isso fica no fim,
        // discreto, e não ao lado do botão de salvar.
        <Button title="Apagar pote" variant="danger" onPress={apagar} disabled={salvando} />
      ) : null}
    </Screen>
  );
}
