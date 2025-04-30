'use client';
import { useLoading } from '../../context/LoadingContext';
import LoadingOverlay from '../molecules/LoadingOverlay';

export default function GlobalLoadingOverlay() {
  const { isLoading, loadingMessage } = useLoading();
  if (!isLoading) return null;
  return <LoadingOverlay message={loadingMessage || 'Loading...'} />;
} 