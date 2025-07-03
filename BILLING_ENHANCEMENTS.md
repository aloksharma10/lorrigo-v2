# Billing System Enhancements - v2.0

## Overview

This document outlines the comprehensive enhancements made to the Lorrigo billing system, transforming it from a basic CSV-based billing system to an advanced, dispute-aware, cycle-driven billing platform with enhanced user experience.

## 🚀 Key Features Implemented

### 1. Enhanced Database Schema
- **UserProfile Model**: Advanced user settings for billing and remittance
- **WeightDispute Model**: Automated weight dispute detection and management
- **BillingCycle Model**: Configurable billing cycles (automatic/manual)
- **Enhanced Billing Model**: Comprehensive billing records with dispute tracking

### 2. Weight Dispute Detection & Management
- **Automatic Detection**: CSV uploads automatically detect weight discrepancies
- **Tolerance Levels**: Configurable tolerance (default: 0.1kg) for weight differences
- **Dispute Workflow**: Automated dispute creation when weight differences exceed tolerance
- **Visual Indicators**: Clear UI indication of disputed weights in tables

### 3. Enhanced Billing Cycles
- **Automatic Cycles**: Configurable cycle lengths (default: 30 days)
- **Manual Billing**: Admin-initiated billing for specific AWBs or date ranges
- **Cycle Management**: Track billing cycle status and processing

### 4. Improved User Experience
- **Modular Components**: Reusable billing field components
- **Enhanced Tables**: Comprehensive data display with copy functionality
- **Weight Dispute Indicators**: Visual alerts for weight discrepancies
- **Payment Status Tracking**: Clear payment status indicators

## 📊 Database Schema Updates

### New Models Added

#### UserProfile Model
```prisma
model UserProfile {
  id                        String          @id @default(cuid())
  user_id                   String          @unique
  
  // Company Details
  company                   String?         @db.VarChar(255)
  company_name              String?         @db.VarChar(255)
  logo_url                  String?         @db.VarChar(500)
  
  // Payment Configuration
  payment_mode              PaymentMode     @default(PREPAID)
  
  // Wallet Configuration
  wallet_balance            Float           @default(0)
  wallet_hold_amount        Float           @default(0)
  wallet_usable_amount      Float           @default(0)
  
  // Remittance Configuration
  remittance_cycle          RemittanceCycle @default(WEEKLY)
  remittance_min_amount     Float           @default(0)
  cod_remittance_pending    Float           @default(0)
  remittance_days_of_week   Json            @default("[5]") // Friday
  remittance_days_after_delivery Int        @default(7)     // D+7
  early_remittance_charge   Float           @default(0)     // 0% default
  
  // Courier Access
  courier_access            Json?           // Array of courier IDs
  
  // Widget Settings
  widget_settings           Json?
  
  // NDR Boost Settings
  ndr_boost_enabled         Boolean         @default(false)
  ndr_boost_charge_percentage Float         @default(1.5)
  ndr_boost_whatsapp_template String?
  ndr_boost_auto_activate   Boolean         @default(false)
  ndr_boost_excluded_couriers Json?
  
  // Relations
  user                      User            @relation(fields: [user_id], references: [id], onDelete: Cascade)
  
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt
}
```

#### WeightDispute Model
```prisma
model WeightDispute {
  id               String              @id @default(cuid())
  dispute_id       String              @unique
  order_id         String              @unique
  user_id          String
  
  // Weight Information
  original_weight  Float
  disputed_weight  Float
  final_weight     Float?
  
  // Dispute Details
  status           WeightDisputeStatus @default(PENDING)
  courier_name     String              @db.VarChar(100)
  
  // Financial Impact
  original_charges Float               @default(0)
  disputed_charges Float               @default(0)
  final_charges    Float?
  
  // Processing Information
  created_by       String              // User ID who created dispute
  reviewed_by      String?             // Admin who reviewed
  resolution_notes String?             @db.Text
  
  // Relations
  order            Order               @relation("OrderWeightDispute", fields: [order_id], references: [id], onDelete: Cascade)
  user             User                @relation("UserWeightDisputes", fields: [user_id], references: [id], onDelete: Cascade)
  
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt
  resolved_at DateTime?
}
```

