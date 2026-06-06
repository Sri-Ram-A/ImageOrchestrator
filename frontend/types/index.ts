export type Post = {
    id: number;
    title: string;
    description: string;
    detailed_description?: string;
    image_url: string;
    processing_type: string;
    uploaded_at: string;
    owner?: number
    phash: string
    tags?:string
    blur_score?: number;
};
export type UserProfile = {
    id: number;
    username: string;
    email: string;
    date_joined: string;
};