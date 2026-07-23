import { act, renderHook } from '@testing-library/react-native';

import useSearch from '../useSearch';

const mockAddListener = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    addListener: mockAddListener,
  }),
}));

describe('useSearch', () => {
  beforeEach(() => {
    mockAddListener.mockReset();
    mockAddListener.mockReturnValue(jest.fn());
  });

  it('clears search text from a blur listener without subscribing to focus', () => {
    const { result } = renderHook(() => useSearch('query'));

    expect(mockAddListener).toHaveBeenCalledWith('blur', expect.any(Function));

    const onBlur = mockAddListener.mock.calls[0][1];
    act(onBlur);

    expect(result.current.searchText).toBe('');
  });

  it('does not register a blur listener when clearing is disabled', () => {
    const { result } = renderHook(() => useSearch('query', false));

    expect(mockAddListener).not.toHaveBeenCalled();
    expect(result.current.searchText).toBe('query');
  });
});
