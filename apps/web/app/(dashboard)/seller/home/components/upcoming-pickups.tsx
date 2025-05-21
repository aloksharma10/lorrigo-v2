"use client"
import { format } from "date-fns";
import { useState } from "react";

import { Button, Calendar, Card, CardContent, Popover, PopoverContent, PopoverTrigger, Separator, Badge } from "@lorrigo/ui/components";
import { PickupCard } from "./pickup-card";

export const mockPickupData = [
  {
    id: "p1",
    customerName: "Surya Paricha",
    address: "Flat no 405, B block Sadagiri Maharshi Gokulum, Bandlaguda Off, Old Madras Rd",
    phone: "8655366779",
    date: "May 21, 2025",
    items: [
      {
        id: "i1",
        brand: "BLUE DART",
        description: "Bluedart brands 500g Surface",
        quantity: 2,
        brandLogo: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='60' viewBox='0 0 120 60'%3E%3Ctext x='10' y='35' font-family='Arial' font-size='22' font-weight='bold'%3E%3Ctspan fill='%230052cc'%3EBLUE %3C/tspan%3E%3Ctspan fill='%2300a651'%3EDART%3C/tspan%3E%3C/text%3E%3C/svg%3E"
      }
    ]
  },
  {
    id: "p2",
    customerName: "Sukrt Delhi",
    address: "Khasra No 391/392 Mehrauli-Gurgaon Road, 1st Floor, Near Ghitorni Metro Station",
    phone: "8010948586",
    date: "May 21, 2025",
    items: [
      {
        id: "i2",
        brand: "DELHIVERY",
        description: "Delivery Air",
        quantity: 1,
        brandLogo: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='60' viewBox='0 0 120 60'%3E%3Ctext x='10' y='35' font-family='Arial' font-size='20' font-weight='bold'%3EDELHIVERY%3C/text%3E%3C/svg%3E"
      },
      {
        id: "i3",
        brand: "BLUE DART",
        description: "BlueDart Surface 2kg Sol",
        quantity: 1,
        brandLogo: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='60' viewBox='0 0 120 60'%3E%3Ctext x='10' y='35' font-family='Arial' font-size='22' font-weight='bold'%3E%3Ctspan fill='%230052cc'%3EBLUE %3C/tspan%3E%3Ctspan fill='%2300a651'%3EDART%3C/tspan%3E%3C/text%3E%3C/svg%3E"
      }
    ]
  },
  {
    id: "p3",
    customerName: "Sukrt Kolkata",
    address: "7A Short Street, First Floor Near Bhagirathi Neotia Hospital",
    phone: "9832419971",
    date: "May 22, 2025",
    items: [
      {
        id: "i4",
        brand: "BLUE DART",
        description: "Blue Dart Air",
        quantity: 3,
        brandLogo: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='60' viewBox='0 0 120 60'%3E%3Ctext x='10' y='35' font-family='Arial' font-size='22' font-weight='bold'%3E%3Ctspan fill='%230052cc'%3EBLUE %3C/tspan%3E%3Ctspan fill='%2300a651'%3EDART%3C/tspan%3E%3C/text%3E%3C/svg%3E"
      },
      {
        id: "i5",
        brand: "DTDC",
        description: "DTDC Air 500gm",
        quantity: 1,
        brandLogo: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='60' viewBox='0 0 120 60'%3E%3Ctext x='30' y='35' font-family='Arial' font-size='24' font-weight='bold' fill='%23233e99'%3EDTDC%3C/text%3E%3C/svg%3E"
      }
    ]
  }
];
export const UpcomingPickups = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [activeDateButton, setActiveDateButton] = useState<string>("today");

  // Format date for display and comparison
  const formattedDate = selectedDate ? format(selectedDate, "MMM d, yyyy") : "";

  // Filter pickups by selected date
  const filteredPickups = mockPickupData.filter(pickup => {
    if (!selectedDate) return true;
    return pickup.date === format(selectedDate, "MMM d, yyyy");
  });

  const handleDateButtonClick = (buttonId: string, date: Date) => {
    setSelectedDate(date);
    setActiveDateButton(buttonId);
  };

  return (
    <main className="container mx-auto p-4 md:p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-6">Your Upcoming Pickups</h1>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex space-x-2">
            <span className="py-2 text-gray-600">Date</span>
            <Button
              variant={activeDateButton === "today" ? "default" : "outline"}
              onClick={() => handleDateButtonClick("today", new Date())}
            >
              {format(new Date(), "MMM d, yyyy")}
            </Button>

            <Button
              variant={activeDateButton === "tomorrow" ? "default" : "outline"}
              onClick={() => {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                handleDateButtonClick("tomorrow", tomorrow);
              }}
            >
              {format(new Date(new Date().setDate(new Date().getDate() + 1)), "MMM d, yyyy")}
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={activeDateButton === "custom" ? "default" : "outline"}
                  onClick={() => setActiveDateButton("custom")}
                >
                  <span>Custom</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date);
                    setActiveDateButton("custom");
                  }}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="mb-4">
            <div className="flex items-center">
              <h2 className="font-medium text-blue-700 mr-2">Pickups Scheduled</h2>
              <Badge variant="outline" className="bg-green-100 text-green-800 font-medium">
                {filteredPickups.length}
              </Badge>
            </div>
          </div>

          <div className="space-y-4">
            {filteredPickups.length > 0 ? (
              filteredPickups.map((pickup) => (
                <PickupCard key={pickup.id} pickup={pickup} />
              ))
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center h-40">
                  <p className="text-gray-500">No pickups scheduled for {formattedDate}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </main>
  );
};