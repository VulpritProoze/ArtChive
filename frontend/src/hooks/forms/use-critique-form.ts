import { useCallback, useMemo, useState } from 'react';

interface CritiqueFormState {
  text: string;
  impression: string;
  post_id: string;
}

const buildInitialForm = (initial?: Partial<CritiqueFormState>): CritiqueFormState => ({
  text: '',
  impression: 'positive',
  post_id: '',
  ...initial,
});

export const useCritiqueForm = (initial?: Partial<CritiqueFormState>) => {
  const [form, setForm] = useState<CritiqueFormState>(() => buildInitialForm(initial));

  const handleFieldChange = useCallback(
    <K extends keyof CritiqueFormState>(field: K, value: CritiqueFormState[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const resetForm = useCallback(() => {
    setForm(buildInitialForm(initial));
  }, [initial]);

  return useMemo(
    () => ({
      form,
      handleFieldChange,
      resetForm,
      setForm,
    }),
    [form, handleFieldChange, resetForm],
  );
};


