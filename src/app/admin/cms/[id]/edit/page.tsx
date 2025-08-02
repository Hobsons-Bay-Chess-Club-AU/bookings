import ContentFormPage from '../../new/page'

interface EditContentPageProps {
    params: {
        id: string
    }
}

export default function EditContentPage({ params }: EditContentPageProps) {
    return <ContentFormPage params={params} />
}
