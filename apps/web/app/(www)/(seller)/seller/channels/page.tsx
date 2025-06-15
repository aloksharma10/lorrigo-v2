'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useShopifyConnection, useInitiateShopifyAuth, useDisconnectShopify } from '@/lib/apis/shopify';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Alert,
  AlertTitle,
  AlertDescription,
  Skeleton,
  toast,
} from '@lorrigo/ui/components';
import { Store, LinkIcon, AlertCircle, CheckCircle2, ShoppingCart, ExternalLink, Unlink } from 'lucide-react';

export default function ChannelsPage() {
  const [shopDomain, setShopDomain] = useState('');
  const [isValidDomain, setIsValidDomain] = useState(true);
  const searchParams = useSearchParams();
  
  const { data: connection, isLoading: isLoadingConnection, isError, error, refetch } = useShopifyConnection();
  const { mutate: initiateAuth, isPending: isConnecting } = useInitiateShopifyAuth();
  const { mutate: disconnect, isPending: isDisconnecting } = useDisconnectShopify();

  // Check for success parameter from callback
  useEffect(() => {
    const success = searchParams.get('success');
    if (success === 'true') {
      toast.success('Successfully connected to Shopify!');
      // Refetch connection data
      refetch();
    }
  }, [searchParams, refetch]);

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
      onSuccess: (authUrl) => {
        // Redirect to Shopify auth page
        window.location.href = authUrl;
      },
      onError: (error) => {
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
      onError: (error) => {
        toast.error('Failed to disconnect Shopify store', {
          description: error instanceof Error ? error.message : 'Please try again later',
        });
      },
    });
  };

  return (
    <div className="container py-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Sales Channels</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-emerald-950/50 dark:to-green-950/50 border-b">
            <div className="flex items-center gap-2">
              <Store className="h-5 w-5 text-emerald-600" />
              <CardTitle>Shopify</CardTitle>
            </div>
            <CardDescription>
              Connect your Shopify store to import orders automatically
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-6">
            {isLoadingConnection ? (
              <div className="space-y-3">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-10 w-full mt-4" />
              </div>
            ) : connection ? (
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
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
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
            ) : (
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
            )}
          </CardContent>
          
          <CardFooter className="flex justify-between border-t bg-muted/50 px-6 py-4">
            {connection ? (
              <Button 
                variant="outline" 
                onClick={handleDisconnect} 
                disabled={isDisconnecting}
                className="w-full"
              >
                <Unlink className="h-4 w-4 mr-2" />
                {isDisconnecting ? 'Disconnecting...' : 'Disconnect Store'}
              </Button>
            ) : (
              <Button 
                onClick={handleConnect} 
                disabled={isConnecting}
                className="w-full"
              >
                <LinkIcon className="h-4 w-4 mr-2" />
                {isConnecting ? 'Connecting...' : 'Connect Shopify Store'}
              </Button>
            )}
          </CardFooter>
        </Card>
        
        {/* Additional sales channels can be added here */}
      </div>
    </div>
  );
}