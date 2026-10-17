import { useCallback } from 'react';

export function useComposerKeyboard(onSubmit) {
  return useCallback(
    (event) => {
      if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) {
        return;
      }

      event.preventDefault();
      onSubmit(event);
    },
    [onSubmit],
  );
}

export default useComposerKeyboard;
