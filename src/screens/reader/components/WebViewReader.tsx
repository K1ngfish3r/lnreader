import React, { memo, useEffect, useMemo, useCallback } from 'react';
import { NativeEventEmitter, NativeModules, StatusBar } from 'react-native';
import WebView from 'react-native-webview';
import color from 'color';

import { useTheme } from '@hooks/persisted';
import { ChapterInfo } from '@database/types';
import { getString } from '@strings/translations';

import { getPlugin } from '@plugins/pluginManager';
import { MMKVStorage, getMMKVObject, setMMKVObject } from '@utils/mmkv/mmkv';
import {
  CHAPTER_GENERAL_SETTINGS,
  CHAPTER_READER_SETTINGS,
  ChapterGeneralSettings,
  ChapterReaderSettings,
  initialChapterGeneralSettings,
  initialChapterReaderSettings,
} from '@hooks/persisted/useSettings';
import { getBatteryLevelSync } from 'react-native-device-info';
import * as Speech from 'expo-speech';
import { PLUGIN_STORAGE } from '@utils/Storages';
import { useChapterContext } from '../ChapterContext';
import { showToast } from '@utils/showToast';

type WebViewPostEvent = {
  type: string;
  data?: { [key: string]: string | number };
};

type WebViewReaderProps = {
  html: string;
  nextChapter?: ChapterInfo;
  webViewRef: React.RefObject<WebView | null>;
  saveProgress(percentage: number): void;
  onPress(): void;
  navigateChapter(position: 'NEXT' | 'PREV'): void;
};

const onLogMessage = (payload: { nativeEvent: { data: string } }) => {
  let dataPayload;
  try {
    dataPayload = JSON.parse(payload.nativeEvent.data);
  } catch (e) {
    console.error(e);
  }
  if (dataPayload) {
    if (dataPayload.type === 'console') {
      console.info(`[Console] ${JSON.stringify(dataPayload.msg, null, 2)}`);
    }
  }
};

const { RNDeviceInfo } = NativeModules;
const deviceInfoEmitter = new NativeEventEmitter(RNDeviceInfo);

const assetsUriPrefix = __DEV__
  ? 'http://localhost:8081/assets'
  : 'file:///android_asset';

