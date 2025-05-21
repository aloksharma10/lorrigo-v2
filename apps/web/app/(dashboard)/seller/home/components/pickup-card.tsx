import { Card, CardContent } from "@lorrigo/ui/components";


export interface PickupItem {
   id: string;
   brand: string;
   description: string;
   quantity: number;
   brandLogo?: string;
 }
 
 export interface Pickup {
   id: string;
   customerName: string;
   address: string;
   phone: string;
   date: string;
   items: PickupItem[];
 }

 
type PickupCardProps = {
  pickup: Pickup;
};

export const PickupCard = ({ pickup }: PickupCardProps) => {
  // Calculate total items across all products
  const totalItems = pickup.items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="p-4">
          <div className="flex flex-col md:flex-row justify-between">
            <div className="mb-4 md:mb-0">
              <h3 className="font-bold text-lg">{pickup.customerName}</h3>
              <div className="text-gray-600 mt-1 flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-sm">{pickup.address}</span>
              </div>
              <div className="flex items-center mt-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-sm text-gray-600">{pickup.customerName}, {pickup.phone}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4">
            {pickup.items.map((item, index) => (
              <div 
                key={index}
                className={`p-4 ${index > 0 ? "border-t md:border-t-0 md:border-l" : ""} border-gray-100 flex justify-between items-center`}
              >
                <div className="flex items-center">
                  {item.brandLogo ? (
                    <div className="w-24 h-8 flex items-center justify-center mb-2">
                      <img 
                        src={item.brandLogo} 
                        alt={`${item.brand} logo`}
                        className="max-h-full max-w-full object-contain" 
                      />
                    </div>
                  ) : (
                    <div className="w-24 h-8 flex items-center justify-center mb-2 bg-gray-100 rounded">
                      <span className="text-gray-500 text-xs">{item.brand}</span>
                    </div>
                  )}
                </div>
                <div className="text-2xl font-bold text-gray-700">{item.quantity}</div>
              </div>
            ))}
            
            <div className="p-4 border-t md:border-t-0 md:border-l border-gray-100 flex justify-between items-center bg-gray-50">
              <div>
                <div className="font-medium text-gray-800">Total</div>
              </div>
              <div className="text-2xl font-bold text-gray-800">{totalItems}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
