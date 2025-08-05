'use client';
import { MoreHorizontal, Edit, Trash2, Users } from 'lucide-react';
import {
  ColumnDef,
  toast,
  Checkbox,
  DataTable,
  DataTableColumnHeader,
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@lorrigo/ui/components';
import { usePlanOperations } from '@/lib/apis/plans';
import Link from 'next/link';

interface Plan {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  features: string[];
  courierPricing: any[];
  assignedUsers: number;
  createdAt: string;
  updatedAt: string;
}

interface PlansTableProps {
  onAssignPlan: (planId: string) => void;
}

export default function PlansTable({ onAssignPlan }: PlansTableProps) {
  const { getPlansQuery, deletePlan } = usePlanOperations();

  // Fetch plans
  const { data: apiPlans = [], isLoading, isError, error } = getPlansQuery();

  // Transform API response to match the Plan interface
  const plans: Plan[] = apiPlans.map((plan: any) => ({
    id: plan.id,
    name: plan.name,
    description: plan.description,
    isDefault: plan.isDefault,
    features: plan.features,
    courierPricing: plan.plan_courier_pricings || [], // Map plan_courier_pricings to courierPricing
    assignedUsers: plan.users?.length || 0, // Count users for assignedUsers
    createdAt: plan.created_at, // Map created_at to createdAt
    updatedAt: plan.updated_at, // Map updated_at to updatedAt
  }));

  // Define the columns for the data table
  const columns: ColumnDef<Plan>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          disabled={isLoading}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          onClick={(e) => e.stopPropagation()}
          disabled={isLoading}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Plan Details" />,
      cell: ({ row }) => {
        const plan = row.original;
        return (
          <div className="flex flex-col">
            <div className="flex items-center gap-2 font-medium">
              {plan.name}
              {plan.isDefault && (
                <Badge variant="secondary" className="text-xs">
                  Default
                </Badge>
              )}
            </div>
            <div className="text-muted-foreground text-sm">{plan.description}</div>
            <div className="text-muted-foreground mt-1 text-xs">Created: {new Date(plan.createdAt).toLocaleDateString()}</div>
          </div>
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: 'features',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Features" />,
      cell: ({ row }) => {
        const plan = row.original;
        return (
          <div className="flex flex-wrap gap-1">
            {plan.features.slice(0, 3).map((feature, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {feature}
              </Badge>
            ))}
            {plan.features.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{plan.features.length - 3} more
              </Badge>
            )}
          </div>
        );
      },
      enableSorting: false,
      enableHiding: true,
    },
    {
      accessorKey: 'courierPricing',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Couriers" />,
      cell: ({ row }) => {
        const plan = row.original;
        return (
          <div className="flex flex-col">
            <div className="font-medium">{plan.courierPricing.length} Couriers</div>
            <div className="text-muted-foreground text-xs">Configured pricing zones</div>
          </div>
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: 'assignedUsers',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Assigned Users" />,
      cell: ({ row }) => {
        const plan = row.original;
        return (
          <div className="flex items-center gap-2">
            <Users className="text-muted-foreground h-4 w-4" />
            <span className="font-medium">{plan.assignedUsers || 0}</span>
          </div>
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      id: 'actions',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Actions" />,
      cell: ({ row }) => {
        const plan = row.original;

        const handleDelete = async () => {
          await deletePlan.mutateAsync(plan.id);
        };

        return (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onAssignPlan(plan.id)}>
              Assign Users
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <Link href={`/admin/plans/${plan.id}/edit`}>
                  <DropdownMenuItem>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Plan
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Plan
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  // Define bulk actions
  const bulkActions = [
    {
      label: 'Delete Selected',
      action: (selectedRows: Plan[]) => {
        console.log('Delete plans:', selectedRows);
        toast.success(`Deleting ${selectedRows.length} plans`);
      },
      variant: 'destructive' as const,
      isLoading: false,
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={plans}
      count={plans.length}
      pageCount={Math.ceil(plans.length / 15)}
      page={0}
      pageSize={15}
      bulkActions={bulkActions}
      searchableColumns={[
        {
          id: 'name',
          title: 'Plan Name',
        },
      ]}
      searchPlaceholder="Search plans..."
      isLoading={isLoading}
      isError={isError}
      errorMessage={error instanceof Error ? error.message : 'Failed to fetch plans. Please try again.'}
      manualPagination={false}
      manualSorting={false}
      manualFiltering={false}
      showToolbar={false}
    />
  );
}
