/**
 * AccountCard Component
 * Pure presentational card matching Figma frame #1157:7 (sbi-card).
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { theme } from '../theme';
import { ArrowUpRightIcon, CreditCardIcon, RefreshCwIcon } from './FigmaIcons';

export interface AccountCardProps {
  bankName: string;
  accountNumberMasked: string; // e.g. "xx0430"
  balance: string; // e.g. "₹6,386"
  lastSynced?: string; // e.g. "04:55 PM • 5, Oct"
  secondaryAmount?: string; // e.g. "₹16,538"
  renderLogo?: () => React.ReactNode;
  onPress?: () => void;
  onPressArrow?: () => void;
  onRefresh?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const AccountCard: React.FC<AccountCardProps> = ({
  bankName,
  accountNumberMasked,
  balance,
  lastSynced,
  secondaryAmount,
  renderLogo,
  onPress,
  onPressArrow,
  onRefresh,
  style,
}) => {
  const content = (
    <View style={[styles.outerContainer, style]}>
      {/* Background with grain texture and blue overlay */}
      <ImageBackground
        source={require('../../../assets/images/gradient-noise-texture.png')}
        style={styles.imageBackground}
        imageStyle={styles.imageStyle}
      >
        <View style={styles.colorTintOverlay} />

        {/* Card Content Layout */}
        <View style={styles.content}>
          {/* Card Top Row: Logo badge & Balance */}
          <View style={styles.topRow}>
            {/* Logo Badge */}
            <View style={styles.logoBadge}>
              {renderLogo ? (
                renderLogo()
              ) : (
                <View style={styles.defaultLogoDot} />
              )}
            </View>

            {/* Balance + Up-Right Arrow Button */}
            <View style={styles.balanceRow}>
              <Text style={styles.balanceText}>{balance}</Text>
              <TouchableOpacity
                onPress={onPressArrow || onPress}
                style={styles.arrowBadge}
                activeOpacity={0.7}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <ArrowUpRightIcon size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Spacer */}
          <View style={styles.spacer} />

          {/* Card Bottom Row: Bank Name, Timestamp & Secondary Amount, Refresh */}
          <View style={styles.bottomRow}>
            {/* Bank details */}
            <View style={styles.bankColumn}>
              <Text style={styles.bankNameText} numberOfLines={1}>
                {bankName}
              </Text>
              <Text style={styles.maskedText} numberOfLines={1}>
                {accountNumberMasked}
              </Text>
            </View>

            {/* Sync timestamp & secondary card amount */}
            {(lastSynced || secondaryAmount) && (
              <View style={styles.metaColumn}>
                {lastSynced ? (
                  <Text style={styles.timestampText} numberOfLines={1}>
                    {lastSynced}
                  </Text>
                ) : null}
                {secondaryAmount ? (
                  <View style={styles.secondaryRow}>
                    <CreditCardIcon size={13} color="rgba(255, 255, 255, 0.8)" />
                    <Text style={styles.secondaryText}>{secondaryAmount}</Text>
                  </View>
                ) : null}
              </View>
            )}

            {/* Refresh circular button */}
            {onRefresh ? (
              <TouchableOpacity
                onPress={onRefresh}
                style={styles.refreshButton}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <RefreshCwIcon size={16} color="#FFFFFF" />
              </TouchableOpacity>
            ) : (
              <View style={styles.refreshButton}>
                <RefreshCwIcon size={16} color="#FFFFFF" />
              </View>
            )}
          </View>
        </View>
      </ImageBackground>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  outerContainer: {
    height: theme.dimensions.accountCardHeight,
    borderRadius: theme.radii.accountCard,
    borderWidth: 1,
    borderColor: theme.colors.accountCard.border,
    overflow: 'hidden',
    alignSelf: 'stretch',
    backgroundColor: '#0A5CC7',
    ...theme.shadows.accountCard,
  },
  imageBackground: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  imageStyle: {
    resizeMode: 'cover',
    borderRadius: theme.radii.accountCard,
    opacity: 0.95,
  },
  colorTintOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10, 92, 199, 0.55)',
  },
  content: {
    flex: 1,
    padding: 18,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  logoBadge: {
    width: theme.dimensions.accountLogoBadge,
    height: theme.dimensions.accountLogoBadge,
    borderRadius: 12,
    backgroundColor: theme.colors.accountCard.badgeBg,
    borderWidth: 1,
    borderColor: theme.colors.accountCard.badgeBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultLogoDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  balanceText: {
    ...theme.typography.accountBalance,
  },
  arrowBadge: {
    width: 26,
    height: 26,
    borderRadius: theme.radii.arrowBadge,
    backgroundColor: theme.colors.accountCard.arrowBadgeBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spacer: {
    flex: 1,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    alignSelf: 'stretch',
  },
  bankColumn: {
    gap: 2,
    justifyContent: 'flex-end',
  },
  bankNameText: {
    ...theme.typography.accountBankName,
  },
  maskedText: {
    ...theme.typography.accountMasked,
  },
  metaColumn: {
    alignItems: 'flex-end',
    gap: 3,
    justifyContent: 'flex-end',
  },
  timestampText: {
    ...theme.typography.accountTimestamp,
  },
  secondaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  secondaryText: {
    ...theme.typography.accountSecondary,
  },
  refreshButton: {
    width: 30,
    height: 30,
    borderRadius: theme.radii.refreshBtn,
    backgroundColor: theme.colors.accountCard.refreshBtnBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
