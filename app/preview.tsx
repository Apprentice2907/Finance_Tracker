/**
 * Preview Screen for testing dashboard UI against Figma frame "Android Compact - 1" (#1128:2).
 * Implements exact section spacings, 137dp solid black footer, and centered 72x72 mic orb.
 */

import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../src/ui/theme';
import {
  HeroCashflow,
  SectionHeader,
  TransactionRow,
  AccountCard,
  DarkMicrophoneFooter,
} from '../src/ui/components';

export default function PreviewScreen() {
  const insets = useSafeAreaInsets();

  // ScrollView paddingBottom = footerHeight + 24 (137 + 24 = 161) so Accounts card scrolls fully clear of footer
  const scrollBottomPadding =
    theme.spacing.footerHeight +
    theme.spacing.footerTopGap +
    Math.max(0, insets.bottom - theme.spacing.footerBottomGap);

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />

      {/* 1. Scrollable Dashboard Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: scrollBottomPadding,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Cashflow with exact 3x Figma blobs */}
        <HeroCashflow amount="-₹1,240" label="TOTAL CASHFLOW" />

        {/* Content sections with exact Figma vertical gaps */}
        <View style={styles.contentSections}>
          {/* Recent Transactions Section */}
          <View style={styles.recentTransactionsSection}>
            <SectionHeader title="RECENT TRANSACTIONS" rightText="5 items" />

            <View style={styles.transactionList}>
              <TransactionRow
                date="12 Oct"
                time="01:37 AM"
                title="Coffee and tea"
                type="Expense"
                amount="-₹40"
                categoryIcon="coffee"
              />

              <TransactionRow
                date="11 Oct"
                time="08:20 PM"
                title="Groceries"
                type="Expense"
                amount="-₹3,191"
                categoryIcon="shopping-bag"
              />

              <TransactionRow
                date="11 Oct"
                time="05:10 PM"
                title="Salary"
                type="Income"
                amount="+₹2,500"
                categoryIcon="briefcase"
              />

              <TransactionRow
                date="10 Oct"
                time="09:45 AM"
                title="Fuel"
                type="Expense"
                amount="-₹310"
                categoryIcon="car"
              />

              <TransactionRow
                date="09 Oct"
                time="07:30 PM"
                title="Recharge"
                type="Expense"
                amount="-₹199"
                categoryIcon="smartphone"
              />
            </View>
          </View>

          {/* Accounts Section */}
          <View style={styles.accountsSection}>
            <SectionHeader title="ACCOUNTS" rightText=">" />

            <AccountCard
              bankName="SBI"
              accountNumberMasked="xx0430"
              balance="₹6,386"
              lastSynced="04:55 PM • 5, Oct"
              secondaryAmount="₹16,538"
              onPress={() => console.log('Account card pressed')}
              onRefresh={() => console.log('Refresh pressed')}
            />
          </View>
        </View>
      </ScrollView>

      {/* 2. Fixed Solid Black Footer (#1157:34) housing 72x72 Mic Orb */}
      <DarkMicrophoneFooter
        onPressMic={() => console.log('Mic pressed')}
        bottomInset={insets.bottom}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    // paddingBottom dynamically set to footerHeight + 24 (161dp)
  },
  contentSections: {
    paddingHorizontal: theme.spacing.horizontalPadding, // 20px
    marginTop: theme.spacing.heroToRecentTransactionsGap, // Exact 40dp gap from hero blobs bottom
  },
  recentTransactionsSection: {
    gap: theme.spacing.sectionHeaderToContentGap, // Exact 12dp gap to rows
  },
  transactionList: {
    gap: theme.spacing.rowGap, // Exact 10dp gap between cards
  },
  accountsSection: {
    marginTop: theme.spacing.lastTransactionToAccountsGap, // Exact 30dp gap from last transaction
    gap: theme.spacing.sectionHeaderToContentGap, // Exact 12dp gap to card
  },
});
