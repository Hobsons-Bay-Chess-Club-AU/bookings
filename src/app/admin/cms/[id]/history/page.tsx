import ContentHistoryClient from "./ContentHistoryClient"

interface EditContentPageProps {
    params: Promise<{
        id: string
    }>
}

export default async function EditContentPage({ params }: EditContentPageProps) {
    const { id } = await params
    return Promise.resolve(<ContentHistoryClient id={id} />)
}
