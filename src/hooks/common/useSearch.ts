import { useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';

const useSearch = (defaultSearchText?: string, clearSearchOnUnfocus = true) => {
  const navigation = useNavigation();

  const [searchText, setSearchText] = useState<string>(defaultSearchText || '');

  const clearSearchbar = useCallback(() => setSearchText(''), []);

  useEffect(() => {
    if (!clearSearchOnUnfocus) {
      return;
    }

    return navigation.addListener('blur', clearSearchbar);
  }, [clearSearchbar, clearSearchOnUnfocus, navigation]);

  return useMemo(
    () => ({ searchText, setSearchText, clearSearchbar }),
    [searchText, setSearchText, clearSearchbar],
  );
};

export default useSearch;
