import LoadingSpinner from '@/components/ui/loading-spinner'

interface CommonLoaderProps {
    text?: string
    size?: 'sm' | 'md' | 'lg'
    className?: string
}

interface SectionLoaderProps extends CommonLoaderProps {
    minHeight?: 'h-64' | 'min-h-96' | 'min-h-screen' | string
}

export function FullPageLoader({ text, size = 'lg', className = '' }: CommonLoaderProps) {
    return (
        <div className={`min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 ${className}`}>
            <LoadingSpinner size={size} text={text} />
        </div>
    )
}

export function SectionLoader({ text, size = 'md', className = '', minHeight = 'min-h-96' }: SectionLoaderProps) {
    return (
        <div className={`flex justify-center items-center ${minHeight} ${className}`}>
            <LoadingSpinner size={size} text={text} />
        </div>
    )
}


