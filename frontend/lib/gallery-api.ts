import { REQUEST } from "@/lib/api";
import { Post } from "@/types";

export type UploadPostPayload = {
    title: string;
    description: string;
    image: File;
    processing_type: "none" | "grayscale" | "resize";
};

export async function fetchPosts(): Promise<Post[]> {
    return REQUEST<Post[]>("GET", "gallery/images/");
}

export async function fetchPost(id: number): Promise<Post> {
    return REQUEST<Post>("GET", `gallery/images/${id}/`);
}

export async function uploadPost(payload: UploadPostPayload): Promise<Post> {
    const formData = new FormData();
    formData.append("title", payload.title);
    formData.append("description", payload.description);
    formData.append("image", payload.image);
    formData.append("processing_type", payload.processing_type);
    return REQUEST<Post>("POST", "gallery/images/", formData, { isMultipart: true });
}

export async function deletePost(id: number): Promise<void> {
    return REQUEST<void>("DELETE", `gallery/images/${id}/`);
}

export async function searchPosts(query: string): Promise<Post[]> {
    return REQUEST<Post[]>("GET", `gallery/search/?q=${encodeURIComponent(query)}`);
}