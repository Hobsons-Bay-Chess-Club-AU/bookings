import ContentFormPage from '../../new/page'

interface EditContentPageProps {
    params: Promise<{
        id: string
    }>
}

export default async function EditContentPage({ params }: EditContentPageProps) {
    const { id } = await params
    return Promise.resolve(<ContentFormPage params={{ id }} />)
}
