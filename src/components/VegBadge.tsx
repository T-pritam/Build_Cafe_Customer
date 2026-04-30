import React from 'react';
import {View, StyleSheet} from 'react-native';
import {Colors} from '../theme';

interface Props {
  isVeg: boolean;
}

export const VegBadge: React.FC<Props> = ({isVeg}) => (
  <View style={[styles.box, {borderColor: isVeg ? Colors.veg : '#dc2626'}]}>
    <View
      style={[
        styles.dot,
        {backgroundColor: isVeg ? Colors.veg : '#dc2626'},
      ]}
    />
  </View>
);

const styles = StyleSheet.create({
  box: {
    width: 14,
    height: 14,
    borderWidth: 2,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
