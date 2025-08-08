'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Button,
  toast,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Switch,
  Badge,
  Textarea,
  Alert,
  AlertDescription,
} from '@lorrigo/ui/components';

import { Loader2, Code, Copy, Eye, EyeOff, RefreshCw, Key, Shield, Zap } from 'lucide-react';

const apiFormSchema = z.object({
  api_key: z.string().min(1, 'API key is required'),
  api_secret: z.string().min(1, 'API secret is required'),
  rate_limit: z.number().min(1, 'Rate limit must be at least 1'),
  allowed_ips: z.array(z.string()).optional(),
  webhook_url: z.string().url().optional().or(z.literal('')),
  description: z.string().optional(),
});

type ApiFormData = z.infer<typeof apiFormSchema>;

interface ApiConfigProps {
  userId: string;
}

export const ApiConfig = ({ userId }: ApiConfigProps) => {
  const [showSecret, setShowSecret] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [apiKeys, setApiKeys] = useState<any[]>([
    {
      id: '1',
      name: 'Production API Key',
      api_key: 'lor_sk_live_123456789abcdef',
      api_secret: 'lor_ss_live_987654321fedcba',
      rate_limit: 1000,
      is_active: true,
      created_at: new Date().toISOString(),
      last_used: new Date().toISOString(),
      usage_count: 15420,
    },
    {
      id: '2',
      name: 'Development API Key',
      api_key: 'lor_sk_test_abcdef123456789',
      api_secret: 'lor_ss_test_fedcba987654321',
      rate_limit: 100,
      is_active: true,
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      last_used: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      usage_count: 1250,
    },
  ]);

  const form = useForm<ApiFormData>({
    resolver: zodResolver(apiFormSchema),
    defaultValues: {
      api_key: '',
      api_secret: '',
      rate_limit: 1000,
      allowed_ips: [],
      webhook_url: '',
      description: '',
    },
  });

  const generateApiKey = async () => {
    setIsGenerating(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newKey = `lor_sk_${Math.random().toString(36).substring(2, 15)}`;
      const newSecret = `lor_ss_${Math.random().toString(36).substring(2, 15)}`;
      
      form.setValue('api_key', newKey);
      form.setValue('api_secret', newSecret);
      
      toast.success('New API key generated');
    } catch (error) {
      toast.error('Failed to generate API key');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${type} copied to clipboard`);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleSubmit = async (data: ApiFormData) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newApiKey = {
        id: Date.now().toString(),
        name: data.description || 'API Key',
        ...data,
        is_active: true,
        created_at: new Date().toISOString(),
        last_used: new Date().toISOString(),
        usage_count: 0,
      };
      
      setApiKeys(prev => [...prev, newApiKey]);
      form.reset();
      toast.success('API key created successfully');
    } catch (error) {
      toast.error('Failed to create API key');
    }
  };

  const revokeApiKey = async (keyId: string) => {
    try {
      setApiKeys(prev => prev.map(key => 
        key.id === keyId ? { ...key, is_active: false } : key
      ));
      toast.success('API key revoked successfully');
    } catch (error) {
      toast.error('Failed to revoke API key');
    }
  };

  const regenerateApiKey = async (keyId: string) => {
    try {
      const newKey = `lor_sk_${Math.random().toString(36).substring(2, 15)}`;
      const newSecret = `lor_ss_${Math.random().toString(36).substring(2, 15)}`;
      
      setApiKeys(prev => prev.map(key => 
        key.id === keyId ? { 
          ...key, 
          api_key: newKey, 
          api_secret: newSecret,
          last_used: new Date().toISOString()
        } : key
      ));
      toast.success('API key regenerated successfully');
    } catch (error) {
      toast.error('Failed to regenerate API key');
    }
  };

  return (
    <div className="space-y-6">
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          Keep your API keys secure and never share them publicly. Each API key has its own rate limits and permissions.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Code className="h-5 w-5" />
            <span>Create New API Key</span>
          </CardTitle>
          <CardDescription>
            Generate a new API key for your application integration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <FormLabel className="text-base">API Key</FormLabel>
                  <FormDescription>
                    Your unique API key for authentication
                  </FormDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={generateApiKey}
                  disabled={isGenerating}
                  className="flex items-center space-x-2"
                >
                  {isGenerating && <Loader2 className="h-4 w-4 animate-spin" />}
                  <RefreshCw className="h-4 w-4" />
                  <span>Generate</span>
                </Button>
              </div>

              <FormField
                control={form.control}
                name="api_key"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          placeholder="lor_sk_..." 
                          {...field}
                          readOnly
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(field.value, 'API Key')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center justify-between">
                <div>
                  <FormLabel className="text-base">API Secret</FormLabel>
                  <FormDescription>
                    Your secret key for webhook signature verification
                  </FormDescription>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSecret(!showSecret)}
                  className="flex items-center space-x-1"
                >
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  <span>{showSecret ? 'Hide' : 'Show'}</span>
                </Button>
              </div>

              <FormField
                control={form.control}
                name="api_secret"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          type={showSecret ? 'text' : 'password'}
                          placeholder="lor_ss_..." 
                          {...field}
                          readOnly
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(field.value, 'API Secret')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="rate_limit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rate Limit (requests per minute)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1"
                        placeholder="1000"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      Maximum number of API requests allowed per minute
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe what this API key is for..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end">
                <Button type="submit" className="flex items-center space-x-2">
                  <Key className="h-4 w-4" />
                  <span>Create API Key</span>
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Existing API Keys */}
      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>
            Manage your active API keys and their usage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {apiKeys.length > 0 ? (
              apiKeys.map((apiKey) => (
                <div key={apiKey.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="font-medium">{apiKey.name}</h4>
                      <div className="flex items-center space-x-2">
                        {apiKey.is_active ? (
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-red-100 text-red-800">
                            Revoked
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {apiKey.rate_limit}/min
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600">
                        <span className="font-mono">{apiKey.api_key}</span>
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>Created: {new Date(apiKey.created_at).toLocaleDateString()}</span>
                        <span>Last used: {new Date(apiKey.last_used).toLocaleDateString()}</span>
                        <span>Usage: {apiKey.usage_count.toLocaleString()} requests</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {apiKey.is_active && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => regenerateApiKey(apiKey.id)}
                          className="flex items-center space-x-1"
                        >
                          <RefreshCw className="h-4 w-4" />
                          <span>Regenerate</span>
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => revokeApiKey(apiKey.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          Revoke
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Code className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No API keys</h3>
                <p className="text-gray-500">
                  Create your first API key to start integrating with our API
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* API Documentation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5" />
            <span>API Documentation</span>
          </CardTitle>
          <CardDescription>
            Learn how to use our API with your keys
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">Authentication</h4>
              <p className="text-sm text-gray-600 mb-3">
                Include your API key in the Authorization header:
              </p>
              <code className="text-sm bg-gray-100 p-2 rounded block">
                Authorization: Bearer YOUR_API_KEY
              </code>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">Rate Limiting</h4>
              <p className="text-sm text-gray-600">
                Each API key has its own rate limit. Exceeding the limit will result in 429 errors.
              </p>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">Base URL</h4>
              <p className="text-sm text-gray-600 mb-3">
                All API requests should be made to:
              </p>
              <code className="text-sm bg-gray-100 p-2 rounded block">
                https://api.lorrigo.com/v1
              </code>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 