import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { TextInput, TouchableRipple } from 'react-native-paper';
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons';

import { Dialog } from '@components';
import { getTracker, useTheme } from '@hooks/persisted';
import { getString } from '@strings/translations';
import { SearchResult } from '@services/Trackers';
import { TrackSearchDialogProps } from './types';
import { showToast } from '@utils/showToast';
import { getErrorMessage } from '@utils/error';

const TrackSearchDialog: React.FC<TrackSearchDialogProps> = ({
  tracker,
  onTrackNovel,
  visible,
  onDismiss,
  novelName,
}) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchText, setSearchText] = useState(novelName);
  const [selectedNovel, setSelectedNovel] = useState<SearchResult>();

  const getSearchResults = useCallback(async () => {
    setLoading(true);
    try {
      const trackerObj = getTracker(tracker.name);
      const results = await trackerObj.handleSearch(searchText, tracker.auth);
      setSearchResults(results);
    } catch (error) {
      showToast(
        `Failed to fetch search results from ${tracker.name}: ${getErrorMessage(
          error,
        )}`,
      );
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }, [searchText, tracker.auth, tracker.name]);

  useEffect(() => {
    if (visible) {
      getSearchResults();
    }
  }, [getSearchResults, visible]);

  const handleSelectNovel = useCallback((item: SearchResult) => {
    setSelectedNovel(item);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchText('');
  }, []);

  const handleRemoveSelection = useCallback(() => {
    setSelectedNovel(undefined);
  }, []);

  const handleConfirm = useCallback(() => {
    if (selectedNovel) {
      onTrackNovel(tracker, selectedNovel);
    }
    onDismiss();
  }, [selectedNovel, onTrackNovel, tracker, onDismiss]);

  const renderSearchResultCard = useCallback(
    (item: SearchResult) => {
      const isSelected = selectedNovel?.id === item.id;

      return (
        <TouchableRipple
          style={[
            styles.searchResultCard,
            isSelected && {
              backgroundColor: theme.rippleColor,
            },
          ]}
          key={item.id}
          onPress={() => handleSelectNovel(item)}
          rippleColor={theme.rippleColor}
          borderless
        >
          <>
            {isSelected && (
              <MaterialCommunityIcons
                name="check-circle"
                color={theme.primary}
                size={24}
                style={styles.checkIcon}
              />
            )}
            <Image
              source={{ uri: item.coverImage }}
              style={styles.coverImage}
            />
            <Text
              style={[styles.resultText, { color: theme.onSurface }]}
              numberOfLines={3}
            >
              {item.title}
            </Text>
          </>
        </TouchableRipple>
      );
    },
    [
      selectedNovel,
      handleSelectNovel,
      theme.rippleColor,
      theme.primary,
      theme.onSurface,
    ],
  );

  return (
    <Dialog.Root visible={visible} onDismiss={onDismiss}>
      <Dialog.Title>{tracker.name}</Dialog.Title>
      <Dialog.Content>
        <TextInput
          value={searchText}
          onChangeText={setSearchText}
          onSubmitEditing={getSearchResults}
          textColor={theme.onSurface}
          theme={{
            colors: {
              primary: theme.primary,
              text: theme.onSurface,
            },
          }}
          style={styles.textInput}
          underlineColor={theme.outline}
          right={
            <TextInput.Icon
              color={theme.onSurfaceVariant}
              icon="close"
              onPress={handleClearSearch}
            />
          }
        />
      </Dialog.Content>
      <Dialog.ScrollArea>
        <ScrollView style={styles.scrollView}>
          {loading ? (
            <ActivityIndicator
              color={theme.primary}
              size={45}
              style={styles.loader}
            />
          ) : (
            searchResults.map(renderSearchResultCard)
          )}
        </ScrollView>
      </Dialog.ScrollArea>
      <Dialog.Actions>
        <Dialog.Action
          title={getString('common.remove')}
          onPress={handleRemoveSelection}
        />
        <Dialog.Action title={getString('common.cancel')} onPress={onDismiss} />
        <Dialog.Action title="OK" onPress={handleConfirm} />
      </Dialog.Actions>
    </Dialog.Root>
  );
};

export default TrackSearchDialog;

const styles = StyleSheet.create({
  checkIcon: {
    position: 'absolute',
    right: 8,
    top: 8,
    zIndex: 1,
  },
  coverImage: {
    borderRadius: 4,
    height: 150,
    width: 100,
  },
  loader: {
    margin: 16,
  },
  resultText: {
    flex: 1,
    flexWrap: 'wrap',
    fontSize: 16,
    marginLeft: 20,
    padding: 8,
    paddingLeft: 0,
  },
  scrollView: {
    flexGrow: 1,
    marginVertical: 8,
    maxHeight: 500,
  },
  searchResultCard: {
    borderRadius: 4,
    flexDirection: 'row',
    margin: 8,
  },
  textInput: {
    backgroundColor: 'transparent',
  },
});
