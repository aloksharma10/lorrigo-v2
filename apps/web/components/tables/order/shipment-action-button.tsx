"use client";

import Link from "next/link";
import React, { memo } from "react";
import { Button } from "@lorrigo/ui/components";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@lorrigo/ui/components";
import { MoreHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "@lorrigo/ui/components";
import { Shipment } from "@/lib/type/response-types";
import { useDrawer } from "@/components/providers/drawer-provider";
import { useModalStore } from "@/modal/modal-store";
import { ShipmentBucket, ShipmentBucketManager } from "@lorrigo/utils";

// Valid shipment statuses
const VALID_SHIPMENT_STATUSES = [
  ShipmentBucket.NEW,
  ShipmentBucket.READY_TO_SHIP,
  ShipmentBucket.IN_TRANSIT,
  ShipmentBucket.DELIVERED,
  ShipmentBucket.CANCELLED_ORDER,
  ShipmentBucket.COURIER_ASSIGNED,
  ShipmentBucket.PICKUP_SCHEDULED,
  ShipmentBucket.PICKED_UP,
  ShipmentBucket.OUT_FOR_DELIVERY,
  ShipmentBucket.NDR,
  ShipmentBucket.RTO,
  ShipmentBucket.EXCEPTION,
];



// Main ShipmentActionButton Component
interface ShipmentActionButtonProps {
  shipment: Shipment;
}

export const ShipmentActionButton: React.FC<ShipmentActionButtonProps> = ({ shipment }) => {
  const router = useRouter();
  const { openDrawer } = useDrawer();
  const { openModal } = useModalStore();

  // Get shipment bucket from status
  const shipmentBucket = ShipmentBucketManager.getBucketFromStatus(shipment.status);
  const latestTrackingEvent = shipment.trackingEvents?.[0];

  // Common dropdown trigger
  const renderDropdown = (items: React.ReactNode[]) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {items}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // NEW status - show Ship Now button
  if (shipmentBucket === ShipmentBucket.NEW || shipmentBucket === ShipmentBucket.AWAITING) {
    return (
      <div className="flex gap-2 items-center">
        <Button
          className="w-fit bg-indigo-600 hover:bg-indigo-700"
          size="sm"
          onClick={() => {
            toast.success('Redirecting to ship now page...');
            router.push(`/seller/orders/ship/${shipment.id}`);
          }}
        >
          Ship Now
        </Button>
        {renderDropdown([
          <ShipmentEditButton key="edit" shipment={shipment} />,
          <ShipmentCloneButton key="clone" shipment={shipment} />,
          <DropdownMenuSeparator key="sep" />,
          <ShipmentCancelButton key="cancel" shipment={shipment} />,
        ])}
      </div>
    );
  }

  // READY_TO_SHIP status
  // if (shipmentBucket === ShipmentBucket.READY_TO_SHIP) {
  //   return (
  //     <div className="flex gap-2 items-center">
  //       {renderDropdown([
  //         <ShipmentCloneButton key="clone" shipment={shipment} />,
  //         <DownloadLabelButton key="download" shipment={shipment} />,
  //         <DropdownMenuSeparator key="sep" />,
  //         <ShipmentCancelButton key="cancel" shipment={shipment} />,
  //       ])}
  //     </div>
  //   );
  // }

  // COURIER_ASSIGNED status - show Schedule Pickup button
  if (shipmentBucket === ShipmentBucket.COURIER_ASSIGNED || shipmentBucket === ShipmentBucket.READY_TO_SHIP) {
    return (
      <div className="flex gap-2 items-center">
        <Button
          variant="default"
          size="sm"
          onClick={() => {
            openModal('pickup-schedule', {
              shipmentId: shipment.id,
              orderNumber: shipment.orderNumber,
              awb: shipment.awb,
            });
          }}
        >
          Schedule Pickup
        </Button>
        {renderDropdown([
          <ShipmentCloneButton key="clone" shipment={shipment} />,
          <DownloadLabelButton key="download" shipment={shipment} />,
          <DropdownMenuSeparator key="sep" />,
          <ShipmentCancelButton key="cancel" shipment={shipment} />,
        ])}
      </div>
    );
  }

  // PICKUP_SCHEDULED status
  if (shipmentBucket === ShipmentBucket.PICKUP_SCHEDULED) {
    return (
      <div className="flex gap-2 items-center">
        {renderDropdown([
          <ShipmentCloneButton key="clone" shipment={shipment} />,
          <DownloadLabelButton key="download" shipment={shipment} />,
          <TrackShipmentButton key="track" shipment={shipment} />,
          <DropdownMenuSeparator key="sep" />,
          <ShipmentCancelButton key="cancel" shipment={shipment} />,
        ])}
      </div>
    );
  }

  // IN_TRANSIT, PICKED_UP, OUT_FOR_DELIVERY statuses
  if ([ShipmentBucket.IN_TRANSIT, ShipmentBucket.PICKED_UP, ShipmentBucket.OUT_FOR_DELIVERY].includes(shipmentBucket)) {
    return (
      <div className="flex gap-2 items-center">
        {renderDropdown([
          <TrackShipmentButton key="track" shipment={shipment} />,
          <ShipmentCloneButton key="clone" shipment={shipment} />,
          <DownloadLabelButton key="download" shipment={shipment} />,
        ])}
      </div>
    );
  }

  // NDR status - show Reattempt button
  if (shipmentBucket === ShipmentBucket.NDR) {
    return (
      <div className="flex gap-2 items-center">
        <Button
          variant="default"
          size="sm"
          onClick={() => {
            openModal('ndr-action', {
              shipmentId: shipment.id,
              orderNumber: shipment.orderNumber,
              awb: shipment.awb,
            });
          }}
        >
          Reattempt
        </Button>
        {renderDropdown([
          <DropdownMenuItem 
            key="rto" 
            onClick={() => {
              openModal('ndr-action', {
                shipmentId: shipment.id,
                orderNumber: shipment.orderNumber,
                awb: shipment.awb,
                action: 'rto'
              });
            }}
          >
            Mark as RTO
          </DropdownMenuItem>,
          <ShipmentCloneButton key="clone" shipment={shipment} />,
          <DownloadLabelButton key="download" shipment={shipment} />,
          <TrackShipmentButton key="track" shipment={shipment} />,
        ])}
      </div>
    );
  }

  // DELIVERED status
  if (shipmentBucket === ShipmentBucket.DELIVERED) {
    return (
      <div className="flex gap-2 items-center">
        <CreateReturnShipmentButton shipment={shipment} />
        {renderDropdown([
          <ShipmentCloneButton key="clone" shipment={shipment} />,
          <DownloadLabelButton key="download" shipment={shipment} />,
          <TrackShipmentButton key="track" shipment={shipment} />,
        ])}
      </div>
    );
  }

  // CANCELLED status
  if ([ShipmentBucket.CANCELLED_ORDER, ShipmentBucket.CANCELLED_SHIPMENT].includes(shipmentBucket)) {
    return (
      <div className="flex gap-2 items-center">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            openDrawer('clone-order', {
              order: shipment,
              size: 'greater-mid',
              side: 'right',
            });
          }}
        >
          Clone Order
        </Button>
      </div>
    );
  }

  // RTO and other statuses
  if ([ShipmentBucket.RTO, ShipmentBucket.RTO_DELIVERED, ShipmentBucket.EXCEPTION].includes(shipmentBucket)) {
    return (
      <div className="flex gap-2 items-center">
        {renderDropdown([
          <ShipmentCloneButton key="clone" shipment={shipment} />,
          <DownloadLabelButton key="download" shipment={shipment} />,
          <TrackShipmentButton key="track" shipment={shipment} />,
        ])}
      </div>
    );
  }

  // Default case
  return (
    <div className="flex gap-2 items-center">
      {renderDropdown([
        <ShipmentCloneButton key="clone" shipment={shipment} />,
        <DownloadLabelButton key="download" shipment={shipment} />,
        <TrackShipmentButton key="track" shipment={shipment} />,
        <ShipmentCancelButton key="cancel" shipment={shipment} />,
      ])}
    </div>
  );
};

