import { Channel } from '@lorrigo/db';
import { IconBrandFacebook, IconBrandInstagram } from '@tabler/icons-react';
import { Globe2Icon, Mail, MessageSquare, ShoppingCartIcon } from 'lucide-react';

export const ORDER_CHANNELS: { name: Channel; description: string; icon: React.ReactNode }[] = [
  {
    name: 'CUSTOM',
    description: 'Custom Order',
    icon: <ShoppingCartIcon />,
  },
  {
    name: 'WEBSITE',
    description: 'Your website',
    icon: <Globe2Icon />,
  },
  {
    name: 'WHATSAPP',
    description: 'Your whatsapp',
    icon: <MessageSquare />,
  },
  {
    name: 'INSTAGRAM',
    description: 'Your instagram',
    icon: <IconBrandInstagram />,
  },
  {
    name: 'FACEBOOK',
    description: 'Your facebook',
    icon: <IconBrandFacebook />,
  },
  {
    name: 'EMAIL',
    description: 'Your email',
    icon: <Mail />,
  },
];