#### Enhanced Billing Model
```prisma
model Billing {
  id       String @id @default(cuid())
  code     String @unique
  order_id String
  
  billing_date   DateTime
  billing_month  String   @db.VarChar(7)
  billing_amount Float
  
  // Enhanced Weight and Charges
  charged_weight        Float
  original_weight       Float
  weight_difference     Float @default(0)
  has_weight_dispute    Boolean @default(false)
  
  // Comprehensive Charge Breakdown
  fw_excess_charge      Float       @default(0)
  rto_excess_charge     Float       @default(0)
  zone_change_charge    Float       @default(0)
  cod_charge            Float       @default(0)
  is_forward_applicable Boolean     @default(true)
  is_rto_applicable     Boolean     @default(true)
  
  // Enhanced Pricing Details
  base_price            Float
  base_weight           Float       @default(0.5)
  increment_price       Float       @default(0)
  order_weight          Float
  order_zone            String?     @db.VarChar(50)
  charged_zone          String?     @db.VarChar(50)
  courier_name          String?     @db.VarChar(100)
  
  // Billing Cycle Information
  cycle_type            BillingCycleType @default(AUTOMATIC)
  billing_cycle_id      String?
  is_manual_billing     Boolean     @default(false)
  approved_by           String?     // Admin who approved manual billing
  approved_at           DateTime?
  
  // Processing Status
  is_processed          Boolean     @default(false)
  processed_at          DateTime?
  payment_status        String      @default("NOT_PAID") @db.VarChar(50)
  
  // Metadata
  applied_charges       Json?       // Array of charge types applied
  billing_notes         String?     @db.Text
  
  // Relations
  order                 Order       @relation(fields: [order_id], references: [id], onDelete: Cascade)
  billing_cycle         BillingCycle? @relation(fields: [billing_cycle_id], references: [id])
  
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt
}
```

### New Enums Added
```prisma
enum PaymentMode {
  PREPAID
  POSTPAID
  COMBINED
}

enum WeightDisputeStatus {
  PENDING
  UNDER_REVIEW
  RESOLVED
  REJECTED
  CANCELLED
}

enum BillingCycleType {
  AUTOMATIC
  MANUAL
  CUSTOM
}

enum BillingStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  CANCELLED
}

enum RemittanceCycle {
  DAILY
  WEEKLY
  FORTNIGHTLY
  MONTHLY
}
```

## 🔧 Enhanced API Features

### New Service Methods

#### Weight Dispute Detection
```typescript
// Automatic weight dispute detection during CSV upload
private async detectWeightDisputes(billingRows: BillingCSVRow[]): Promise<WeightDisputeInfo[]>
```

#### Manual Billing Processing
```typescript
// Process manual billing for specific orders
async processManualBilling(
  userId: string,
  awbs?: string[],
  dateRange?: { from: Date; to: Date },
  adminUserId?: string
): Promise<BillingProcessingResult>
```

#### Billing Cycle Management
```typescript
// Create automatic billing cycles
async createAutomaticBillingCycle(userId: string, cycleDays: number = 30): Promise<string>
```

### Enhanced API Endpoints

#### Admin Routes
- `POST /billing/upload-csv` - Enhanced CSV upload with dispute detection
- `POST /billing/manual/:userId` - Manual billing for specific user
- `POST /billing/cycle/:userId` - Create billing cycle for user
- `GET /billing/summary/:month` - Enhanced billing summary with dispute info
- `GET /billing/user/:userId/:month` - User billing details with weight disputes

#### User Routes
- `GET /billing/my/:month` - User's own billing with dispute information
- `GET /billing/months` - Available billing months

## 🎨 UI Component Enhancements

### Modular Billing Components

#### WeightDetailsCell Component
```typescript
// Enhanced weight display with dispute indicators
export function WeightDetailsCell({ record }: WeightDetailsCellProps) {
  const hasWeightDispute = record.has_weight_dispute;
  const weightDifference = record.weight_difference || 0;
  const originalWeight = record.original_weight || record.order_weight;
  
  return (
    <div className="flex flex-col space-y-1">
      {/* Charged weight with dispute badge */}
      {hasWeightDispute && (
        <Badge className="bg-red-100 text-red-800 text-xs">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Disputed
        </Badge>
      )}
      
      {/* Weight difference indicator */}
      {weightDifference > 0 && (
        <div className={`text-xs ${hasWeightDispute ? 'text-red-600' : 'text-orange-600'}`}>
          Weight difference: +{weightDifference.toFixed(2)}kg
        </div>
      )}
      
      {/* Weight dispute status */}
      {record.order.weight_dispute && (
        <div className="text-xs text-red-600 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          <span>Under review</span>
        </div>
      )}
    </div>
  );
}
```

#### Enhanced Payment Status Cell
```typescript
// Payment status with processing indicators
export function PaymentStatusCell({ record }: PaymentStatusCellProps) {
  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PAID': return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
      case 'DISPUTED': return <Badge className="bg-red-100 text-red-800">Disputed</Badge>;
      default: return <Badge className="bg-orange-100 text-orange-800">Pending</Badge>;
    }
  };
  
  return (
    <div className="flex flex-col gap-2">
      {getStatusBadge(record.payment_status)}
      <div className="text-xs text-muted-foreground">
        {record.is_processed ? 'Processed' : 'Processing'}
      </div>
    </div>
  );
}
```

