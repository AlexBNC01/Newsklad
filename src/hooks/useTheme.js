import { StyleSheet } from 'react-native';
import { useData } from '../context/DataContext';

export const useTheme = () => {
  const { isDarkTheme, getThemeColors } = useData();
  const themeColors = getThemeColors();

  const createThemedStyles = (styles) => {
    return StyleSheet.create(styles(themeColors));
  };

  return {
    isDarkTheme,
    themeColors,
    createThemedStyles,
  };
};