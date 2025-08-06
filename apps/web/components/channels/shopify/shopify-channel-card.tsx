import { Store, LinkIcon, AlertCircle, CheckCircle2, ShoppingCart, ExternalLink, Unlink } from 'lucide-react';
import { Button, Alert, AlertTitle, AlertDescription, Skeleton, toast } from '@lorrigo/ui/components';
import { ChannelCard } from '../channel-card-factory';
import { useShopify } from '@/lib/apis/channels/shopify';

export function ShopifyChannelCard() {
  // Use our shopify hook
  const shopify = useShopify();
  const { data: connection, isLoading: isLoadingConnection, isError, error, refetch } = shopify.connection;
  const { mutate: initiateAuth, isPending: isConnecting } = shopify.initiateAuth;
  const { mutate: disconnect, isPending: isDisconnecting } = shopify.disconnect;

  const handleConnect = () => {
    // Generate auth URL without specifying a shop domain
    // Shopify will handle the shop selection during OAuth flow
    initiateAuth('', {
      onSuccess: (authUrl: string) => {
        // Show loading state
        toast.loading('Redirecting to Shopify...', {
          id: 'shopify-redirect',
        });

        // Redirect to Shopify auth page after a short delay
        setTimeout(() => {
          toast.dismiss('shopify-redirect');
          window.location.href = authUrl;
        }, 1000);
      },
      onError: (error: unknown) => {
        toast.error('Failed to connect to Shopify', {
          description: error instanceof Error ? error.message : 'Please try again later',
        });
      },
    });
  };

  const handleDisconnect = () => {
    disconnect(undefined, {
      onSuccess: () => {
        toast.success('Shopify store disconnected successfully');
      },
      onError: (error: unknown) => {
        toast.error('Failed to disconnect Shopify store', {
          description: error instanceof Error ? error.message : 'Please try again later',
        });
      },
    });
  };

  const renderContent = () => {
    if (isLoadingConnection) {
      return (
        <div className="space-y-3">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="mt-4 h-10 w-full" />
        </div>
      );
    }

    if (connection) {
      return (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-md bg-green-50 p-3 dark:bg-green-950/30">
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600" />
            <div>
              <h4 className="text-sm font-medium">Connected to Shopify</h4>
              <p className="text-muted-foreground mt-1 text-sm">
                Store: <span className="font-medium">{connection.shop}</span>
              </p>
              <p className="text-muted-foreground text-xs">Connected on {new Date(connection.connected_at).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => window.open(`https://${connection.shop}/admin`, '_blank')}
              icon={ExternalLink}
            >
              Open Shopify Admin
            </Button>
            <Button variant="outline" size="sm" className="flex-1" asChild>
              <a href="/seller/orders">
                <ShoppingCart className="mr-2 h-4 w-4" />
                View Orders
              </a>
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* {isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Connection Error</AlertTitle>
            <AlertDescription>{error instanceof Error ? error.response.data.error : 'Failed to check connection status'}</AlertDescription>
          </Alert>
        )} */}

        <div className="space-y-3 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/30">
            <Store className="h-8 w-8 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Connect Your Shopify Store</h3>
            <p className="text-muted-foreground mt-1 text-sm">Import orders automatically from your Shopify store</p>
          </div>
          <div className="text-muted-foreground space-y-1 text-xs">
            <p>• Sync orders in real-time</p>
            <p>• Manage shipping and tracking</p>
            <p>• Access order analytics</p>
          </div>
        </div>
      </div>
    );
  };

  const renderFooter = () => {
    if (connection) {
      return (
        <Button variant="outline" onClick={handleDisconnect} disabled={isDisconnecting} className="w-full" icon={Unlink}>
          {isDisconnecting ? 'Disconnecting...' : 'Disconnect Store'}
        </Button>
      );
    }

    return (
      <Button onClick={handleConnect} disabled={isConnecting} className="w-full" icon={LinkIcon}>
        {isConnecting ? 'Connecting...' : 'Connect with Shopify'}
      </Button>
    );
  };

  return (
    <ChannelCard
      title="Shopify"
      description="Connect your Shopify store to import orders automatically"
      icon={Store}
      iconColor="text-emerald-600"
      headerClassName="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-emerald-950/50 dark:to-green-950/50"
      footer={renderFooter()}
    >
      {renderContent()}
    </ChannelCard>
  );
}
