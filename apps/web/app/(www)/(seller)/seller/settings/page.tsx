import { redirect } from 'next/navigation';

export default function SettingsIndexPage() {
  // Redirect to default tab
  redirect('/seller/settings/general');
}