// Reusable Button Components
export const ShipmentCancelButton: React.FC<{ shipment: Shipment }> = ({ shipment }) => {
  const { openModal } = useModalStore();
  return (
    <DropdownMenuItem 
      onClick={() => {
        openModal('cancel-shipment', {
          shipmentId: shipment.id,
          orderNumber: shipment.orderNumber,
        });
      }} 
      className="text-red-600 hover:text-red-500"
    >
      Cancel Shipment
    </DropdownMenuItem>
  );
};

export const ShipmentCloneButton: React.FC<{ shipment: Shipment }> = ({ shipment }) => {
  const { openDrawer } = useDrawer();
  return (
    <DropdownMenuItem 
      onClick={() => {
        openDrawer('clone-order', {
          order: shipment,
          size: 'greater-mid',
          side: 'right',
        });
      }}
    >
      Clone Order
    </DropdownMenuItem>
  );
};

export const ShipmentEditButton: React.FC<{ shipment: Shipment }> = ({ shipment }) => {
  const { openDrawer } = useDrawer();
  return (
    <DropdownMenuItem 
      onClick={() => {
        openDrawer('edit-order', {
          order: shipment,
          size: 'greater-mid',
          side: 'right',
        });
      }}
    >
      Edit Order
    </DropdownMenuItem>
  );
};

export const DownloadLabelButton: React.FC<{ shipment: Shipment }> = ({ shipment }) => {
  // TODO: Implement download label functionality
  const handleDownloadLabel = (thermal: boolean = false) => {
    console.log(`Download ${thermal ? 'thermal ' : ''}label for shipment:`, shipment.id);
    toast.success(`${thermal ? 'Thermal ' : ''}Label download initiated`);
  };

  return (
    <>
      <DropdownMenuItem onClick={() => handleDownloadLabel(false)}>
        Download Label
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => handleDownloadLabel(true)}>
        Download Thermal Label
      </DropdownMenuItem>
    </>
  );
};

export const TrackShipmentButton: React.FC<{ shipment: Shipment }> = ({ shipment }) => {
  return (
    <DropdownMenuItem 
      onClick={() => {
        console.log('Track shipment:', shipment);
        // TODO: Implement tracking functionality
        toast.info('Tracking functionality coming soon');
      }}
    >
      Track Shipment
    </DropdownMenuItem>
  );
};

export const CreateReturnShipmentButton: React.FC<{ shipment: Shipment }> = ({ shipment }) => {
  const router = useRouter();
  const { openDrawer } = useDrawer();

  const handleCreateReturn = () => {
    // Open clone order drawer with return order flag
    openDrawer('clone-order', {
      order: {
        ...shipment,
        orderNumber: `${shipment.orderNumber}-RT`,
        // Add return order specific fields
        isReturnOrder: true,
      },
      size: 'greater-mid',
      side: 'right',
    });
  };

  return (
    <Button variant="default" size="sm" onClick={handleCreateReturn}>
      Create Return Order
    </Button>
  );
};

export default memo(ShipmentActionButton); 