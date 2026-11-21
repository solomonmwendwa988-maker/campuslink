import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { loadLocal, saveLocal } from '../services/localStore';

export function useLocalState<T>(key: string, fallback: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => loadLocal(key, fallback));
  useEffect(() => saveLocal(key, value), [key, value]);
  return [value, setValue];
}
