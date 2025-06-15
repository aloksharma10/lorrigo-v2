import { ReactNode } from 'react';
import { ShopifyChannelCard } from './shopify/shopify-channel-card';

// Define channel types
export type ChannelType = 'shopify' | 'woocommerce' | 'magento' | 'bigcommerce' | 'custom';

// Interface for channel registry entries
interface ChannelRegistryEntry {
  type: ChannelType;
  name: string;
  component: () => ReactNode;
  enabled: boolean;
}

/**
 * Registry of all available channels in the application
 * Add new channels here to make them available in the UI
 */
export const channelRegistry: ChannelRegistryEntry[] = [
  {
    type: 'shopify',
    name: 'Shopify',
    component: () => <ShopifyChannelCard />,
    enabled: true,
  },
  // Example of a disabled/upcoming channel
  // {
  //   type: 'woocommerce',
  //   name: 'WooCommerce',
  //   component: () => <WooCommerceChannelCard />,
  //   enabled: false,
  // },
];

/**
 * Get all enabled channels from the registry
 */
export function getEnabledChannels(): ChannelRegistryEntry[] {
  return channelRegistry.filter(channel => channel.enabled);
}

/**
 * Get a specific channel by type
 */
export function getChannelByType(type: ChannelType): ChannelRegistryEntry | undefined {
  return channelRegistry.find(channel => channel.type === type);
}

/**
 * Component to render all enabled channels
 */
export function AllEnabledChannels() {
  const enabledChannels = getEnabledChannels();
  
  return (
    <>
      {enabledChannels.map((channel) => (
        <div key={channel.type}>
          {channel.component()}
        </div>
      ))}
    </>
  );
} 