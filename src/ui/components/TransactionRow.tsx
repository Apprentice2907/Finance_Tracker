/**
 * TransactionRow Component
 * Pure presentational card row matching Figma frame #1143:13.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { theme } from '../theme';
import {
  CoffeeIcon,
  ShoppingBagIcon,
  BriefcaseIcon,
  CarIcon,
  SmartphoneIcon,
} from './FigmaIcons';

export type CategoryIconType =
  | 'coffee'
  | 'shopping-bag'
  | 'shopping'
  | 'briefcase'
  | 'salary'
  | 'car'
  | 'fuel'
  | 'smartphone'
  | 'recharge'
  | string;

export interface TransactionRowProps {
  date: string;
  time: string;
  title: string;
  type?: 'Expense' | 'Income' | string;
  amount: string; // e.g. "-₹40" or "+₹2,500"
  categoryIcon?: CategoryIconType;
  renderCustomIcon?: () => React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

function resolveIcon(iconKey?: CategoryIconType): React.ReactNode {
  const normalized = (iconKey || '').toLowerCase();
  switch (normalized) {
    case 'coffee':
    case 'tea':
    case 'coffee and tea':
    case 'food':
    case 'cafe':
      return <CoffeeIcon size={theme.dimensions.iconSize} color="#FFFFFF" />;
    case 'shopping-bag':
    case 'shopping':
    case 'groceries':
    case 'grocery':
      return <ShoppingBagIcon size={theme.dimensions.iconSize} color="#FFFFFF" />;
    case 'briefcase':
    case 'salary':
    case 'work':
    case 'business':
    case 'income':
      return <BriefcaseIcon size={theme.dimensions.iconSize} color="#FFFFFF" />;
    case 'car':
    case 'fuel':
    case 'travel':
    case 'transport':
      return <CarIcon size={theme.dimensions.iconSize} color="#FFFFFF" />;
    case 'smartphone':
    case 'phone':
    case 'recharge':
    case 'bills':
    case 'mobile':
      return <SmartphoneIcon size={theme.dimensions.iconSize} color="#FFFFFF" />;
    default:
      return <CoffeeIcon size={theme.dimensions.iconSize} color="#FFFFFF" />;
  }
}

export const TransactionRow: React.FC<TransactionRowProps> = ({
  date,
  time,
  title,
  type = 'Expense',
  amount,
  categoryIcon = 'coffee',
  renderCustomIcon,
  onPress,
  style,
}) => {
  const content = (
    <View style={[styles.card, style]}>
      {/* Date & Time Column */}
      <View style={styles.metaColumn}>
        <Text style={styles.dateText} numberOfLines={1}>
          {date}
        </Text>
        <Text style={styles.timeText} numberOfLines={1}>
          {time}
        </Text>
      </View>

      {/* Circular Dark Icon Container */}
      <View style={styles.iconContainer}>
        {renderCustomIcon ? renderCustomIcon() : resolveIcon(categoryIcon)}
      </View>

      {/* Title & Type Column */}
      <View style={styles.titleColumn}>
        <Text style={styles.titleText} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.typeText} numberOfLines={1}>
          {type}
        </Text>
      </View>

      {/* Right Aligned Amount */}
      <Text style={styles.amountText} numberOfLines={1}>
        {amount}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.cardBorder,
    borderWidth: 1,
    borderRadius: theme.radii.rowCard,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    alignSelf: 'stretch',
  },
  metaColumn: {
    width: 92,
    gap: 2,
    justifyContent: 'center',
  },
  dateText: {
    ...theme.typography.rowDate,
  },
  timeText: {
    ...theme.typography.rowTime,
  },
  iconContainer: {
    width: theme.dimensions.iconContainerSize,
    height: theme.dimensions.iconContainerSize,
    borderRadius: theme.radii.circleIcon,
    backgroundColor: theme.colors.cardInnerCircle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleColumn: {
    flex: 1,
    gap: 2,
    justifyContent: 'center',
  },
  titleText: {
    ...theme.typography.rowTitle,
  },
  typeText: {
    ...theme.typography.rowSubtitle,
  },
  amountText: {
    ...theme.typography.rowAmount,
    textAlign: 'right',
  },
});
