import { ArrowLeft, Edit2, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '@/components/ui/Button';
import type { CareCategory } from '@/types';
import logoImg from '@/assets/logo.png';

const careCategoryLabels: Record<string, string> = {
  'child-care': 'Child Care',
  'senior-care': 'Senior Care',
  'adult-care': 'Adult Care',
  'cleaning': 'Cleaning Services',
};

interface Props {
  careCategory: CareCategory;
  careData: Record<string, unknown>;
  onSubmit: () => void;
  onBack: () => void;
}

function formatAge(years: number): string {
  if (years === 0) return 'Under 1 year';
  if (years === 1) return '1 year';
  return `${years} years`;
}

export default function ReviewStep({ careCategory, careData, onSubmit, onBack }: Props) {
  const formatValue = (key: string, value: unknown): string => {
    if (key === 'childAges' && Array.isArray(value)) {
      return value.map(a => formatAge(Number(a))).join(', ');
    }
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (value === null) return 'Not specified';
    return String(value);
  };

  const getReviewItems = () => {
    const items: { label: string; value: string }[] = [];

    items.push({ label: 'Care Type', value: careCategoryLabels[careCategory] });

    const keyLabels: Record<string, string> = {
      numChildren: 'Number of Children',
      childAges: 'Children Ages',
      careType: 'Care Arrangement',
      startDate: 'Start Date',
      days: 'Days Needed',
      frequency: 'Frequency',
      helpNeeded: 'Help Needed',
      specialNeeds: 'Special Needs',
      location: 'Location',
      payRange: 'Pay Range',
      age: 'Age',
      mobility: 'Mobility Level',
      supportType: 'Support Type',
      independence: 'Independence Level',
      tasks: 'Tasks Needed',
      propertyType: 'Property Type',
      bedrooms: 'Bedrooms',
      bathrooms: 'Bathrooms',
      sqft: 'Square Footage',
      cleaningType: 'Cleaning Type',
      areas: 'Areas to Clean',
      suppliesProvided: 'Supplies Provided',
      pets: 'Pets in Home',
      preferredDate: 'Preferred Date',
      timeWindow: 'Time Window',
      specialInstructions: 'Special Instructions',
    };

    for (const [key, value] of Object.entries(careData)) {
      if (value && keyLabels[key]) {
        let displayValue = formatValue(key, value);
        if (key === 'payRange' && Array.isArray(value)) {
          displayValue = `$${value[0]} – $${value[1]}/hr`;
        }
        items.push({ label: keyLabels[key], value: displayValue });
      }
    }

    return items;
  };

  const reviewItems = getReviewItems();

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-coral-50 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1 flex justify-center">
            <Link to="/"><img src={logoImg} alt="TruliCares" className="h-6 w-auto" /></Link>
          </div>
          <div className="w-10" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-6">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-brand-400 to-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Review Your Request</h2>
          <p className="text-gray-500 text-sm">Make sure everything looks correct before submitting.</p>
        </div>

        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
          {reviewItems.map((item, i) => (
            <div
              key={i}
              className={`flex items-center justify-between px-5 py-4 ${i !== reviewItems.length - 1 ? 'border-b border-gray-100' : ''}`}
            >
              <span className="text-sm text-gray-500">{item.label}</span>
              <span className="text-sm font-semibold text-gray-800 text-right max-w-[60%]">{item.value}</span>
            </div>
          ))}
        </div>

        <button
          onClick={onBack}
          className="flex items-center justify-center gap-2 w-full mt-4 py-3 text-brand-600 font-medium text-sm hover:bg-brand-50 rounded-xl transition-colors"
        >
          <Edit2 className="w-4 h-4" /> Edit details
        </button>
      </div>

      {/* Bottom CTA */}
      <div className="sticky bottom-0 bg-white/90 backdrop-blur-lg border-t border-gray-100 p-4">
        <div className="max-w-lg mx-auto">
          <Button variant="primary" size="xl" fullWidth onClick={onSubmit}>
            Submit Care Request
          </Button>
          <p className="text-xs text-gray-400 text-center mt-3">
            By submitting, your request will be sent to matching caregivers.
          </p>
        </div>
      </div>
    </div>
  );
}
