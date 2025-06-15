import { useState } from 'react';
import { Store, LinkIcon, AlertCircle, CheckCircle2, ShoppingCart, ExternalLink, Unlink } from 'lucide-react';
import {
  Button,
  Input,
  Alert,
  AlertTitle,
  AlertDescription,
  Skeleton,
  toast,
} from '@lorrigo/ui/components';
import { ChannelCard } from '../channel-card-factory';
import { useShopify } from '@/lib/apis/channels/shopify';

export function ShopifyChannelCard() {
  const [shopDomain, setShopDomain] = useState('');
  const [isValidDomain, setIsValidDomain] = useState(true);
  
  // Use our shopify hook
  const shopify = useShopify();
  const { data: connection, isLoading: isLoadingConnection, isError, error, refetch } = shopify.connection;
  const { mutate: initiateAuth, isPending: isConnecting } = shopify.initiateAuth;
  const { mutate: disconnect, isPending: isDisconnecting } = shopify.disconnect;

  const handleConnect = () => {
    // Basic validation for Shopify domain
    if (!shopDomain.trim()) {
      setIsValidDomain(false);
      return;
    }

    // Format domain if needed
    let domain = shopDomain.trim();
    if (!domain.includes('.myshopify.com')) {
      domain = `${domain}.myshopify.com`;
    }

    setIsValidDomain(true);
    initiateAuth(domain, {
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
        setShopDomain('');
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
          <Skeleton className="h-10 w-full mt-4" />
        </div>
      );
    }

    if (connection) {
      return (
        <div className="space-y-4">
          <div className="flex items-start gap-3 bg-green-50 dark:bg-green-950/30 p-3 rounded-md">
            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-sm">Connected to Shopify</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Store: <span className="font-medium">{connection.shop}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Connected on {new Date(connection.connected_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              className="flex-1"
              onClick={() => window.open(`https://${connection.shop}/admin`, '_blank')}
              icon={<ExternalLink className="h-4 w-4 mr-2" />}
            >
              Open Shopify Admin
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="flex-1"
              asChild
            >
              <a href="/seller/orders">
                <ShoppingCart className="h-4 w-4 mr-2" />
                View Orders
              </a>
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Connection Error</AlertTitle>
            <AlertDescription>
              {error instanceof Error ? error.message : 'Failed to check connection status'}
            </AlertDescription>
          </Alert>
        )}
        
        <div>
          <label htmlFor="shop-domain" className="text-sm font-medium mb-1.5 block">
            Shopify Store Domain
          </label>
          <div className="flex gap-2 items-center">
            <Input
              id="shop-domain"
              placeholder="your-store"
              value={shopDomain}
              onChange={(e) => {
                setShopDomain(e.target.value);
                setIsValidDomain(true);
              }}
              className={!isValidDomain ? "border-red-500" : ""}
            />
            <span className="text-sm text-muted-foreground whitespace-nowrap">.myshopify.com</span>
          </div>
          {!isValidDomain && (
            <p className="text-red-500 text-xs mt-1">Please enter a valid store name</p>
          )}
        </div>
      </div>
    );
  };

  const renderFooter = () => {
    if (connection) {
      return (
        <Button 
          variant="outline" 
          onClick={handleDisconnect} 
          disabled={isDisconnecting}
          className="w-full"
          icon={<Unlink className="h-4 w-4 mr-2" />}
        >
          {isDisconnecting ? 'Disconnecting...' : 'Disconnect Store'}
        </Button>
      );
    }

    return (
      <Button 
        onClick={handleConnect} 
        disabled={isConnecting}
        className="w-full"
        icon={<LinkIcon className="h-4 w-4 mr-2" />}
      >
        {isConnecting ? 'Connecting...' : 'Connect Shopify Store'}
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