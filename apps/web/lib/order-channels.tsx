import { IconBrandFacebook, IconBrandInstagram } from '@tabler/icons-react';
import { Globe2Icon, Mail, MessageSquare, ShoppingCartIcon } from 'lucide-react';

export const ORDER_CHANNELS = [
  {
    name: 'Custom',
    description: 'Custom Order',
    icon: <ShoppingCartIcon />,
  },
  {
    name: 'Website',
    description: 'Your website',
    icon: <Globe2Icon />,
  },
  {
    name: 'Whatsapp',
    description: 'Your whatsapp',
    icon: <MessageSquare />,
  },
  {
    name: 'Instagram',
    description: 'Your instagram',
    icon: <IconBrandInstagram />,
  },
  {
    name: 'Facebook',
    description: 'Your facebook',
    icon: <IconBrandFacebook />,
  },
  {
    name: 'Email',
    description: 'Your email',
    icon: <Mail />,
  },
];
