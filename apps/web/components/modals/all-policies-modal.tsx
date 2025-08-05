import { useModalStore } from '@/modal/modal-store';
import PrivacyPolicy from '../policies/privacy';
import RefundPolicy from '../policies/refund';
import TermsAndConditions from '../policies/terms-conditions';
import ShipmentAndDeliveryPolicy from '../policies/shipment-delivery';
import { ScrollArea } from '@lorrigo/ui/components';

export const AllPoliciesModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { modals, closeModal } = useModalStore();
  const modal_props = modals.filter((modal) => modal.type === 'all-policies')[0];
  const modal_id = modal_props!.id;
  const id = modal_props!.props.id;
  const type = modal_props!.props.type;

  //   if (!modal_props) return null;

  const title = modal_props!.props.title;

  return (
    <div>
      <h1 className="bg-secondary dark:bg-secondary/80 sticky top-0 z-10 border-b bg-white p-4 text-2xl font-bold">{title}</h1>
      <ScrollArea className="flex h-[calc(100vh-10rem)] flex-col gap-4">
        {type === 'privacy-policy' && <PrivacyPolicy />}
        {type === 'terms-conditions' && <TermsAndConditions />}
        {type === 'refund-policy' && <RefundPolicy />}
        {type === 'shipment-and-delivery' && <ShipmentAndDeliveryPolicy />}
      </ScrollArea>
    </div>
  );
};
