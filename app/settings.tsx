import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { colors, radii, spacing } from '../src/ui/tokens';
import { useAppStore } from '../src/state/useAppStore';
import { TrashIcon } from '../src/ui/icons';

export default function SettingsScreen() {
  const { categories, keywords, deleteKeyword, showBanner } = useAppStore();

  const handleDeleteKeyword = async (id: string, word: string) => {
    await deleteKeyword(id);
    showBanner(`Removed "${word}" from learned keywords.`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>Categories, learned vocabulary & preferences</Text>
        </View>

        {/* Section: Learned Keywords */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Learned Keywords</Text>
            <Text style={styles.sectionBadge}>{keywords.length}</Text>
          </View>
          <Text style={styles.sectionDesc}>
            Wini automatically remembers words you assign to categories.
          </Text>

          {keywords.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                No learned keywords yet. When you confirm or edit a word's category, Wini will remember it here!
              </Text>
            </View>
          ) : (
            <View style={styles.card}>
              {keywords.map((kw, idx) => (
                <View
                  key={kw.id}
                  style={[
                    styles.keywordRow,
                    idx === keywords.length - 1 && styles.rowLast,
                  ]}
                >
                  <View style={styles.keywordInfo}>
                    <Text style={styles.keywordWord}>"{kw.word}"</Text>
                    <View style={styles.categoryPill}>
                      <Text style={styles.categoryEmoji}>{kw.category_emoji || '✨'}</Text>
                      <Text style={styles.categoryName}>{kw.category_name || 'General'}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeleteKeyword(kw.id, kw.word)}
                    hitSlop={8}
                    style={styles.deleteBtn}
                  >
                    <TrashIcon size={18} color={colors.muted} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Section: Categories */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Categories</Text>
            <Text style={styles.sectionBadge}>{categories.length}</Text>
          </View>

          <View style={styles.card}>
            {categories.map((cat, idx) => (
              <View
                key={cat.id}
                style={[
                  styles.categoryRow,
                  idx === categories.length - 1 && styles.rowLast,
                ]}
              >
                <View style={styles.catLeft}>
                  <View
                    style={[
                      styles.catEmojiWrap,
                      { backgroundColor: `${cat.color}22` },
                    ]}
                  >
                    <Text style={styles.catEmojiText}>{cat.emoji}</Text>
                  </View>
                  <View>
                    <Text style={styles.catTitle}>{cat.name}</Text>
                    <Text style={styles.catSubtitle}>{cat.kind === 'income' ? 'Income' : 'Expense'}</Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.colorIndicator,
                    { backgroundColor: cat.color },
                  ]}
                />
              </View>
            ))}
          </View>
        </View>

        {/* Section: App Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={[styles.card, { padding: spacing.lg }]}>
            <Text style={styles.aboutName}>Wini 🛺</Text>
            <Text style={styles.aboutVersion}>Version 1.0.0 (Expo SDK 57)</Text>
            <Text style={styles.aboutDesc}>
              Personal, voice-first, local-first expense tracker. Your financial data stays entirely on your phone.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  header: {
    marginBottom: spacing.xl,
    paddingTop: 8,
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 2,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  sectionBadge: {
    backgroundColor: colors.elevated,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.round,
  },
  sectionDesc: {
    color: colors.muted,
    fontSize: 13,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderColor: colors.border,
    borderWidth: 1,
    overflow: 'hidden',
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderColor: colors.border,
    borderWidth: 1,
    padding: spacing.lg,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  keywordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  keywordInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  keywordWord: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.elevated,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.round,
  },
  categoryEmoji: {
    fontSize: 12,
    marginRight: 4,
  },
  categoryName: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  deleteBtn: {
    padding: spacing.xs,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  catLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  catEmojiWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catEmojiText: {
    fontSize: 18,
  },
  catTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  catSubtitle: {
    color: colors.muted,
    fontSize: 12,
  },
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  aboutName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  aboutVersion: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  aboutDesc: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
});
