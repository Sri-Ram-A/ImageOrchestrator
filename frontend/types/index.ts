export type Post = {
    id: number;
    title: string;
    description: string;
    image_url: string;
    processing_type: string;
    uploaded_at: string;
    owner?: number
    phash: string
};
