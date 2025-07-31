"use client"

interface ContactInfo {
    first_name: string
    last_name: string
    email: string
    phone: string
}

interface Step2ContactProps {
    contactInfo: ContactInfo
    setContactInfo: (info: ContactInfo) => void
    onContinue: () => void
    onBack: () => void
    loading: boolean
    error: string
}

export default function Step2Contact({
    contactInfo,
    setContactInfo,
    onContinue,
    onBack,
    loading,
    error
}: Step2ContactProps) {
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        onContinue()
    }

    const handleInputChange = (field: keyof ContactInfo, value: string) => {
        setContactInfo({
            ...contactInfo,
            [field]: value
        })
    }

    const isFormValid = () => {
        return contactInfo.first_name.trim() && 
               contactInfo.last_name.trim() && 
               contactInfo.email.trim()
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                    {error}
                </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex">
                    <div className="flex-shrink-0">
                        <span className="text-blue-400">ℹ️</span>
                    </div>
                    <div className="ml-3">
                        <h3 className="text-sm font-medium text-blue-800">
                            Contact Information
                        </h3>
                        <div className="mt-2 text-sm text-blue-700">
                            <p>Please provide your contact information for this booking.</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        First Name *
                    </label>
                    <input
                        type="text"
                        value={contactInfo.first_name}
                        onChange={(e) => handleInputChange('first_name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name *
                    </label>
                    <input
                        type="text"
                        value={contactInfo.last_name}
                        onChange={(e) => handleInputChange('last_name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email *
                    </label>
                    <input
                        type="email"
                        value={contactInfo.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone
                    </label>
                    <input
                        type="tel"
                        value={contactInfo.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
            </div>

            <div className="flex space-x-4">
                <button
                    type="button"
                    onClick={onBack}
                    className="flex-1 bg-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-400"
                >
                    Back to Pricing
                </button>
                <button
                    type="submit"
                    disabled={loading || !isFormValid()}
                    className="flex-1 bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Processing...' : 'Continue to Participant Information'}
                </button>
            </div>
        </form>
    )
} 