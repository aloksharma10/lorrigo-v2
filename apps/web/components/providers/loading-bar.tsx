'use client';
import { Progress, useProgress } from '@bprogress/next';
import { useEffect } from 'react';
import { useIsFetching, useIsMutating } from '@tanstack/react-query';

export const LoadingBar = () => {
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  const progress = useProgress();

  useEffect(() => {
    if (isFetching > 0 || isMutating > 0) {
      progress.start();
    } else {
      progress.stop();
    }
  }, [isFetching, isMutating, progress]);

  return <Progress />;
};
