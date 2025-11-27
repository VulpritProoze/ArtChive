import { useCallback, useMemo, useState } from 'react';

interface CommentFormState {
  text: string;
  post_id: string;
}

const buildInitialForm = (initial?: Partial<CommentFormState>): CommentFormState => ({
  text: '',
  post_id: '',
  ...initial,
});

export const useCommentForm = (initial?: Partial<CommentFormState>) => {
  const [form, setForm] = useState<CommentFormState>(() => buildInitialForm(initial));

  const handleChange = useCallback((value: string) => {
    setForm((prev) => ({ ...prev, text: value }));
  }, []);

  const setPostId = useCallback((postId: string) => {
    setForm((prev) => ({ ...prev, post_id: postId }));
  }, []);

  const resetForm = useCallback(() => {
    setForm(buildInitialForm(initial));
  }, [initial]);

  return useMemo(
    () => ({
      form,
      handleChange,
      setPostId,
      resetForm,
      setForm,
    }),
    [form, handleChange, setPostId, resetForm, setForm],
  );
};

