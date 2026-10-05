/**
 * Accounts Screen for Wini.
 * Where it fits: Reachable via the Accounts route (`/accounts`).
 *
 * Displays net worth breakdown, account cards (Bank, Cash, Investments),
 * and the first-run "Add your accounts" prompt when only Cash exists.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Card, Button, SectionHeader, AmountText } from '../src/ui/kit';
import { colors, spacing, typography, radii } from '../src/ui/tokens';
import { WalletIcon, PlusIcon } from '../src/ui/icons';
import { getRepository } from '../src/db';
import { AccountWithBalance } from '../src/domain/types';

export default function AccountsScreen() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [netWorth, setNetWorth] = useState({ totalPaise: 0, bankPaise: 0, cashPaise: 0, investmentPaise: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const repo = getRepository();

    Promise.all([
      repo.getAllAccountsWithBalances(),
      repo.getTotalBalancePaise(),
    ])
      .then(([accList, totals]) => {
        if (active) {
          setAccounts(accList);
          setNetWorth(totals);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          console.error('Failed to load accounts:', err);
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  // First-run condition: user only has the default Cash account
  const onlyHasCash = accounts.length <= 1 && accounts.every((a) => a.type === 'cash');

  return (
    <Screen scrollable safeAreaEdges={['top', 'bottom', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
          <Text style={styles.backArrow}>←</Text>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Accounts</Text>
        <Text style={styles.subtitle}>Net Worth &amp; Balances</Text>
      </View>

      {/* Net Worth Summary Card */}
      <Card variant="surface" style={styles.summaryCard}>
        <Text style={styles.metricLabel}>Total Net Worth</Text>
        <AmountText amountPaise={netWorth.totalPaise} size="hero" style={styles.heroAmount} />

        <View style={styles.tilesRow}>
          <View style={styles.tile}>
            <Text style={styles.tileLabel}>Bank</Text>
            <AmountText amountPaise={netWorth.bankPaise} size="md" />
          </View>
          <View style={styles.tile}>
            <Text style={styles.tileLabel}>Cash</Text>
            <AmountText amountPaise={netWorth.cashPaise} size="md" />
          </View>
          <View style={styles.tile}>
            <Text style={styles.tileLabel}>Investments</Text>
            <AmountText amountPaise={netWorth.investmentPaise} size="md" />
          </View>
        </View>
      </Card>

      {/* First-Run Prompt: Add Your Accounts (Non-blocking) */}
      {onlyHasCash && !loading && (
        <Card variant="elevated" style={styles.promptCard}>
          <View style={styles.promptHeader}>
            <Text style={styles.promptEmoji}>🏦</Text>
            <View style={styles.promptTextWrap}>
              <Text style={styles.promptTitle}>Add your accounts</Text>
              <Text style={styles.promptDescription}>
                You currently only have Cash. Add your bank accounts, credit cards, or investments
                to track balances and see your complete financial picture.
              </Text>
            </View>
          </View>
          <View style={styles.promptActionRow}>
            <Button
              title="Add Account"
              variant="primary"
              size="md"
              icon={<PlusIcon size={16} color={colors.white} />}
              onPress={() => {
                // Future account creation sheet trigger
              }}
            />
          </View>
        </Card>
      )}

      {/* Accounts List */}
      <SectionHeader title="Your Accounts" subtitle={`${accounts.length} active`} />
      <View style={styles.accountsStack}>
        {accounts.map((acc) => (
          <Card key={acc.id} variant="surface" style={styles.accountCard}>
            <View style={styles.accountCardRow}>
              <View style={styles.accountIconBox}>
                <WalletIcon size={20} color={colors.text} />
              </View>
              <View style={styles.accountInfo}>
                <Text style={styles.accountName}>{acc.name}</Text>
                <Text style={styles.accountType}>
                  {acc.type.toUpperCase()}{acc.institution ? ` • ${acc.institution}` : ''}
                </Text>
              </View>
              <AmountText amountPaise={acc.balance_paise} size="lg" />
            </View>
          </Card>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  backArrow: {
    color: colors.primary,
    fontSize: typography.sizeLg,
    marginRight: spacing.xs,
  },
  backText: {
    color: colors.primary,
    fontFamily: typography.bodySemiBold,
    fontSize: typography.sizeSm,
  },
  title: {
    color: colors.text,
    fontFamily: typography.bodyBold,
    fontSize: typography.sizeXxl,
  },
  subtitle: {
    color: colors.muted,
    fontFamily: typography.body,
    fontSize: typography.sizeSm,
    marginTop: 2,
  },
  summaryCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  metricLabel: {
    color: colors.muted,
    fontFamily: typography.bodyMedium,
    fontSize: typography.sizeSm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroAmount: {
    marginVertical: spacing.sm,
  },
  tilesRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  tile: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    padding: spacing.sm,
    alignItems: 'center',
  },
  tileLabel: {
    color: colors.muted,
    fontFamily: typography.body,
    fontSize: typography.sizeXs,
    marginBottom: 4,
  },
  promptCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  promptHeader: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  promptEmoji: {
    fontSize: 32,
  },
  promptTextWrap: {
    flex: 1,
  },
  promptTitle: {
    color: colors.text,
    fontFamily: typography.bodyBold,
    fontSize: typography.sizeBase,
    marginBottom: 4,
  },
  promptDescription: {
    color: colors.muted,
    fontFamily: typography.body,
    fontSize: typography.sizeSm,
    lineHeight: typography.lineHeightMd,
  },
  promptActionRow: {
    alignItems: 'flex-start',
  },
  accountsStack: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.xxl,
  },
  accountCard: {
    padding: spacing.md,
  },
  accountCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountIconBox: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    color: colors.text,
    fontFamily: typography.bodySemiBold,
    fontSize: typography.sizeBase,
  },
  accountType: {
    color: colors.muted,
    fontFamily: typography.body,
    fontSize: typography.sizeXs,
    marginTop: 2,
  },
});