### Enhanced Data Tables

#### User Billing Detail Table
- **Weight Dispute Indicators**: Visual alerts for disputed weights
- **Comprehensive Filtering**: Payment status, courier, processing status filters
- **Enhanced Search**: Search by billing code, order number, or AWB
- **Copy Functionality**: One-click copy for all relevant data

#### Admin Billing Detail Table
- **User Selection**: Proper handling of user switching with data refresh
- **Enhanced User Experience**: Auto-refresh when switching between users
- **Comprehensive Admin View**: All billing details with dispute tracking

## 📈 Billing Flow Enhancements

### CSV Upload Process
1. **File Validation**: Ensure proper CSV format and required headers
2. **Weight Dispute Detection**: Automatically detect weight discrepancies
3. **Dispute Creation**: Create dispute records for weight differences > tolerance
4. **Background Processing**: Queue-based processing for large CSV files
5. **Progress Tracking**: Real-time progress updates for admins

### Weight Dispute Workflow
1. **Automatic Detection**: During CSV upload, compare charged vs. original weight
2. **Dispute Creation**: If difference > 0.1kg, create dispute record
3. **Billing Hold**: Orders with disputes are held from billing
4. **Admin Review**: Admins can review and resolve disputes
5. **Billing Release**: Once resolved, orders are released for billing

### Manual Billing Process
1. **Admin Control**: Admins can manually trigger billing for specific users
2. **Selective Billing**: Choose specific AWBs or date ranges
3. **Approval Tracking**: Track which admin approved manual billing
4. **Immediate Processing**: Manual billing processes immediately

## 🛠️ Configuration Options

### Weight Dispute Settings
- **Tolerance Level**: Configure acceptable weight difference (default: 0.1kg)
- **Auto-Resolution**: Option to auto-resolve disputes below certain thresholds
- **Notification Settings**: Configure dispute notifications

### Billing Cycle Configuration
- **Cycle Length**: Configurable billing cycle duration
- **Start Date**: Custom cycle start dates
- **Processing Schedule**: Automated billing processing schedules

### User Profile Settings
- **Payment Mode**: Prepaid/Postpaid/Combined billing
- **Remittance Settings**: Configure remittance cycles and amounts
- **Wallet Management**: Wallet balance and hold amount tracking

## 🚦 Error Handling & Validation

### CSV Upload Validation
- File format validation (CSV only)
- Header validation (required: awb, weight)
- Data type validation (weight must be numeric)
- Duplicate AWB detection

### Weight Dispute Validation
- Weight values must be positive
- Original weight existence check
- Dispute status transition validation

### Billing Validation
- Prevent duplicate billing for same order
- Validate billing amounts are positive
- Ensure proper dispute resolution before billing

## 📊 Monitoring & Analytics

### Dispute Tracking
- Track dispute creation rates
- Monitor resolution times
- Identify problematic couriers

### Billing Performance
- Processing time metrics
- Error rate tracking
- Cycle completion monitoring

### User Experience Metrics
- Table load times
- Search performance
- Copy functionality usage

## 🔮 Future Enhancements

### Planned Features
1. **Automated Dispute Resolution**: AI-powered dispute resolution
2. **Advanced Analytics**: Detailed billing and dispute analytics
3. **Bulk Operations**: Enhanced bulk billing operations
4. **Integration APIs**: Third-party billing system integrations
5. **Mobile Optimization**: Enhanced mobile experience

### Technical Improvements
1. **Performance Optimization**: Database query optimization
2. **Caching Layer**: Redis-based caching for billing data
3. **Real-time Updates**: WebSocket-based real-time updates
4. **API Rate Limiting**: Enhanced API protection

## 📝 Migration Guide

### Database Migration
1. Run Prisma migrations: `npx prisma migrate deploy`
2. Generate new client: `npx prisma generate`
3. Update existing billing records to include new fields

### Frontend Updates
1. Update billing API types
2. Replace old table components with enhanced versions
3. Update routing to include new billing features

### Backend Updates
1. Update service methods to handle new models
2. Add new API endpoints for enhanced features
3. Update queue workers for background processing

---

## 📞 Support

For questions or issues related to these billing enhancements, please contact the development team or create an issue in the project repository.

**Enhanced by**: Lorrigo Development Team  
**Version**: 2.0  
**Last Updated**: December 2024 