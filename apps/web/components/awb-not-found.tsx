import { Package } from 'lucide-react';
import { Button, Input, Card, CardContent } from '@lorrigo/ui/components';
import { Search, ArrowLeft, Mail, Phone } from 'lucide-react';
import { LorrigoLogo } from './logos/lorrigo-logo';

export function AwbNotFound() {
  return (
    <main className="container mx-auto max-w-6xl p-6">
      <LorrigoLogo className="mb-4 lg:h-16 lg:w-56" />
      <div className="mx-auto max-w-2xl">
        {/* Error Illustration */}
        <div className="mb-8 text-center">
          <div className="bg-secondary relative mb-6 inline-flex h-32 w-32 items-center justify-center rounded-full">
            <Package className="text-primary h-16 w-16" />
            <div className="bg-destructive/10 absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full">
              <span className="text-destructive text-lg font-bold">?</span>
            </div>
          </div>
        </div>

        {/* Error Message Card */}
        <Card className="shadow-lg">
          <CardContent className="p-8 text-center">
            <h1 className="text-foreground mb-4 font-sans text-3xl font-bold">Oops! We Can't Find Your AWB</h1>
            <p className="text-foreground mb-6 text-lg font-medium">Don't worry, we're here to help you track your shipment.</p>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              It seems the AWB number you entered doesn't match our records. Please check the number and try again. AWB numbers are typically 10-12 digits long
              and can be found on your shipping receipt.
            </p>

            {/* Search Again Section */}
            <div className="bg-muted mb-8 rounded-lg p-6">
              <h3 className="text-foreground mb-4 font-sans font-semibold">Try Searching Again</h3>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Input placeholder="Enter AWB number (e.g., 1234567890)" className="focus:ring-ring" />
                </div>
                <Button className="px-6">
                  <Search className="mr-2 h-4 w-4" />
                  Track
                </Button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Return to Tracking
              </Button>
              <Button variant="secondary">
                <Phone className="mr-2 h-4 w-4" />
                Contact Support
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Help Section */}
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="bg-muted flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg">
                  <Mail className="text-primary h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-foreground mb-2 font-sans font-semibold">Email Support</h3>
                  <p className="text-muted-foreground mb-3 text-sm">Get help via email within 24 hours</p>
                  <p className="text-foreground font-medium">support@logitrack.com</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="bg-muted flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg">
                  <Phone className="text-primary h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-foreground mb-2 font-sans font-semibold">Phone Support</h3>
                  <p className="text-muted-foreground mb-3 text-sm">Speak with our team directly</p>
                  <p className="text-foreground font-medium">+1 (555) 123-4567</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Common Issues */}
        <Card className="bg-secondary mt-8">
          <CardContent className="p-6">
            <h3 className="text-foreground mb-4 font-sans font-semibold">Common Issues & Solutions</h3>
            <ul className="text-muted-foreground space-y-3">
              <li className="flex items-start gap-3">
                <div className="bg-primary mt-2 h-2 w-2 flex-shrink-0 rounded-full"></div>
                <span>Double-check your AWB number for any typos or missing digits</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="bg-primary mt-2 h-2 w-2 flex-shrink-0 rounded-full"></div>
                <span>New shipments may take 2-4 hours to appear in our tracking system</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="bg-primary mt-2 h-2 w-2 flex-shrink-0 rounded-full"></div>
                <span>Remove any spaces or special characters from the AWB number</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
