import { useTheme } from '../context/ThemeContext.jsx';

export function useDarkMode() {
  const { dark, toggle, setDark } = useTheme();
  return { dark, toggle, setDark };
}