const WebViewReader: React.FC<WebViewReaderProps> = ({
  html,
  webViewRef,
  nextChapter,
  saveProgress,
  onPress,
  navigateChapter,
}) => {
  const { novel, chapter } = useChapterContext();
  const theme = useTheme();
  const readerSettings = useMemo(
    () =>
      getMMKVObject<ChapterReaderSettings>(CHAPTER_READER_SETTINGS) ||
      initialChapterReaderSettings,
    [],
  );
  const [batteryLevel, setBatteryLevel] = React.useState(getBatteryLevelSync());
  const plugin = getPlugin(novel?.pluginId);
  const pluginId = plugin?.id;
  const pluginLang = plugin?.lang;
  const rtlLanguages = ['ar', 'he', 'fa'];
  const RTL_INITIAL_SET_KEY = pluginId ? `RTL_INITIAL_SET_${pluginId}` : '';

  // Logic to set initial rtlMode based on plugin lang if not explicitly set
  // This needs to run before chapterGeneralSettings is memoized for the initial render
  if (pluginId && pluginLang) {
    // Proceed only if the initial check hasn't been done for this plugin
    if (MMKVStorage.getBoolean(RTL_INITIAL_SET_KEY) !== true) {
      const isRtlLanguage = rtlLanguages.includes(pluginLang);
      const currentSettings =
        getMMKVObject<ChapterGeneralSettings>(CHAPTER_GENERAL_SETTINGS) ||
        initialChapterGeneralSettings;

      if (currentSettings.rtlMode !== isRtlLanguage) {
         setMMKVObject(CHAPTER_GENERAL_SETTINGS, {
           ...currentSettings,
           rtlMode: isRtlLanguage,
         });
         // Show toast like in Tachi for WebToon
         if (isRtlLanguage) {
            showToast(getString('readerScreen.rtlEnabled'));
         }
      }
      // Mark that the check has been done for this plugin regardless of whether an update occurred
      MMKVStorage.set(RTL_INITIAL_SET_KEY, true);
    }
  }

  const chapterGeneralSettings = useMemo(
    () =>
      getMMKVObject<ChapterGeneralSettings>(CHAPTER_GENERAL_SETTINGS) ||
      initialChapterGeneralSettings,
    [],
  );
  const pluginCustomJS = `file://${PLUGIN_STORAGE}/${plugin?.id}/custom.js`;
  const pluginCustomCSS = `file://${PLUGIN_STORAGE}/${plugin?.id}/custom.css`;
  useEffect(() => {
    const mmkvListener = MMKVStorage.addOnValueChangedListener(key => {
      switch (key) {
        case CHAPTER_READER_SETTINGS:
          webViewRef.current?.injectJavaScript(
            `reader.readerSettings.val = ${MMKVStorage.getString(
              CHAPTER_READER_SETTINGS,
            )}`,
          );
          break;
        case CHAPTER_GENERAL_SETTINGS:
          webViewRef.current?.injectJavaScript(
            `reader.generalSettings.val = ${MMKVStorage.getString(
              CHAPTER_GENERAL_SETTINGS,
            )}`,
          );
          break;
      }
    });

    const subscription = deviceInfoEmitter.addListener(
      'RNDeviceInfo_batteryLevelDidChange',
      (level: number) => {
        setBatteryLevel(level);
        webViewRef.current?.injectJavaScript(
          `reader.batteryLevel.val = ${level}`,
        );
      },
    );

    return () => {
      subscription.remove();
      mmkvListener.remove();
    };
  }, []);

  const onMessage = useCallback(
    (ev: { nativeEvent: { data: string } }) => {
      __DEV__ && onLogMessage(ev);
      let event: WebViewPostEvent;
      try {
        event = JSON.parse(ev.nativeEvent.data);
      } catch (error) {
        console.error('Failed to parse WebView message:', error);
        return;
      }
      switch (event.type) {
        case 'hide':
          onPress();
          break;
        case 'next':
          navigateChapter('NEXT');
          break;
        case 'prev':
          navigateChapter('PREV');
          break;
        case 'save':
          if (typeof event.data === 'number') {
            saveProgress(event.data);
          } else {
            console.warn('Invalid data type for save event:', event.data);
          }
          break;
        case 'speak':
          if (typeof event.data === 'string') {
            Speech.speak(event.data, {
              onDone() {
                webViewRef.current?.injectJavaScript('tts.next?.()');
              },
              voice: readerSettings.tts?.voice?.identifier,
              pitch: readerSettings.tts?.pitch || 1,
              rate: readerSettings.tts?.rate || 1,
            });
          } else {
            console.warn('Invalid data type for speak event:', event.data);
            webViewRef.current?.injectJavaScript('tts.next?.()');
          }
          break;
        case 'stop-speak':
          Speech.stop();
          break;
      }
    },
    [
      webViewRef,
      onPress,
      navigateChapter,
      saveProgress,
      readerSettings.tts?.voice?.identifier,
      readerSettings.tts?.pitch,
      readerSettings.tts?.rate,
    ],
  );

  const getHtmlTemplate = useCallback(() => {
    return `
      <!DOCTYPE html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
            <link rel="stylesheet" href="${assetsUriPrefix}/css/index.css">
            <style>
            :root {
              --StatusBar-currentHeight: ${StatusBar.currentHeight}px;
              --readerSettings-theme: ${readerSettings.theme};
              --readerSettings-padding: ${readerSettings.padding}px;
              --readerSettings-textSize: ${readerSettings.textSize}px;
              --readerSettings-textColor: ${readerSettings.textColor};
              --readerSettings-textAlign: ${readerSettings.textAlign};
              --readerSettings-lineHeight: ${readerSettings.lineHeight};
              --readerSettings-fontFamily: ${readerSettings.fontFamily};
              --theme-primary: ${theme.primary};
              --theme-onPrimary: ${theme.onPrimary};
              --theme-secondary: ${theme.secondary};
              --theme-tertiary: ${theme.tertiary};
              --theme-onTertiary: ${theme.onTertiary};
              --theme-onSecondary: ${theme.onSecondary};
              --theme-surface: ${theme.surface};
              --theme-surface-0-9: ${color(theme.surface)
                .alpha(0.9)
                .toString()};
              --theme-onSurface: ${theme.onSurface};
              --theme-surfaceVariant: ${theme.surfaceVariant};
              --theme-onSurfaceVariant: ${theme.onSurfaceVariant};
              --theme-outline: ${theme.outline};
              --theme-rippleColor: ${theme.rippleColor};
              }
              body {
                direction: ${chapterGeneralSettings.rtlMode ? 'rtl' : 'ltr'};
              }
              
              @font-face {
                font-family: ${readerSettings.fontFamily};
                src: url("file:///android_asset/fonts/${
                  readerSettings.fontFamily
                }.ttf");
              }
              </style>

            <link rel="stylesheet" href="${pluginCustomCSS}">
            <style>${readerSettings.customCSS}</style>
          </head>
          <body class="${
            chapterGeneralSettings.pageReader ? 'page-reader' : ''
          }">
            <div id="LNReader-chapter">
              ${html}
            </div>
            <div id="reader-ui"></div>
            </body>
            <script>
              var initialReaderConfig = ${JSON.stringify({
                readerSettings,
                chapterGeneralSettings,
                novel,
                chapter,
                nextChapter,
                batteryLevel,
                autoSaveInterval: 2222,
                DEBUG: __DEV__,
                strings: {
                  finished: `${getString(
                    'readerScreen.finished',
                  )}: ${chapter.name.trim()}`,
                  nextChapter: getString('readerScreen.nextChapter', {
                    name: nextChapter?.name,
                  }),
                  noNextChapter: getString('readerScreen.noNextChapter'),
                },
              })}
            </script>
            <script src="${assetsUriPrefix}/js/icons.js"></script>
            <script src="${assetsUriPrefix}/js/van.js"></script>
            <script src="${assetsUriPrefix}/js/text-vibe.js"></script>
            <script src="${assetsUriPrefix}/js/core.js"></script>
            <script src="${assetsUriPrefix}/js/index.js"></script>
            <script src="${pluginCustomJS}"></script>
            <script>
              ${readerSettings.customJS}
            </script>
        </html>
        `;
  }, [
    html,
    readerSettings,
    chapterGeneralSettings,
    theme,
    novel,
    chapter,
    nextChapter,
    batteryLevel,
    pluginCustomCSS,
    pluginCustomJS,
    assetsUriPrefix
  ]);

  return (
    <WebView
      ref={webViewRef}
      style={{ backgroundColor: readerSettings.theme }}
      allowFileAccess={true}
      originWhitelist={['*']}
      scalesPageToFit={true}
      showsVerticalScrollIndicator={false}
      javaScriptEnabled={true}
      onMessage={onMessage}
      source={{
        baseUrl: !chapter.isDownloaded ? plugin?.site : undefined,
        headers: plugin?.imageRequestInit?.headers,
        method: plugin?.imageRequestInit?.method,
        body: plugin?.imageRequestInit?.body,
        html: getHtmlTemplate(),
      }}
    />
  );
};

export default memo(WebViewReader);
