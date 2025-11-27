import { useCallback, useMemo, useState } from 'react';
import type { PostForm } from '@types';

const emptyChapter = { chapter: '', content: '' };

const buildInitialForm = (initial?: Partial<PostForm>): PostForm => ({
  description: '',
  post_type: 'default',
  image_url: null,
  video_url: null,
  chapters: [{ ...emptyChapter }],
  channel_id: initial?.channel_id,
  ...initial,
});

export const usePostForm = (initial?: Partial<PostForm>) => {
  const [form, setForm] = useState<PostForm>(() => buildInitialForm(initial));

  const handleFieldChange = useCallback(
    <K extends keyof PostForm>(field: K, value: PostForm[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const handleChapterChange = useCallback((index: number, field: 'chapter' | 'content', value: string) => {
    setForm((prev) => {
      const chapters = [...prev.chapters];
      chapters[index] = { ...chapters[index], [field]: value };
      return { ...prev, chapters };
    });
  }, []);

  const addChapter = useCallback(() => {
    setForm((prev) => ({ ...prev, chapters: [...prev.chapters, { ...emptyChapter }] }));
  }, []);

  const removeChapter = useCallback((index: number) => {
    setForm((prev) => {
      if (prev.chapters.length === 1) {
        return prev;
      }
      const chapters = prev.chapters.filter((_, idx) => idx !== index);
      return { ...prev, chapters };
    });
  }, []);

  const resetForm = useCallback(() => {
    setForm(buildInitialForm(initial));
  }, [initial]);

  const helpers = useMemo(
    () => ({
      handleFieldChange,
      handleChapterChange,
      addChapter,
      removeChapter,
      resetForm,
      setForm,
    }),
    [handleFieldChange, handleChapterChange, addChapter, removeChapter, resetForm],
  );

  return { form, ...helpers };
};


