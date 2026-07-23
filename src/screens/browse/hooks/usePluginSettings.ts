import { useCallback, useEffect, useMemo, useState } from 'react';

import { Storage } from '@plugins/helpers/storage';
import { loadPlugin } from '@plugins/pluginManager';
import { PluginSetting } from '@plugins/types';

export type PluginSettingValue = boolean | string | string[];
export type PluginSettingValues = Record<string, PluginSettingValue>;
export type PluginSettingEntry = [string, PluginSetting];

export const usePluginSettings = (pluginId: string) => {
  const storage = useMemo(() => new Storage(pluginId), [pluginId]);
  const [isLoading, setIsLoading] = useState(true);
  const [entries, setEntries] = useState<PluginSettingEntry[]>([]);
  const [values, setValues] = useState<PluginSettingValues>({});

  useEffect(() => {
    let active = true;

    loadPlugin(pluginId).then(plugin => {
      if (!active) return;

      const nextEntries = Object.entries(
        plugin?.pluginSettings ?? {},
      ) as PluginSettingEntry[];
      const nextValues = Object.fromEntries(
        nextEntries.map(([key, setting]) => [
          key,
          storage.get(key) ?? setting.value,
        ]),
      );

      setEntries(nextEntries);
      setValues(nextValues);
      setIsLoading(false);
    });

    return () => {
      active = false;
    };
  }, [pluginId, storage]);

  const changeValue = useCallback((key: string, value: PluginSettingValue) => {
    setValues(current => ({ ...current, [key]: value }));
  }, []);

  const changeAndSaveValue = useCallback(
    (key: string, value: PluginSettingValue) => {
      changeValue(key, value);
      storage.set(key, value);
    },
    [changeValue, storage],
  );

  const saveTextValue = useCallback(
    (key: string, value: string) => storage.set(key, value),
    [storage],
  );

  return {
    changeAndSaveValue,
    changeValue,
    entries,
    isLoading,
    saveTextValue,
    values,
  };
};
